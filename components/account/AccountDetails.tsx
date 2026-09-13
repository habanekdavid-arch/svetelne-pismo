"use client";

import { useState } from "react";
import type { Address, UserProfile } from "@/lib/profile";

// The details collected at registration, shown back to the customer and
// editable in place. Read-only until "Upraviť" is pressed, so the page opens
// as something to check rather than something to fill in.

export default function AccountDetails({
  name,
  email,
  initial,
}: {
  name: string;
  email: string;
  initial: UserProfile;
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
    return (
      <div className="mt-6 space-y-6">
        {justSaved && (
          <p className="text-sm font-semibold" style={{ color: "var(--color-accent-text)" }}>
            Údaje sú uložené.
          </p>
        )}

        <Group title="Kontakt">
          <Row label="Meno" value={name} />
          <Row label="E-mail" value={email} />
          <Row label="Telefón" value={saved.phone} />
          <Row label="Typ účtu" value={saved.accountType === "COMPANY" ? "Firma" : "Súkromná osoba"} />
        </Group>

        {(saved.accountType === "COMPANY" || saved.soleTrader || saved.vatPayer) && (
          <Group title="Firemné údaje">
            {saved.companyName && <Row label="Názov firmy" value={saved.companyName} />}
            <Row label="IČO" value={saved.ico} />
            <Row label="DIČ" value={saved.dic} />
            {saved.vatPayer && <Row label="IČ DPH" value={saved.icDph} />}
            <Row label="Platca DPH" value={saved.vatPayer ? "Áno" : "Nie"} />
            <Row label="Živnostník / SZČO" value={saved.soleTrader ? "Áno" : "Nie"} />
          </Group>
        )}

        <Group title="Fakturačná adresa">
          <AddressRows address={saved.billing} fallback="Rovnaká ako doručovacia" />
        </Group>

        <Group title="Doručovacia adresa">
          <AddressRows address={saved.shipping} />
        </Group>

        <button
          type="button"
          onClick={() => {
            setDraft(saved);
            setEditing(true);
          }}
          className="rounded-2xl px-5 py-3 text-sm font-bold transition hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          Upraviť údaje
        </button>
      </div>
    );
  }

  return (
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
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
        {title}
      </h3>
      <dl
        className="divide-y rounded-2xl px-4"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {children}
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 text-sm">
      <dt style={{ color: "var(--color-muted)" }}>{label}</dt>
      <dd className="text-right font-semibold" style={{ color: "var(--color-foreground)" }}>
        {value || "—"}
      </dd>
    </div>
  );
}

function AddressRows({ address, fallback }: { address: Address; fallback?: string }) {
  const empty = !address.street && !address.city && !address.zip;
  if (empty && fallback) {
    return (
      <div className="py-3 text-sm" style={{ color: "var(--color-muted)" }}>
        {fallback}
      </div>
    );
  }
  return (
    <>
      <Row label="Ulica a číslo" value={address.street} />
      <Row label="Mesto" value={address.city} />
      <Row label="PSČ" value={address.zip} />
      <Row label="Krajina" value={address.country} />
    </>
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
