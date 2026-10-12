import type { Metadata } from "next";
import { formatDateTime } from "@/lib/dates";
import Link from "next/link";
import { previewIds } from "@/lib/order-previews.server";
import { notFound, redirect } from "next/navigation";
import { getUserSession } from "@/lib/user-auth";
import {
  getOrderGroup,
  groupOrderNumber,
  payWindowClosed,
  listOrdersForGroup,
  PAYMENT_STATUS_LABEL,
  quoteState,
  type OrderGroup,
} from "@/lib/orders";
import { materialById } from "@/lib/options";
import { oneLine } from "@/lib/sign-text";
import PreviewImage from "@/components/orders/PreviewImage";
import { formatEur } from "@/lib/vat";
import AccountShell from "@/components/account/AccountShell";
import { AccountSection } from "@/components/account/AccountSection";
import PayAgainButton from "@/components/orders/PayAgainButton";
import { bankAccount, variableSymbol } from "@/lib/bank";
import { stripeConfigured } from "@/lib/stripe";
import { INSTALLATION_METHOD, PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";
import type { TFunction } from "@/lib/i18n/config";
import { afterMadeText, deliveryPlace, DELIVERY_METHOD_LABEL, leadTimeNotice, PRODUCTION_TIME, formatAddress } from "@/lib/shipping";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Objednávka | rozsvieťTO",
};

