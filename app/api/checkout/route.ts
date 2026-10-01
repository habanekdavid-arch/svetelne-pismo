import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getUserSession } from "@/lib/user-auth";
import {
  attachStripeSession,
  getOrderGroup,
  groupOrderNumber,
  listOrdersForGroup,
  payWindowClosed,
  quoteState,
  type Order,
  type OrderGroup,
} from "@/lib/orders";
import { siteOrigin, stripe } from "@/lib/stripe";
import {
  colorLabel,
  depthMmFor,
  faceColorOf,
  fontOptions,
  hasSeparateFace,
  materialById,
  variantLabel,
} from "@/lib/options";
import { oneLine } from "@/lib/sign-text";
import { deliveryPlace, DELIVERY_METHOD_LABEL, formatAddress } from "@/lib/shipping";
import { measureSign } from "@/lib/sign-metrics.server";
import { previewIds } from "@/lib/order-previews.server";
import { previewToken } from "@/lib/preview-token.server";
import { formatEur } from "@/lib/vat";

// Opens the Stripe Checkout Session for an order that has already been placed
// and priced (app/api/orders). The amount comes from the stored order, never
// from the request — by the time this runs the price has been decided.

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = stripe();
  if (!client) {
    return NextResponse.json({ error: "payments_disabled" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const groupId = typeof body?.groupId === "string" ? body.groupId : null;
  if (!groupId) {
    return NextResponse.json({ error: "missing_group" }, { status: 400 });
  }

  const group = await getOrderGroup(groupId);
  // A customer may only pay for their own order, and only once.
  if (!group || group.userId !== session.userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (group.paymentStatus === "paid") {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }
  // An installation order is paid against the quote, and not before it is sent.
  if (quoteState(group) === "requested") {
    return NextResponse.json({ error: "not_payable" }, { status: 400 });
  }
  if (group.totalCents <= 0) {
    return NextResponse.json({ error: "nothing_to_pay" }, { status: 400 });
  }
  // An unpaid order can be finished for a week (lib/orders.ts PAY_WINDOW_DAYS).
  if (payWindowClosed(group)) {
    return NextResponse.json({ error: "pay_window_closed" }, { status: 410 });
  }

  const orders = await listOrdersForGroup(groupId);
  // Back to the site the customer is on — NEXT_PUBLIC_SITE_URL can name a
  // domain that is not connected yet.
  const origin = new URL(req.url).origin || siteOrigin();

  const no = groupOrderNumber(group);
  // Laid out like vytlacto3d's payment page: one short line per sign —
  // "Svetelný nápis: KAVIAREŇ" over "Alurol – veľké písmená, Svetelné spredu,
  // 1 ks | výška 400 mm | 2073 × 322 mm", with the sign's watermarked picture
  // so the customer sees what they are paying for — then Medzisúčet, Dodanie
  // and the total. The full spec (font, colours, depth) goes to the metadata.
  const withPicture = await previewIds(orders.map((o) => o.id)).catch(() => new Set<number>());
  const sizes = await Promise.all(
    orders.map((o) => measureSign(o.config.text, o.config.font, o.config.height).catch(() => null)),
  );
  const specs = orders.map((o, i) => signSpec(o, sizes[i]));
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = orders.map((order, i) => {
    const c = order.config;
    const size = sizes[i];
    // A signed link only Stripe is given (lib/preview-token.server.ts).
    const token = withPicture.has(order.id) ? previewToken(order.id) : null;
    return {
      quantity: 1,
      price_data: {
        currency: group.currency.toLowerCase(),
        // Cents straight from the order row; price_cents is null only for
        // rows written before checkout existed, which never reach Stripe.
        unit_amount: order.priceCents ?? order.price * 100,
        product_data: {
          name: `Svetelný nápis: ${oneLine(c.text) || "nápis"}`,
          description: [
            `${materialById(c.material).displayName}, ${variantLabel(c)}, 1 ks`,
            `výška ${c.height} mm`,
            size ? `${Math.round(size.widthMm)} × ${Math.round(size.heightMm)} mm` : null,
          ]
            .filter(Boolean)
            .join(" | "),
          ...(token && origin.startsWith("https://")
            ? { images: [`${origin}/api/orders/${order.id}/preview?t=${token}`] }
            : {}),
          metadata: { order_number: no, sign_id: String(order.id) },
        },
      },
    };
  });

  // Delivery as Stripe's own shipping row — "Dodanie / Kuriér DPD" between
  // Medzisúčet and the total, free collection as "Zadarmo". An (older)
  // installation order's quoted mounting stays an ordinary line.
  const installationQuote = Boolean(quoteState(group));
  const deliveryName = DELIVERY_METHOD_LABEL[group.deliveryMethod] ?? group.deliveryMethod;
  const shipping: Stripe.Checkout.SessionCreateParams.ShippingOption[] | null = installationQuote
    ? null
    : [{
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: deliveryName,
          fixed_amount: { amount: group.deliveryCents, currency: group.currency.toLowerCase() },
        },
      }];
  const deliveryLine: Stripe.Checkout.SessionCreateParams.LineItem | null = group.deliveryCents > 0
    ? {
        quantity: 1,
        price_data: {
          currency: group.currency.toLowerCase(),
          unit_amount: group.deliveryCents,
          product_data: {
            name: installationQuote ? "Montáž" : "Dodanie",
            description: installationQuote ? deliveryPlace(group) ?? "Montáž u zákazníka" : deliveryName,
          },
        },
      }
    : null;
  if (installationQuote && deliveryLine) lineItems.push(deliveryLine);

  // The whole order in the payment's metadata (Stripe → Payments → detail →
  // Metadata), so it can be read there without opening the admin.
  const metadata = orderMetadata(group, orders, specs, no);
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: lineItems,
    customer_email: group.customerEmail,
    // The order id travels with the payment, so the webhook can find the order
    // again without trusting anything the browser sends back.
    client_reference_id: group.id,
    metadata,
    payment_intent_data: {
      metadata,
      // What the Payments list in the dashboard shows for this payment.
      description: `Objednávka ${no} — ${orders.length} ${orders.length === 1 ? "nápis" : orders.length < 5 ? "nápisy" : "nápisov"} — ${group.customerName} — rozsvieťTO`,
    },
    success_url: `${origin}/dakujeme/${group.id}`,
    cancel_url: `${origin}/nedokoncena/${group.id}`,
    locale: "sk",
    // A payment page left open closes after an hour; Stripe then reports it
    // (checkout.session.expired) and the customer gets the "nie je dokončená"
    // e-mail. Stripe's own minimum is 30 minutes.
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  // The Stripe account is shared with vytlacto3d, so its own branding is
  // vytlacto3d's. A rozsvieťTO payment carries rozsvieťTO's logo and colour
  // for this one page.
  const branding: Stripe.Checkout.SessionCreateParams.BrandingSettings | null = origin.startsWith("https://")
    ? {
        logo: { type: "url", url: `${origin}/logo-email.png` },
        button_color: "#FFAE00",
        border_style: "rounded",
      }
    : null;
  // Tried in order, each a step plainer — should Stripe refuse the branding
  // or the shipping row (an older API version, a restricted key without that
  // permission), the payment still opens rather than not at all.
  const attempts: Stripe.Checkout.SessionCreateParams[] = [];
  const withShipping: Stripe.Checkout.SessionCreateParams = shipping ? { ...params, shipping_options: shipping } : params;
  const asLine: Stripe.Checkout.SessionCreateParams =
    !installationQuote && deliveryLine ? { ...params, line_items: [...lineItems, deliveryLine] } : params;
  if (branding) attempts.push({ ...withShipping, branding_settings: branding });
  attempts.push(withShipping);
  if (shipping) attempts.push(asLine);
  let checkout: Stripe.Checkout.Session | null = null;
  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      checkout = await client.checkout.sessions.create(attempt);
      break;
    } catch (err) {
      lastError = err;
      // Only a request Stripe found invalid is worth retrying plainer; a bad
      // key or a network failure would fail the same way again.
      if ((err as { type?: string })?.type !== "StripeInvalidRequestError") break;
      console.error("[stripe] platba odmietnutá, skúšam jednoduchšiu:", (err as Error).message);
    }
  }
  if (!checkout) throw lastError;

  if (!checkout.url) {
    return NextResponse.json({ error: "stripe_no_url" }, { status: 502 });
  }

  await attachStripeSession(group.id, checkout.id);
  return NextResponse.json({ url: checkout.url });
}

