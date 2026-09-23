"use client";

import type { DeliveryAddress } from "@/lib/orders";

/** Street, number, town and postcode — for a courier, or for where a sign is mounted. */
export function AddressFields({
  value,
  onChange,
  error,
}: {
  value: DeliveryAddress;
  onChange: (next: DeliveryAddress) => void;
  error?: string;
}) {
  const address = value;
  function patchAddress(patch: Partial<DeliveryAddress>) {
    onChange({ ...address, ...patch });
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      <Field
        className="col-span-2"
        label="Ulica"
        value={address.street}
        onChange={(v) => patchAddress({ street: v })}
        autoComplete="address-line1"
      />
      <Field
        label="Číslo"
        value={address.houseNumber}
        onChange={(v) => patchAddress({ houseNumber: v })}
        autoComplete="address-line2"
      />
      <Field
        className="col-span-2"
        label="Mesto"
        value={address.city}
        onChange={(v) => patchAddress({ city: v })}
        autoComplete="address-level2"
      />
      <Field
        label="PSČ"
        value={address.zip}
        onChange={(v) => patchAddress({ zip: v })}
        autoComplete="postal-code"
      />
      {error && <p className="col-span-3 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

export function emptyAddress(): DeliveryAddress {
  return { street: "", houseNumber: "", city: "", zip: "", country: "sk" };
}

function Field({
  label,
  value,
  onChange,
  className = "",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  autoComplete?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-[10px] font-black tracking-wide" style={{ color: "var(--color-muted)" }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
        style={{
          background: "var(--color-background)",
          border: "1px solid var(--color-border)",
          color: "var(--color-foreground)",
        }}
      />
    </label>
  );
}
