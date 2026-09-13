"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, Lock } from "lucide-react";
import type { Config } from "@/lib/types";
import { useCart, describeConfig, type CartItem } from "@/lib/cart-context";
import { calculatePrice } from "@/lib/pricing";
import { fontOptions, MATERIALS, LIGHT_MODES } from "@/lib/options";
import { generateClientOrderId, trackPurchase } from "@/lib/analytics";
import { notifySessionChange } from "@/lib/session-client";

type SessionUser = { name: string; email: string };

// The last step of checkout, opened from the cart drawer. Every order goes
// through the cart now — the configurator's "Objednať" puts the sign there
// first — so this always works from a list of cart items.
type Props = {
  cartItems: CartItem[];
  onClose: () => void;
};

export default function OrderModal({ cartItems, onClose }: Props) {
  const { clear: clearCart } = useCart();

  const configs: Config[] = cartItems.map((i) => i.config);
  // undefined = still checking /api/auth/me, null = confirmed signed out,
  // SessionUser = signed in. Fetched here (not passed as a prop from a
  // server-rendered ancestor) so the pages that render this stay static —
  // see app/api/auth/me/route.ts.
  const [authedUser, setAuthedUser] = useState<SessionUser | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setAuthedUser(data.user);
        if (data.user) {
          setName((prev) => prev || data.user.name);
          setEmail((prev) => prev || data.user.email);
        }
      })
      .catch(() => { if (!cancelled) setAuthedUser(null); });
    return () => { cancelled = true; };
  }, []);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const trackedRef = useRef(false);

  const price = configs.reduce((sum, c) => sum + calculatePrice(c), 0);

  // Detail fields for the single-sign summary. With a cart the modal shows a
  // per-item list instead, so these are only read when configs.length === 1.
  const first    = configs[0];
  const font     = first ? fontOptions.find((f) => f.id === first.font) : undefined;
  const material = first ? MATERIALS.find((m) => m.id === first.material) : undefined;
  const lighting = first && first.signType === "illuminated"
    ? LIGHT_MODES.find((l) => l.id === first.lightMode)
    : null;

  function handleAuthenticated(u: SessionUser) {
    setAuthedUser(u);
    setName((prev) => prev || u.name);
    setEmail((prev) => prev || u.email);
    notifySessionChange(); // syncs Header's account UI too
  }

  function validate() {
    const e: { name?: string; email?: string } = {};
    if (!name.trim()) e.name = "Zadajte vaše meno";
    if (!email.trim()) {
      e.email = "Zadajte e-mailovú adresu";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = "Neplatná e-mailová adresa";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: configs, name, email }),
      });
      if (!res.ok) throw new Error(`request failed: ${res.status}`);

      setSubmitted(true);
      clearCart();
      if (!trackedRef.current) {
        trackedRef.current = true;
        trackPurchase({
          transactionId: generateClientOrderId(),
          value: price,
          currency: "EUR",
          items: configs.map((c) => {
            const mat = MATERIALS.find((m) => m.id === c.material);
            const f   = fontOptions.find((x) => x.id === c.font);
            return {
              item_name: `Svetelný nápis — ${mat?.displayName ?? c.material} (${f?.name ?? c.font})`,
              item_id: `${c.material}-${c.font}-${c.signType}`,
              price: calculatePrice(c),
              quantity: 1,
            };
          }),
        });
      }
    } catch {
      setSubmitError("Objednávku sa nepodarilo odoslať. Skúste to prosím znova.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl p-8 shadow-2xl"
        style={{
          background: "var(--color-background)",
          border: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition"
          style={{ color: "var(--color-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-raised)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          aria-label="Zatvoriť"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="py-6 text-center">
            <div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "var(--accent)" }}
            >
              <Check size={28} strokeWidth={2.5} style={{ color: "#000" }} />
            </div>
            <h2 className="main-heading text-2xl" style={{ color: "var(--color-foreground)" }}>
              Objednávka odoslaná
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
              Ďakujeme, {name}! Ozveme sa vám čoskoro na{" "}
              <strong style={{ color: "var(--color-foreground)" }}>{email}</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-7 rounded-full px-10 py-3 text-xs font-black transition hover:opacity-80"
              style={{ background: "var(--color-foreground)", color: "var(--color-background)" }}
            >
              Zatvoriť
            </button>
          </div>
        ) : (
          <>
            <h2
              className="main-heading mb-6 text-2xl"
              style={{ color: "var(--color-foreground)" }}
            >
              Zhrnutie objednávky
            </h2>

            {/* Summary — a per-sign list for a cart, the full spec table for
                a single sign ordered straight from the configurator. */}
            <div
              className="mb-6 rounded-xl p-4"
              style={{ background: "var(--color-surface)" }}
            >
              {configs.length > 1 ? (
                <ul className="space-y-2">
                  {configs.map((c, i) => {
                    const mat = MATERIALS.find((m) => m.id === c.material);
                    const f   = fontOptions.find((x) => x.id === c.font);
                    return (
                      <li
                        key={i}
                        className="flex items-start justify-between gap-3 rounded-lg px-3 py-2"
                        style={{ background: "var(--color-background)" }}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
                            {c.text || "Váš text"}
                          </p>
                          <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                            {[f?.name, mat?.displayName].filter(Boolean).join(" · ")} · {describeConfig(c)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black" style={{ color: "var(--color-foreground)" }}>
                          {calculatePrice(c)} €
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <dt className="font-black tracking-wide" style={{ color: "var(--color-muted)" }}>Text</dt>
                <dd className="truncate font-semibold" style={{ color: "var(--color-foreground)" }}>{first?.text || "Váš text"}</dd>

                <dt className="font-black tracking-wide" style={{ color: "var(--color-muted)" }}>Písmo</dt>
                <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>{font?.name ?? "—"}</dd>

                <dt className="font-black tracking-wide" style={{ color: "var(--color-muted)" }}>Materiál</dt>
                <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>{material?.displayName ?? "—"}</dd>

                <dt className="font-black tracking-wide" style={{ color: "var(--color-muted)" }}>Svietenie</dt>
                <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>
                  {first?.signType === "plain" ? "Nesvetelné" : (lighting?.name ?? "—")}
                </dd>

                <dt className="font-black tracking-wide" style={{ color: "var(--color-muted)" }}>Hrúbka</dt>
                <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>{first?.thickness} mm</dd>

                <dt className="font-black tracking-wide" style={{ color: "var(--color-muted)" }}>Farba svetla</dt>
                <dd className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ background: first?.lightColor, border: "1px solid var(--color-border)" }}
                  />
                  <span className="font-semibold" style={{ color: "var(--color-foreground)" }}>vlastná</span>
                </dd>
              </dl>
              )}

              <div
                className="mt-4 flex items-baseline justify-between border-t pt-4"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span className="text-xs font-black tracking-wide" style={{ color: "var(--color-muted)" }}>
                  Orientačná cena
                </span>
                <span className="text-2xl font-black" style={{ color: "var(--color-foreground)" }}>
                  {price} €
                </span>
              </div>
            </div>

            {/* Objednávka sa viaže na účet zákazníka (aby ju videl v Moje
                objednávky) — bez prihlásenia ponúkneme prihlásenie/registráciu
                priamo tu, nech neopúšťa rozostavaný nápis. */}
            {authedUser === undefined ? (
              <div className="h-40 animate-pulse rounded-xl" style={{ background: "var(--color-surface)" }} aria-hidden="true" />
            ) : !authedUser ? (
              <AuthGate onAuthenticated={handleAuthenticated} />
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <label
                    className="mb-1.5 block text-[11px] font-black tracking-wide"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    Meno a priezvisko
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ján Novák"
                    autoComplete="name"
                    className="w-full rounded-lg px-4 py-3 text-sm outline-none transition"
                    style={{
                      background: errors.name ? "rgba(239,68,68,0.08)" : "var(--color-surface)",
                      border: `1px solid ${errors.name ? "#f87171" : "var(--color-border)"}`,
                      color: "var(--color-foreground)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-foreground)")}
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = errors.name ? "#f87171" : "var(--color-border)")
                    }
                  />
                  {errors.name && (
                    <p className="mt-1 text-[11px] text-red-400">{errors.name}</p>
                  )}
                </div>

                <div className="mb-6">
                  <label
                    className="mb-1.5 block text-[11px] font-black tracking-wide"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jan@email.sk"
                    autoComplete="email"
                    className="w-full rounded-lg px-4 py-3 text-sm outline-none transition"
                    style={{
                      background: errors.email ? "rgba(239,68,68,0.08)" : "var(--color-surface)",
                      border: `1px solid ${errors.email ? "#f87171" : "var(--color-border)"}`,
                      color: "var(--color-foreground)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-foreground)")}
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = errors.email ? "#f87171" : "var(--color-border)")
                    }
                  />
                  {errors.email && (
                    <p className="mt-1 text-[11px] text-red-400">{errors.email}</p>
                  )}
                </div>

                {submitError && (
                  <p className="mb-3 text-[12px] text-red-400">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full py-3.5 text-xs font-black transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "var(--accent)", color: "#000" }}
                >
                  {submitting ? "Odosielam…" : "Odoslať objednávku"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Inline sign-in / sign-up gate ────────────────────────────────────────────
// Posts straight to our own Prisma-backed auth API (lib/user-auth.ts) — no
// navigation away from the configurator, no Clerk modal.

function AuthGate({ onAuthenticated }: { onAuthenticated: (user: SessionUser) => void }) {
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
          Pre odoslanie objednávky sa prosím prihláste alebo si vytvorte
          účet — objednávku tak uvidíte aj neskôr v „Moje objednávky“.
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
