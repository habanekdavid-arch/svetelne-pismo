"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import type { DeliveryPoint } from "@/lib/orders";

// Packeta's pick-up point widget.
//
// The widget is Packeta's own page in an iframe; the only way to talk to it is
// their integration library, which is loaded from their domain on demand —
// once, and only if the customer actually chooses delivery to a pick-up point.
// Documented at https://docs.packeta.com/docs/pudo-delivery/widget.

const LIBRARY_SRC = "https://widget.packeta.com/v6/www/js/library.js";

/** The point object the widget hands back; only the fields we keep are typed. */
type WidgetPoint = {
  id: string | number;
  name: string;
  place?: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
  carrierId?: string;
  carrierPickupPointId?: string;
};

type PacketaGlobal = {
  Widget: {
    pick: (
      apiKey: string,
      callback: (point: WidgetPoint | null) => void,
      options?: Record<string, unknown>,
    ) => void;
  };
};

declare global {
  interface Window {
    Packeta?: PacketaGlobal;
  }
}

let libraryPromise: Promise<void> | null = null;

function loadLibrary(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Packeta) return Promise.resolve();
  if (libraryPromise) return libraryPromise;

  libraryPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = LIBRARY_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later attempt try again rather than failing for good.
      libraryPromise = null;
      reject(new Error("Packeta widget sa nepodarilo načítať"));
    };
    document.head.appendChild(script);
  });
  return libraryPromise;
}

type Props = {
  value: DeliveryPoint | null;
  onChange: (point: DeliveryPoint | null) => void;
  /** Only points that take a parcel this heavy are shown. */
  weightKg?: number;
};

export default function PacketaPointPicker({ value, onChange, weightKg }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_PACKETA_API_KEY;
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  // Warm the library up as soon as this step is on screen, so the first click
  // opens the map instead of waiting for a download.
  useEffect(() => {
    if (apiKey) loadLibrary().catch(() => {});
  }, [apiKey]);

  const open = useCallback(async () => {
    if (!apiKey || opening) return;
    setOpening(true);
    setError(null);
    try {
      await loadLibrary();
      window.Packeta?.Widget.pick(
        apiKey,
        (point) => {
          // null means the customer closed the map without choosing.
          if (!point) return;
          onChange({
            id: String(point.id),
            name: point.name,
            place: point.place ?? null,
            street: point.street ?? null,
            city: point.city ?? null,
            zip: point.zip ?? null,
            country: point.country ?? null,
            carrierId: point.carrierId ?? null,
            carrierPickupPoint: point.carrierPickupPointId ?? null,
          });
        },
        {
          language: "sk",
          country: "sk,cz",
          ...(weightKg ? { weight: weightKg } : {}),
        },
      );
    } catch {
      setError("Mapu výdajných miest sa nepodarilo otvoriť. Skúste to prosím znova.");
    } finally {
      setOpening(false);
    }
  }, [apiKey, onChange, opening, weightKg]);

  if (!apiKey) {
    return (
      <p className="text-[12px] leading-5" style={{ color: "var(--color-muted)" }}>
        Výber výdajného miesta zatiaľ nie je zapnutý. Vyberte prosím inú dopravu.
      </p>
    );
  }

  // Drawn like vytlacto3d's: a dashed "choose" button until a point is
  // picked, then the point itself in a green box with a way to change it.
  return (
    <div>
      {value ? (
        <div
          className="flex items-center gap-2 rounded-2xl px-3 py-2"
          style={{ border: "1px solid #bbf7d0", background: "#f0fdf4" }}
        >
          <MapPin size={14} className="shrink-0 text-green-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-neutral-900">{value.name}</div>
            <div className="truncate text-[11px] text-neutral-600">
              {[value.street, value.city].filter(Boolean).join(", ")}
            </div>
          </div>
          <button
            type="button"
            onClick={open}
            disabled={opening}
            className="shrink-0 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-60"
          >
            {opening ? "Otváram…" : "Zmeniť"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={opening}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-semibold transition disabled:opacity-60"
          style={{
            border: "2px dashed var(--color-border-strong)",
            background: "var(--color-surface)",
            color: "var(--color-foreground-soft)",
          }}
        >
          <MapPin size={12} aria-hidden="true" />
          {opening ? "Otváram mapu…" : "Vybrať výdajné miesto →"}
        </button>
      )}
      {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
    </div>
  );
}
