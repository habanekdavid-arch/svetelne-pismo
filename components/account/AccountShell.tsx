import EyebrowPill from "@/components/ui/EyebrowPill";
import AccountNav from "@/components/account/AccountNav";

// Shared frame of the customer area: the heading block, the sidebar and the
// column the page fills. Both /ucet and /ucet/objednavky render through it, so
// the two can never drift apart.

export default function AccountShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen" style={{ background: "var(--color-background)" }}>
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-10">

        <div className="mb-8">
          <EyebrowPill>Zákaznícka zóna</EyebrowPill>
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
              Zákaznícka zóna
            </div>
            <AccountNav />
          </aside>

          <div>{children}</div>
        </div>
      </div>
    </main>
  );
}

// One panel inside the account column — same card as the sidebar.
//
// Two shapes, the way the customer area on vytlacto3d uses them: a plain
// panel with just a heading (the account's own sections), and an eyebrow +
// big heading variant for a page that is one panel from top to bottom.
export function AccountSection({
  eyebrow,
  title,
  subtitle,
  badge,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section
      className="rounded-3xl p-6 shadow-sm"
      style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          {eyebrow && (
            <div className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
              {eyebrow}
            </div>
          )}
          <h2
            className={
              eyebrow
                ? "mt-2 text-2xl font-extrabold tracking-tight"
                : "text-lg font-extrabold tracking-tight"
            }
            style={{ color: "var(--color-foreground)" }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}
