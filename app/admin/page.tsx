import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
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
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getAdminSession();
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
      <section className="pb-6 pt-16">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p
              className="text-[10px] font-black uppercase tracking-[0.35em]"
              style={{ color: "var(--color-muted)" }}
            >
              Administratíva
            </p>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-wide transition hover:opacity-80"
                style={{ color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
              >
                Späť na web
              </Link>
              <LogoutButton />
            </div>
          </div>

          <h1 className="main-heading mb-6 text-3xl md:text-4xl" style={{ color: "var(--color-foreground)" }}>
            Objednávky
          </h1>

          {/* Stat tiles — counts per status + total revenue; click to filter the list below */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
            {tiles.map((t) => {
              const active = t.key === activeFilter;
              return (
                <Link
                  key={t.key}
                  href={t.key === "all" ? "/admin" : `/admin?status=${t.key}`}
                  className="rounded-2xl p-4 transition hover:opacity-90"
                  style={{
                    background: active ? "var(--color-foreground)" : "var(--color-surface)",
                    border: `1px solid ${active ? "var(--color-foreground)" : "var(--color-border)"}`,
                  }}
                >
                  <p
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: active ? "var(--color-background)" : "var(--color-muted)", opacity: active ? 0.7 : 1 }}
                  >
                    {t.label}
                  </p>
                  <p className="mt-1 text-2xl font-black" style={{ color: active ? "var(--color-background)" : "var(--color-foreground)" }}>
                    {t.count}
                  </p>
                </Link>
              );
            })}
            <div
              className="rounded-2xl p-4"
              style={{ background: "var(--color-primary)" }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#000", opacity: 0.7 }}>
                Tržby
              </p>
              <p className="mt-1 text-2xl font-black" style={{ color: "#000" }}>
                {revenue} €
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24 pt-4">
        <div className="mx-auto max-w-5xl px-5">
          {orders.length === 0 ? (
            <p style={{ color: "var(--color-muted)" }}>
              {activeFilter === "all" ? "Zatiaľ žiadne objednávky." : "V tomto stave nie sú žiadne objednávky."}
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const font     = fontOptions.find((f) => f.id === o.config.font);
                const material = MATERIALS.find((m) => m.id === o.config.material);
                const lighting = o.config.signType === "illuminated"
                  ? LIGHT_MODES.find((l) => l.id === o.config.lightMode)
                  : null;

                return (
                  <article
                    key={o.id}
                    className="flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-start sm:justify-between"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    {/* Left — order + customer */}
                    <div className="min-w-0 sm:w-56 sm:shrink-0">
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
                        Objednávka #{o.id}
                      </p>
                      <p className="mt-1 truncate font-black" style={{ color: "var(--color-foreground)" }}>
                        {o.customerName}
                      </p>
                      <a
                        href={`mailto:${o.customerEmail}`}
                        className="truncate text-[12px] underline"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {o.customerEmail}
                      </a>
                      <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-muted)" }}>
                        {new Date(o.createdAt).toLocaleDateString("sk-SK")}
                      </p>
                    </div>

                    {/* Middle — sign spec */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ background: o.config.bodyColor, border: "1px solid var(--color-border)" }}
                          aria-hidden="true"
                        />
                        <p className="truncate font-black" style={{ color: "var(--color-foreground)" }}>
                          {o.config.text}
                        </p>
                      </div>
                      <p className="mt-1 text-[12px] leading-5" style={{ color: "var(--color-muted)" }}>
                        {font?.name ?? o.config.font} · {material?.displayName ?? o.config.material} ·{" "}
                        {o.config.signType === "plain" ? "Nesvetelné" : (lighting?.name ?? "Svetelné")} ·{" "}
                        {o.config.height} cm / {o.config.thickness} mm
                      </p>
                    </div>

                    {/* Right — price + status */}
                    <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <p className="text-xl font-black" style={{ color: "var(--color-foreground)" }}>
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
