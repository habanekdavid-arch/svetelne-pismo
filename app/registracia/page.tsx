"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notifySessionChange } from "@/lib/session-client";
import { EMPTY_PROFILE, type AccountType, type Address, type UserProfile } from "@/lib/profile";

// Registration in vytlacto3d's shape: account type first, then the personal
// details, the two tax switches, and the two addresses — everything an
// invoice and a delivery need, collected once instead of chased by e-mail
// after every order.
//
// The account itself stays minimal (Prisma User: name, e-mail, password); the
// rest is stored beside it in user_profiles — see lib/profile.ts for why.
export default function RegisterPage() {
  const router = useRouter();

  const [accountType, setAccountType] = useState<AccountType>("PERSON");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [ico, setIco] = useState("");
  const [dic, setDic] = useState("");
  const [icDph, setIcDph] = useState("");
  const [vatPayer, setVatPayer] = useState(false);
  const [soleTrader, setSoleTrader] = useState(false);

  const [billing, setBilling] = useState<Address>(EMPTY_PROFILE.billing);
  const [shipping, setShipping] = useState<Address>(EMPTY_PROFILE.shipping);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCompany = accountType === "COMPANY";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const profile: UserProfile = {
      accountType,
      phone,
      companyName: isCompany ? companyName : "",
      ico: isCompany || soleTrader ? ico : "",
      dic: isCompany || soleTrader ? dic : "",
      icDph: vatPayer ? icDph : "",
      vatPayer,
      soleTrader,
      billing,
      shipping,
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, profile }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.error === "email_taken") setError("Tento e-mail už má vytvorený účet.");
        else if (body?.error === "weak_password") setError("Heslo musí mať aspoň 8 znakov.");
        else if (body?.error === "missing_company") setError("Pri firemnom účte vyplňte názov firmy a IČO.");
        else if (body?.error === "missing_fields") setError("Vyplňte prosím všetky povinné polia.");
        else setError("Registrácia zlyhala. Skontrolujte údaje a skúste znova.");
        return;
      }
      notifySessionChange(); // so the header's account pill updates too
      router.replace("/moje-objednavky");
      router.refresh();
    } catch {
      setError("Registrácia zlyhala. Skúste to prosím znova.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div
        className="rounded-3xl p-6 shadow-sm"
        style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
      >
        <div className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
          Registrácia
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          Vytvoriť účet
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          Vyberte, či sa registrujete ako súkromná osoba alebo firma.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>

          {/* Account type */}
          <section>
            <label htmlFor="account-type" className="text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>
              Typ účtu
            </label>
            <select
              id="account-type"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
              className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#FFAE00]"
              style={{
                background: "var(--color-background)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground)",
              }}
            >
              <option value="PERSON">Súkromná osoba</option>
              <option value="COMPANY">Firma</option>
            </select>
          </section>

          {/* Personal details */}
          <section>
            <h2 className="text-lg font-extrabold" style={{ color: "var(--color-foreground)" }}>
              {isCompany ? "Kontaktná osoba" : "Osobné údaje"}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Meno a priezvisko" required value={name} onChange={setName} autoComplete="name" />
              <Field label="E-mail" required type="email" value={email} onChange={setEmail} autoComplete="email" />
              <Field label="Telefónne číslo" required type="tel" value={phone} onChange={setPhone} autoComplete="tel" />
              <Field label="Heslo" required type="password" value={password} onChange={setPassword} autoComplete="new-password" hint="Aspoň 8 znakov." />
            </div>
          </section>

          {/* Company details — only a company is asked for them */}
          {isCompany && (
            <section>
              <h2 className="text-lg font-extrabold" style={{ color: "var(--color-foreground)" }}>
                Firemné údaje
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Názov firmy" required value={companyName} onChange={setCompanyName} autoComplete="organization" />
                <Field label="IČO" required value={ico} onChange={setIco} />
                <Field label="DIČ" value={dic} onChange={setDic} />
              </div>
            </section>
          )}

          {/* Tax switches */}
          <section
            className="rounded-2xl p-4"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={vatPayer}
                onChange={(e) => setVatPayer(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#FFAE00]"
              />
              <div>
                <div className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
                  Som platca DPH
                </div>
                <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
                  Ak ste platca DPH, pri firemnom účte vyplňte aj IČ DPH.
                </div>
              </div>
            </label>
            {vatPayer && (
              <div className="mt-4 md:max-w-xs">
                <Field label="IČ DPH" value={icDph} onChange={setIcDph} />
              </div>
            )}
          </section>

          <section
            className="rounded-2xl p-4"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={soleTrader}
                onChange={(e) => setSoleTrader(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#FFAE00]"
              />
              <div>
                <div className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
                  Som živnostník / SZČO
                </div>
                <div className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
                  Vyplňte IČO a DIČ ak potrebujete faktúru na živnosť.
                </div>
              </div>
            </label>
            {soleTrader && !isCompany && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="IČO" value={ico} onChange={setIco} />
                <Field label="DIČ" value={dic} onChange={setDic} />
              </div>
            )}
          </section>

          {/* Billing address */}
          <section>
            <h2 className="text-lg font-extrabold" style={{ color: "var(--color-foreground)" }}>
              Fakturačná adresa
            </h2>
            <p className="mb-3 mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
              Adresa pre faktúry. Ak je rovnaká ako doručovacia, môžete ju nechať prázdnu — použije sa doručovacia adresa.
            </p>
            <AddressFields value={billing} onChange={setBilling} />
          </section>

          {/* Shipping address */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold" style={{ color: "var(--color-foreground)" }}>
                Doručovacia adresa
              </h2>
              <button
                type="button"
                onClick={() => setShipping(billing)}
                className="rounded-full px-4 py-2 text-xs font-bold transition hover:opacity-80"
                style={{
                  background: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground-soft)",
                }}
              >
                Skopírovať z fakturačnej
              </button>
            </div>
            <AddressFields value={shipping} onChange={setShipping} required />
          </section>

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

function AddressFields({
  value,
  onChange,
  required = false,
}: {
  value: Address;
  onChange: (a: Address) => void;
  required?: boolean;
}) {
  const set = (key: keyof Address) => (v: string) => onChange({ ...value, [key]: v });
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Field label="Ulica a číslo" required={required} value={value.street} onChange={set("street")} autoComplete="street-address" />
      <Field label="Mesto"         required={required} value={value.city}   onChange={set("city")}   autoComplete="address-level2" />
      <Field label="PSČ"           required={required} value={value.zip}    onChange={set("zip")}    autoComplete="postal-code" />
      <Field label="Krajina"       required={required} value={value.country} onChange={set("country")} autoComplete="country-name" />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>
        {label}
        {required && <span className="ml-1" style={{ color: "var(--accent)" }}>*</span>}
      </div>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-[#FFAE00]"
        style={{
          background: "var(--color-background)",
          border: "1px solid var(--color-border)",
          color: "var(--color-foreground)",
        }}
      />
      {hint && (
        <div className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
          {hint}
        </div>
      )}
    </label>
  );
}
