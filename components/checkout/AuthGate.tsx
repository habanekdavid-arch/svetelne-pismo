"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

export type SessionUser = { name: string; email: string };

// ── Inline sign-in / sign-up gate ────────────────────────────────────────────
// Posts straight to our own Prisma-backed auth API (lib/user-auth.ts) — no
// navigation away from the cart, no Clerk modal.

export default function AuthGate({ onAuthenticated }: { onAuthenticated: (user: SessionUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email, password } : { name, email, password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        if (body?.error === "email_taken") setError("Tento e-mail už má vytvorený účet.");
        else if (body?.error === "weak_password") setError("Heslo musí mať aspoň 8 znakov.");
        else if (mode === "login") setError("Nesprávny e-mail alebo heslo.");
        else setError("Skontrolujte údaje a skúste znova.");
        return;
      }
      onAuthenticated(body.user as SessionUser);
    } catch {
      setError("Niečo sa pokazilo. Skúste to prosím znova.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl p-6" style={{ background: "var(--color-surface)" }}>
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "var(--color-surface-raised)", color: "var(--color-muted)" }}
        >
          <Lock size={16} />
        </span>
        <p className="text-sm leading-6" style={{ color: "var(--color-muted)" }}>
          Pre objednanie sa prosím prihláste alebo si vytvorte účet —
          objednávku tak uvidíte aj neskôr v „Moje objednávky“.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="mb-4 flex gap-1 rounded-full p-1" style={{ background: "var(--color-surface-raised)" }}>
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            className="flex-1 rounded-full py-2 text-[11px] font-black tracking-wide transition"
            style={
              mode === m
                ? { background: "var(--color-foreground)", color: "var(--color-background)" }
                : { color: "var(--color-muted)" }
            }
          >
            {m === "login" ? "Prihlásiť sa" : "Vytvoriť účet"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        {mode === "register" && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Meno"
            autoComplete="name"
            required
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jan@email.sk"
          autoComplete="username"
          required
          className="w-full rounded-lg px-4 py-3 text-sm outline-none"
          style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Heslo"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "register" ? 8 : undefined}
          required
          className="w-full rounded-lg px-4 py-3 text-sm outline-none"
          style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
        />

        {error && <p className="text-[12px] text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full py-3.5 text-xs font-black transition hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {submitting
            ? "Chvíľu…"
            : mode === "login" ? "Prihlásiť sa" : "Vytvoriť účet"}
        </button>
      </form>
    </div>
  );
}
