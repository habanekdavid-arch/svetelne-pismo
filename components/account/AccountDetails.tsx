"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Address, UserProfile } from "@/lib/profile";
import { AccountSection } from "@/components/account/AccountShell";
import DataTile from "@/components/account/DataTile";

// The details collected at registration, shown back to the customer and
// editable in place. Read-only until "Upraviť" is pressed, so the page opens
// as something to check rather than something to fill in.

export default function AccountDetails({
  name,
  email,
  initial,
  ordersCount,
}: {
  name: string;
  email: string;
  initial: UserProfile;
  ordersCount: number;
}) {
  const [saved, setSaved] = useState<UserProfile>(initial);
  const [draft, setDraft] = useState<UserProfile>(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const isCompany = draft.accountType === "COMPANY";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: draft }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          body?.error === "missing_company"
            ? "Pri firemnom účte vyplňte názov firmy a IČO."
            : "Údaje sa nepodarilo uložiť. Skúste to prosím znova.",
        );
        return;
      }
      setSaved(draft);
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch {
      setError("Údaje sa nepodarilo uložiť. Skúste to prosím znova.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    const hasCompany = saved.accountType === "COMPANY" || saved.soleTrader || saved.vatPayer;
    const billingFilled = Boolean(saved.billing.street || saved.billing.city || saved.billing.zip);

    return (
      <div className="space-y-5">
        {justSaved && (
          <p className="text-sm font-semibold" style={{ color: "var(--color-accent-text)" }}>
            Údaje sú uložené.
          </p>
        )}

        <AccountSection title="Osobné údaje">
          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <DataTile label="Meno a priezvisko" value={name} />
            <DataTile label="E-mail" value={email} />
            <DataTile label="Telefón" value={saved.phone} />
            <DataTile label="Typ účtu">
              <span className={saved.accountType === "COMPANY" ? "badge-info" : "badge-ok"}>
                {saved.accountType === "COMPANY" ? "Firma" : "Súkromná osoba"}
              </span>
            </DataTile>
            <DataTile label="Počet objednávok" value={String(ordersCount)} />
          </div>
        </AccountSection>

        {/* Len pre firmy a živnostníkov — súkromná osoba tu nemá čo vypĺňať. */}
        {hasCompany && (
          <AccountSection title="Firemné údaje">
            <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {saved.companyName && <DataTile label="Názov firmy" value={saved.companyName} />}
              <DataTile label="IČO" value={saved.ico} />
              <DataTile label="DIČ" value={saved.dic} />
              {saved.vatPayer && <DataTile label="IČ DPH" value={saved.icDph} />}
              <DataTile label="Platca DPH">
                <span className={saved.vatPayer ? "badge-ok" : "badge-info"}>
                  {saved.vatPayer ? "Áno" : "Nie"}
                </span>
              </DataTile>
              <DataTile label="Živnostník / SZČO">
                <span className={saved.soleTrader ? "badge-ok" : "badge-info"}>
                  {saved.soleTrader ? "Áno" : "Nie"}
                </span>
              </DataTile>
            </div>
          </AccountSection>
        )}

        <AccountSection title="Doručovacia adresa">
          <AddressTiles address={saved.shipping} />
        </AccountSection>

        {/* Fakturačná sa ukáže, až keď sa naozaj líši od doručovacej — inak by
            to boli štyri prázdne dlaždice s pomlčkami. */}
        {billingFilled && (
          <AccountSection title="Fakturačná adresa">
            <AddressTiles address={saved.billing} />
          </AccountSection>
        )}

        <AccountSection
          title="Upraviť moje údaje"
          subtitle="Fakturačná a dodacia adresa sa predvyplní pri ďalšej objednávke."
        >
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setDraft(saved);
                setEditing(true);
              }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: "var(--color-background)" }}
              >
                <Pencil size={14} strokeWidth={2.5} style={{ color: "var(--accent)" }} />
              </span>
              Upraviť údaje
            </button>
          </div>
        </AccountSection>
      </div>
    );
  }

  return (
    <AccountSection
      title="Upraviť moje údaje"
      subtitle="Fakturačná a dodacia adresa sa predvyplní pri ďalšej objednávke."
    >
    <form onSubmit={handleSave} className="mt-6 space-y-6">
      <section>
        <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
          Kontakt
        </h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-2 text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>
              Typ účtu
            </div>
            <select
              value={draft.accountType}
              onChange={(e) => setDraft({ ...draft, accountType: e.target.value === "COMPANY" ? "COMPANY" : "PERSON" })}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#FFAE00]"
              style={{
                background: "var(--color-background)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground)",
              }}
            >
              <option value="PERSON">Súkromná osoba</option>
              <option value="COMPANY">Firma</option>
            </select>
          </label>
          <Field label="Telefón" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
          Firemné údaje
        </h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {isCompany && (
            <Field label="Názov firmy" value={draft.companyName} onChange={(v) => setDraft({ ...draft, companyName: v })} />
          )}
          <Field label="IČO" value={draft.ico} onChange={(v) => setDraft({ ...draft, ico: v })} />
          <Field label="DIČ" value={draft.dic} onChange={(v) => setDraft({ ...draft, dic: v })} />
          {draft.vatPayer && (
            <Field label="IČ DPH" value={draft.icDph} onChange={(v) => setDraft({ ...draft, icDph: v })} />
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <Check
            label="Som platca DPH"
            checked={draft.vatPayer}
            onChange={(v) => setDraft({ ...draft, vatPayer: v })}
          />
          <Check
            label="Som živnostník / SZČO"
            checked={draft.soleTrader}
            onChange={(v) => setDraft({ ...draft, soleTrader: v })}
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
          Fakturačná adresa
        </h3>
        <AddressFields value={draft.billing} onChange={(billing) => setDraft({ ...draft, billing })} />
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
            Doručovacia adresa
          </h3>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, shipping: draft.billing })}
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
        <AddressFields value={draft.shipping} onChange={(shipping) => setDraft({ ...draft, shipping })} />
      </section>

      {error && <p className="text-[13px] text-red-500">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl px-5 py-3 text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          {saving ? "Ukladám…" : "Uložiť zmeny"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(saved);
            setEditing(false);
            setError(null);
          }}
          className="rounded-2xl px-5 py-3 text-sm font-semibold transition hover:opacity-80"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground-soft)" }}
        >
          Zrušiť
        </button>
      </div>
    </form>
    </AccountSection>
  );
}

/** Štyri dlaždice jednej adresy — rovnaké poradie ako v objednávkovom formulári. */
function AddressTiles({ address }: { address: Address }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
      <DataTile label="Ulica a číslo" value={address.street} />
      <DataTile label="Mesto" value={address.city} />
      <DataTile label="PSČ" value={address.zip} />
      <DataTile label="Krajina" value={address.country} />
    </div>
  );
}

function AddressFields({ value, onChange }: { value: Address; onChange: (a: Address) => void }) {
  const set = (key: keyof Address) => (v: string) => onChange({ ...value, [key]: v });
  return (
    <div className="mt-3 grid gap-4 md:grid-cols-2">
      <Field label="Ulica a číslo" value={value.street} onChange={set("street")} />
      <Field label="Mesto" value={value.city} onChange={set("city")} />
      <Field label="PSČ" value={value.zip} onChange={set("zip")} />
      <Field label="Krajina" value={value.country} onChange={set("country")} />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>
        {label}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-[#FFAE00]"
        style={{
          background: "var(--color-background)",
          border: "1px solid var(--color-border)",
          color: "var(--color-foreground)",
        }}
      />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: "var(--color-foreground-soft)" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#FFAE00]"
      />
      {label}
    </label>
  );
}
