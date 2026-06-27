"use client";

import { useMemo, useState } from "react";
import type { Config } from "@/lib/types";
import {
  fontOptions,
  materialOptions,
  lightingOptions,
  lightColors,
} from "@/lib/options";
import { calculatePrice } from "@/lib/pricing";

export default function Configurator() {
  const [config, setConfig] = useState<Config>({
    text: "VÁŠ TEXT",
    font: "modern",
    material: "alubond",
    lighting: "full",
    lightColor: "#00c8ff",
    bodyColor: "#f0f0f0",
    height: 35,
    thickness: 8,
  });
  const [rotation, setRotation] = useState(34);
  const [lightHue, setLightHue] = useState(195);
  const [selectedSwatch, setSelectedSwatch] = useState("cyan");

  function patch(update: Partial<Config>) {
    setConfig((prev) => ({ ...prev, ...update }));
  }

  function applyHue(hue: number) {
    setLightHue(hue);
    setSelectedSwatch("");
    patch({ lightColor: `hsl(${hue}, 92%, 58%)` });
  }

  function applySwatch(id: string, value: string, hue: number) {
    setSelectedSwatch(id);
    setLightHue(hue);
    patch({ lightColor: value });
  }

  const price = useMemo(() => calculatePrice(config), [config]);

  function handleOrder() {
    const mat = materialOptions.find((m) => m.id === config.material);
    const light = lightingOptions.find((l) => l.id === config.lighting);
    console.log("=== Konfigurácia objednávky ===", {
      text: config.text,
      font: config.font,
      material: mat?.label ?? config.material,
      lighting: light?.label ?? config.lighting,
      lightColor: config.lightColor,
      thickness: `${config.thickness} mm`,
      price: `${price} €`,
    });
  }

  return (
    <section id="konfigurator" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[200px_1fr_200px]">

          {/* ── LEFT: Font + Material ─────────────────────────────── */}
          <aside className="order-2 space-y-8 lg:order-1">

            {/* Font picker */}
            <div>
              <ControlLabel>Odporúčané písmo</ControlLabel>
              <div className="grid grid-cols-3 gap-2">
                {fontOptions.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => patch({ font: font.id })}
                    title={font.name}
                    className={[
                      "flex h-12 w-full flex-col items-center justify-center rounded-lg border transition",
                      config.font === font.id
                        ? "border-black bg-black text-white"
                        : "border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:border-[var(--color-foreground)]",
                    ].join(" ")}
                  >
                    <span className={`text-base leading-none ${font.className}`}>Aa</span>
                    <span className="mt-0.5 text-[9px] font-black uppercase leading-none opacity-50">
                      {font.name.slice(0, 5)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Material picker */}
            <div>
              <ControlLabel>Materiály</ControlLabel>
              <div className="space-y-1">
                {materialOptions.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => patch({ material: mat.id })}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition",
                      config.material === mat.id
                        ? "bg-[var(--color-foreground)] text-white"
                        : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-raised)]",
                    ].join(" ")}
                  >
                    <span className="text-[12px] font-black uppercase">{mat.label}</span>
                    <span className="text-[10px] opacity-40">×{mat.multiplier}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── CENTER: Preview + rotation + text input ───────────── */}
          <div className="order-1 flex flex-col items-center lg:order-2">

            <TextPreview
              text={config.text || "VÁŠ TEXT"}
              lightColor={config.lightColor}
              thickness={config.thickness}
              rotation={rotation}
            />

            {/* Rotation slider */}
            <div className="mt-4 w-full max-w-xs">
              <div className="mb-1 flex items-center justify-between">
                <span
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: "var(--color-muted)" }}
                >
                  Otáčanie
                </span>
                <span
                  className="text-[10px] font-black"
                  style={{ color: "var(--color-muted)" }}
                >
                  {rotation}°
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="359"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="range-clean w-full"
                aria-label="Otáčanie náhľadu"
              />
            </div>

            {/* Text input */}
            <input
              value={config.text}
              onChange={(e) => patch({ text: e.target.value })}
              maxLength={30}
              placeholder="Napíšte váš text…"
              aria-label="Text na nápis"
              className="mt-5 w-full max-w-xs rounded-full border px-6 py-3 text-center text-sm font-black uppercase tracking-wide outline-none transition"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-foreground)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-foreground)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-border)")
              }
            />
          </div>

          {/* ── RIGHT: Lighting + Color + Thickness ───────────────── */}
          <aside className="order-3 space-y-8">

            {/* Lighting grid */}
            <div>
              <ControlLabel>Svietenie</ControlLabel>
              <div className="grid grid-cols-3 gap-2">
                {lightingOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => patch({ lighting: opt.id })}
                    aria-label={opt.label}
                    aria-pressed={config.lighting === opt.id}
                    title={opt.label}
                    className={[
                      "flex h-14 w-full items-center justify-center rounded-xl transition",
                      config.lighting === opt.id
                        ? "bg-[var(--color-foreground)] text-white"
                        : "bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]",
                    ].join(" ")}
                  >
                    <LightingIcon id={opt.id} active={config.lighting === opt.id} />
                  </button>
                ))}
              </div>
              <p
                className="mt-2 text-center text-[10px] font-black uppercase tracking-widest"
                style={{ color: "var(--color-muted)" }}
              >
                {lightingOptions.find((o) => o.id === config.lighting)?.label}
              </p>
            </div>

            {/* Light color */}
            <div>
              <ControlLabel>Farba</ControlLabel>
              <input
                type="range"
                min="0"
                max="359"
                value={lightHue}
                onChange={(e) => applyHue(Number(e.target.value))}
                className="range-hue w-full"
                style={{
                  background:
                    "linear-gradient(90deg,hsl(0,92%,58%),hsl(40,92%,58%),hsl(60,92%,58%),hsl(120,92%,58%),hsl(180,92%,58%),hsl(240,92%,58%),hsl(300,92%,58%),hsl(359,92%,58%))",
                }}
                aria-label="Odtieň farby svetla"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lightColors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => applySwatch(c.id, c.value, c.hue)}
                    title={c.label}
                    aria-label={c.label}
                    className={[
                      "h-5 w-5 flex-shrink-0 rounded-full border-2 transition hover:scale-110",
                      selectedSwatch === c.id
                        ? "border-[var(--color-foreground)] scale-110"
                        : "border-[var(--color-border)]",
                    ].join(" ")}
                    style={{
                      background:
                        c.id === "white"
                          ? "linear-gradient(135deg,#fff 50%,#e0e0e0 50%)"
                          : c.value,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Thickness */}
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <ControlLabel as="span">Hrúbka</ControlLabel>
                <span
                  className="text-[11px] font-black"
                  style={{ color: "var(--color-muted)" }}
                >
                  {config.thickness} mm
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="20"
                value={config.thickness}
                onChange={(e) => patch({ thickness: Number(e.target.value) })}
                className="range-clean w-full"
                aria-label="Hrúbka písma"
              />
              <div
                className="mt-1 flex justify-between text-[9px] font-black uppercase"
                style={{ color: "var(--color-muted)", opacity: 0.5 }}
              >
                <span>Tenké</span>
                <span>Hrubé</span>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Price + CTA ──────────────────────────────────────────── */}
        <div
          className="mt-12 flex flex-col items-center justify-between gap-6 border-t pt-8 sm:flex-row"
          style={{ borderColor: "var(--color-border)" }}
        >
          {/* Price */}
          <div>
            <p
              className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: "var(--color-muted)" }}
            >
              Orientačná cena
            </p>
            <p
              className="mt-0.5 text-4xl font-black leading-none"
              style={{ color: "var(--color-foreground)" }}
            >
              {price} €
            </p>
            <p
              className="mt-1 text-[11px]"
              style={{ color: "var(--color-muted)" }}
            >
              Záväznú cenu dostanete po overení parametrov.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleOrder}
            className="rounded-full border px-16 py-4 text-sm font-black uppercase tracking-widest transition hover:bg-[var(--color-foreground)] hover:text-white active:scale-[0.97]"
            style={{
              borderColor: "var(--color-foreground)",
              color: "var(--color-foreground)",
            }}
          >
            Objednať
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function ControlLabel({
  children,
  as: Tag = "h3",
}: {
  children: React.ReactNode;
  as?: "h3" | "span";
}) {
  return (
    <Tag
      className="mb-2.5 block text-[11px] font-black uppercase tracking-widest"
      style={{ color: "var(--color-muted)" }}
    >
      {children}
    </Tag>
  );
}

