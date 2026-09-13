import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin-auth";
import { listAllOrders, ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { fontOptions, MATERIALS, LIGHT_MODES } from "@/lib/options";
import StatusSelect from "@/components/orders/StatusSelect";
import LogoutButton from "@/components/admin/LogoutButton";

export const metadata: Metadata = {
  title: "Administratíva objednávok | rozsvieťTO",
  robots: { index: false, follow: false },
};

function isOrderStatus(v: string | undefined): v is OrderStatus {
  return !!v && (ORDER_STATUSES as string[]).includes(v);
}

// Own password-based login (Prisma AdminUser + bcrypt), deliberately
// separate from Clerk — see lib/admin-auth.ts and app/admin/prihlasenie.
// Deliberately compact/light-weight typography (small text, regular/semibold
// weights) rather than the site's usual bold-uppercase voice — this is a
// working tool, not a marketing page.
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
    <main style={{ background: "var(--color-background)" }}>
      <section className="pb-5 pt-12">
        <div className="mx-auto max-w-4xl px-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p
              className="text-[9px] font-bold tracking-wide"
              style={{ color: "var(--color-muted)" }}
            >
              Administratíva
            </p>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-full px-4 py-2 text-[10px] font-bold tracking-wide transition hover:opacity-80"
                style={{ color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
              >
                Späť na web
              </Link>
              {/* Only the password login has an admin cookie to clear. An
                  allowlisted account signs out from its own profile. */}
              {session.via === "password" && <LogoutButton />}
            </div>
          </div>

          <h1 className="mb-4 text-xl font-bold md:text-2xl" style={{ color: "var(--color-foreground)" }}>
            Objednávky
          </h1>

          {/* Stat tiles — counts per status + total revenue; click to filter the list below */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {tiles.map((t) => {
              const active = t.key === activeFilter;
              return (
                <Link
                  key={t.key}
                  href={t.key === "all" ? "/admin" : `/admin?status=${t.key}`}
                  className="rounded-xl p-3 transition hover:opacity-90"
                  style={{
                    background: active ? "var(--color-foreground)" : "var(--color-surface)",
                    border: `1px solid ${active ? "var(--color-foreground)" : "var(--color-border)"}`,
                  }}
                >
                  <p
                    className="text-[9px] font-semibold tracking-wide"
                    style={{ color: active ? "var(--color-background)" : "var(--color-muted)", opacity: active ? 0.7 : 1 }}
                  >
                    {t.label}
                  </p>
                  <p className="mt-0.5 text-base font-bold" style={{ color: active ? "var(--color-background)" : "var(--color-foreground)" }}>
                    {t.count}
                  </p>
                </Link>
              );
            })}
            <div className="rounded-xl p-3" style={{ background: "var(--color-primary)" }}>
              <p className="text-[9px] font-semibold tracking-wide" style={{ color: "#000", opacity: 0.7 }}>
                Tržby
              </p>
              <p className="mt-0.5 text-base font-bold" style={{ color: "#000" }}>
                {revenue} €
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 pt-2">
        <div className="mx-auto max-w-4xl px-5">
          {orders.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
              {activeFilter === "all" ? "Zatiaľ žiadne objednávky." : "V tomto stave nie sú žiadne objednávky."}
            </p>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => {
                const font     = fontOptions.find((f) => f.id === o.config.font);
                const material = MATERIALS.find((m) => m.id === o.config.material);
                const lighting = o.config.signType === "illuminated"
                  ? LIGHT_MODES.find((l) => l.id === o.config.lightMode)
                  : null;

                return (
                  <article
                    key={o.id}
                    className="flex flex-col gap-3 rounded-xl p-4 text-[13px] sm:flex-row sm:items-start sm:justify-between"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    {/* Left — order + customer */}
                    <div className="min-w-0 sm:w-52 sm:shrink-0">
                      <p className="text-[9px] font-semibold tracking-wide" style={{ color: "var(--color-muted)" }}>
                        Objednávka #{o.id}
                      </p>
                      <p className="mt-0.5 truncate font-semibold" style={{ color: "var(--color-foreground)" }}>
                        {o.customerName}
                      </p>
                      <a
                        href={`mailto:${o.customerEmail}`}
                        className="truncate text-[11px] underline"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {o.customerEmail}
                      </a>
                      <p className="mt-1 text-[10px]" style={{ color: "var(--color-muted)" }}>
                        {new Date(o.createdAt).toLocaleDateString("sk-SK")}
                      </p>
                    </div>

                    {/* Middle — sign spec */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ background: o.config.bodyColor, border: "1px solid var(--color-border)" }}
                          aria-hidden="true"
                        />
                        <p className="truncate font-semibold" style={{ color: "var(--color-foreground)" }}>
                          {o.config.text}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
                        {font?.name ?? o.config.font} · {material?.displayName ?? o.config.material} ·{" "}
                        {o.config.signType === "plain" ? "Nesvetelné" : (lighting?.name ?? "Svetelné")} ·{" "}
                        {o.config.height} cm / {o.config.thickness} mm
                      </p>
                    </div>

                    {/* Right — price + status */}
                    <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <p className="text-base font-bold" style={{ color: "var(--color-foreground)" }}>
                        {o.price} €
                      </p>
                      <StatusSelect orderId={o.id} status={o.status} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
