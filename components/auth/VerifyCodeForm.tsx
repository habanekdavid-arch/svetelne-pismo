"use client";

import { useState } from "react";
import { notifySessionChange } from "@/lib/session-client";

// Typing in the 6-digit code from the verification e-mail — and sending the
// e-mail again. Used in the banner under the header and in the cart.

type SendState = "idle" | "sending" | "sent" | "failed" | "disabled";

export default function VerifyCodeForm({ onVerified, compact }: { onVerified?: () => void; compact?: boolean }) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [send, setSend] = useState<SendState>("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (checking || code.replace(/\D/g, "").length !== 6) {
      setError("Zadajte 6-miestny kód z e-mailu.");
      return;
    }
    setChecking(true);
    setError(null);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);
    const body = await res?.json().catch(() => null);
    setChecking(false);
    if (res?.ok) {
      notifySessionChange();
      onVerified?.();
      return;
    }
    setError(
      body?.error === "wrong_code"
        ? "Kód nesedí. Skontrolujte ho a skúste znova."
        : body?.error === "code_expired"
          ? "Kód už neplatí. Pošlite si nový."
          : "Overenie sa nepodarilo. Skúste to prosím znova.",
    );
  }

  async function resend() {
    setSend("sending");
    const res = await fetch("/api/auth/verify", { method: "POST" }).catch(() => null);
    if (res?.ok) return setSend("sent");
    const body = await res?.json().catch(() => null);
    setSend(body?.error === "mail_disabled" ? "disabled" : "failed");
  }

  return (
    <div className={compact ? "space-y-2" : "flex flex-wrap items-center gap-2"}>
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-miestny kód"
          aria-label="Overovací kód z e-mailu"
          className="w-32 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-center text-sm font-bold tracking-[0.2em] text-black outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={checking}
          className="rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {checking ? "Overujem…" : "Overiť"}
        </button>
      </form>
      <button
        type="button"
        onClick={resend}
        disabled={send === "sending" || send === "sent"}
        className="text-xs font-bold underline disabled:no-underline"
      >
        {send === "sending" ? "Posielam…" : send === "sent" ? "Nový kód odoslaný ✓" : "Poslať kód znova"}
      </button>
      {error && <p className="w-full text-xs font-semibold text-red-600">{error}</p>}
      {send === "failed" && (
        <p className="w-full text-xs text-red-600">
          E-mail sa nepodarilo odoslať. Skúste to o chvíľu, alebo nám napíšte na info@4frommedia.sk — overíme vás ručne.
        </p>
      )}
      {send === "disabled" && (
        <p className="w-full text-xs text-red-600">
          Odosielanie e-mailov je dočasne vypnuté. Napíšte nám na info@4frommedia.sk — overíme vás ručne.
        </p>
      )}
    </div>
  );
}
