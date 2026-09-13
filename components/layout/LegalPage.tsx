// Shared shell for the three legal/info pages (GDPR, Obchodné podmienky,
// Cookies) — one consistent hero + prose layout instead of re-typing markup
// per page.

export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main style={{ background: "var(--color-background)" }}>
      <section className="pb-8 pt-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p
            className="mb-4 text-[10px] font-black tracking-[0.35em]"
            style={{ color: "var(--color-muted)" }}
          >
            {eyebrow}
          </p>
          <h1
            className="main-heading text-3xl md:text-5xl"
            style={{ color: "var(--color-foreground)" }}
          >
            {title}
          </h1>
          <p className="mt-4 text-[12px]" style={{ color: "var(--color-muted)" }}>
            Posledná aktualizácia: {updated}
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-3xl space-y-9 px-5">{children}</div>
      </section>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2
        className="mb-2.5 text-[15px] font-black tracking-wide"
        style={{ color: "var(--color-foreground)" }}
      >
        {title}
      </h2>
      <div
        className="space-y-3 text-[14px] leading-7"
        style={{ color: "var(--color-muted)" }}
      >
        {children}
      </div>
    </div>
  );
}