/* ── Lighting icons (inline SVG) ──────────────────────────────────────────── */

function LightingIcon({ id, active }: { id: string; active: boolean }) {
  const s = active ? "white" : "currentColor";
  const f = active ? "white" : "currentColor";

  switch (id) {
    case "none":
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="8" width="20" height="12" rx="2" stroke={s} strokeWidth="1.5" />
          <line x1="7" y1="11" x2="21" y2="17" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "front":
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="8" width="16" height="12" rx="2" stroke={s} strokeWidth="1.5" />
          <rect x="4" y="8" width="16" height="12" rx="2" fill={f} fillOpacity="0.25" />
          <line x1="22" y1="11" x2="26" y2="10" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="14" x2="26" y2="14" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="17" x2="26" y2="18" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "halo":
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <ellipse cx="14" cy="14" rx="11" ry="8" fill={f} fillOpacity="0.18" />
          <rect x="5" y="9" width="18" height="10" rx="2" stroke={s} strokeWidth="1.5" />
        </svg>
      );
    case "edge":
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <rect x="5" y="9" width="18" height="10" rx="2" stroke={s} strokeWidth="1.5" />
          <line x1="5" y1="9" x2="5" y2="19" stroke={s} strokeWidth="3" strokeLinecap="round" />
          <line x1="23" y1="9" x2="23" y2="19" stroke={s} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "full":
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <rect x="6" y="9" width="16" height="10" rx="2" fill={f} fillOpacity="0.4" stroke={s} strokeWidth="1.5" />
          <line x1="4" y1="7" x2="2" y2="5" stroke={s} strokeWidth="1.4" strokeLinecap="round" />
          <line x1="14" y1="6" x2="14" y2="3" stroke={s} strokeWidth="1.4" strokeLinecap="round" />
          <line x1="24" y1="7" x2="26" y2="5" stroke={s} strokeWidth="1.4" strokeLinecap="round" />
          <line x1="4" y1="21" x2="2" y2="23" stroke={s} strokeWidth="1.4" strokeLinecap="round" />
          <line x1="24" y1="21" x2="26" y2="23" stroke={s} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "open":
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="8" width="20" height="12" rx="2" stroke={s} strokeWidth="1.5" />
          <circle cx="10" cy="14" r="1.8" fill={f} />
          <circle cx="14" cy="14" r="1.8" fill={f} />
          <circle cx="18" cy="14" r="1.8" fill={f} />
        </svg>
      );
    default:
      return null;
  }
}

