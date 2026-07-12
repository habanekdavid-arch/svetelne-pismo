"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import type { Config } from "@/lib/types";
import { calculatePrice } from "@/lib/pricing";
import { fontOptions, MATERIALS, LIGHT_MODES } from "@/lib/options";

type Props = {
  config: Config;
  onClose: () => void;
};

export default function OrderModal({ config, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const price    = calculatePrice(config);
  const font     = fontOptions.find((f) => f.id === config.font);
  const material = MATERIALS.find((m) => m.id === config.material);
  const lighting = config.signType === "illuminated"
    ? LIGHT_MODES.find((l) => l.id === config.lightMode)
    : null;

  function validate() {
    const e: { name?: string; email?: string } = {};
    if (!name.trim()) e.name = "Zadajte vaše meno";
    if (!email.trim()) {
      e.email = "Zadajte e-mailovú adresu";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = "Neplatná e-mailová adresa";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl p-8 shadow-2xl"
        style={{
          background: "var(--color-background)",
          border: "1px solid var(--color-border)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition"
          style={{ color: "var(--color-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-raised)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          aria-label="Zatvoriť"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="py-6 text-center">
            <div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "var(--accent)" }}
            >
              <Check size={28} strokeWidth={2.5} style={{ color: "#000" }} />
            </div>
            <h2 className="main-heading text-2xl" style={{ color: "var(--color-foreground)" }}>
              Objednávka odoslaná
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--color-muted)" }}>
              Ďakujeme, {name}! Ozveme sa vám čoskoro na{" "}
              <strong style={{ color: "var(--color-foreground)" }}>{email}</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-7 rounded-full px-10 py-3 text-xs font-black uppercase transition hover:opacity-80"
              style={{ background: "var(--color-foreground)", color: "var(--color-background)" }}
            >
              Zatvoriť
            </button>
          </div>
        ) : (
          <>
            <h2
              className="main-heading mb-6 text-2xl"
              style={{ color: "var(--color-foreground)" }}
            >
              Zhrnutie objednávky
            </h2>

            {/* Summary table */}
            <div
              className="mb-6 rounded-xl p-4"
              style={{ background: "var(--color-surface)" }}
            >
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <dt className="font-black uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Text</dt>
                <dd className="truncate font-semibold" style={{ color: "var(--color-foreground)" }}>{config.text || "VÁŠ TEXT"}</dd>

                <dt className="font-black uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Písmo</dt>
                <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>{font?.name ?? "—"}</dd>

                <dt className="font-black uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Materiál</dt>
                <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>{material?.displayName ?? "—"}</dd>

                <dt className="font-black uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Svietenie</dt>
                <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>
                  {config.signType === "plain" ? "Nesvetelné" : (lighting?.name ?? "—")}
                </dd>

                <dt className="font-black uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Hrúbka</dt>
                <dd className="font-semibold" style={{ color: "var(--color-foreground)" }}>{config.thickness} mm</dd>

                <dt className="font-black uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Farba svetla</dt>
                <dd className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ background: config.lightColor, border: "1px solid var(--color-border)" }}
                  />
                  <span className="font-semibold" style={{ color: "var(--color-foreground)" }}>vlastná</span>
                </dd>
              </dl>

              <div
                className="mt-4 flex items-baseline justify-between border-t pt-4"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span className="text-xs font-black uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                  Orientačná cena
                </span>
                <span className="text-2xl font-black" style={{ color: "var(--color-foreground)" }}>
                  {price} €
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label
                  className="mb-1.5 block text-[11px] font-black uppercase tracking-wide"
                  style={{ color: "var(--color-foreground)" }}
                >
                  Meno a priezvisko
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ján Novák"
                  autoComplete="name"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition"
                  style={{
                    background: errors.name ? "rgba(239,68,68,0.08)" : "var(--color-surface)",
                    border: `1px solid ${errors.name ? "#f87171" : "var(--color-border)"}`,
                    color: "var(--color-foreground)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-foreground)")}
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = errors.name ? "#f87171" : "var(--color-border)")
                  }
                />
                {errors.name && (
                  <p className="mt-1 text-[11px] text-red-400">{errors.name}</p>
                )}
              </div>

              <div className="mb-6">
                <label
                  className="mb-1.5 block text-[11px] font-black uppercase tracking-wide"
                  style={{ color: "var(--color-foreground)" }}
                >
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jan@email.sk"
                  autoComplete="email"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition"
                  style={{
                    background: errors.email ? "rgba(239,68,68,0.08)" : "var(--color-surface)",
                    border: `1px solid ${errors.email ? "#f87171" : "var(--color-border)"}`,
                    color: "var(--color-foreground)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-foreground)")}
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = errors.email ? "#f87171" : "var(--color-border)")
                  }
                />
                {errors.email && (
                  <p className="mt-1 text-[11px] text-red-400">{errors.email}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-full py-3.5 text-xs font-black uppercase transition hover:opacity-90 active:scale-[0.98]"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                Odoslať objednávku
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
