"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Config } from "@/lib/types";
import type { DeliveryAddress, DeliveryPoint } from "@/lib/orders";
import { useCart, type CartItem } from "@/lib/cart-context";
import { MATERIALS, fontOptions } from "@/lib/options";
import { PAYMENT_METHOD_LABEL, type PaymentMethodId } from "@/lib/payment-methods";
import { generateClientOrderId, trackPurchase } from "@/lib/analytics";
import { notifySessionChange, onSessionChange } from "@/lib/session-client";
import { formatEur } from "@/lib/vat";
import PacketaPointPicker from "@/components/checkout/PacketaPointPicker";
import { AddressFields, emptyAddress } from "@/components/checkout/AddressFields";
import AuthGate, { type SessionUser } from "@/components/checkout/AuthGate";

// The whole checkout, inside the cart drawer — laid out the way vytlacto3d's
// is: delivery as two cards (Packeta, courier), the contact details as a
// summary with an "Upraviť" link, payment as two cards (card, transfer), the
// price breakdown, the terms tick and one order button.
//
// One addition of our own: a third delivery card for an order with
// installation. A sign that is to be mounted is not posted — the order goes in
// without any payment and waits for the shop's quote (a pre-invoice with the
// mounting in it), so that choice asks for the address it goes up at instead.
//
// Nothing about money is decided here: prices, delivery methods and payment
// methods all come from app/api/quote, and app/api/orders checks them again.

type QuotedDeliveryMethod = {
  id: string;
  name: string;
  description: string;
  price: number | null;
  priceLabel: string;
  needsPoint: boolean;
  needsAddress: boolean;
};

type Quote = {
  items: { price: number; priceCents: number }[];
  itemsCents: number;
  parcel: { weightKg: number; longestCm: number };
  deliveryMethods: QuotedDeliveryMethod[];
  paymentMethods: PaymentMethodId[];
};

/** The delivery card picked — a carrier from the quote, or the consultation. */
const INSTALLATION = "installation";

export type PlacedNotice = { title: string; text: string };

type Props = {
  items: CartItem[];
  /** Quotes are only fetched while the drawer is open. */
  isOpen: boolean;
  /** Called once an order that stays on this page (not a redirect) is placed. */
  onPlaced: (notice: PlacedNotice) => void;
  /** The server's price for each cart line, once quoted — what is charged. */
  onQuoted?: (prices: number[] | null) => void;
};

type Errors = Partial<Record<"name" | "email" | "phone" | "point" | "address" | "site" | "payment", string>>;