// Where Stripe sends the customer back to, and where they land from "Moje
// objednávky". `?stav` is only what the browser was told on the way back — it
// decides the wording, never the truth. Whether the order is paid comes from
// the row, which only the verified webhook writes.

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stav?: string }>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  const { t } = await getT();
  const session = await getUserSession();
  if (!session) redirect("/prihlasenie");

  const { id } = await params;
  const { stav } = await searchParams;

  const group = await getOrderGroup(id);
  // An order belongs to the account that placed it. A wrong id and someone
  // else's id must look the same from outside.
  if (!group || group.userId !== session.userId) notFound();

  const orders = await listOrdersForGroup(id);
  const withPreview = await previewIds(orders.map((o) => o.id)).catch(() => new Set<number>());
  const paid = group.paymentStatus === "paid";
  const cancelled = stav === "zrusene";
  const installation = group.deliveryMethod === INSTALLATION_METHOD;
  const quote = quoteState(group);
  // Something to pay: any order, except an older installation order whose
  // quote — the pre-invoice — has not been sent yet.
  const payable = !paid && group.totalCents > 0 && quote !== "requested";
  // A card can be (re)tried whenever the shop takes cards — also by someone
  // who picked a transfer and changed their mind.
  const canPayByCard = payable && stripeConfigured() && !payWindowClosed(group);
  const bank = payable && (group.paymentMethod === "transfer" || quote === "sent") ? bankAccount() : null;
  const vs = orders[0] ? variableSymbol(orders[0].id) : null;

  return (
    <AccountShell
      title={quote === "sent" ? t("Predfaktúra") : installation ? t("Objednávka s montážou") : t("Objednávka")}
      description={t("Číslo {number} · vytvorená {date}", { number: groupOrderNumber(group), date: formatDateTime(group.createdAt) })}
    >
      <AccountSection title={headline(group, cancelled, t)}>
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
          {body(group, cancelled, t)}
        </p>

        {/* Bank transfer: everything needed to pay, for as long as it is unpaid. */}
        {bank && vs && (
          <dl
            className="mt-5 space-y-2 rounded-xl p-4 text-sm"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)" }}
          >
            <Row label={t("Suma")} value={formatEur(group.totalCents / 100)} />
            <Row label={t("IBAN")} value={bank.iban} />
            {bank.bic && <Row label={t("BIC / SWIFT")} value={bank.bic} />}
            {bank.bank && <Row label={t("Banka")} value={bank.bank} />}
            <Row label={t("Variabilný symbol")} value={vs} />
            <Row label={t("Príjemca")} value={bank.holder} />
            <Row label={t("Správa pre príjemcu")} value={t("Objednávka {number}", { number: groupOrderNumber(group) })} />
          </dl>
        )}

        {canPayByCard && !cancelled && (
          <div className="mt-5">
            <PayAgainButton
              groupId={group.id}
              label={group.paymentMethod === "transfer" ? t("Radšej zaplatiť kartou") : undefined}
            />
          </div>
        )}
        {canPayByCard && cancelled && (
          <div className="mt-5">
            <PayAgainButton groupId={group.id} label={t("Skúsiť platbu znova")} />
          </div>
        )}

        {group.installationRequest && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <p className="font-bold">{t("Dopyt na cenu za inštaláciu")}</p>
            <p>{t("Miesto inštalácie:")} {formatAddress(group.installationRequest.address)}</p>
            {group.installationRequest.note && <p className="whitespace-pre-line">{group.installationRequest.note}</p>}
            <p className="mt-1 text-xs">{t("Pripravíme cenovú ponuku na inštaláciu a pošleme vám ju e-mailom.")}</p>
          </div>
        )}

        {/* What was ordered. */}
        <ul className="mt-6 space-y-2">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl px-4 py-3"
              style={{ background: "var(--color-surface)" }}
            >
              {/* The picture across the whole card; a click opens it bigger. */}
              {withPreview.has(order.id) && (
                <PreviewImage
                  src={`/api/orders/${order.id}/preview`}
                  alt={t("Náhľad nápisu {name}", { name: oneLine(order.config.text) })}
                  className="mb-3 rounded-lg"
                />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
                    {oneLine(order.config.text) || t("Váš nápis")}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                    {t(materialById(order.config.material).displayName)} · {t("výška písmen {mm} mm", { mm: order.config.height })}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-black" style={{ color: "var(--color-foreground)" }}>
                  {formatEur((order.priceCents ?? order.price * 100) / 100)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2 text-sm">
          <Row label={installation ? t("Adresa inštalácie") : t("Doprava")} value={deliveryLabel(group, t)} />
          {!installation && group.paymentStatus !== "paid" && (
            <p className="text-xs leading-5" style={{ color: "var(--color-muted)" }}>
              {t(leadTimeNotice(group.deliveryMethod))}
            </p>
          )}
          {installation ? (
            <Row
              label={t("Montáž")}
              value={
                quote === "requested" ? t("pripravujeme cenovú ponuku")
                  : quote === "pending" || quote === "consult" ? t("dohodneme po zaplatení nápisu")
                  : formatEur(group.deliveryCents / 100)
              }
            />
          ) : group.deliveryCents > 0 && (
            <Row label={t("Cena dopravy")} value={formatEur(group.deliveryCents / 100)} />
          )}
          {group.paymentMethod && (
            <Row label={t("Spôsob platby")} value={t(PAYMENT_METHOD_LABEL[group.paymentMethod])} />
          )}
          {quote !== "requested" && (
            <Row label={t("Platba")} value={t(PAYMENT_STATUS_LABEL[group.paymentStatus])} />
          )}
          {group.packetaBarcode && (
            <Row label={t("Číslo zásielky")} value={group.packetaBarcode} />
          )}
          <div
            className="flex items-baseline justify-between border-t pt-3"
            style={{ borderColor: "var(--color-border)" }}
          >
            <dt className="text-xs font-black tracking-wide" style={{ color: "var(--color-muted)" }}>
              {quote === "requested" || quote === "pending" || quote === "consult" ? t("Za nápisy, s DPH") : t("Spolu s DPH")}
            </dt>
            <dd className="text-2xl font-black" style={{ color: "var(--color-foreground)" }}>
              {formatEur(group.totalCents / 100)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/ucet/objednavky"
            className="rounded-full px-6 py-3 text-xs font-black transition hover:opacity-80"
            style={{ background: "var(--color-surface-raised)", color: "var(--color-foreground)" }}
          >
            {t("Moje objednávky")}
          </Link>
          <Link
            href="/"
            className="rounded-full px-6 py-3 text-xs font-black transition hover:opacity-90"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {t("Navrhnúť ďalší nápis")}
          </Link>
        </div>
      </AccountSection>
    </AccountShell>
  );
}

function headline(group: OrderGroup, cancelled: boolean, t: TFunction): string {
  const quote = quoteState(group);
  if (quote === "requested") return t("Objednávka čaká na cenovú ponuku");
  if (quote === "consult") return t("Nápis je zaplatený — ozveme sa kvôli montáži");
  if (quote === "sent") return t("Cenová ponuka je pripravená");
  if (group.paymentStatus === "paid") return t("Objednávka je zaplatená");
  if (cancelled) return t("Platba nebola dokončená");
  if (group.paymentStatus === "failed") return t("Platba zlyhala");
  if (group.totalCents === 0 || !group.paymentMethod) return t("Objednávka je prijatá");
  return t("Objednávka čaká na zaplatenie");
}

function body(group: OrderGroup, cancelled: boolean, t: TFunction): string {
  const quote = quoteState(group);
  if (quote === "requested") {
    return t("Objednávku s montážou máme. Pripravíme cenovú ponuku — predfaktúru s montážou na vašej adrese — a ozveme sa vám. Vopred nič neplatíte.");
  }
  if (quote === "sent") {
    return t("Toto je naša cenová ponuka s montážou. Ak s ňou súhlasíte, uhraďte prosím sumu nižšie — výrobu začneme hneď, ako platba príde, a termín montáže dohodneme telefonicky.");
  }
  if (group.paymentStatus === "paid") {
    return group.deliveryMethod === INSTALLATION_METHOD
      ? t("Ďakujeme za platbu. Nápis ideme vyrábať a čoskoro vás budeme kontaktovať — dohodneme montáž a realizáciu: termín, detaily a cenu montáže.")
      : `${t("Ďakujeme. Nápis ideme vyrábať.")} ${t(PRODUCTION_TIME)} ${t(afterMadeText(group.deliveryMethod))}`;
  }
  if (cancelled) {
    return t("Platba bola prerušená a nič sme vám nestrhli. Objednávku máme uloženú — môžete ju zaplatiť kedykoľvek.");
  }
  if (group.paymentMethod === "transfer") {
    return t("Objednávku máme. Pošlite prosím sumu na účet nižšie s variabilným symbolom — výrobu začneme hneď, ako platba príde.");
  }
  if (group.totalCents === 0 || !group.paymentMethod) {
    return t("Objednávku máme. Ozveme sa vám s potvrdením ceny, termínu a platobnými údajmi.");
  }
  return t("Objednávku máme uloženú. Dokončite prosím platbu.");
}

function deliveryLabel(group: OrderGroup, t: TFunction): string {
  const place = deliveryPlace(group);
  if (group.deliveryMethod === INSTALLATION_METHOD) return place ?? "—";
  const method = t(DELIVERY_METHOD_LABEL[group.deliveryMethod] ?? "Osobný odber");
  return place ? `${method} — ${place}` : method;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs font-black tracking-wide" style={{ color: "var(--color-muted)" }}>
        {label}
      </dt>
      <dd className="text-right text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
        {value}
      </dd>
    </div>
  );
}
