import type { Metadata } from "next";
import { oneLine } from "@/lib/sign-text";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin-auth";
import {
  listAllOrders,
  listGroupsByIds,
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  quoteState,
  type OrderStatus,
} from "@/lib/orders";
import { fontOptions, MATERIALS, hasSeparateFace, faceColorOf, colorLabel, variantLabel } from "@/lib/options";
import { formatEur } from "@/lib/vat";
import AdminOrderActions from "@/components/admin/AdminOrderActions";
import { integrations } from "@/lib/integrations.server";
import StatusBadge from "@/components/orders/StatusBadge";
import LogoutButton from "@/components/admin/LogoutButton";
import SelfTestPanel from "@/components/admin/SelfTestPanel";
import { SHOP_INBOX } from "@/lib/mailer.server";
import EyebrowPill from "@/components/ui/EyebrowPill";
import { orderNumber, Label, DELIVERY_LABEL } from "@/components/admin/OrderBits";
import AdminNav from "@/components/admin/AdminNav";
import { listContactMessages } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Administrácia objednávok | rozsvieťTO",
  robots: { index: false, follow: false },
};

function isOrderStatus(v: string | undefined): v is OrderStatus {
  return !!v && (ORDER_STATUSES as string[]).includes(v);
}

// Sub-label under each filter tile. vytlacto3d's admin puts a short hint
// under every count so the tiles read as sentences, not bare numbers.
const TILE_HINT: Record<string, string> = {
  all:         "Celkom v systéme",
  new:         "Čakajú na prijatie",
  in_progress: "Práve sa vyrábajú",
  done:        "Odovzdané zákazníkovi",
  cancelled:   "Stornované",
};

