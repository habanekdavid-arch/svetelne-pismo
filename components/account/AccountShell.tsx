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

// One panel inside the account column — same card as the sidebar, with an
// eyebrow + heading and an optional badge on the right.
export function AccountSection({
  eyebrow,
  title,
  badge,
  children,
}: {
  eyebrow: string;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-3xl p-6 shadow-sm"
      style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
            {eyebrow}
          </div>
          <h2
            className="mt-2 text-2xl font-extrabold tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            {title}
          </h2>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}
