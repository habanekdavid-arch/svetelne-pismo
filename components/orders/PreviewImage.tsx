"use client";

import { useEffect, useState } from "react";

// The watermarked picture of an ordered sign. Shown large on the page; a
// click opens it bigger still, in a window over the same page (not a new
// tab) — Escape, the × or a click beside it closes it again.

export function PreviewLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Zavrieť náhľad"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-black shadow transition hover:bg-white"
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[88vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"
        onClick={onClose}
      />
    </div>
  );
}

export default function PreviewImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block w-full cursor-zoom-in overflow-hidden ${className}`}
        aria-label={`Zväčšiť: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block w-full transition duration-300 group-hover:scale-[1.02]" />
        <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
          </svg>
          Zväčšiť
        </span>
      </button>
      {open && <PreviewLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