// Own password-based login (AdminUser + bcrypt) or an allowlisted account —
// see lib/admin-auth.ts and app/admin/prihlasenie.
//
// Laid out like vytlacto3d's admin: an eyebrow + heading block with the exit
// actions on the right, a row of clickable stat tiles that double as the
// status filter, then one roomy card per order instead of a dense table.
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getAdminIdentity();
  if (!session) redirect("/admin/prihlasenie");

  const { status: statusParam } = await searchParams;
  const activeFilter = isOrderStatus(statusParam) ? statusParam : "all";

  const allOrders = await listAllOrders();
  // Delivery and payment live on the checkout, not on the individual sign —
  // one lookup for the whole page rather than one per row.
  const groups = await listGroupsByIds(allOrders.map((o) => o.groupId ?? ""));

  const counts: Record<string, number> = { all: allOrders.length };
  let revenue = 0;
  for (const o of allOrders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
    if (o.status !== "cancelled") revenue += o.price;
  }

  const tiles = [
    { key: "all" as const, label: "Všetky", count: counts.all },
    ...ORDER_STATUSES.map((s) => ({ key: s, label: ORDER_STATUS_LABEL[s], count: counts[s] ?? 0 })),
  ];

  const orders = activeFilter === "all" ? allOrders : allOrders.filter((o) => o.status === activeFilter);

  return (
    <main className="min-h-screen px-5 py-12" style={{ background: "var(--color-surface)" }}>
      <div className="mx-auto max-w-7xl">

        {/* Header — eyebrow, heading, description, exit actions */}
        <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-4">
              <EyebrowPill>Administrácia</EyebrowPill>
            </div>
            <h1
              className="section-heading text-3xl sm:text-4xl"
              style={{ color: "var(--color-foreground)" }}
            >
              Správa objednávok
            </h1>
            <p className="mt-3 leading-7" style={{ color: "var(--color-muted)" }}>
              Prehľad všetkých objednaných svetelných nápisov. Kliknutím na dlaždicu
              vyfiltrujete zoznam podľa stavu, v karte objednávky posuniete zákazku
              do ďalšieho kroku výroby.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full px-4 py-2 text-sm font-semibold transition hover:opacity-80"
              style={{
                background: "var(--color-background)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
              }}
            >
              Späť na web
            </Link>
            {/* Only the password login has an admin cookie to clear. An
                allowlisted account signs out from its own profile. */}
            {session.via === "password" && <LogoutButton />}
          </div>
        </div>

        <AdminNav active="orders" />

        {/* Which outside services are on — the checklist for the API keys
            (docs/API-KLUCE-TODO.md), read live from the environment. */}
        <IntegrationsPanel />

        {/* Buttons that exercise each live service — a test e-mail, the
            database, Stripe and the server's own price calculation. */}
        <SelfTestPanel defaultTo={SHOP_INBOX} />

        {/* Messages from the contact form — stored even when e-mail is down,
            so this is where nothing gets lost. */}
        <ContactMessagesPanel />

        {/* Stat tiles — counts per status + total revenue; click to filter */}
        <div className="mb-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {tiles.map((t) => {
            const active = t.key === activeFilter;
            return (
              <Link
                key={t.key}
                href={t.key === "all" ? "/admin" : `/admin?status=${t.key}`}
                className={`rounded-3xl border p-5 transition ${
                  active
                    ? "border-[#FFAE00] bg-[#FFAE00]/10 shadow-md ring-2 ring-[#FFAE00]/30"
                    : "hover:-translate-y-0.5 hover:shadow-md"
                }`}
                style={
                  active
                    ? undefined
                    : { background: "var(--color-background)", borderColor: "var(--color-border)" }
                }
              >
                <p className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
                  {t.label}
                </p>
                <p className="mt-1 text-3xl font-extrabold" style={{ color: "var(--color-foreground)" }}>
                  {t.count}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
                  {active ? "● Aktívny filter" : TILE_HINT[t.key]}
                </p>
              </Link>
            );
          })}

          {/* Revenue is not a filter, so it is a plain tile in the accent fill */}
          <div className="rounded-3xl border border-[#FFAE00] bg-[#FFAE00] p-5 shadow-sm">
            <p className="text-sm font-semibold text-black/70">Tržby</p>
            <p className="mt-1 text-3xl font-extrabold text-black">{formatEur(revenue)}</p>
            <p className="mt-1 text-xs text-black/70">Bez zrušených objednávok</p>
          </div>
        </div>

        {/* Orders */}
        {orders.length === 0 ? (
          <div
            className="rounded-3xl border p-10 text-center"
            style={{ background: "var(--color-background)", borderColor: "var(--color-border)" }}
          >
            <p className="font-semibold" style={{ color: "var(--color-foreground)" }}>
              {activeFilter === "all" ? "Zatiaľ žiadne objednávky." : "V tomto stave nie sú žiadne objednávky."}
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Nové objednávky z konfigurátora sa zobrazia tu.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const font     = fontOptions.find((f) => f.id === o.config.font);
              const material = MATERIALS.find((m) => m.id === o.config.material);

              const group = o.groupId ? (groups.get(o.groupId) ?? null) : null;
              const quote = group ? quoteState(group) : null;
              const paid = group?.paymentStatus === "paid";
              const colours = hasSeparateFace(o.config.material)
                ? `${colorLabel(faceColorOf(o.config))} / ${colorLabel(o.config.bodyColor)}`
                : colorLabel(o.config.bodyColor);
              // Something only the shop can move forward — said on the card
              // itself, so it is not missed with the detail folded away.
              const todo =
                quote === "consult"
                  ? "Kontaktovať zákazníka kvôli montáži"
                  : quote === "requested"
                  ? "Pripraviť cenovú ponuku s montážou"
                  : group && !paid && group.paymentMethod === "transfer"
                    ? "Čaká na platbu prevodom"
                    : null;

              return (
                <article
                  key={o.id}
                  className="rounded-3xl border px-6 py-5 shadow-sm transition hover:shadow-md"
                  style={{ background: "var(--color-background)", borderColor: "var(--color-border)" }}
                >
                  {/* The card holds what is needed at a glance — number,
                      state, the sign in one line, price, contact and date.
                      Everything else waits behind "Zobraziť detail". */}
                  <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1.6fr_1fr_auto]">

                    <div className="min-w-0">
                      <p className="text-lg font-extrabold" style={{ color: "var(--color-foreground)" }}>
                        {orderNumber(o.id)}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>
                        {oneLine(o.config.text)}
                      </p>
                      <span
                        className="mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
                      >
                        {variantLabel(o.config)}
                      </span>
                    </div>

                    <div className="min-w-0 text-sm">
                      <Label>Konfigurácia</Label>
                      <p style={{ color: "var(--color-foreground)" }}>
                        {[material?.displayName ?? o.config.material, `${o.config.height} mm`, colours, font?.name ?? o.config.font].join(" • ")}
                      </p>
                      <div className="mt-3">
                        <Label>Kontakt</Label>
                      </div>
                      <a
                        href={`mailto:${o.customerEmail}`}
                        className="block truncate"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {o.customerEmail}
                      </a>
                      {group && (
                        <p className="mt-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
                          Doprava: {DELIVERY_LABEL[group.deliveryMethod] ?? group.deliveryMethod}
                        </p>
                      )}
                    </div>

                    <div className="min-w-0 text-sm">
                      <Label>Cena celkom</Label>
                      <p className="text-xl font-extrabold" style={{ color: "var(--color-foreground)" }}>
                        {formatEur(o.price)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-muted)" }}>vrátane DPH</p>
                      <div className="mt-3">
                        <Label>Dátum</Label>
                      </div>
                      <p style={{ color: "var(--color-foreground)" }}>
                        {new Date(o.createdAt).toLocaleString("sk-SK", {
                          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusBadge status={o.status} />
                        {group && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${paid ? "bg-[#FFAE00] text-black" : ""}`}
                            style={paid ? undefined : { background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
                          >
                            {PAYMENT_STATUS_LABEL[group.paymentStatus]}
                          </span>
                        )}
                      </div>
                      {todo && (
                        <p className="mt-2 text-xs font-bold" style={{ color: "var(--color-accent-text)" }}>
                          ● {todo}
                        </p>
                      )}
                    </div>

                    <AdminOrderActions orderId={o.id} status={o.status} />
                  </div>

                  <Link
                    href={`/admin/objednavka/${o.id}`}
                    className="mt-4 inline-block text-sm font-bold underline underline-offset-4"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    Zobraziť detail objednávky →
                  </Link>
                </article>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}

function IntegrationsPanel() {
  const list = integrations();
  const on = list.filter((i) => i.ok).length;
  return (
    <details
      className="mb-8 rounded-3xl border p-5"
      style={{ background: "var(--color-background)", borderColor: "var(--color-border)" }}
      open={on < list.length}
    >
      <summary className="cursor-pointer text-sm font-extrabold" style={{ color: "var(--color-foreground)" }}>
        Stav integrácií — zapnuté {on} z {list.length}
      </summary>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {list.map((i) => (
          <li
            key={i.name}
            className="rounded-2xl px-4 py-3 text-sm"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-2 font-bold" style={{ color: "var(--color-foreground)" }}>
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: i.ok ? "#16a34a" : "#f59e0b" }}
                aria-hidden="true"
              />
              {i.name}
            </div>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--color-muted)" }}>{i.status}</p>
            {i.missing.length > 0 && (
              <p className="mt-1 text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
                {i.ok ? "Voliteľné: " : "Doplniť: "}
                {i.missing.map((m) => (
                  <code key={m} className="mr-1 rounded bg-black/5 px-1 py-0.5">{m}</code>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

async function ContactMessagesPanel() {
  const messages = await listContactMessages(30).catch(() => null);
  return (
    <details
      className="mb-8 rounded-3xl border p-5"
      style={{ background: "var(--color-background)", borderColor: "var(--color-border)" }}
    >
      <summary className="cursor-pointer text-sm font-extrabold" style={{ color: "var(--color-foreground)" }}>
        Správy z kontaktného formulára — {messages === null ? "nepodarilo sa načítať" : messages.length === 0 ? "žiadne" : `posledných ${messages.length}`}
      </summary>
      {messages && messages.length > 0 && (
        <ul className="mt-4 space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl px-4 py-3 text-sm"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold" style={{ color: "var(--color-foreground)" }}>
                  {m.subject}
                </p>
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                  {new Date(m.createdAt).toLocaleString("sk-SK", {
                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
                {m.name} ·{" "}
                <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="underline">
                  {m.email}
                </a>
              </p>
              <p className="mt-2 whitespace-pre-line" style={{ color: "var(--color-foreground-soft)" }}>
                {m.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
