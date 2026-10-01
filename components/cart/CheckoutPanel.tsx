"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Config } from "@/lib/types";
import type { DeliveryAddress } from "@/lib/orders";
import { useCart, type CartItem } from "@/lib/cart-context";
import { MATERIALS, fontOptions } from "@/lib/options";
import { PAYMENT_METHOD_LABEL, type PaymentMethodId } from "@/lib/payment-methods";
import { generateClientOrderId, trackPurchase } from "@/lib/analytics";
import { notifySessionChange, onSessionChange } from "@/lib/session-client";
import { formatEur } from "@/lib/vat";
import { usePriceAccess, PRICE_PLACEHOLDER } from "@/lib/price-access";
import { capturePreview } from "@/lib/sign-preview";
import { EMPTY_PROFILE, type UserProfile } from "@/lib/profile";
import { accountDetailsComplete } from "@/lib/account-details";
import VerifyCodeForm from "@/components/auth/VerifyCodeForm";
import { isInBratislava, isPickup, leadTimeNotice } from "@/lib/shipping";
import { AddressFields, emptyAddress } from "@/components/checkout/AddressFields";
import AuthGate, { type SessionUser } from "@/components/checkout/AuthGate";

// The whole checkout, inside the cart drawer — laid out the way vytlacto3d's
// is, as six numbered steps:
//   1. Doručenie — delivery as cards (collect in Prievidza, hand-over in
//      Bratislava, DPD) and the address where one is needed;
//   2. Doplniť detaily účtu — signing up asks only for an e-mail and a
//      password, so name, phone, the billing address and company details are
//      completed here (and saved to the account for next time); signed out,
//      this is where one signs in;
//   3. Platba — card or transfer;
//   4. Dopyt na cenu za inštaláciu — optional: "Máte záujem aj o inštaláciu?"
//      asks where the sign is to go up, and the shop sends a quote for it;
//   5. Súhlas s podmienkami;
//   6. Objednať a zaplatiť — the price breakdown and one button.
//
// Nothing about money is decided here: prices, delivery methods and payment
// methods all come from app/api/quote, and app/api/orders checks them again.

type QuotedDeliveryMethod = {
  id: string;
  name: string;
  description: string;
  price: number | null;
  priceLabel: string;
  needsAddress: boolean;
};

type Quote = {
  items: { price: number; priceCents: number }[];
  itemsCents: number;
  parcel: { weightKg: number; longestCm: number };
  deliveryMethods: QuotedDeliveryMethod[];
  paymentMethods: PaymentMethodId[];
};

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

type Errors = Partial<Record<"name" | "phone" | "billing" | "company" | "address" | "site" | "payment", string>>;

