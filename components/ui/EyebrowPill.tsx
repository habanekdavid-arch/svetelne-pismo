// Small pill-shaped section label with a colored dot — the "eyebrow" tag
// pattern (e.g. vytlacto3d's "● Online výpočet ceny") used above headings
// throughout the site instead of a bare line of text.

export default function EyebrowPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-black tracking-wide"
      style={{ background: "var(--color-surface)", color: "var(--color-muted)" }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: "var(--accent)" }}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