/** "Svetelné spredu · font Oswald Bold · výška písmen 300 mm · celý nápis 1269 × 310 mm · …" */
function signSpec(order: Order, size: { widthMm: number; heightMm: number } | null): string {
  const c = order.config;
  const font = fontOptions.find((f) => f.id === c.font)?.name ?? c.font;
  const colours = hasSeparateFace(c.material)
    ? `čelo ${colorLabel(faceColorOf(c))}, telo ${colorLabel(c.bodyColor)}`
    : `farba ${colorLabel(c.bodyColor)}`;
  return [
    variantLabel(c),
    `font ${font}`,
    `výška písmen ${c.height} mm`,
    size ? `celý nápis ${Math.round(size.widthMm)} × ${Math.round(size.heightMm)} mm` : null,
    `hrúbka ${depthMmFor(c.material, c.height)} mm`,
    colours,
    c.text.includes("\n") ? `text: ${c.text.replace(/\n/g, " / ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Stripe metadata: at most 50 keys, 500 characters a value. */
function orderMetadata(group: OrderGroup, orders: Order[], specs: string[], no: string): Record<string, string> {
  const cut = (v: string) => (v.length > 500 ? `${v.slice(0, 497)}…` : v);
  const m: Record<string, string> = {
    orderGroupId: group.id,
    objednavka: no,
    zakaznik: cut(group.customerName),
    email: cut(group.customerEmail),
    telefon: group.customerPhone ?? "",
    doprava: cut([DELIVERY_METHOD_LABEL[group.deliveryMethod] ?? group.deliveryMethod, deliveryPlace(group)].filter(Boolean).join(" — ")),
    napisy_spolu: formatEur(group.itemsCents / 100),
    doprava_cena: formatEur(group.deliveryCents / 100),
    spolu_s_dph: formatEur(group.totalCents / 100),
    admin: `${siteOrigin()}/admin/objednavka/${orders[0]?.id ?? ""}`,
  };
  if (group.installationRequest) {
    m.instalacia = cut(
      `Dopyt na cenu — ${formatAddress(group.installationRequest.address)}${group.installationRequest.note ? ` — ${group.installationRequest.note}` : ""}`,
    );
  }
  orders.slice(0, 30).forEach((o, i) => {
    m[`napis_${i + 1}`] = cut(`„${oneLine(o.config.text)}“ — ${materialById(o.config.material).displayName} — ${formatEur((o.priceCents ?? o.price * 100) / 100)} — ${specs[i]}`);
  });
  return m;
}
