"use client";

import { useEffect } from "react";
import Link from "next/link";

// Something on a page threw. Says so plainly, offers to try again, and keeps
// the rest of the site (header, footer) around it.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="px-5 py-20" style={{ background: "var(--color-background)" }}>
      <div
        className="mx-auto max-w-xl rounded-3xl p-8 text-center shadow-sm sm:p-10"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl font-black text-red-800" aria-hidden="true">
          !
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          Niečo sa pokazilo
        </h1>
        <p className="mt-4 text-[15px] leading-7" style={{ color: "var(--color-muted)" }}>
          Stránku sa nepodarilo načítať. Skúste to znova — ak problém pretrvá, napíšte nám a pomôžeme.
          {error.digest && <span className="mt-2 block text-xs">Kód chyby: {error.digest}</span>}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl px-5 py-3 text-sm font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            Skúsiť znova
          </button>
          <Link
            href="/"
            className="rounded-2xl px-5 py-3 text-sm font-bold"
            style={{ background: "var(--color-background)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
          >
            Na úvod
          </Link>
        </div>
        <p className="mt-8 text-xs" style={{ color: "var(--color-muted)" }}>
          Pomoc: <a href="mailto:info@4frommedia.sk" className="font-semibold underline">info@4frommedia.sk</a> ·{" "}
          <a href="tel:+421907907097" className="font-semibold underline">+421 907 907 097</a>
        </p>
      </div>
    </main>
  );
}
