"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onSessionChange } from "@/lib/session-client";
import { useCart } from "@/lib/cart-context";
import { accountDetailsComplete } from "@/lib/account-details";
import { VERIFIED_EVENT } from "@/components/auth/VerifyCodeForm";

// A small, quiet card in the corner: a signed-in, verified customer whose
// account has no name, phone or billing address yet is asked to fill them in.
// Never in the way — it waits a few seconds, stays out of the account page
// and the open cart (which has its own "Doplniť detaily účtu" step), and
// "×" hides it for the rest of the visit.

const DISMISS_KEY = "rozsvietto-details-later";

export default function AccountDetailsReminder() {
  const pathname = usePathname();
  const { isOpen: cartOpen } = useCart();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      try { if (sessionStorage.getItem(DISMISS_KEY) === "1") return; } catch {}
      const me = await fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      const user = me?.user;
      if (cancelled) return;
      if (!user || user.verified === false) return setShow(false);
      const res = await fetch("/api/profile", { cache: "no-store" }).catch(() => null);
      const body = res && res.ok ? await res.json().catch(() => null) : null;
      if (cancelled) return;
      const complete = accountDetailsComplete(user.name ?? "", body?.profile ?? null);
      clearTimeout(timer);
      if (complete) setShow(false);
      else timer = setTimeout(() => { if (!cancelled) setShow(true); }, 4000);
    };
    check();
    const off = onSessionChange(check);
    window.addEventListener(VERIFIED_EVENT, check);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      off();
      window.removeEventListener(VERIFIED_EVENT, check);
    };
  }, []);

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setShow(false);
  }

  if (!show || cartOpen || pathname.startsWith("/ucet") || pathname.startsWith("/admin")) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[45] w-[min(340px,calc(100vw-2rem))] rounded-2xl p-4 shadow-lg"
      style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Zavrieť"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-base transition hover:opacity-70"
        style={{ color: "var(--color-muted)" }}
      >
        ×
      </button>
      <div className="flex items-start gap-3 pr-5">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black"
          style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--color-accent-text)" }}
          aria-hidden="true"
        >
          i
        </span>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
            Doplňte si detaily účtu
          </p>
          <p className="mt-1 text-xs leading-5" style={{ color: "var(--color-muted)" }}>
            Meno, telefón a fakturačnú adresu. Objednávka vám potom zaberie len pár klikov.
          </p>
          <Link
            href="/ucet?upravit=1"
            onClick={dismiss}
            className="mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            Doplniť detaily účtu
          </Link>
        </div>
      </div>
    </div>
  );
}
