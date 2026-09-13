"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notifySessionChange } from "@/lib/session-client";

// Own login — Prisma User + bcrypt, no Clerk anywhere on the site. Same
// shape as app/admin/prihlasenie, a separate table/cookie.
//
// Laid out like vytlacto3d's sign-in: one card on a tinted page, an eyebrow
// above the heading, a line explaining what is behind the login, and a show/
// hide toggle on the password so a typo is findable without retyping.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError("Nesprávny e-mail alebo heslo.");
        return;
      }
      notifySessionChange(); // so the header's account pill updates too
      router.replace("/moje-objednavky");
      router.refresh();
    } catch {
      setError("Prihlásenie zlyhalo. Skúste to prosím znova.");
    } finally {
      setSubmitting(false);
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
          <h1
            className="mt-2 text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            Prihlásenie
          </h1>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
            Prihláste sa a zobrazte si svoje objednávky, ich stav a históriu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-sm font-medium"
              style={{ color: "var(--color-foreground-soft)" }}
            >
              Email
            </label>
            <input
              id="login-email"
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
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-sm font-medium"
              style={{ color: "var(--color-foreground-soft)" }}
            >
              Heslo
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Vaše heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 pr-20 text-sm outline-none transition focus:border-[#FFAE00]"
                style={{
                  background: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium transition hover:opacity-70"
                style={{ color: "var(--color-muted)" }}
              >
                {showPassword ? "Skryť" : "Zobraziť"}
              </button>
            </div>
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {submitting ? "Prihlasujem…" : "Prihlásiť sa"}
          </button>
        </form>

        <div className="mt-5 text-sm" style={{ color: "var(--color-muted)" }}>
          Nemáte účet?{" "}
          <Link
            href="/registracia"
            className="font-semibold underline underline-offset-4"
            style={{ color: "var(--color-foreground)" }}
          >
            Vytvoriť účet
          </Link>
        </div>
      </div>
    </main>
  );
}
