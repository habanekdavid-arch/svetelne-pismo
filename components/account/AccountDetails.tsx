"use client";

import { useState } from "react";
import { notifySessionChange } from "@/lib/session-client";
import { missingAccountDetails } from "@/lib/account-details";
import { Pencil } from "lucide-react";
import type { Address, UserProfile } from "@/lib/profile";
import { AccountSection } from "@/components/account/AccountSection";
import DataTile from "@/components/account/DataTile";
import { useT } from "@/lib/i18n/client";

// The details collected at registration, shown back to the customer and
// editable in place. Read-only until "Upraviť" is pressed, so the page opens
// as something to check rather than something to fill in.

export default function AccountDetails({
  name,
  email,
  initial,
  ordersCount,
  startEditing = false,
}: {
  name: string;
  email: string;
  initial: UserProfile;
  ordersCount: number;
  startEditing?: boolean;
}) {
  const t = useT();
  const [saved, setSaved] = useState<UserProfile>(initial);
  const [draft, setDraft] = useState<UserProfile>(initial);
  const [savedName, setSavedName] = useState(name);
  const [draftName, setDraftName] = useState(name);
  // "Doplniť" in the reminder (AccountDetailsReminder) lands here with
  // ?upravit=1 — straight into the form.
  const [editing, setEditing] = useState(startEditing);
  const missing = missingAccountDetails(savedName, saved);
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
        body: JSON.stringify({ profile: draft, name: draftName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          body?.error === "missing_company"
            ? t("Pri firemnom účte vyplňte názov firmy a IČO.") : t("Údaje sa nepodarilo uložiť. Skúste to prosím znova."),
        );
        return;
      }
      setSaved(draft);
      setSavedName(draftName.trim());
      setEditing(false);
      notifySessionChange(); // the header and the reminder read the new details
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch {
      setError(t("Údaje sa nepodarilo uložiť. Skúste to prosím znova."));
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
            {t("Údaje sú uložené.")}
          </p>
        )}

        {missing.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              <strong>{t("Doplňte detaily účtu")}</strong> — {t("meno, telefón a fakturačnú adresu. Pri objednávke ich potom už nebudete vypĺňať.")}
            </span>
            <button
              type="button"
              onClick={() => { setDraft(saved); setDraftName(savedName); setEditing(true); }}
              className="rounded-full bg-black px-4 py-1.5 text-xs font-bold text-white"
            >
              {t("Doplniť")}
            </button>
          </div>
        )}

        <AccountSection title={t("Osobné údaje")}>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <DataTile label={t("Meno a priezvisko")} value={savedName} />
            <DataTile label={t("E-mail")} value={email} />
            <DataTile label={t("Telefón")} value={saved.phone} />
            <DataTile label={t("Typ účtu")}>
              <span className={saved.accountType === "COMPANY" ? "badge-info" : "badge-ok"}>
                {saved.accountType === "COMPANY" ? t("Firma") : t("Súkromná osoba")}
              </span>
            </DataTile>
            <DataTile label={t("Počet objednávok")} value={String(ordersCount)} />
          </div>
        </AccountSection>

        {/* Len pre firmy a živnostníkov — súkromná osoba tu nemá čo vypĺňať. */}
        {hasCompany && (
          <AccountSection title={t("Firemné údaje")}>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {saved.companyName && <DataTile label={t("Názov firmy")} value={saved.companyName} />}
              <DataTile label={t("IČO")} value={saved.ico} />
              <DataTile label={t("DIČ")} value={saved.dic} />
              {saved.vatPayer && <DataTile label={t("IČ DPH")} value={saved.icDph} />}
              <DataTile label={t("Platca DPH")}>
                <span className={saved.vatPayer ? "badge-ok" : "badge-info"}>
                  {saved.vatPayer ? t("Áno") : t("Nie")}
                </span>
              </DataTile>
              <DataTile label={t("Živnostník / SZČO")}>
                <span className={saved.soleTrader ? "badge-ok" : "badge-info"}>
                  {saved.soleTrader ? t("Áno") : t("Nie")}
                </span>
              </DataTile>
            </div>
          </AccountSection>
        )}

        <AccountSection title={t("Doručovacia adresa")}>
          <AddressTiles address={saved.shipping} />
        </AccountSection>

        {/* Fakturačná sa ukáže, až keď sa naozaj líši od doručovacej — inak by
            to boli štyri prázdne dlaždice s pomlčkami. */}
        {billingFilled && (
          <AccountSection title={t("Fakturačná adresa")}>
            <AddressTiles address={saved.billing} />
          </AccountSection>
        )}

        <AccountSection
          title={t("Upraviť moje údaje")}
          subtitle={t("Fakturačná a dodacia adresa sa predvyplní pri ďalšej objednávke.")}
        >
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setDraft(saved);
                setDraftName(savedName);
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
              {t("Upraviť údaje")}
            </button>
          </div>
        </AccountSection>
      </div>
    );
  }

  return (
    <AccountSection
      title={t("Upraviť moje údaje")}
      subtitle={t("Fakturačná a dodacia adresa sa predvyplní pri ďalšej objednávke.")}
    >
    <form onSubmit={handleSave} className="mt-6 space-y-6">
      <section>
        <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
          {t("Kontakt")}
        </h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-2 text-sm font-semibold" style={{ color: "var(--color-foreground-soft)" }}>
              {t("Typ účtu")}
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
              <option value="PERSON">{t("Súkromná osoba")}</option>
              <option value="COMPANY">{t("Firma")}</option>
            </select>
          </label>
          <Field label={t("Meno a priezvisko")} value={draftName} onChange={setDraftName} />
          <Field label={t("Telefón")} value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
          {t("Firemné údaje")}
        </h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {isCompany && (
            <Field label={t("Názov firmy")} value={draft.companyName} onChange={(v) => setDraft({ ...draft, companyName: v })} />
          )}
          <Field label={t("IČO")} value={draft.ico} onChange={(v) => setDraft({ ...draft, ico: v })} />
          <Field label={t("DIČ")} value={draft.dic} onChange={(v) => setDraft({ ...draft, dic: v })} />
          {draft.vatPayer && (
            <Field label={t("IČ DPH")} value={draft.icDph} onChange={(v) => setDraft({ ...draft, icDph: v })} />
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <Check
            label={t("Som platca DPH")}
            checked={draft.vatPayer}
            onChange={(v) => setDraft({ ...draft, vatPayer: v })}
          />
          <Check
            label={t("Som živnostník / SZČO")}
            checked={draft.soleTrader}
            onChange={(v) => setDraft({ ...draft, soleTrader: v })}
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
          {t("Fakturačná adresa")}
        </h3>
        <AddressFields value={draft.billing} onChange={(billing) => setDraft({ ...draft, billing })} />
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
            {t("Doručovacia adresa")}
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
            {t("Skopírovať z fakturačnej")}
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
          {saving ? t("Ukladám…") : t("Uložiť zmeny")}
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
          {t("Zrušiť")}
        </button>
      </div>
    </form>
    </AccountSection>
  );
}

/** Štyri dlaždice jednej adresy — rovnaké poradie ako v objednávkovom formulári. */
function AddressTiles({ address }: { address: Address }) {
  const t = useT();
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
      <DataTile label={t("Ulica a číslo")} value={address.street} />
      <DataTile label={t("Mesto")} value={address.city} />
      <DataTile label={t("PSČ")} value={address.zip} />
      <DataTile label={t("Krajina")} value={address.country} />
    </div>
  );
}

function AddressFields({ value, onChange }: { value: Address; onChange: (a: Address) => void }) {
  const t = useT();
  const set = (key: keyof Address) => (v: string) => onChange({ ...value, [key]: v });
  return (
    <div className="mt-3 grid gap-4 md:grid-cols-2">
      <Field label={t("Ulica a číslo")} value={value.street} onChange={set("street")} />
      <Field label={t("Mesto")} value={value.city} onChange={set("city")} />
      <Field label={t("PSČ")} value={value.zip} onChange={set("zip")} />
      <Field label={t("Krajina")} value={value.country} onChange={set("country")} />
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
