"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Where the reset e-mail's link lands: the token is in the query string, the
// customer picks a new password (app/api/auth/reset).
export default function ResetPasswordPage() {
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
            Nové heslo
          </h1>
        </div>
        <Suspense fallback={null}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "invalid" | "weak" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setState("weak");
    setState("saving");
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) return setState("done");
      setState(body?.error === "invalid_token" ? "invalid" : body?.error === "weak_password" ? "weak" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm leading-6" style={{ color: "var(--color-foreground)" }}>
        Heslo je zmenené.{" "}
        <Link href="/prihlasenie" className="font-semibold underline underline-offset-4">Prihláste sa</Link> s novým heslom.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Nové heslo (aspoň 8 znakov)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-[#FFAE00]"
        style={{
          background: "var(--color-background)",
          border: "1px solid var(--color-border)",
          color: "var(--color-foreground)",
        }}
      />
      {state === "weak" && <p className="text-[13px] text-red-500">Heslo musí mať aspoň 8 znakov.</p>}
      {state === "invalid" && (
        <p className="text-[13px] text-red-500">
          Odkaz už neplatí (vypršal alebo bol použitý).{" "}
          <Link href="/zabudnute-heslo" className="underline">Vyžiadajte si nový.</Link>
        </p>
      )}
      {state === "error" && <p className="text-[13px] text-red-500">Nepodarilo sa uložiť. Skúste to prosím znova.</p>}
      <button
        type="submit"
        disabled={state === "saving" || !token}
        className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
      >
        {state === "saving" ? "Ukladám…" : "Uložiť nové heslo"}
      </button>
      {!token && <p className="text-[13px] text-red-500">Chýba odkaz z e-mailu.</p>}
    </form>
  );
}
