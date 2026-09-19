import type { Metadata } from "next";
import { oneLine } from "@/lib/sign-text";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserSession } from "@/lib/user-auth";
import { listOrdersForUser, orderCountLabel } from "@/lib/orders";
import { fontOptions, MATERIALS, LIGHT_MODES, depthMmFor } from "@/lib/options";
import { formatEur } from "@/lib/vat";
import StatusBadge from "@/components/orders/StatusBadge";
import AccountShell, { AccountSection } from "@/components/account/AccountShell";

export const metadata: Metadata = {
  title: "Moje objednávky | rozsvieťTO",
};

// No middleware involved — same pattern as app/admin/page.tsx: read our own
// session cookie (lib/user-auth.ts) and redirect here if it's missing.
export default async function AccountOrdersPage() {
  const session = await getUserSession();
  if (!session) redirect("/prihlasenie");

  const orders = await listOrdersForUser(session.userId);

  return (
    <AccountShell title="Moje objednávky" description="Tu nájdete svoje objednávky, ich stav a históriu.">
      <AccountSection
        eyebrow="Moje objednávky"
        title="História objednávok"
        badge={
          <div
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "var(--color-surface)", color: "var(--color-muted)" }}
          >
            {orderCountLabel(orders.length)}
          </div>
        }
      >
        {orders.length === 0 ? (
          <div
            className="mt-6 rounded-2xl p-6 text-sm"
            style={{
              border: "1px dashed var(--color-border-strong)",
              background: "var(--color-surface)",
              color: "var(--color-muted)",
            }}
          >
            Zatiaľ tu nevidíte žiadne objednávky.{" "}
            <Link
              href="/#konfigurator"
              className="font-semibold underline underline-offset-2"
              style={{ color: "var(--color-foreground)" }}
            >
              Navrhnite si nápis
            </Link>
            .
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {orders.map((o) => {
              const font     = fontOptions.find((f) => f.id === o.config.font);
              const material = MATERIALS.find((m) => m.id === o.config.material);
              const lighting = o.config.signType === "illuminated"
                ? LIGHT_MODES.find((l) => l.id === o.config.lightMode)
                : null;

              return (
                <article
                  key={o.id}
                  className="rounded-2xl p-5"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ background: o.config.bodyColor, border: "1px solid var(--color-border)" }}
                          aria-hidden="true"
                        />
                        <p className="truncate text-base font-extrabold" style={{ color: "var(--color-foreground)" }}>
                          {oneLine(o.config.text) || "Váš text"}
                        </p>
                      </div>
                      <p className="mt-1 text-[13px]" style={{ color: "var(--color-muted)" }}>
                        {font?.name ?? o.config.font} · {material?.displayName ?? o.config.material} ·{" "}
                        {o.config.signType === "plain" ? "Nesvetelné" : (lighting?.name ?? "Svetelné")} ·{" "}
                        {o.config.height} mm / {depthMmFor(o.config.material, o.config.height)} mm
                      </p>
                      <p className="mt-1.5 text-xs" style={{ color: "var(--color-muted)" }}>
                        Objednané {new Date(o.createdAt).toLocaleDateString("sk-SK")} · #{o.id}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-extrabold" style={{ color: "var(--color-foreground)" }}>
                        {formatEur(o.price)}
                      </p>
                      <div className="mt-1.5">
                        <StatusBadge status={o.status} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </AccountSection>
    </AccountShell>
  );
}
