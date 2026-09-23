"use client";

import { useEffect, useRef, useState } from "react";
import { oneLine } from "@/lib/sign-text";
import { X, Check, Lock, Package, Wrench, CreditCard, Landmark } from "lucide-react";
import type { Config } from "@/lib/types";
import type { DeliveryAddress } from "@/lib/orders";
import { useCart, describeConfig, type CartItem } from "@/lib/cart-context";
import {
  fontOptions,
  MATERIALS,
  LIGHT_MODES,
  depthMmFor,
  lightColorOption,
  hasSeparateFace,
  faceColorOf,
  colorLabel,
} from "@/lib/options";
import {
  PAYMENT_METHOD_LABEL,
  type OrderKind,
  type PaymentMethodId,
} from "@/lib/payment-methods";
import { generateClientOrderId, trackPurchase } from "@/lib/analytics";
import { notifySessionChange } from "@/lib/session-client";
import DeliveryStep, {
  AddressFields,
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
  /** Empty when the shop takes no payment yet — the order is then an enquiry. */
  paymentMethods: PaymentMethodId[];
};

type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  point?: string;
  address?: string;
  site?: string;
  payment?: string;
};

// The last step of checkout, opened from the cart drawer once the terms are
// agreed to there. Two ways on from here:
//   · a standard order, as on vytlacto3d — delivery by Packeta (3,99 €) or
//     courier (5,99 €), paid by card or by bank transfer;
//   · an installation consultation — the customer wants the sign mounted, so
//     they leave their name, the address it goes up at, e-mail and phone, and
//     the shop calls them. Nothing is paid or shipped until then.
type Props = {
  cartItems: CartItem[];
  /** Agreed to in the cart drawer, which is the only way this modal opens. */
  termsAccepted: boolean;
  onClose: () => void;
};

