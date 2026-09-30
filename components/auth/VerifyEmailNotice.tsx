"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// "Overte svoj e-mail" — shown to a signed-in customer whose address is not
// confirmed yet (a new account), with a button to send the link again. Also
// says how clicking the link went, when the verify route sends the customer
// back here with ?overenie=ok / ?overenie=neplatne.

export default function VerifyEmailNotice({ email }: { email?: string }) {
  const params = useSearchParams();
  const result = params.get("overenie");
  const [pending, setPending] = useState<{ email: string } | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.user && d.user.verified === false) setPending({ email: d.user.email });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [result]);

  async function resend() {
    setState("sending");
    const res = await fetch("/api/auth/verify", { method: "POST" }).catch(() => null);
    setState(res?.ok ? "sent" : "failed");
  }

  if (result === "ok") {
    return (
      <Banner tone="ok">
        E-mail je overený. Ďakujeme — môžete objednávať.
      </Banner>
    );
  }
  if (result === "neplatne" && !pending) {
    return (
      <Banner tone="warn">
        Overovací odkaz je neplatný alebo mu vypršala platnosť. Prihláste sa a pošlite si nový.
      </Banner>
    );
  }
  if (!pending) return null;

  return (
    <Banner tone="warn">
      <span>
        Overte prosím svoj e-mail — poslali sme odkaz na <strong>{email ?? pending.email}</strong>.
        Objednať sa dá až po overení.
      </span>
      <button
        type="button"
        onClick={resend}
        disabled={state === "sending" || state === "sent"}
        className="shrink-0 rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
      >
        {state === "sending" ? "Posielam…" : state === "sent" ? "Odoslané ✓" : "Poslať znova"}
      </button>
      {state === "failed" && <span className="text-xs text-red-600">E-mail sa nepodarilo odoslať, skúste neskôr.</span>}
    </Banner>
  );
}

function Banner({ tone, children }: { tone: "ok" | "warn"; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={`mx-auto my-4 flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
        tone === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {children}
    </div>
  );
}
