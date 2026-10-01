"use client";

// The last line of defence — when even the layout fails, this replaces the
// whole page, so it brings its own <html> and plain styling.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="sk">
      <body style={{ margin: 0, fontFamily: "Arial, Helvetica, sans-serif", background: "#fafaf9", color: "#111" }}>
        <main style={{ maxWidth: 520, margin: "80px auto", padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            rozsvieť<span style={{ color: "#e59b00" }}>TO</span>
          </div>
          <h1 style={{ fontSize: 28, margin: "24px 0 12px" }}>Niečo sa pokazilo</h1>
          <p style={{ color: "#57534e", lineHeight: 1.6 }}>
            Stránku sa nepodarilo načítať. Skúste to prosím znova, alebo nám napíšte na{" "}
            <a href="mailto:info@4frommedia.sk">info@4frommedia.sk</a>.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 24, padding: "12px 22px", borderRadius: 14, border: 0, background: "#FFAE00", fontWeight: 700, cursor: "pointer" }}
          >
            Skúsiť znova
          </button>
        </main>
      </body>
    </html>
  );
}