export default function CheckoutPanel({ items, isOpen, onPlaced, onQuoted }: Props) {
  const { clear: clearCart, close } = useCart();
  const router = useRouter();
  const configs: Config[] = items.map((i) => i.config);

  // ── Who is ordering ──────────────────────────────────────────────────────
  // undefined = still checking, null = signed out.
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  // Prices only for a signed-in customer with a confirmed e-mail.
  const canSeePrice = usePriceAccess() === "ok" || (!!user && user.verified !== false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // The account's details (lib/profile.ts) — what step 2 completes and saves.
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [billing, setBilling] = useState<DeliveryAddress>(emptyAddress());
  const [editingAccount, setEditingAccount] = useState(false);
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
          // What the customer saved on their account, so a returning customer
          // only has to press the button.
          const res = await fetch("/api/profile").catch(() => null);
          const body = res && res.ok ? await res.json().catch(() => null) : null;
          const saved: UserProfile | undefined = body?.profile;
          if (cancelled || !saved) return;
          setProfile(saved);
          if (saved.phone) setPhone((v) => v || saved.phone);
          if (saved.shipping?.street) setAddress((a) => (a.street ? a : fromProfileAddress(saved.shipping)));
          const bill = saved.billing?.street ? saved.billing : saved.shipping;
          if (bill?.street) setBilling((b) => (b.street ? b : fromProfileAddress(bill)));
          // Incomplete details open the form straight away.
          setEditingAccount(!accountDetailsComplete(data.user.name ?? "", saved));
        })
        .catch(() => { if (!cancelled) setUser(null); });
    load();
    const off = onSessionChange(load);
    return () => { cancelled = true; off(); };
  }, [isOpen]);

  // ── What it costs and how it can go ──────────────────────────────────────
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  // "Skúsiť znova" — asks for the quote again without closing the cart.
  const [quoteTry, setQuoteTry] = useState(0);
  const [method, setMethod] = useState<string>("");
  const [payment, setPayment] = useState<PaymentMethodId | null>(null);

  // ── "Máte záujem aj o inštaláciu?" ──────────────────────────────────────
  const [wantsInstall, setWantsInstall] = useState(false);
  const [site, setSite] = useState<DeliveryAddress>(emptyAddress());
  const [installNote, setInstallNote] = useState("");

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
            data.deliveryMethods.some((d) => d.id === m) ? m : (data.deliveryMethods[0]?.id ?? ""),
          );
          setPayment((p) =>
            p && data.paymentMethods.includes(p) ? p : (data.paymentMethods[0] ?? null),
          );
        })
        .catch(() => { if (!cancelled) setQuoteFailed(true); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, itemsKey, quoteTry]);

  const carrier = quote?.deliveryMethods.find((d) => d.id === method) ?? null;
  const paymentMethods = quote?.paymentMethods ?? [];

  const itemsPrice = quote ? quote.itemsCents / 100 : items.reduce((s, i) => s + i.price, 0);
  const deliveryPrice = carrier?.price ?? 0;
  const total = itemsPrice + deliveryPrice;

  // ── Placing it ───────────────────────────────────────────────────────────
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const tracked = useRef(false);
  const isCompany = profile.accountType === "COMPANY";

  function validate(): boolean {
    const e: Errors = {};
    if (!name.trim()) e.name = "Zadajte meno a priezvisko";
    if (!phone.trim()) e.phone = "Zadajte telefón";
    if (!isComplete(billing)) e.billing = "Vyplňte celú fakturačnú adresu";
    if (isCompany && (!profile.companyName.trim() || !profile.ico.trim())) e.company = "Vyplňte názov firmy a IČO";
    if (carrier?.needsAddress && !isComplete(address)) e.address = "Vyplňte celú adresu";
    else if (carrier?.id === "pickup-bratislava" && !isInBratislava(address.city)) {
      e.address = "Osobne odovzdávame len v Bratislave";
    }
    if (wantsInstall && !isComplete(site)) e.site = "Vyplňte celú adresu miesta inštalácie";
    if (paymentMethods.length > 0 && !payment) e.payment = "Vyberte spôsob platby";
    setErrors(e);
    // Account problems are inside the collapsed summary — open it.
    if (e.name || e.phone || e.billing || e.company) setEditingAccount(true);
    return Object.keys(e).length === 0;
  }

  /** Step 2 is kept on the account, so the next order is a couple of clicks. */
  async function saveAccountDetails(): Promise<void> {
    const next: UserProfile = {
      ...profile,
      phone: phone.trim(),
      billing: toProfileAddress(billing),
      // The first delivery address becomes the account's, if it had none.
      shipping: profile.shipping.street || !carrier?.needsAddress ? profile.shipping : toProfileAddress(address),
    };
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: next, name: name.trim() }),
    }).catch(() => null);
    if (res?.ok) {
      setProfile(next);
      setUser((u) => (u ? { ...u, name: name.trim() } : u));
    }
  }

  async function submit() {
    if (submitting || !validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Not being able to save them is no reason to lose the order.
      await saveAccountDetails().catch(() => {});
      // The picture of each sign (lib/sign-preview.ts) — taken when it went
      // into the cart, or now for the one still open in the configurator.
      const previews = await Promise.all(configs.map((c) => capturePreview(c).catch(() => null)));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "standard",
          items: configs,
          previews,
          name: name.trim(),
          email: user?.email,
          phone: phone.trim(),
          delivery: {
            method,
            address: carrier?.needsAddress ? address : null,
          },
          installationRequest: wantsInstall ? { address: site, note: installNote.trim() } : null,
          payment,
          terms,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        if (err?.error === "email_not_verified") {
          setUser((u) => (u ? { ...u, verified: false } : u));
          setSubmitError("Najprv overte svoj e-mail — zadajte kód, ktorý sme vám poslali.");
          return;
        }
        throw new Error(String(res.status));
      }
      const placed = await res.json();

      if (!tracked.current) {
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
        setSubmitError("Objednávku sme uložili, ale platbu sa nepodarilo otvoriť. Nájdete ju v časti „Moje objednávky“.");
        return;
      }

      // Transfer: the order page shows the IBAN, variable symbol and amount.
      if (placed?.payment === "transfer" && placed?.groupId) {
        clearCart();
        router.push(`/dakujeme/${placed.groupId}`);
        close();
        return;
      }

      clearCart();
      onPlaced({
        title: "Objednávka odoslaná",
        text: `Ďakujeme, ${name}! Ozveme sa vám na ${user?.email ?? "váš e-mail"} s potvrdením ceny, termínu a platby.`,
      });
    } catch {
      setSubmitError("Objednávku sa nepodarilo odoslať. Skúste to prosím znova.");
    } finally {
      setSubmitting(false);
    }
  }

  const buttonLabel = submitting
    ? payment === "card" ? "Presmerúvam…" : "Odosielam…"
    : paymentMethods.length === 0
        ? "Odoslať objednávku"
        : payment === "transfer"
          ? "Objednať — zaplatiť prevodom"
          : "Objednať a zaplatiť kartou";

  const blocked =
    submitting || !terms || !quote || !user || user.verified === false;

  const count = items.length;
  const countLabel = `${count} ${count === 1 ? "nápis" : count < 5 ? "nápisy" : "nápisov"}`;
  const accountReady = !!user && user.verified !== false;

  return (
    <div className="space-y-6">
      {/* ── 1. Doručenie ─────────────────────────────────────────────── */}
      <div>
        <Step n={1}>Doručenie</Step>
        {!quote ? (
          quoteFailed ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Ceny sa nepodarilo načítať.
              <button type="button" onClick={() => setQuoteTry((n) => n + 1)} className="font-bold underline">
                Skúsiť znova
              </button>
            </div>
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
                icon={d.id.startsWith("pickup-") ? <HouseIcon /> : <TruckIcon />}
                title={d.name}
                sub={d.priceLabel}
                subStrong
                wide={quote.deliveryMethods.length % 2 === 1 && d === quote.deliveryMethods[quote.deliveryMethods.length - 1]}
              />
            ))}
          </div>
        )}

        {carrier && (
          <>
            <p className="mt-2 text-xs leading-5" style={{ color: "var(--color-muted)" }}>
              {carrier.description}
            </p>
            <div
              className={`mt-2 rounded-2xl border px-3 py-2 text-xs leading-5 ${
                isPickup(carrier.id)
                  ? "border-orange-200 bg-orange-50 text-orange-800"
                  : ""
              }`}
              style={isPickup(carrier.id) ? undefined : { borderColor: "var(--color-border)", color: "var(--color-muted)" }}
            >
              {leadTimeNotice(carrier.id)}
            </div>
          </>
        )}
        {carrier?.needsAddress && (
          <div className="mt-2 rounded-2xl p-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <Sub>
              {carrier.id === "freight"
                ? "Adresa doručenia — dopravu dohodneme"
                : carrier.id === "pickup-bratislava"
                  ? "Kde v Bratislave vám ho odovzdáme"
                  : "Dodacia adresa"}
            </Sub>
            <AddressFields value={address} onChange={setAddress} error={errors.address} />
          </div>
        )}
      </div>

      {/* ── 2. Doplniť detaily účtu ──────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Step n={2} flush>Doplniť detaily účtu</Step>
          {accountReady && !editingAccount && (
            <button
              type="button"
              onClick={() => setEditingAccount(true)}
              className="text-xs font-semibold"
              style={{ color: "var(--color-accent-text)" }}
            >
              Upraviť
            </button>
          )}
        </div>
        {user === undefined ? (
          <div className="h-24 animate-pulse rounded-2xl" style={{ background: "var(--color-surface)" }} />
        ) : !user ? (
          <AuthGate
            onAuthenticated={(u) => {
              setUser(u);
              setName((v) => v || u.name);
              notifySessionChange();
            }}
          />
        ) : user.verified === false ? (
          <VerifyInline email={user.email} onVerified={() => setUser((u) => (u ? { ...u, verified: true } : u))} />
        ) : !editingAccount ? (
          <div
            className="rounded-2xl px-3 py-2 text-xs leading-5"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="font-semibold" style={{ color: "var(--color-foreground)" }}>
              {isCompany && profile.companyName ? `${profile.companyName} — ${name}` : name}
            </div>
            <div style={{ color: "var(--color-muted)" }}>{phone} · {user.email}</div>
            <div style={{ color: "var(--color-muted)" }}>
              Fakturačná adresa: {billing.street} {billing.houseNumber}, {billing.zip} {billing.city}
            </div>
            {isCompany && profile.ico && (
              <div style={{ color: "var(--color-muted)" }}>IČO {profile.ico}{profile.dic ? ` · DIČ ${profile.dic}` : ""}{profile.icDph ? ` · IČ DPH ${profile.icDph}` : ""}</div>
            )}
          </div>
        ) : (
          <div
            className="space-y-3 rounded-2xl p-3"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-[11px] leading-4" style={{ color: "var(--color-muted)" }}>
              Uložíme si ich k vášmu účtu ({user.email}) — pri ďalšej objednávke ich už nevypĺňate.
            </p>
            <div className="flex gap-1 rounded-full p-1" style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}>
              {(["PERSON", "COMPANY"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProfile((p) => ({ ...p, accountType: t }))}
                  className="flex-1 rounded-full py-1.5 text-[11px] font-bold transition"
                  style={
                    profile.accountType === t
                      ? { background: "var(--color-foreground)", color: "var(--color-background)" }
                      : { color: "var(--color-muted)" }
                  }
                >
                  {t === "PERSON" ? "Súkromná osoba" : "Firma"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Meno a priezvisko" value={name} onChange={setName} autoComplete="name" error={errors.name} />
              <Field label="Telefón" value={phone} onChange={setPhone} autoComplete="tel" type="tel" error={errors.phone} />
            </div>
            {isCompany && (
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Field label="Názov firmy" value={profile.companyName} onChange={(v) => setProfile((p) => ({ ...p, companyName: v }))} autoComplete="organization" />
                </div>
                <Field label="IČO" value={profile.ico} onChange={(v) => setProfile((p) => ({ ...p, ico: v }))} />
                <Field label="DIČ" value={profile.dic} onChange={(v) => setProfile((p) => ({ ...p, dic: v }))} />
                <div className="col-span-2">
                  <Field
                    label="IČ DPH (ak ste platca DPH)"
                    value={profile.icDph}
                    onChange={(v) => setProfile((p) => ({ ...p, icDph: v, vatPayer: !!v.trim() }))}
                  />
                </div>
                {errors.company && <p className="col-span-2 text-[11px] text-red-500">{errors.company}</p>}
              </div>
            )}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Sub>Fakturačná adresa</Sub>
                {carrier?.needsAddress && isComplete(address) && (
                  <button
                    type="button"
                    onClick={() => setBilling(address)}
                    className="mb-2 text-[11px] font-semibold underline"
                    style={{ color: "var(--color-muted)" }}
                  >
                    Rovnaká ako dodacia
                  </button>
                )}
              </div>
              <AddressFields value={billing} onChange={setBilling} error={errors.billing} />
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Platba — shown before signing in too, so the customer sees
          from the start how they can pay (prevodom alebo kartou). ── */}
      <div>
        <Step n={3}>Platba</Step>
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

      {/* ── 4. Dopyt na cenu za inštaláciu ───────────────────────────── */}
      <div>
        <Step n={4}>Dopyt na cenu za inštaláciu</Step>
        <div
          className="rounded-2xl p-3 transition-colors"
          style={{
            border: `2px solid ${errors.site ? "#f87171" : wantsInstall ? "var(--accent)" : "var(--color-border)"}`,
            background: wantsInstall ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "var(--color-background)",
          }}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <CheckBox checked={wantsInstall} />
            <input type="checkbox" checked={wantsInstall} onChange={(e) => setWantsInstall(e.target.checked)} className="sr-only" />
            <span className="flex-1">
              <span className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--color-foreground)" }}>
                <WrenchIcon /> Máte záujem aj o inštaláciu?
              </span>
              <span className="mt-1 block text-[11px] leading-4" style={{ color: "var(--color-muted)" }}>
                V prípade, že máte záujem aj inštaláciu nápisu, vyplňte prosím údaje o mieste
                inštalácie a my Vám pošleme cenovú ponuku.
              </span>
            </span>
          </label>
          {wantsInstall && (
            <div className="mt-3 space-y-2">
              <Sub>Miesto inštalácie</Sub>
              <AddressFields value={site} onChange={setSite} error={errors.site} />
              <label className="block">
                <span className="mb-1 block text-[10px] font-black tracking-wide" style={{ color: "var(--color-muted)" }}>
                  Poznámka (nepovinné)
                </span>
                <textarea
                  value={installNote}
                  onChange={(e) => setInstallNote(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Napr. typ steny alebo fasády, výška umiestnenia, prívod elektriny…"
                  className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                />
              </label>
              <p className="text-[11px] leading-4" style={{ color: "var(--color-muted)" }}>
                Teraz platíte len za nápis a dopravu. Inštaláciu vám nacenime zvlášť.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Súhlas s podmienkami ──────────────────────────────────── */}
      <div>
        <Step n={5}>Súhlas s podmienkami</Step>
        <label
          className="flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition-colors"
          style={{
            border: `2px solid ${terms ? "var(--accent)" : "var(--color-border)"}`,
            background: terms ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "var(--color-background)",
          }}
        >
          <CheckBox checked={terms} />
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="sr-only" />
          <span className="text-xs leading-5" style={{ color: "var(--color-foreground-soft)" }}>
            Súhlasím so{" "}
            <a
              href="/obchodne-podmienky"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-semibold underline"
              style={{ color: "var(--color-foreground)" }}
            >
              všeobecnými obchodnými podmienkami (VOP)
            </a>
          </span>
        </label>
      </div>

      {/* ── 6. Objednať a zaplatiť ───────────────────────────────────── */}
      <div className="space-y-3">
        <Step n={6} flush>Objednať a zaplatiť</Step>
        <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--color-surface)" }}>
          <div className="flex justify-between" style={{ color: "var(--color-muted)" }}>
            <span>Výroba ({countLabel})</span>
            <span className="font-semibold">{canSeePrice ? formatEur(itemsPrice) : <Blurred />}</span>
          </div>
          <div className="flex justify-between" style={{ color: "var(--color-muted)" }}>
            <span>Doprava</span>
            <span className="font-semibold">{carrier ? carrier.priceLabel : "—"}</span>
          </div>
          {wantsInstall && (
            <div className="flex justify-between" style={{ color: "var(--color-muted)" }}>
              <span>Inštalácia</span>
              <span className="font-semibold">cenová ponuka zvlášť</span>
            </div>
          )}
          <div
            className="mt-2 flex justify-between border-t pt-2 text-base font-extrabold"
            style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
          >
            <span>{carrier?.price === null ? "Za nápisy s DPH" : "Celkom s DPH"}</span>
            <span>{canSeePrice ? formatEur(total) : <Blurred />}</span>
          </div>
        </div>

        {submitError && <Err>{submitError}</Err>}
        {!user && user !== undefined && (
          <p className="text-center text-xs" style={{ color: "var(--color-muted)" }}>
            Na dokončenie objednávky sa prihláste alebo zaregistrujte v kroku 2.
          </p>
        )}
        {user && user.verified === false && (
          <p className="text-center text-xs" style={{ color: "var(--color-muted)" }}>
            Na dokončenie objednávky overte e-mail kódom v kroku 2.
          </p>
        )}

        <button
          type="button"
          disabled={blocked}
          onClick={submit}
          className="btn-press w-full rounded-2xl px-5 py-3.5 text-sm font-extrabold shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={
            payment === "transfer"
              ? { background: "#f97316", color: "#fff" }
              : { background: "var(--accent)", color: "var(--accent-foreground)" }
          }
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function Blurred() {
  return <span aria-label="Cena po prihlásení" className="inline-block select-none blur-[5px]">{PRICE_PLACEHOLDER}</span>;
}

/** A new account orders once its e-mail is confirmed — the code from the e-mail, or a new one. */
function VerifyInline({ email, onVerified }: { email: string; onVerified: () => void }) {
  return (
    <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
      <p>
        Na objednanie treba overiť e-mail. Zadajte kód, ktorý sme poslali na <strong>{email}</strong>.
      </p>
      <VerifyCodeForm compact onVerified={onVerified} />
    </div>
  );
}

function isComplete(a: DeliveryAddress): boolean {
  return Boolean(a.street.trim() && a.houseNumber.trim() && a.city.trim() && a.zip.trim());
}

/** Street and number back together, as the account keeps them. */
function toProfileAddress(a: DeliveryAddress): UserProfile["billing"] {
  return {
    street: [a.street.trim(), a.houseNumber.trim()].filter(Boolean).join(" "),
    city: a.city.trim(),
    zip: a.zip.trim(),
    country: "Slovensko",
  };
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

/** "1. Doručenie" — a numbered step of the checkout. */
function Step({ n, children, flush }: { n: number; children: React.ReactNode; flush?: boolean }) {
  return (
    <div className={`${flush ? "" : "mb-3 "}flex items-center gap-2 text-sm font-extrabold`} style={{ color: "var(--color-foreground)" }}>
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
        style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        aria-hidden="true"
      >
        {n}
      </span>
      {children}
    </div>
  );
}

/** The square tick used by the installation and terms boxes. */
function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors"
      style={{
        border: `2px solid ${checked ? "var(--accent)" : "var(--color-border-strong)"}`,
        background: checked ? "var(--accent)" : "var(--color-background)",
      }}
      aria-hidden="true"
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
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
