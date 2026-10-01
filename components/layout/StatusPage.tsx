import Link from "next/link";

// One look for every "something happened" page — not found, an error, an
// unfinished order, a confirmed e-mail: a centred card with a round badge,
// a heading, a sentence or two and the way on.

type Action = { href: string; label: string; primary?: boolean; external?: boolean };

export default function StatusPage({
  tone = "info",
  badge,
  eyebrow,
  title,
  children,
  actions = [],
}: {
  tone?: "ok" | "warn" | "error" | "info";
  badge: string;
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  actions?: Action[];
}) {
  const ring = {
    ok: { bg: "#dcfce7", fg: "#166534" },
    warn: { bg: "#fef3c7", fg: "#92400e" },
    error: { bg: "#fee2e2", fg: "#991b1b" },
    info: { bg: "color-mix(in srgb, var(--accent) 18%, transparent)", fg: "var(--color-foreground)" },
  }[tone];

  return (
    <main className="px-5 py-20" style={{ background: "var(--color-background)" }}>
      <div
        className="mx-auto max-w-xl rounded-3xl p-8 text-center shadow-sm sm:p-10"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black"
          style={{ background: ring.bg, color: ring.fg }}
          aria-hidden="true"
        >
          {badge}
        </div>
        {eyebrow && (
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-muted)" }}>
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          {title}
        </h1>
        {children && (
          <div className="mt-4 space-y-3 text-[15px] leading-7" style={{ color: "var(--color-muted)" }}>
            {children}
          </div>
        )}
        {actions.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {actions.map((a) =>
              a.external ? (
                <a
                  key={a.href}
                  href={a.href}
                  className="rounded-2xl px-5 py-3 text-sm font-bold transition hover:opacity-90"
                  style={
                    a.primary
                      ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                      : { background: "var(--color-background)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" }
                  }
                >
                  {a.label}
                </a>
              ) : (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-2xl px-5 py-3 text-sm font-bold transition hover:opacity-90"
                  style={
                    a.primary
                      ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                      : { background: "var(--color-background)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" }
                  }
                >
                  {a.label}
                </Link>
              ),
            )}
          </div>
        )}
        <p className="mt-8 text-xs" style={{ color: "var(--color-muted)" }}>
          Potrebujete pomôcť? Napíšte na{" "}
          <a href="mailto:info@4frommedia.sk" className="font-semibold underline">info@4frommedia.sk</a>{" "}
          alebo zavolajte na{" "}
          <a href="tel:+421907907097" className="font-semibold underline">+421 907 907 097</a>.
        </p>
      </div>
    </main>
  );
}
