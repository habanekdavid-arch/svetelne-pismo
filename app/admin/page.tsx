import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { listAllOrders } from "@/lib/orders";
import { fontOptions, MATERIALS, LIGHT_MODES } from "@/lib/options";
import StatusSelect from "@/components/orders/StatusSelect";

export const metadata: Metadata = {
  title: "Administratíva objednávok | rozsvieťTO",
  robots: { index: false, follow: false },
};

// Gate #1 (must be signed in) lives in middleware.ts. Gate #2 (must be on
// the ADMIN_EMAILS allowlist) needs the full Clerk user object — that only
// comes from currentUser(), not the session claims middleware sees — so it
// happens here, plain e-mail check, no Clerk roles/organizations involved.
export default async function AdminPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!user || !isAdminEmail(email)) {
    redirect("/");
  }

  const orders = await listAllOrders();

  return (
    <main style={{ background: "var(--color-background)" }}>
      <section className="pb-8 pt-20">
        <div className="mx-auto max-w-5xl px-5">
          <p
            className="mb-3 text-[10px] font-black uppercase tracking-[0.35em]"
            style={{ color: "var(--color-muted)" }}
          >
            Administratíva
          </p>
          <h1 className="main-heading text-3xl md:text-4xl" style={{ color: "var(--color-foreground)" }}>
            Objednávky
          </h1>
        </div>
      </section>

      <section className="pb-24">
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