export default function CheckoutPanel({ items, isOpen, onPlaced, onQuoted }: Props) {
  const { clear: clearCart, close } = useCart();
  const router = useRouter();
  const configs: Config[] = items.map((i) => i.config);

  // ── Who is ordering ──────────────────────────────────────────────────────
  // undefined = still checking, null = signed out.
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [editingContact, setEditingContact] = useState(false);
  const [address, setAddress] = useState<DeliveryAddress>(emptyAddress());

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = () =>
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then(async (data) => {
          if (cancelled) return;
          setUser(data.user ?? null);
          if (!data.user) return;
          setName((v) => v || data.user.name || "");
          setEmail((v) => v || data.user.email || "");
          // The phone and the delivery address the customer saved on their
          // account, so a returning customer only has to press the button.
          const res = await fetch("/api/profile").catch(() => null);
          const body = res && res.ok ? await res.json().catch(() => null) : null;
          const profile = body?.profile;
          if (cancelled || !profile) return;
          if (profile.phone) setPhone((v) => v || profile.phone);
          const saved = profile.shipping?.street ? profile.shipping : profile.billing;
          if (saved?.street) {
            setAddress((a) => (a.street ? a : fromProfileAddress(saved)));
          }
        })
        .catch(() => { if (!cancelled) setUser(null); });
    load();
    const off = onSessionChange(load);
    return () => { cancelled = true; off(); };
  }, [isOpen]);

  // ── What it costs and how it can go ──────────────────────────────────────
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [method, setMethod] = useState<string>("");
  const [point, setPoint] = useState<DeliveryPoint | null>(null);
  const [payment, setPayment] = useState<PaymentMethodId | null>(null);
  const [site, setSite] = useState<DeliveryAddress>(emptyAddress());

  // Rebuilt from the cart lines, so the lines are what the quote depends on.
  const itemsKey = JSON.stringify(configs);
  // A changed cart makes the old server prices wrong — drop them until the
  // new quote is in, rather than show one sign at another's price.
  useEffect(() => {
    onQuoted?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);
  useEffect(() => {
    if (!isOpen || configs.length === 0) return;
    let cancelled = false;
    const t = setTimeout(() => {
      fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: configs }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: Quote) => {
          if (cancelled) return;
          setQuote(data);
          setQuoteFailed(false);
          onQuoted?.(data.items.map((i) => i.price));
          // Keep the customer's choice while it is still on offer.
          setMethod((m) =>
            m === INSTALLATION || data.deliveryMethods.some((d) => d.id === m)
              ? m
              : (data.deliveryMethods[0]?.id ?? ""),
          );
          setPayment((p) =>
            p && data.paymentMethods.includes(p) ? p : (data.paymentMethods[0] ?? null),
          );
        })
        .catch(() => { if (!cancelled) setQuoteFailed(true); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, itemsKey]);

  const installation = method === INSTALLATION;
  const carrier = quote?.deliveryMethods.find((d) => d.id === method) ?? null;
  const paymentMethods = quote?.paymentMethods ?? [];

  const itemsPrice = quote ? quote.itemsCents / 100 : items.reduce((s, i) => s + i.price, 0);
  const deliveryPrice = installation ? 0 : (carrier?.price ?? 0);
  const total = itemsPrice + deliveryPrice;

  // ── Placing it ───────────────────────────────────────────────────────────
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const tracked = useRef(false);

  function validate(): boolean {
    const e: Errors = {};
    if (!name.trim()) e.name = "Zadajte meno";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Zadajte platný e-mail";
    if (!phone.trim()) e.phone = "Zadajte telefón";
    if (installation) {
      if (!isComplete(site)) e.site = "Vyplňte celú adresu inštalácie";
    } else {
      if (carrier?.needsPoint && !point) e.point = "Vyberte výdajné miesto";
      if (carrier?.needsAddress && !isComplete(address)) e.address = "Vyplňte celú adresu";
      if (paymentMethods.length > 0 && !payment) e.payment = "Vyberte spôsob platby";
    }
    setErrors(e);
    // Contact problems are inside the collapsed summary — open it.
    if (e.name || e.email || e.phone) setEditingContact(true);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (submitting || !validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          installation
            ? { kind: "installation", items: configs, name, email, phone, installation: { address: site } }
            : {
                kind: "standard",
                items: configs,
                name,
                email,
                phone,
                delivery: {
                  method,
                  point: carrier?.needsPoint ? point : null,
                  address: carrier?.needsAddress ? address : null,
                },
                payment,
                terms,
              },
        ),
      });
      if (!res.ok) throw new Error(String(res.status));
      const placed = await res.json();

      if (!installation && !tracked.current) {
        tracked.current = true;
        trackPurchase({
          transactionId: generateClientOrderId(),
          value: total,
          currency: "EUR",
          items: configs.map((c, idx) => {
            const mat = MATERIALS.find((m) => m.id === c.material);
            const f = fontOptions.find((x) => x.id === c.font);
            return {
              item_name: `Svetelný nápis — ${mat?.displayName ?? c.material} (${f?.name ?? c.font})`,
              item_id: `${c.material}-${c.font}-${c.signType}`,
              price: items[idx]?.price ?? 0,
              quantity: 1,
            };
          }),
        });
      }

      // Card: straight on to Stripe. The order is saved already, so a
      // cancelled payment loses nothing.
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
        setSubmitError("Objednávku sme uložili, ale platbu sa nepodarilo otvoriť. Nájdete ju v Moje objednávky.");
        return;
      }

      // Transfer: the order page shows the IBAN, variable symbol and amount.
      // Installation: the order page shows it waiting for our quote, and is
      // where the pre-invoice will appear.
      if ((installation || placed?.payment === "transfer") && placed?.groupId) {
        clearCart();
        router.push(`/objednavka/${placed.groupId}${installation ? "" : "?stav=prevod"}`);
        close();
        return;
      }

      clearCart();
      onPlaced(
        installation
          ? {
              title: "Objednávka čaká na cenovú ponuku",
              text: `Ďakujeme, ${name}! Pripravíme cenovú ponuku s montážou a ozveme sa vám na ${phone}. Vopred nič neplatíte.`,
            }
          : {
              title: "Objednávka odoslaná",
              text: `Ďakujeme, ${name}! Ozveme sa vám na ${email} s potvrdením ceny, termínu a platby.`,
            },
      );
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

  const buttonLabel = submitting
    ? payment === "card" && !installation ? "Presmerúvam…" : "Odosielam…"
    : installation
      ? "Objednať s montážou — na cenovú ponuku"
      : paymentMethods.length === 0 || carrier?.price === null
        ? "Odoslať objednávku"
        : payment === "transfer"
          ? "Objednať — zaplatiť prevodom"
          : "Objednať a zaplatiť kartou";

  const blocked =
    submitting || !terms || !quote || (!installation && carrier?.needsPoint === true && !point);

  const count = items.length;
  const countLabel = `${count} ${count === 1 ? "nápis" : count < 5 ? "nápisy" : "nápisov"}`;

  return (
    <div className="space-y-5">
      {/* ── Delivery ─────────────────────────────────────────────────── */}
      <div>
        <Heading>Spôsob doručenia</Heading>
        {!quote ? (
          quoteFailed ? (
            <p className="text-xs text-red-500">Ceny sa nepodarilo načítať. Skúste košík zavrieť a otvoriť.</p>
          ) : (
            <div className="h-20 animate-pulse rounded-2xl" style={{ background: "var(--color-surface)" }} />
          )
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {quote.deliveryMethods.map((d) => (
              <ChoiceCard
                key={d.id}
                active={method === d.id}
                onClick={() => setMethod(d.id)}
                icon={d.id === "packeta-pickup" ? <HouseIcon /> : <TruckIcon />}
                title={d.name}
                sub={d.priceLabel}
                subStrong
                wide={quote.deliveryMethods.length === 1}
              />
            ))}
            <ChoiceCard
              active={installation}
              onClick={() => setMethod(INSTALLATION)}
              icon={<WrenchIcon />}
              title="Montáž u vás — na cenovú ponuku"
              sub="Pošleme vám cenovú ponuku (predfaktúru) s montážou. Vopred nič neplatíte."
              wide
            />
          </div>
        )}

        {carrier?.needsPoint && !installation && (
          <div className="mt-2">
            <PacketaPointPicker value={point} onChange={setPoint} weightKg={quote?.parcel.weightKg} />
            {errors.point && <Err>{errors.point}</Err>}
          </div>
        )}
        {carrier?.needsAddress && !installation && (
          <div className="mt-2 rounded-2xl p-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <Sub>{carrier.id === "freight" ? "Adresa doručenia — dopravu dohodneme" : "Dodacia adresa"}</Sub>
            <AddressFields value={address} onChange={setAddress} error={errors.address} />
          </div>
        )}
        {installation && (
          <div
            className="mt-2 rounded-2xl p-3"
            style={{ background: "var(--color-surface)", border: `2px solid ${errors.site ? "#f87171" : "var(--accent)"}` }}
          >
            <Sub>Adresa inštalácie — kde bude nápis visieť</Sub>
            <AddressFields value={site} onChange={setSite} error={errors.site} />
          </div>
        )}
      </div>

      {/* ── Contact ──────────────────────────────────────────────────── */}
      {user === undefined ? (
        <div className="h-24 animate-pulse rounded-2xl" style={{ background: "var(--color-surface)" }} />
      ) : !user ? (
        <AuthGate
          onAuthenticated={(u) => {
            setUser(u);
            setName((v) => v || u.name);
            setEmail((v) => v || u.email);
            notifySessionChange();
          }}
        />
      ) : (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Heading flush>Kontaktné údaje</Heading>
              <button
                type="button"
                onClick={() => setEditingContact((v) => !v)}
                className="text-xs font-semibold"
                style={{ color: "var(--color-accent-text)" }}
              >
                {editingContact ? "Zatvoriť" : "Upraviť"}
              </button>
            </div>
            {!editingContact && name && phone ? (
              <div
                className="rounded-2xl px-3 py-2 text-xs"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div className="font-semibold" style={{ color: "var(--color-foreground)" }}>{name}</div>
                <div style={{ color: "var(--color-muted)" }}>{phone}</div>
                <div style={{ color: "var(--color-muted)" }}>{email}</div>
              </div>
            ) : (
              <div
                className="space-y-2 rounded-2xl p-3"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Meno" value={name} onChange={setName} autoComplete="name" error={errors.name} />
                  <Field label="Telefón" value={phone} onChange={setPhone} autoComplete="tel" type="tel" error={errors.phone} />
                </div>
                <Field label="E-mail" value={email} onChange={setEmail} autoComplete="email" type="email" error={errors.email} />
              </div>
            )}
          </div>

          {/* ── Payment ──────────────────────────────────────────────── */}
          {!installation && (
            <div>
              <Heading>Spôsob platby</Heading>
              {paymentMethods.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((m) => (
                      <ChoiceCard
                        key={m}
                        active={payment === m}
                        onClick={() => setPayment(m)}
                        icon={m === "card" ? <CardBadge /> : <TransferBadge />}
                        title={m === "card" ? PAYMENT_METHOD_LABEL.card : "Prevod"}
                        sub={m === "card" ? "Stripe" : "IBAN SK"}
                        tone={m === "transfer" ? "orange" : "accent"}
                        wide={paymentMethods.length === 1}
                      />
                    ))}
                  </div>
                  {payment === "transfer" && (
                    <div className="mt-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                      Platobné údaje (IBAN, VS, sumu) uvidíte hneď po objednaní. Výroba začne po prijatí platby.
                    </div>
                  )}
                  {errors.payment && <Err>{errors.payment}</Err>}
                </>
              ) : (
                <p className="text-xs leading-5" style={{ color: "var(--color-muted)" }}>
                  Po odoslaní vám potvrdíme cenu, termín a platobné údaje.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Summary ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--color-surface)" }}>
        <div className="flex justify-between" style={{ color: "var(--color-muted)" }}>
          <span>Výroba ({countLabel})</span>
          <span className="font-semibold">{formatEur(itemsPrice)}</span>
        </div>
        <div className="flex justify-between" style={{ color: "var(--color-muted)" }}>
          <span>{installation ? "Montáž" : "Doprava"}</span>
          <span className="font-semibold">
            {installation ? "v cenovej ponuke" : carrier ? carrier.priceLabel : "—"}
          </span>
        </div>
        <div
          className="mt-2 flex justify-between border-t pt-2 text-base font-extrabold"
          style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
        >
          <span>{installation || carrier?.price === null ? "Za nápisy s DPH" : "Celkom s DPH"}</span>
          <span>{formatEur(total)}</span>
        </div>
      </div>

      {/* ── Terms + order ────────────────────────────────────────────── */}
      {user && (
        <div className="space-y-3">
          <label
            className="flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition-colors"
            style={{
              border: `2px solid ${terms ? "var(--accent)" : "var(--color-border)"}`,
              background: terms ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "var(--color-background)",
            }}
          >
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors"
              style={{
                border: `2px solid ${terms ? "var(--accent)" : "var(--color-border-strong)"}`,
                background: terms ? "var(--accent)" : "var(--color-background)",
              }}
              aria-hidden="true"
            >
              {terms && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="sr-only" />
            <span className="text-xs leading-5" style={{ color: "var(--color-foreground-soft)" }}>
              Súhlasím s{" "}
              <a
                href="/obchodne-podmienky"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-semibold underline"
                style={{ color: "var(--color-foreground)" }}
              >
                obchodnými podmienkami
              </a>
            </span>
          </label>

          {submitError && <Err>{submitError}</Err>}

          <button
            type="button"
            disabled={blocked}
            onClick={submit}
            className="btn-press w-full rounded-2xl px-5 py-3.5 text-sm font-extrabold shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={
              payment === "transfer" && !installation
                ? { background: "#f97316", color: "#fff" }
                : { background: "var(--accent)", color: "var(--accent-foreground)" }
            }
          >
            {buttonLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function isComplete(a: DeliveryAddress): boolean {
  return Boolean(a.street.trim() && a.houseNumber.trim() && a.city.trim() && a.zip.trim());
}

/** "Hlavná 12/A" as saved on the account → street and house number apart, as a courier needs them. */
function fromProfileAddress(a: { street: string; city: string; zip: string }): DeliveryAddress {
  const m = a.street.trim().match(/^(.*?)[\s,]+(\d[\w/-]*)$/);
  return {
    street: m ? m[1] : a.street.trim(),
    houseNumber: m ? m[2] : "",
    city: a.city ?? "",
    zip: a.zip ?? "",
    country: "sk",
  };
}

function Heading({ children, flush }: { children: React.ReactNode; flush?: boolean }) {
  return (
    <div className={`${flush ? "" : "mb-3 "}text-sm font-extrabold`} style={{ color: "var(--color-foreground)" }}>
      {children}
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
      {children}
    </div>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-red-500">{children}</p>;
}

function Tick({ tone }: { tone: "accent" | "orange" }) {
  return (
    <span
      className="flex h-4 w-4 items-center justify-center rounded-full"
      style={{ background: tone === "orange" ? "#fb923c" : "var(--accent)" }}
      aria-hidden="true"
    >
      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke={tone === "orange" ? "white" : "black"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** A delivery or payment card, as on vytlacto3d. */
function ChoiceCard({
  active,
  onClick,
  icon,
  title,
  sub,
  subStrong,
  tone = "accent",
  wide,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
  subStrong?: boolean;
  tone?: "accent" | "orange";
  wide?: boolean;
}) {
  const ring = tone === "orange" ? "#fb923c" : "var(--accent)";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-2xl p-3 text-left transition-all ${wide ? "col-span-2" : ""}`}
      style={{
        border: `2px solid ${active ? ring : "var(--color-border)"}`,
        background: active
          ? tone === "orange" ? "#fff7ed" : "color-mix(in srgb, var(--accent) 6%, transparent)"
          : "var(--color-background)",
      }}
    >
      <span className="flex items-center justify-between">
        {icon}
        {active && <Tick tone={tone} />}
      </span>
      <span className="text-xs font-bold" style={{ color: "var(--color-foreground)" }}>{title}</span>
      <span
        className={subStrong ? "text-xs font-extrabold" : "text-[11px]"}
        style={{ color: subStrong ? "var(--color-foreground)" : "var(--color-muted)" }}
      >
        {sub}
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  type?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black tracking-wide" style={{ color: "var(--color-muted)" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={{
          background: "var(--color-background)",
          border: `1px solid ${error ? "#f87171" : "var(--color-border)"}`,
          color: "var(--color-foreground)",
        }}
      />
      {error && <span className="mt-0.5 block text-[11px] text-red-500">{error}</span>}
    </label>
  );
}

// Icons drawn with vytlacto3d's own paths and stroke weights.

function HouseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-accent-text)" }} aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)" }} aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-muted)" }} aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function CardBadge() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--accent)" }} aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    </span>
  );
}

function TransferBadge() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    </span>
  );
}
