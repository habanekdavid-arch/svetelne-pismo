"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Deliberately not Clerk — a plain e-mail + password form against
// AdminUser (Prisma), same shape as the vytlacto3d admin. See
// lib/admin-auth.ts and app/api/admin/login/route.ts.
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError("Nesprávny e-mail alebo heslo.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Prihlásenie zlyhalo. Skúste to prosím znova.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="flex min-h-[70vh] items-center justify-center px-5 py-16"
      style={{ background: "var(--color-background)" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <p
          className="mb-2 text-[10px] font-black uppercase tracking-[0.35em]"
          style={{ color: "var(--color-muted)" }}
        >
          Administratíva
        </p>
        <h1 className="main-heading mb-6 text-2xl" style={{ color: "var(--color-foreground)" }}>
          Prihlásenie
        </h1>

        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide" style={{ color: "var(--color-foreground)" }}>
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
          />
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide" style={{ color: "var(--color-foreground)" }}>
            Heslo
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
          />
        </div>

        {error && <p className="mb-4 text-[12px] text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full py-3.5 text-xs font-black uppercase transition hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {submitting ? "Prihlasujem…" : "Prihlásiť sa"}
        </button>
      </form>
    </main>
  );
}
