"use client";

import { useEffect, useRef, useState } from "react";
import { oneLine } from "@/lib/sign-text";
import { X, Check, Lock } from "lucide-react";
import type { Config } from "@/lib/types";
import { useCart, describeConfig, type CartItem } from "@/lib/cart-context";
import {
  fontOptions,
  MATERIALS,
  LIGHT_MODES,
  depthMmFor,
  lightColorOption,
  resolveLightColor,
} from "@/lib/options";
import { generateClientOrderId, trackPurchase } from "@/lib/analytics";
import { notifySessionChange } from "@/lib/session-client";
import DeliveryStep, {
  emptyAddress,
  type DeliveryChoice,
  type QuotedDeliveryMethod,
} from "@/components/checkout/DeliveryStep";
import { formatEur } from "@/lib/vat";

type SessionUser = { name: string; email: string };

/** What app/api/quote returns: server-decided prices and delivery options. */
type Quote = {
  items: { label: string; price: number; priceCents: number; widthMm: number; heightMm: number }[];
  itemsCents: number;
  parcel: { weightKg: number; longestCm: number };
  deliveryMethods: QuotedDeliveryMethod[];
  canPayOnline: boolean;
};

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
  const [deliveryErrors, setDeliveryErrors] = useState<{
    point?: string; address?: string; phone?: string;
  }>({});
  const trackedRef = useRef(false);

  // The basket, priced by the server. The cart's own figures are a preview
  // measured in this browser; these are the ones the card is charged, so from
  // here on the modal shows nothing else (app/api/quote).
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [phone, setPhone] = useState("");
  const [delivery, setDelivery] = useState<DeliveryChoice>({
    method: "personal", point: null, address: null,
  });

  useEffect(() => {
    let cancelled = false;
    if (configs.length === 0) return;
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: configs }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: Quote) => {
        if (cancelled) return;
        setQuote(data);
        // Start on the first method offered — the cheapest parcel option when
        // the sign fits one, collection in person when it does not.
        const first = data.deliveryMethods[0];
        if (first) {
          setDelivery({
            method: first.id,
            point: null,
            address: first.needsAddress ? emptyAddress() : null,
          });
        }
      })
      .catch(() => { if (!cancelled) setQuoteFailed(true); });
    return () => { cancelled = true; };
    // configs is rebuilt on every render from cartItems, so the cart lines are
    // what this actually depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems]);

  // The server's figures once they arrive; the cart's own total meanwhile, so
  // the modal is never blank. Only the server's is ever charged.
  const selectedMethod = quote?.deliveryMethods.find((m) => m.id === delivery.method) ?? null;
  const deliveryPrice = selectedMethod?.price ?? 0;
  const itemsPrice = quote ? quote.itemsCents / 100 : cartItems.reduce((sum, i) => sum + i.price, 0);
  const price = itemsPrice + deliveryPrice;

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

  /** The delivery step is only complete when the chosen method has what it needs. */
  function validateDelivery(): boolean {
    const method = selectedMethod;
    const e: { point?: string; address?: string; phone?: string } = {};
    if (method?.needsPoint && !delivery.point) e.point = "Vyberte prosím výdajné miesto";
    if (method?.needsAddress) {
      const a = delivery.address;
      if (!a?.street.trim() || !a?.houseNumber.trim() || !a?.city.trim() || !a?.zip.trim()) {
        e.address = "Vyplňte prosím celú adresu";
      }
    }
    if (method?.id.startsWith("packeta") && !phone.trim()) {
      e.phone = "Packeta potrebuje telefónne číslo";
    }
    setDeliveryErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !validateDelivery() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: configs, name, email, phone, delivery }),
      });
      if (!res.ok) throw new Error(`request failed: ${res.status}`);
      const placed = await res.json();

      // Card payment on: hand the customer straight to Stripe. The order is
      // already saved, so a cancelled payment loses nothing — they can come
      // back to it from "Moje objednávky".
      if (placed?.payOnline && placed?.groupId) {
        const pay = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: placed.groupId }),
        });
        const data = await pay.json().catch(() => null);
        if (pay.ok && data?.url) {
          clearCart();
          window.location.href = data.url;
          return;
        }
        // Stripe would not open. The order stands; say so rather than pretend.
        setSubmitError(
          "Objednávku sme uložili, ale platbu sa nepodarilo otvoriť. Nájdete ju v sekcii Moje objednávky.",
        );
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      clearCart();
      if (!trackedRef.current) {
        trackedRef.current = true;
        trackPurchase({
          transactionId: generateClientOrderId(),
          value: price,
          currency: "EUR",
          items: configs.map((c, idx) => {
            const mat = MATERIALS.find((m) => m.id === c.material);
            const f   = fontOptions.find((x) => x.id === c.font);
            return {
              item_name: `Svetelný nápis — ${mat?.displayName ?? c.material} (${f?.name ?? c.font})`,
              item_id: `${c.material}-${c.font}-${c.signType}`,
              price: cartItems[idx]?.price ?? 0,
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
                  {configs.map((c, idx) => {
                    const mat = MATERIALS.find((m) => m.id === c.material);
                    const f   = fontOptions.find((x) => x.id === c.font);
                    return (
                      <li
                        key={idx}
                        className="flex items-start justify-between gap-3 rounded-lg px-3 py-2"
                        style={{ background: "var(--color-background)" }}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
                            {oneLine(c.text) || "Váš text"}
                          </p>
                          <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                            {[f?.name, mat?.displayName].filter(Boolean).join(" · ")} · {describeConfig(c)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black" style={{ color: "var(--color-foreground)" }}>
                          {formatEur(quote?.items[idx]?.price ?? cartItems[idx]?.price ?? 0)}
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
                <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>{first ? depthMmFor(first.material, first.height) : "—"} mm</dd>

                <dt className="font-black tracking-wide" style={{ color: "var(--color-muted)" }}>Farba svetla</dt>
                <dd className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ background: first ? resolveLightColor(first) : undefined, border: "1px solid var(--color-border)" }}
                  />
                  <span className="font-semibold" style={{ color: "var(--color-foreground)" }}>
                    {(first && lightColorOption(first.lightColor)?.label) ?? "—"}
                  </span>
                </dd>
              </dl>
              )}

              <div
                className="mt-4 space-y-1.5 border-t pt-4"
                style={{ borderColor: "var(--color-border)" }}
              >
                {selectedMethod && (
                  <>
                    <div className="flex items-baseline justify-between text-[12px]">
                      <span style={{ color: "var(--color-muted)" }}>Nápisy</span>
                      <span style={{ color: "var(--color-foreground)" }}>{formatEur(itemsPrice)}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-[12px]">
                      <span style={{ color: "var(--color-muted)" }}>{selectedMethod.name}</span>
                      <span style={{ color: "var(--color-foreground)" }}>{selectedMethod.priceLabel}</span>
                    </div>
                  </>
                )}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs font-black tracking-wide" style={{ color: "var(--color-muted)" }}>
                    {selectedMethod?.price === null ? "Za nápisy, s DPH" : "Spolu s DPH"}
                  </span>
                  <span className="text-2xl font-black" style={{ color: "var(--color-foreground)" }}>
                    {formatEur(price)}
                  </span>
                </div>
                {selectedMethod?.price === null && (
                  <p className="text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
                    Cenu dopravy dohodneme a potvrdíme pred výrobou — teraz ju neúčtujeme.
                  </p>
                )}
                {quoteFailed && (
                  <p className="text-[11px] leading-5 text-red-400">
                    Cenu sa nepodarilo prepočítať na serveri. Zobrazená suma je orientačná.
                  </p>
                )}
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

                {quote ? (
                  <DeliveryStep
                    methods={quote.deliveryMethods}
                    value={delivery}
                    onChange={setDelivery}
                    phone={phone}
                    onPhoneChange={setPhone}
                    weightKg={quote.parcel.weightKg}
                    errors={deliveryErrors}
                  />
                ) : (
                  !quoteFailed && (
                    <div
                      className="mb-6 h-28 animate-pulse rounded-xl"
                      style={{ background: "var(--color-surface)" }}
                      aria-hidden="true"
                    />
                  )
                )}

                {submitError && (
                  <p className="mb-3 text-[12px] text-red-400">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || (!quote && !quoteFailed)}
                  className="w-full rounded-full py-3.5 text-xs font-black transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "var(--accent)", color: "#000" }}
                >
                  {submitting
                    ? "Odosielam…"
                    : quote?.canPayOnline && selectedMethod?.price !== null
                      ? `Zaplatiť ${formatEur(price)}`
                      : "Odoslať objednávku"}
                </button>

                {quote?.canPayOnline && selectedMethod?.price !== null && (
                  <p className="mt-2 text-center text-[11px]" style={{ color: "var(--color-muted)" }}>
                    Platbu vybavíte bezpečne cez Stripe. Objednávku uložíme ešte pred platbou.
                  </p>
                )}
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
