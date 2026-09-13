"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Own registration — Prisma User + bcrypt, no Clerk anywhere on the site.
export default function RegisterPage() {
  const router = useRouter();
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.error === "email_taken") setError("Tento e-mail už má vytvorený účet.");
        else if (body?.error === "weak_password") setError("Heslo musí mať aspoň 8 znakov.");
        else setError("Registrácia zlyhala. Skontrolujte údaje a skúste znova.");
        return;
      }
      router.replace("/moje-objednavky");
      router.refresh();
    } catch {
      setError("Registrácia zlyhala. Skúste to prosím znova.");
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
        <p className="mb-2 text-[10px] font-black tracking-[0.35em]" style={{ color: "var(--color-muted)" }}>
          Účet
        </p>
        <h1 className="main-heading mb-6 text-2xl" style={{ color: "var(--color-foreground)" }}>
          Vytvoriť účet
        </h1>

        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-black tracking-wide" style={{ color: "var(--color-foreground)" }}>
            Meno
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-black tracking-wide" style={{ color: "var(--color-foreground)" }}>
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
          <label className="mb-1.5 block text-[11px] font-black tracking-wide" style={{ color: "var(--color-foreground)" }}>
            Heslo
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
          />
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-muted)" }}>
            Aspoň 8 znakov.
          </p>
        </div>

        {error && <p className="mb-4 text-[12px] text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full py-3.5 text-xs font-black transition hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {submitting ? "Vytváram účet…" : "Vytvoriť účet"}
        </button>

        <p className="mt-5 text-center text-[12px]" style={{ color: "var(--color-muted)" }}>
          Už máte účet?{" "}
          <Link href="/prihlasenie" className="underline" style={{ color: "var(--color-foreground)" }}>
            Prihlásiť sa
          </Link>
        </p>
      </form>
    </main>
  );
}