export default function OrderModal({ cartItems, termsAccepted, onClose }: Props) {
  const { clear: clearCart } = useCart();

  const configs: Config[] = cartItems.map((i) => i.config);
  // undefined = still checking /api/auth/me, null = confirmed signed out,
  // SessionUser = signed in. Fetched here (not passed as a prop from a
  // server-rendered ancestor) so the pages that render this stay static —
  // see app/api/auth/me/route.ts.
  const [authedUser, setAuthedUser] = useState<SessionUser | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

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

  const [kind, setKind] = useState<OrderKind>("standard");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const trackedRef = useRef(false);

  // The basket, priced by the server. The cart's own figures are a preview
  // measured in this browser; these are the ones the card is charged, so from
  // here on the modal shows nothing else (app/api/quote).
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryChoice>({
    method: "", point: null, address: null,
  });
  const [payment, setPayment] = useState<PaymentMethodId | null>(null);
  // Where the sign is to be mounted — the one thing a consultation cannot do without.
  const [site, setSite] = useState<DeliveryAddress>(emptyAddress());

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
        // Start on the first method offered — the cheaper parcel option when
        // the sign fits one.
        const first = data.deliveryMethods[0];
        if (first) {
          setDelivery({
            method: first.id,
            point: null,
            address: first.needsAddress ? emptyAddress() : null,
          });
        }
        setPayment(data.paymentMethods?.[0] ?? null);
      })
      .catch(() => { if (!cancelled) setQuoteFailed(true); });
    return () => { cancelled = true; };
    // configs is rebuilt on every render from cartItems, so the cart lines are
    // what this actually depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems]);

  const installation = kind === "installation";
  const paymentMethods = quote?.paymentMethods ?? [];

  // The server's figures once they arrive; the cart's own total meanwhile, so
  // the modal is never blank. Only the server's is ever charged. A
  // consultation has no delivery — the sign comes with the fitter.
  const selectedMethod = quote?.deliveryMethods.find((m) => m.id === delivery.method) ?? null;
  const deliveryPrice = installation ? 0 : (selectedMethod?.price ?? 0);
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

  /** Everything the chosen kind of order needs, checked before it is sent. */
  function validate(): boolean {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = "Zadajte vaše meno";
    if (!email.trim()) {
      e.email = "Zadajte e-mailovú adresu";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = "Neplatná e-mailová adresa";
    }
    if (!phone.trim()) e.phone = "Zadajte telefónne číslo";

    if (installation) {
      if (!isComplete(site)) e.site = "Vyplňte prosím celú adresu inštalácie";
    } else {
      const method = selectedMethod;
      if (method?.needsPoint && !delivery.point) e.point = "Vyberte prosím výdajné miesto";
      if (method?.needsAddress && !(delivery.address && isComplete(delivery.address))) {
        e.address = "Vyplňte prosím celú adresu";
      }
      if (paymentMethods.length > 0 && !payment) e.payment = "Vyberte spôsob platby";
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
        body: JSON.stringify(
          installation
            ? { kind: "installation", items: configs, name, email, phone, installation: { address: site } }
            : { kind: "standard", items: configs, name, email, phone, delivery, payment, terms: termsAccepted },
        ),
      });
      if (!res.ok) throw new Error(`request failed: ${res.status}`);
      const placed = await res.json();

      // Card: hand the customer straight to Stripe. The order is already
      // saved, so a cancelled payment loses nothing — they can come back to
      // it from "Moje objednávky".
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

      // Transfer: the order page shows the IBAN, the variable symbol and the
      // amount — and keeps showing them for as long as the order is unpaid.
      if (placed?.payment === "transfer" && placed?.groupId) {
        clearCart();
        window.location.href = `/objednavka/${placed.groupId}?stav=prevod`;
        return;
      }

      setSubmitted(true);
      clearCart();
      if (!installation && !trackedRef.current) {
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
      setSubmitError(
        installation
          ? "Žiadosť sa nepodarilo odoslať. Skúste to prosím znova."
          : "Objednávku sa nepodarilo odoslať. Skúste to prosím znova.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = submitting
    ? "Odosielam…"
    : installation
      ? "Požiadať o konzultáciu"
      : selectedMethod?.price === null || paymentMethods.length === 0
        ? "Odoslať objednávku"
        : payment === "card"
          ? `Objednať a zaplatiť kartou · ${formatEur(price)}`
          : "Objednať — zaplatiť prevodom";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl sm:p-8"
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
              {installation ? "Žiadosť o konzultáciu odoslaná" : "Objednávka odoslaná"}
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
              {installation ? (
                <>
                  Ďakujeme, {name}! Ozveme sa vám na{" "}
                  <strong style={{ color: "var(--color-foreground)" }}>{phone}</strong> a dohodneme montáž na
                  adrese{" "}
                  <strong style={{ color: "var(--color-foreground)" }}>
                    {site.street} {site.houseNumber}, {site.city}
                  </strong>.
                </>
              ) : (
                <>
                  Ďakujeme, {name}! Ozveme sa vám čoskoro na{" "}
                  <strong style={{ color: "var(--color-foreground)" }}>{email}</strong>.
                </>
              )}
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
              className="main-heading mb-5 text-2xl"
              style={{ color: "var(--color-foreground)" }}
            >
              Dokončenie objednávky
            </h2>

            {/* Which way on: order it, or talk about mounting it first. */}
            <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Spôsob objednania">
              <KindCard
                active={!installation}
                onClick={() => { setKind("standard"); setErrors({}); }}
                icon={<Package size={16} />}
                title="Objednať s doručením"
                text="Vyrobíme a pošleme — Packeta alebo kuriér."
              />
              <KindCard
                active={installation}
                onClick={() => { setKind("installation"); setErrors({}); }}
                icon={<Wrench size={16} />}
                title="Konzultácia k montáži"
                text="Zavoláme vám a dohodneme montáž na mieste."
              />
            </div>

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

                {first && hasSeparateFace(first.material) ? (
                  <>
                    <dt className="font-black tracking-wide" style={{ color: "var(--color-muted)" }}>Čelo</dt>
                    <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>{colorLabel(faceColorOf(first))}</dd>
                    <dt className="font-black tracking-wide" style={{ color: "var(--color-muted)" }}>Hrana</dt>
                    <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>{colorLabel(first.bodyColor)}</dd>
                  </>
                ) : first ? (
                  <>
                    <dt className="font-black tracking-wide" style={{ color: "var(--color-muted)" }}>Farba</dt>
                    <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>{colorLabel(first.bodyColor)}</dd>
                  </>
                ) : null}

                {first?.signType === "illuminated" && (
                  <>
                    <dt className="font-black tracking-wide" style={{ color: "var(--color-muted)" }}>Farba svetla</dt>
                    <dd className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded-full"
                        style={{ background: first.lightColor, border: "1px solid var(--color-border)" }}
                      />
                      <span className="font-semibold" style={{ color: "var(--color-foreground)" }}>
                        {lightColorOption(first.lightColor)?.label ?? "—"}
                      </span>
                    </dd>
                  </>
                )}
              </dl>
              )}

              <div
                className="mt-4 space-y-1.5 border-t pt-4"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex items-baseline justify-between text-[12px]">
                  <span style={{ color: "var(--color-muted)" }}>
                    Výroba ({configs.length} {configs.length === 1 ? "nápis" : configs.length < 5 ? "nápisy" : "nápisov"})
                  </span>
                  <span style={{ color: "var(--color-foreground)" }}>{formatEur(itemsPrice)}</span>
                </div>
                {installation ? (
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span style={{ color: "var(--color-muted)" }}>Montáž</span>
                    <span style={{ color: "var(--color-foreground)" }}>po konzultácii</span>
                  </div>
                ) : selectedMethod && (
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span style={{ color: "var(--color-muted)" }}>Doprava — {selectedMethod.name}</span>
                    <span style={{ color: "var(--color-foreground)" }}>{selectedMethod.priceLabel}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs font-black tracking-wide" style={{ color: "var(--color-muted)" }}>
                    {installation || selectedMethod?.price === null ? "Za nápisy, s DPH" : "Celkom s DPH"}
                  </span>
                  <span className="text-2xl font-black" style={{ color: "var(--color-foreground)" }}>
                    {formatEur(price)}
                  </span>
                </div>
                {installation && (
                  <p className="text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
                    Teraz nič neplatíte. Cenu montáže a termín dohodneme po telefonickej konzultácii.
                  </p>
                )}
                {!installation && selectedMethod?.price === null && (
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
                <SectionTitle>Kontaktné údaje</SectionTitle>
                <div className="mb-6 space-y-3">
                  <TextField
                    label="Meno a priezvisko"
                    value={name}
                    onChange={setName}
                    placeholder="Ján Novák"
                    autoComplete="name"
                    error={errors.name}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="E-mail"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="jan@email.sk"
                      autoComplete="email"
                      error={errors.email}
                    />
                    <TextField
                      label="Telefón"
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      placeholder="+421 900 000 000"
                      autoComplete="tel"
                      error={errors.phone}
                    />
                  </div>
                </div>

                {installation ? (
                  <div className="mb-6">
                    <SectionTitle>Adresa inštalácie</SectionTitle>
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: "var(--color-surface-raised)",
                        border: `1px solid ${errors.site ? "#f87171" : "var(--color-border-strong)"}`,
                      }}
                    >
                      <p className="mb-3 text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
                        Kde bude nápis visieť — podľa nej naplánujeme obhliadku aj montáž.
                      </p>
                      <AddressFields value={site} onChange={setSite} error={errors.site} />
                    </div>
                  </div>
                ) : quote ? (
                  <>
                    <DeliveryStep
                      methods={quote.deliveryMethods}
                      value={delivery}
                      onChange={setDelivery}
                      weightKg={quote.parcel.weightKg}
                      errors={{ point: errors.point, address: errors.address }}
                    />

                    <div className="mb-6">
                      <SectionTitle>Spôsob platby</SectionTitle>
                      {paymentMethods.length > 0 ? (
                        <>
                          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Spôsob platby">
                            {paymentMethods.map((m) => (
                              <KindCard
                                key={m}
                                active={payment === m}
                                onClick={() => setPayment(m)}
                                icon={m === "card" ? <CreditCard size={16} /> : <Landmark size={16} />}
                                title={PAYMENT_METHOD_LABEL[m]}
                                text={m === "card" ? "Bezpečne cez Stripe" : "Na účet, podľa variabilného symbolu"}
                              />
                            ))}
                          </div>
                          {payment === "transfer" && (
                            <p className="mt-2 text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
                              IBAN, variabilný symbol a sumu uvidíte hneď po odoslaní objednávky. Výroba začne po prijatí platby.
                            </p>
                          )}
                          {errors.payment && <p className="mt-1 text-[11px] text-red-400">{errors.payment}</p>}
                        </>
                      ) : (
                        <p className="text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
                          Po odoslaní vám potvrdíme cenu, termín a platobné údaje.
                        </p>
                      )}
                    </div>
                  </>
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
                  {submitLabel}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function isComplete(a: DeliveryAddress): boolean {
  return Boolean(a.street.trim() && a.houseNumber.trim() && a.city.trim() && a.zip.trim());
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-black tracking-wide" style={{ color: "var(--color-foreground)" }}>
      {children}
    </h3>
  );
}

/** A choice card — the order kind, or the payment method. */
function KindCard({
  active,
  onClick,
  icon,
  title,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className="flex flex-col gap-1 rounded-2xl p-3 text-left transition"
      style={{
        border: `2px solid ${active ? "var(--accent)" : "var(--color-border)"}`,
        background: active ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--color-surface)",
      }}
    >
      <span className="flex items-center justify-between">
        <span style={{ color: active ? "var(--color-foreground)" : "var(--color-muted)" }}>{icon}</span>
        {active && (
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full"
            style={{ background: "var(--accent)" }}
            aria-hidden="true"
          >
            <Check size={10} strokeWidth={3} style={{ color: "#000" }} />
          </span>
        )}
      </span>
      <span className="text-[12px] font-black" style={{ color: "var(--color-foreground)" }}>{title}</span>
      <span className="text-[11px] leading-4" style={{ color: "var(--color-muted)" }}>{text}</span>
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  type?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-[11px] font-black tracking-wide"
        style={{ color: "var(--color-foreground)" }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg px-4 py-3 text-sm outline-none transition"
        style={{
          background: error ? "rgba(239,68,68,0.08)" : "var(--color-surface)",
          border: `1px solid ${error ? "#f87171" : "var(--color-border)"}`,
          color: "var(--color-foreground)",
        }}
      />
      {error && <span className="mt-1 block text-[11px] text-red-400">{error}</span>}
    </label>
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
