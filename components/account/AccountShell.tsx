import EyebrowPill from "@/components/ui/EyebrowPill";
import AccountNav from "@/components/account/AccountNav";
import { getT } from "@/lib/i18n/server";

// Shared frame of the customer area: the heading block, the sidebar and the
// column the page fills. Both /ucet and /ucet/objednavky render through it, so
// the two can never drift apart.

export default async function AccountShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { t } = await getT();
  return (
    <main className="min-h-screen" style={{ background: "var(--color-background)" }}>
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-10">

        <div className="mb-8">
          <EyebrowPill>{t("Zákaznícka zóna")}</EyebrowPill>
          <h1
            className="mt-4 text-4xl font-extrabold tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            {title}
          </h1>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--color-muted)" }}>
            {description}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            className="h-fit rounded-3xl p-4 shadow-sm"
            style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
          >
            <div className="mb-3 text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
              {t("Zákaznícka zóna")}
            </div>
            <AccountNav />
          </aside>

          <div>{children}</div>
        </div>
      </div>
    </main>
  );
}
