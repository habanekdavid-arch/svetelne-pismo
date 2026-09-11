import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { listAllOrders, ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/orders";
import { fontOptions, MATERIALS, LIGHT_MODES } from "@/lib/options";
import StatusSelect from "@/components/orders/StatusSelect";
import LogoutButton from "@/components/admin/LogoutButton";

export const metadata: Metadata = {
  title: "Administratíva objednávok | rozsvieťTO",
  robots: { index: false, follow: false },
};

// Own password-based login (Prisma AdminUser + bcrypt), deliberately
// separate from Clerk — see lib/admin-auth.ts and app/admin/prihlasenie.
export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/prihlasenie");

  const orders = await listAllOrders();

  const counts: Record<string, number> = { all: orders.length };
  let revenue = 0;
  for (const o of orders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
    if (o.status !== "cancelled") revenue += o.price;
  }

  const tiles = [
    { key: "all", label: "Všetky", count: counts.all },
    ...ORDER_STATUSES.map((s) => ({ key: s, label: ORDER_STATUS_LABEL[s], count: counts[s] ?? 0 })),
  ];

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

          {/* Stat tiles — counts per status + total revenue, at a glance */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
            {tiles.map((t) => (
              <div
                key={t.key}
                className="rounded-2xl p-4"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
                  {t.label}
                </p>
                <p className="mt-1 text-2xl font-black" style={{ color: "var(--color-foreground)" }}>
                  {t.count}
                </p>
              </div>
            ))}
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
            <p style={{ color: "var(--color-muted)" }}>Zatiaľ žiadne objednávky.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--color-border)" }}>
              <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
                <thead>
                  <tr style={{ background: "var(--color-surface)" }}>
                    {["#", "Zákazník", "Text / špecifikácia", "Cena", "Dátum", "Stav"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[10px] font-black uppercase tracking-widest"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const font     = fontOptions.find((f) => f.id === o.config.font);
                    const material = MATERIALS.find((m) => m.id === o.config.material);
                    const lighting = o.config.signType === "illuminated"
                      ? LIGHT_MODES.find((l) => l.id === o.config.lightMode)
                      : null;

                    return (
                      <tr key={o.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                        <td className="px-4 py-3 align-top" style={{ color: "var(--color-muted)" }}>
                          {o.id}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-black" style={{ color: "var(--color-foreground)" }}>{o.customerName}</p>
                          <a
                            href={`mailto:${o.customerEmail}`}
                            className="text-[12px] underline"
                            style={{ color: "var(--color-muted)" }}
                          >
                            {o.customerEmail}
                          </a>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-black" style={{ color: "var(--color-foreground)" }}>{o.config.text}</p>
                          <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                            {font?.name ?? o.config.font} · {material?.displayName ?? o.config.material} ·{" "}
                            {o.config.signType === "plain" ? "Nesvetelné" : (lighting?.name ?? "Svetelné")} ·{" "}
                            {o.config.height} cm / {o.config.thickness} mm
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top font-black" style={{ color: "var(--color-foreground)" }}>
                          {o.price} €
                        </td>
                        <td className="px-4 py-3 align-top" style={{ color: "var(--color-muted)" }}>
                          {new Date(o.createdAt).toLocaleDateString("sk-SK")}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <StatusSelect orderId={o.id} status={o.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
