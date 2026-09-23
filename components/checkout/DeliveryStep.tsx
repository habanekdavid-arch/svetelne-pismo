"use client";

import PacketaPointPicker from "@/components/checkout/PacketaPointPicker";
import type { DeliveryAddress, DeliveryPoint } from "@/lib/orders";

// Choosing how the sign gets to the customer.
//
// The methods are not a fixed list: the server works out which ones this
// consignment may actually be sent by (lib/shipping.ts) and sends those. A
// two-metre alurol sign simply never offers Packeta, because Packeta would
// not carry it.

export type QuotedDeliveryMethod = {
  id: string;
  name: string;
  description: string;
  price: number | null;
  priceLabel: string;
  needsPoint: boolean;
  needsAddress: boolean;
};

export type DeliveryChoice = {
  method: string;
  point: DeliveryPoint | null;
  address: DeliveryAddress | null;
};

type Props = {
  methods: QuotedDeliveryMethod[];
  value: DeliveryChoice;
  onChange: (next: DeliveryChoice) => void;
  /** Estimated parcel weight, so the widget only offers points that take it. */
  weightKg?: number;
  errors?: { point?: string; address?: string };
};

export default function DeliveryStep({
  methods,
  value,
  onChange,
  weightKg,
  errors = {},
}: Props) {
  const selected = methods.find((m) => m.id === value.method) ?? methods[0];
  const address = value.address ?? emptyAddress();

  function pick(method: QuotedDeliveryMethod) {
    // Switching method drops what belonged to the old one, so a pick-up point
    // can never travel along with a courier order.
    onChange({ method: method.id, point: null, address: method.needsAddress ? address : null });
  }

  return (
    <div className="mb-6">
      <h3
        className="mb-3 text-[11px] font-black tracking-wide"
        style={{ color: "var(--color-foreground)" }}
      >
        Spôsob doručenia
      </h3>

      <div className="space-y-2">
        {methods.map((method) => {
          const active = selected?.id === method.id;
          return (
            <div
              key={method.id}
              className="rounded-xl p-3 transition"
              style={{
                background: active ? "var(--color-surface-raised)" : "var(--color-surface)",
                border: `1px solid ${active ? "var(--color-border-strong)" : "var(--color-border)"}`,
              }}
            >
              <button
                type="button"
                onClick={() => pick(method)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <span className="min-w-0">
                  <span
                    className="block text-[13px] font-black"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {method.name}
                  </span>
                  <span className="block text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
                    {method.description}
                  </span>
                </span>
                <span
                  className="shrink-0 text-[13px] font-black"
                  style={{ color: active ? "var(--color-foreground)" : "var(--color-muted)" }}
                >
                  {method.priceLabel}
                </span>
              </button>

              {active && method.needsPoint && (
                <div className="mt-3">
                  <PacketaPointPicker
                    value={value.point}
                    onChange={(point) => onChange({ ...value, point })}
                    weightKg={weightKg}
                  />
                  {errors.point && <p className="mt-1 text-[11px] text-red-400">{errors.point}</p>}
                </div>
              )}

              {active && method.needsAddress && (
                <div className="mt-3">
                  <AddressFields
                    value={address}
                    onChange={(next) => onChange({ ...value, address: next })}
                    error={errors.address}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
