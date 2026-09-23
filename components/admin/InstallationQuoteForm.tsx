"use client";

import { useState, useTransition } from "react";
import { sendQuote } from "@/app/admin/actions";

/**
 * The shop's quote for an installation order: the mounting price, which goes
 * in beside the signs. Once sent, the customer's order page turns into the
 * pre-invoice they pay against. It can be sent again with a new price until
 * the order is paid.
 */
export default function InstallationQuoteForm({
  groupId,
  itemsEur,
  currentEur,
}: {
  groupId: string;
  itemsEur: number;
  /** The mounting price already quoted, if any. */
  currentEur: number | null;
}) {
  const [value, setValue] = useState(currentEur !== null ? String(currentEur) : "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const eur = Number(value.replace(",", "."));
  const valid = value.trim() !== "" && Number.isFinite(eur) && eur >= 0;

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) { setError("Zadajte cenu montáže"); return; }
        setError(null);
        startTransition(async () => {
          try {
            await sendQuote(groupId, eur);
          } catch {
            setError("Ponuku sa nepodarilo uložiť.");
          }
        });
      }}
    >
      <label className="block text-xs font-bold" style={{ color: "var(--color-muted)" }}>
        Cena montáže s DPH (€)
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="napr. 120"
          className="mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
        />
      </label>
      {valid && (
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          Spolu pre zákazníka:{" "}
          <strong style={{ color: "var(--color-foreground)" }}>
            {(itemsEur + eur).toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </strong>
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Ukladám…" : currentEur !== null ? "Upraviť cenovú ponuku" : "Odoslať cenovú ponuku"}
      </button>
    </form>
  );
}
