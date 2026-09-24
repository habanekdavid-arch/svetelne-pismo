"use client";

import { useState } from "react";
import Link from "next/link";

// "Zabudnuté heslo" — in the login page's card. Sends a one-hour link to set a
// new password (app/api/auth/forgot). The confirmation reads the same whether
// or not the address has an account.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "disabled" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 503) return setState("disabled");
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="min-h-screen px-4 py-12" style={{ background: "var(--color-surface)" }}>
      <div
        className="mx-auto max-w-md rounded-3xl p-6 shadow-sm"
        style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
      >
        <div className="mb-6">
          <div className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
            Zákaznícka zóna
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
            Zabudnuté heslo
          </h1>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
            Zadajte e-mail, s ktorým ste sa registrovali. Pošleme vám odkaz na nastavenie nového hesla.
          </p>
        </div>

        {state === "sent" ? (
          <p className="rounded-2xl px-4 py-3 text-sm leading-6" style={{ background: "var(--color-surface)", color: "var(--color-foreground)" }}>
            Ak je <strong>{email}</strong> zaregistrovaný, prišiel naň e-mail s odkazom. Platí 1 hodinu —
            pozrite aj priečinok nevyžiadanej pošty.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="vas@email.sk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-[#FFAE00]"
              style={{
                background: "var(--color-background)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground)",
              }}
            />
            {state === "disabled" && (
              <p className="text-[13px] text-red-500">
                Obnovenie hesla e-mailom zatiaľ nie je zapnuté. Napíšte nám prosím na{" "}
                <a href="mailto:info@4frommedia.sk" className="underline">info@4frommedia.sk</a>.
              </p>
            )}
            {state === "error" && <p className="text-[13px] text-red-500">Nepodarilo sa odoslať. Skúste to prosím znova.</p>}
            <button
              type="submit"
              disabled={state === "sending"}
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              {state === "sending" ? "Odosielam…" : "Poslať odkaz"}
            </button>
          </form>
        )}

        <div className="mt-5 text-sm" style={{ color: "var(--color-muted)" }}>
          <Link href="/prihlasenie" className="font-semibold underline underline-offset-4" style={{ color: "var(--color-foreground)" }}>
            Späť na prihlásenie
          </Link>
        </div>
      </div>
    </main>
  );
}
