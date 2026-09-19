import type { Metadata } from "next";
import { oneLine } from "@/lib/sign-text";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin-auth";
import { listAllOrders, ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { fontOptions, MATERIALS, LIGHT_MODES, depthMmFor } from "@/lib/options";
import { formatEur } from "@/lib/vat";
import AdminOrderActions from "@/components/admin/AdminOrderActions";
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
                  <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr_1fr_auto]">

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
                          style={{ background: o.config.bodyColor, border: "1px solid var(--color-border)" }}
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
