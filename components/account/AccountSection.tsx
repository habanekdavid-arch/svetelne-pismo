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