/* ── CSS preview helpers ──────────────────────────────────────────────────── */

function withAlpha(color: string, alpha: number): string {
  const h = Math.round(alpha * 255).toString(16).padStart(2, "0");
  if (color.startsWith("#") && color.length === 7) return `${color}${h}`;
  if (color.startsWith("hsl("))
    return color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
  return color;
}

function buildGlow(color: string, thickness: number, rotation: number): string {
  const t = Math.min(Math.max(thickness, 4), 20);
  const depth = Math.round(t * 0.5); // 2 – 10 layers
  const ex = Math.sin((rotation * Math.PI) / 180);
  const shadows: string[] = [];

  // Bloom / glow
  shadows.push(`0 0 ${t}px ${color}`);
  shadows.push(`0 0 ${t * 2.5}px ${withAlpha(color, 0.6)}`);
  shadows.push(`0 0 ${t * 5}px ${withAlpha(color, 0.28)}`);

  // Extrusion — direction flips with rotateY so depth appears on the correct side
  for (let i = 1; i <= depth; i++) {
    const xOff = (-ex * i * 0.9).toFixed(1);
    const yOff = (i * 0.35).toFixed(1);
    const a = Math.max(0.88 - i * 0.07, 0.15);
    shadows.push(`${xOff}px ${yOff}px 0 ${withAlpha(color, a)}`);
  }

  return shadows.join(", ");
}

/* ── TextPreview ──────────────────────────────────────────────────────────── */

function TextPreview({
  text,
  lightColor,
  thickness,
  rotation,
}: {
  text: string;
  lightColor: string;
  thickness: number;
  rotation: number;
}) {
  return (
    <div
      className="relative flex h-85 w-full items-center justify-center overflow-hidden rounded-2xl"
      style={{ background: "#0d0d0d" }}
    >
      {/* Ambient radial glow backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 55%, ${withAlpha(lightColor, 0.18)} 0%, transparent 65%)`,
        }}
      />

      {/* 3D scene */}
      <div style={{ perspective: "600px" }}>
        <div
          className="flex flex-col items-center"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: "preserve-3d",
            transition: "transform 0.08s linear",
          }}
        >
          <span
            className="select-none px-2 text-4xl font-black uppercase leading-none tracking-tight md:text-5xl"
            style={{
              fontFamily: "var(--font-anton), sans-serif",
              color: "#ffffff",
              textShadow: buildGlow(lightColor, thickness, rotation),
            }}
          >
            {text}
          </span>

          {/* Ground arc — ellipse glow below letters */}
          <div
            aria-hidden="true"
            style={{
              marginTop: "1.5rem",
              width: "72%",
              height: "5px",
              borderRadius: "50%",
              background: lightColor,
              filter: `blur(${Math.round(thickness * 0.9)}px)`,
              opacity: 0.38,
            }}
          />
        </div>
      </div>
    </div>
  );
}
