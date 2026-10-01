"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { onSessionChange } from "@/lib/session-client";
import VerifyCodeForm, { VERIFIED_EVENT } from "@/components/auth/VerifyCodeForm";

// E-mail verification as a pop-up. A signed-in customer whose address is not
// confirmed yet gets a window asking for the 6-digit code from the e-mail
// (or a new one). Once it is right the window says thank you and that prices
// are now shown — and closes. "Neskôr" hides it for this visit; a slim bar
// stays under the header to bring it back.

const SNOOZE_KEY = "rozsvietto-verify-later";

export default function VerifyEmailNotice() {
  const params = useSearchParams();
  const result = params.get("overenie");
  const [pending, setPending] = useState<{ email: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          const waiting = d?.user && d.user.verified === false ? { email: d.user.email as string } : null;
          setPending(waiting);
          if (waiting) {
            let snoozed = false;
            try { snoozed = sessionStorage.getItem(SNOOZE_KEY) === "1"; } catch {}
            if (!snoozed) setOpen(true);
          }
        })
        .catch(() => {});
    check();
    const off = onSessionChange(check);
    return () => { cancelled = true; off(); };
  }, [result]);

  // A code typed in the cart or the price card thanks the customer here too.
  useEffect(() => {
    const onVerified = () => { setPending(null); setOpen(false); setThanks(true); };
    window.addEventListener(VERIFIED_EVENT, onVerified);
    return () => window.removeEventListener(VERIFIED_EVENT, onVerified);
  }, []);

  // Escape closes the window like "Neskôr" / "Zavrieť".
  useEffect(() => {
    if (!open && !thanks) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (thanks) setThanks(false);
      else later();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function later() {
    try { sessionStorage.setItem(SNOOZE_KEY, "1"); } catch {}
    setOpen(false);
  }


  if (thanks) {
    return (
      <Modal onClose={() => setThanks(false)} label="E-mail je overený">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl font-black text-green-700" aria-hidden="true">
          ✓
        </div>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          Ďakujeme za overenie!
        </h2>
        <p className="mt-3 text-[15px] leading-7" style={{ color: "var(--color-muted)" }}>
          Váš e-mail je overený. Od teraz už vidíte ceny nápisov a môžete objednávať.
        </p>
        <button
          type="button"
          onClick={() => {
            setThanks(false);
            const target = document.getElementById("konfigurator");
            if (target) target.scrollIntoView({ behavior: "smooth" });
            else window.location.href = "/#konfigurator";
          }}
          className="mt-6 rounded-2xl px-6 py-3 text-sm font-bold"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          Pozrieť ceny
        </button>
      </Modal>
    );
  }

  if (!pending) {
    if (result === "neplatne") {
      return (
        <Bar>
          Overovací odkaz je neplatný alebo mu vypršala platnosť. Prihláste sa a pošlite si nový kód.
        </Bar>
      );
    }
    return null;
  }

  if (open) {
    return (
      <Modal onClose={later} label="Overte svoj e-mail">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl" aria-hidden="true">
          ✉
        </div>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          Overte svoj e-mail
        </h2>
        <p className="mt-3 text-[15px] leading-7" style={{ color: "var(--color-muted)" }}>
          Na <strong style={{ color: "var(--color-foreground)" }}>{pending.email}</strong> sme poslali 6-miestny
          kód. Zadajte ho sem — potom uvidíte ceny a môžete objednávať.
        </p>
        <div className="mt-5 flex justify-center text-left">
          <VerifyCodeForm compact />
        </div>
        <p className="mt-4 text-xs" style={{ color: "var(--color-muted)" }}>
          Nevidíte e-mail? Pozrite aj priečinok nevyžiadanej pošty.
        </p>
        <button
          type="button"
          onClick={later}
          className="mt-4 text-xs font-semibold underline"
          style={{ color: "var(--color-muted)" }}
        >
          Neskôr
        </button>
      </Modal>
    );
  }

  return (
    <Bar>
      <span>
        Váš e-mail ešte nie je overený — ceny uvidíte po overení.
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white"
      >
        Zadať kód
      </button>
    </Bar>
  );
}

function Modal({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl p-7 text-center shadow-2xl"
        style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Zavrieť"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:opacity-70"
          style={{ color: "var(--color-muted)" }}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="mx-auto my-4 flex max-w-3xl flex-wrap items-center justify-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      {children}
    </div>
  );
}
