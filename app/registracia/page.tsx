"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notifySessionChange } from "@/lib/session-client";

// Registration is deliberately short: an e-mail and a password, then the
// 6-digit code from the e-mail (the pop-up in components/auth/VerifyEmailNotice).
// That is all it takes to see prices. Name, phone, addresses and company
// details — "detaily účtu" — are filled in later, in the cart or on the
// account page (lib/account-details.ts).
export default function RegisterPage() {
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.error === "email_taken") setError("Tento e-mail už má vytvorený účet.");
        else if (body?.error === "weak_password") setError("Heslo musí mať aspoň 8 znakov.");
        else if (body?.error === "invalid_email") setError("Zadajte platnú e-mailovú adresu.");
        else if (body?.error === "missing_fields") setError("Vyplňte e-mail a heslo.");
        else setError("Registrácia zlyhala. Skontrolujte údaje a skúste znova.");
        return;
      }
      notifySessionChange(); // the header pill and the verification pop-up
      // Back where the customer came from (e.g. the configurator, to see its
      // price) — only a path on this site, never an outside address.
      const back = new URLSearchParams(window.location.search).get("spat");
      router.replace(back && back.startsWith("/") && !back.startsWith("//") ? back : "/#konfigurator");
      router.refresh();
    } catch {
      setError("Registrácia zlyhala. Skúste to prosím znova.");
    } finally {
      setSubmitting(false);
    }
  }

  const input = "w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-[#FFAE00]";
  const inputStyle = {
    background: "var(--color-background)",
    border: "1px solid var(--color-border)",
    color: "var(--color-foreground)",
  };

  return (
    <main className="px-6 py-16" style={{ background: "var(--color-surface)" }}>
      <div
        className="mx-auto max-w-md rounded-3xl p-8 shadow-sm"
        style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
      >
        <div className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
          Registrácia
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          Vytvoriť účet
        </h1>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
          Stačí e-mail a heslo. Na e-mail vám pošleme 6-miestny kód — po jeho zadaní
          uvidíte ceny nápisov. Ostatné údaje doplníte až pri objednávke.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
          <label className="block">
            <div className="mb-2 text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>E-mail</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="jan@email.sk"
              className={input}
              style={inputStyle}
            />
          </label>
          <label className="block">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>
              Heslo
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-xs font-semibold underline"
                style={{ color: "var(--color-muted)" }}
              >
                {showPassword ? "Skryť" : "Zobraziť"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className={input}
              style={inputStyle}
            />
            <div className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>Aspoň 8 znakov.</div>
          </label>

          {error && <p className="text-[13px] text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl px-5 py-3 text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {submitting ? "Registrujem…" : "Registrovať sa"}
          </button>

          <p className="text-center text-sm" style={{ color: "var(--color-muted)" }}>
            Už máte účet?{" "}
            <Link href="/prihlasenie" className="font-semibold underline" style={{ color: "var(--color-foreground)" }}>
              Prihláste sa
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
