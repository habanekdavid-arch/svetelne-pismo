// Small pill-shaped section label with a coloured dot — the "eyebrow" tag
// above headings.
//
// Copied class-for-class from vytlacto3d's hero pill (its app/page.tsx):
//
//   inline-flex items-center gap-2 rounded-full border border-neutral-200
//   bg-white px-3 py-1 text-sm text-neutral-700 shadow-sm
//   └ span: inline-block h-2 w-2 rounded-full bg-[#FFAE00]
//
// Its literal colours map onto this site's tokens exactly: neutral-200 is
// #e5e5e5 (= --color-border) and white is --color-background. neutral-700
// (#404040) had no token, so --color-foreground-soft was added for it.
//
// This was previously a 10px all-caps label on a grey fill with no border;
// the sister site's is 14px sentence case on white with a hairline border.

export default function EyebrowPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm shadow-sm"
      style={{
        background: "var(--color-background)",
        border: "1px solid var(--color-border)",
        color: "var(--color-foreground-soft)",
      }}
    >
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: "var(--accent)" }}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
