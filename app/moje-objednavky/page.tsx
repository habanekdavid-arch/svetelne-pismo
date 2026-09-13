import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserSession } from "@/lib/user-auth";
import { listOrdersForUser } from "@/lib/orders";
import { fontOptions, MATERIALS, LIGHT_MODES } from "@/lib/options";
import StatusBadge from "@/components/orders/StatusBadge";

export const metadata: Metadata = {
  title: "Moje objednávky | rozsvieťTO",
};

// No middleware involved — same pattern as app/admin/page.tsx: read our own
// session cookie (lib/user-auth.ts) and redirect here if it's missing.
export default async function MyOrdersPage() {
  const session = await getUserSession();
  if (!session) redirect("/prihlasenie");

  const orders = await listOrdersForUser(session.userId);

  return (
    <main style={{ background: "var(--color-background)" }}>
      <section className="pb-8 pt-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p
            className="mb-4 text-[10px] font-black tracking-[0.35em]"
            style={{ color: "var(--color-muted)" }}
          >
            Účet
          </p>
          <h1 className="main-heading text-3xl md:text-5xl" style={{ color: "var(--color-foreground)" }}>
            Moje objednávky
          </h1>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-3xl px-5">
          {orders.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{ background: "var(--color-surface)" }}
            >
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                Zatiaľ ste neodoslali žiadnu objednávku.
              </p>
              <Link
                href="/#konfigurator"
                className="mt-5 inline-block rounded-full px-8 py-3 text-xs font-black tracking-wide transition hover:opacity-85"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                Vytvoriť nápis
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const font     = fontOptions.find((f) => f.id === o.config.font);
                const material = MATERIALS.find((m) => m.id === o.config.material);
                const lighting = o.config.signType === "illuminated"
                  ? LIGHT_MODES.find((l) => l.id === o.config.lightMode)
                  : null;

                return (
                  <div
                    key={o.id}
                    className="rounded-xl p-5"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black" style={{ color: "var(--color-foreground)" }}>
                          {o.config.text || "Váš text"}
                        </p>
                        <p className="mt-0.5 text-[12px]" style={{ color: "var(--color-muted)" }}>
                          {font?.name ?? o.config.font} · {material?.displayName ?? o.config.material} ·{" "}
                          {o.config.signType === "plain" ? "Nesvetelné" : (lighting?.name ?? "Svetelné")}
                        </p>
                        <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-muted)" }}>
                          Objednané {new Date(o.createdAt).toLocaleDateString("sk-SK")} · #{o.id}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-black" style={{ color: "var(--color-foreground)" }}>
                          {o.price} €
                        </p>
                        <div className="mt-1.5">
                          <StatusBadge status={o.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
