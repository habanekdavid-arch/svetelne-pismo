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
  QUOTE_STATE_LABEL,
  quoteState,
  type OrderGroup,
  type OrderStatus,
} from "@/lib/orders";
import { fontOptions, MATERIALS, LIGHT_MODES, depthMmFor, hasSeparateFace, faceColorOf, colorLabel } from "@/lib/options";
import { formatEur } from "@/lib/vat";
import AdminOrderActions from "@/components/admin/AdminOrderActions";
import ConfirmTransferButton from "@/components/admin/ConfirmTransferButton";
import InstallationQuoteForm from "@/components/admin/InstallationQuoteForm";
import { integrations } from "@/lib/integrations.server";
import { INSTALLATION_METHOD, PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";
import StatusBadge from "@/components/orders/StatusBadge";
import LogoutButton from "@/components/admin/LogoutButton";
import EyebrowPill from "@/components/ui/EyebrowPill";

export const metadata: Metadata = {
  title: "Administratíva objednávok | rozsvieťTO",
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

// Human-facing order number. The database id stays visible next to it so a
// row is still findable by its real primary key.
function orderNumber(id: number): string {
  return `ROZ-${String(id).padStart(4, "0")}`;
}

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

        {/* Which outside services are on — the checklist for the API keys
            (docs/API-KLUCE-TODO.md), read live from the environment. */}
        <IntegrationsPanel />

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
              const lighting = o.config.signType === "illuminated"
                ? LIGHT_MODES.find((l) => l.id === o.config.lightMode)
                : null;

              return (
                <article
                  key={o.id}
                  className="rounded-3xl border p-6 shadow-sm transition hover:shadow-md"
                  style={{ background: "var(--color-background)", borderColor: "var(--color-border)" }}
                >
                  <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr_1fr_1fr_auto]">

                    {/* Identity — order number, the sign itself, its colour */}
                    <div className="min-w-0">
                      <p className="text-xs font-bold tracking-wide" style={{ color: "var(--color-accent-text)" }}>
                        {orderNumber(o.id)}
                        <span className="ml-2 font-medium" style={{ color: "var(--color-muted)" }}>
                          #{o.id}
                        </span>
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full"
                          style={{ background: faceColorOf(o.config), border: `3px solid ${o.config.bodyColor}` }}
                          title="čelo a hrana"
                          aria-hidden="true"
                        />
                        <p className="truncate text-lg font-extrabold" style={{ color: "var(--color-foreground)" }}>
                          {oneLine(o.config.text)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                        {o.config.signType === "plain" ? "Nesvetelné písmo" : (lighting?.name ?? "Svetelné písmo")}
                      </p>
                    </div>

                    {/* Configuration */}
                    <div className="min-w-0 text-sm">
                      <p className="mb-2 text-xs font-bold tracking-wide" style={{ color: "var(--color-muted)" }}>
                        Konfigurácia
                      </p>
                      <dl className="space-y-1" style={{ color: "var(--color-foreground-soft)" }}>
                        <SpecLine label="Font" value={font?.name ?? o.config.font} />
                        <SpecLine label="Materiál" value={material?.displayName ?? o.config.material} />
                        <SpecLine label="Výška" value={`${o.config.height} mm`} />
                        <SpecLine
                          label="Hrúbka"
                          value={`${depthMmFor(o.config.material, o.config.height)} mm`}
                        />
                        {/* Dielňa potrebuje obe farby menom — čelo a hrana sa
                            objednávajú a lakujú zvlášť. */}
                        {hasSeparateFace(o.config.material) ? (
                          <>
                            <SpecLine label="Čelo" value={colorLabel(faceColorOf(o.config))} />
                            <SpecLine label="Hrana" value={colorLabel(o.config.bodyColor)} />
                          </>
                        ) : (
                          <SpecLine label={o.config.signType === "illuminated" && o.config.lightMode === "edge" ? "Čelo" : "Farba"} value={colorLabel(o.config.bodyColor)} />
                        )}
                      </dl>
                    </div>

                    {/* Customer + date */}
                    <div className="min-w-0 text-sm">
                      <p className="mb-2 text-xs font-bold tracking-wide" style={{ color: "var(--color-muted)" }}>
                        Zákazník
                      </p>
                      <p className="truncate font-semibold" style={{ color: "var(--color-foreground)" }}>
                        {o.customerName}
                      </p>
                      <a
                        href={`mailto:${o.customerEmail}`}
                        className="block truncate underline underline-offset-2"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {o.customerEmail}
                      </a>
                      <p className="mt-3 text-2xl font-extrabold" style={{ color: "var(--color-foreground)" }}>
                        {formatEur(o.price)}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
                        {new Date(o.createdAt).toLocaleDateString("sk-SK", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <div className="mt-3">
                        <StatusBadge status={o.status} />
                      </div>
                    </div>

                    {/* Delivery and payment — from the checkout this sign was
                        part of. Orders placed before checkout existed have no
                        group, and simply show nothing here. */}
                    <DeliveryPanel group={o.groupId ? (groups.get(o.groupId) ?? null) : null} />

                    {/* Actions */}
                    <AdminOrderActions orderId={o.id} status={o.status} />
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}

function SpecLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt style={{ color: "var(--color-muted)" }}>{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
    </div>
  );
}

/**
 * What the workshop needs in order to send the sign: where it goes, whether it
 * has been paid for, and — once Packeta has it — the packet number. A packet
 * that could not be created says why, right here, because nobody will go
 * looking in the logs.
 */
const DELIVERY_LABEL: Record<string, string> = {
  "packeta-pickup": "Packeta — výdajné miesto",
  "packeta-home":   "Kuriér",
  freight:          "Preprava na dohodu",
  personal:         "Osobný odber",
  [INSTALLATION_METHOD]: "Montáž — na cenovú ponuku",
};

function DeliveryPanel({ group }: { group: OrderGroup | null }) {
  if (!group) {
    // Placed before checkout existed: there is no delivery or payment to show,
    // but the cell stays so the row's columns keep their places.
    return (
      <div className="min-w-0 text-sm">
        <p className="mb-2 text-xs font-bold tracking-wide" style={{ color: "var(--color-muted)" }}>
          Doprava a platba
        </p>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          Staršia objednávka — dohodnuté mimo e-shopu.
        </p>
      </div>
    );
  }

  const where = group.deliveryPoint
    ? `${group.deliveryPoint.name}${group.deliveryPoint.street ? `, ${group.deliveryPoint.street}` : ""}`
    : group.deliveryAddress
      ? `${group.deliveryAddress.street} ${group.deliveryAddress.houseNumber}, ${group.deliveryAddress.zip} ${group.deliveryAddress.city}`
      : "Osobný odber";

  const paid = group.paymentStatus === "paid";
  const installation = group.deliveryMethod === INSTALLATION_METHOD;
  const quote = quoteState(group);

  return (
    <div className="min-w-0 text-sm">
      <p className="mb-2 text-xs font-bold tracking-wide" style={{ color: "var(--color-muted)" }}>
        {installation ? "Montáž — cenová ponuka" : "Doprava a platba"}
      </p>
      <dl className="space-y-1" style={{ color: "var(--color-foreground-soft)" }}>
        <SpecLine label="Spôsob" value={DELIVERY_LABEL[group.deliveryMethod] ?? group.deliveryMethod} />
        <SpecLine label={installation ? "Adresa inštalácie" : "Kam"} value={where} />
        {group.customerPhone && <SpecLine label="Telefón" value={group.customerPhone} />}
        {quote && <SpecLine label="Stav" value={QUOTE_STATE_LABEL[quote]} />}
        {quote === "sent" && (
          <SpecLine label="Montáž" value={formatEur(group.deliveryCents / 100)} />
        )}
        {group.paymentMethod && (
          <SpecLine label="Platba cez" value={PAYMENT_METHOD_LABEL[group.paymentMethod]} />
        )}
        {(!installation || quote !== "requested") && (
          <SpecLine label="Platba" value={PAYMENT_STATUS_LABEL[group.paymentStatus]} />
        )}
        {group.packetaBarcode && <SpecLine label="Zásielka" value={group.packetaBarcode} />}
      </dl>
      {paid && (
        <p className="mt-2 text-xs font-bold" style={{ color: "var(--color-accent-text)" }}>
          Zaplatené {formatEur(group.totalCents / 100)}
        </p>
      )}
      {quote === "requested" && (
        <p className="mt-2 text-xs font-bold" style={{ color: "var(--color-accent-text)" }}>
          Pripraviť cenovú ponuku s montážou — zákazník zatiaľ nič neplatil
        </p>
      )}
      {(quote === "requested" || quote === "sent") && (
        <InstallationQuoteForm
          groupId={group.id}
          itemsEur={group.itemsCents / 100}
          currentEur={quote === "sent" ? group.deliveryCents / 100 : null}
        />
      )}
      {!paid && (group.paymentMethod === "transfer" || quote === "sent") && (
        <ConfirmTransferButton groupId={group.id} />
      )}
      {group.packetaError && (
        <p className="mt-2 text-xs leading-5 text-red-500">
          Packeta: {group.packetaError}
        </p>
      )}
    </div>
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
