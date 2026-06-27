"use client";

import { useEffect, useMemo, useState } from "react";
import LetterScene from "@/components/three/LetterScene";
import OrderModal from "@/components/configurator/OrderModal";
import type { Config } from "@/lib/types";
import { calculatePrice } from "@/lib/pricing";
import {
  fontOptions,
  lightingOptions,
  lightColors,
  materialOptions,
} from "@/lib/options";

const LETTER_COLOR = "#f0f0f0";

export default function ConfiguratorStage() {
  const [manualMode, setManualMode] = useState<"day" | "night" | null>(null);
  const [lightHue, setLightHue] = useState(195);
  const [selectedSwatch, setSelectedSwatch] = useState<string>("cyan");
  const [orderOpen, setOrderOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const [config, setConfig] = useState<Config>({
    text: "VÁŠ TEXT",
    font: "modern",
    material: "alubond",
    lighting: "full",
    lightColor: "#00c8ff",
    bodyColor: LETTER_COLOR,
    height: 35,
    thickness: 8,
  });

  const price = useMemo(() => calculatePrice(config), [config]);
  const glowModes = ["halo", "full", "open"];

  // Derive preview mode: glow modes force night; manual toggle overrides otherwise
  const previewMode: "day" | "night" = glowModes.includes(config.lighting)
    ? "night"
    : (manualMode ?? "day");

  // Sync accent CSS variable with chosen light color
  useEffect(() => {
    const accent =
      config.lightColor === "#ffffff" ? "#c8c8c8" : config.lightColor;
    document.documentElement.style.setProperty("--accent", accent);
  }, [config.lightColor]);

  function setLightColorFromSwatch(id: string, value: string, hue: number) {
    setSelectedSwatch(id);
    setLightHue(hue);
    setConfig({ ...config, lightColor: value });
  }

  function setLightColorFromSlider(hue: number) {
    setLightHue(hue);
    setSelectedSwatch("");
    const color = `hsl(${hue}, 92%, 58%)`;
    setConfig({ ...config, lightColor: color });
  }

  const darkBg = previewMode === "night" || glowModes.includes(config.lighting);

  return (
    <div className="mx-auto mt-14 max-w-6xl">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[210px_1fr_210px]">
        {/* ── LEFT: Font + Material ── */}
        <aside className="order-2 space-y-8 lg:order-1 lg:pt-8">
          <section>
            <ControlLabel>Odporúčané písmo</ControlLabel>
            <div className="grid grid-cols-3 gap-2">
              {fontOptions.map((font) => (
                <button
                  key={font.id}
                  onClick={() => setConfig({ ...config, font: font.id })}
                  title={font.name}
                  className={`group relative flex h-12 w-full flex-col items-center justify-center rounded-lg border text-[11px] transition ${
                    config.font === font.id
                      ? "border-black bg-black text-white"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                  }`}
                >
                  <span className={`text-base leading-none ${font.className}`}>
                    Aa
                  </span>
                  <span
                    className={`mt-0.5 text-[9px] font-black uppercase leading-none ${config.font === font.id ? "text-white/70" : "text-neutral-400"}`}
                  >
                    {font.name.slice(0, 5)}
                  </span>
                  <span className="pointer-events-none absolute bottom-14 left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-[10px] font-bold text-white group-hover:block">
                    {font.name}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <ControlLabel>Materiály</ControlLabel>
            <div className="space-y-1">
              {materialOptions.map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => setConfig({ ...config, material: mat.id })}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition ${
                    config.material === mat.id
                      ? "bg-black text-white"
                      : "bg-neutral-100 text-black hover:bg-neutral-200"
                  }`}
                >
                  <span className="text-[12px] font-black uppercase">
                    {mat.label}
                  </span>
                  <span
                    className={`text-[10px] ${config.material === mat.id ? "text-white/60" : "text-neutral-400"}`}
                  >
                    ×{mat.multiplier}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* ── CENTER: 3D Preview + controls ── */}
        <section className="order-1 flex flex-col items-center lg:order-2">
          {/* Canvas container */}
          <div
            className={`relative h-95 w-full overflow-hidden rounded-3xl transition-colors duration-500 ${
              darkBg ? "bg-neutral-950" : "bg-neutral-100"
            }`}
          >
            {/* Radial glow overlay when in night/glow mode */}
            {darkBg && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse at 50% 44%, ${config.lightColor}22 0%, transparent 60%)`,
                }}
              />
            )}

            <LetterScene
              text={config.text}
              lightColor={config.lightColor}
              letterColor={LETTER_COLOR}
              thickness={config.thickness}
              material={config.material}
              lighting={config.lighting}
              height={config.height}
              previewMode={previewMode}
              reducedMotion={reducedMotion}
            />

            {/* Day / Night toggle */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/30 p-1 backdrop-blur-sm">
              <button
                onClick={() => setManualMode("day")}
                className={`rounded-full px-3 py-1 text-[9px] font-black uppercase transition ${
                  previewMode === "day"
                    ? "bg-white text-black"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Deň
              </button>
              <button
                onClick={() => setManualMode("night")}
                className={`rounded-full px-3 py-1 text-[9px] font-black uppercase transition ${
                  previewMode === "night"
                    ? "bg-white text-black"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Noc
              </button>
            </div>
          </div>

          {/* Rotation slider */}
          <div className="mt-4 w-full max-w-sm">
            <div className="mb-1 flex justify-between text-[10px] font-black uppercase text-neutral-400">
              <span>Otáčanie</span>
              <span>{config.height}°</span>
            </div>
            <input
              type="range"
              min="15"
              max="55"
              value={config.height}
              onChange={(e) =>
                setConfig({ ...config, height: Number(e.target.value) })
              }
              className="range-clean w-full"
              aria-label="Otáčanie náhľadu"
            />
          </div>

          {/* Text input */}
          <input
            value={config.text}
            onChange={(e) => setConfig({ ...config, text: e.target.value })}
            maxLength={30}
            className="mt-6 w-full max-w-sm rounded-full border border-neutral-200 bg-white px-6 py-3 text-center text-sm font-black uppercase tracking-wide outline-none transition focus:border-black focus:shadow-sm"
            placeholder="Napíšte váš text…"
            aria-label="Text na nápis"
          />
        </section>

        {/* ── RIGHT: Lighting + Color + Thickness ── */}
        <aside className="order-3 space-y-8 lg:pt-8">
          {/* Lighting grid */}
          <section>
            <ControlLabel>Svietenie</ControlLabel>
            <div className="grid grid-cols-3 gap-2">
              {lightingOptions.map((opt) => (
                <div key={opt.id} className="group relative">
                  <button
                    onClick={() =>
                      setConfig({ ...config, lighting: opt.id })
                    }
                    aria-label={opt.label}
                    aria-pressed={config.lighting === opt.id}
                    className={`flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl transition ${
                      config.lighting === opt.id
                        ? "bg-black text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    <LightingIcon
                      id={opt.id}
                      active={config.lighting === opt.id}
                    />
                  </button>
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 w-52 -translate-x-1/2 rounded-xl bg-black px-4 py-3 text-center text-[11px] font-semibold leading-4 text-white opacity-0 shadow-xl transition group-hover:opacity-100">
                    <strong
                      className="mb-1 block text-[12px] font-black"
                      style={{ color: "var(--accent)" }}
                    >
                      {opt.label}
                    </strong>
                    {opt.description}
                  </div>
                </div>
              ))}
            </div>
            {/* Active label */}
            <p className="mt-2 text-center text-[10px] font-black uppercase text-neutral-400">
              {lightingOptions.find((o) => o.id === config.lighting)?.label}
            </p>
          </section>

          {/* Light color */}
          <section>
            <ControlLabel>Farba svetla</ControlLabel>

            {/* Hue slider */}
            <div className="relative mb-3">
              <input
                type="range"
                min="0"
                max="359"
                value={lightHue}
                onChange={(e) => setLightColorFromSlider(Number(e.target.value))}
                className="range-hue w-full"
                style={{
                  background:
                    "linear-gradient(90deg,hsl(0,92%,58%),hsl(40,92%,58%),hsl(60,92%,58%),hsl(120,92%,58%),hsl(180,92%,58%),hsl(240,92%,58%),hsl(300,92%,58%),hsl(359,92%,58%))",
                }}
                aria-label="Odtieň farby svetla"
              />
            </div>

            {/* Quick swatches */}
            <div className="flex flex-wrap gap-2">
              {lightColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() =>
                    setLightColorFromSwatch(color.id, color.value, color.hue)
                  }
                  title={color.label}
                  aria-label={color.label}
                  className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 ${
                    selectedSwatch === color.id
                      ? "border-black scale-110"
                      : "border-neutral-200"
                  }`}
                  style={{
                    background:
                      color.id === "white"
                        ? "linear-gradient(135deg,#fff 50%,#e0e0e0 50%)"
                        : color.value,
                  }}
                />
              ))}
            </div>
          </section>

          {/* Thickness */}
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <ControlLabel as="span">Hrúbka</ControlLabel>
              <span className="text-[11px] font-black text-neutral-400">
                {config.thickness} mm
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="20"
              value={config.thickness}
              onChange={(e) =>
                setConfig({ ...config, thickness: Number(e.target.value) })
              }
              className="range-clean w-full"
              aria-label="Hrúbka písma"
            />
            <div className="mt-1 flex justify-between text-[9px] font-black uppercase text-neutral-300">
              <span>Tenké</span>
              <span>Hrubé</span>
            </div>
          </section>
        </aside>
      </div>

      {/* ── PRICE + ORDER ROW ── */}
      <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-neutral-200 pt-8 sm:flex-row">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-400">
            Orientačná cena
          </p>
          <p className="mt-0.5 text-4xl font-black leading-none">{price} €</p>
          <p className="mt-1 text-[11px] text-neutral-400">
            Záväznú cenu dostanete po overení parametrov.
          </p>
        </div>

        <button
          onClick={() => setOrderOpen(true)}
          className="rounded-full px-14 py-4 text-sm font-black uppercase text-black transition hover:opacity-85 active:scale-[0.97]"
          style={{ background: "var(--accent)" }}
        >
          Objednať
        </button>
      </div>

      {orderOpen && (
        <OrderModal config={config} onClose={() => setOrderOpen(false)} />
      )}
    </div>
  );
}

/* ── Helpers ── */

function ControlLabel({
  children,
  as: Tag = "h3",
}: {
  children: React.ReactNode;
  as?: "h3" | "span";
}) {
  return (
    <Tag className="mb-2.5 block text-[11px] font-black uppercase tracking-widest text-neutral-400">
      {children}
    </Tag>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/* ── Lighting icons (inline SVG) ── */

function LightingIcon({ id, active }: { id: string; active: boolean }) {
  const stroke = active ? "white" : "currentColor";
  const fill = active ? "white" : "currentColor";

  switch (id) {
    case "none":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="8" width="20" height="12" rx="2" stroke={stroke} strokeWidth="1.5" />
          <line x1="7" y1="11" x2="21" y2="17" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "front":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="8" width="16" height="12" rx="2" stroke={stroke} strokeWidth="1.5" />
          <rect x="4" y="8" width="16" height="12" rx="2" fill={fill} fillOpacity="0.25" />
          <line x1="22" y1="11" x2="26" y2="10" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="14" x2="26" y2="14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="17" x2="26" y2="18" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "halo":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <ellipse cx="14" cy="14" rx="11" ry="8" fill={fill} fillOpacity="0.18" />
          <rect x="5" y="9" width="18" height="10" rx="2" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case "edge":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="5" y="9" width="18" height="10" rx="2" stroke={stroke} strokeWidth="1.5" />
          <line x1="5" y1="9" x2="5" y2="19" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <line x1="23" y1="9" x2="23" y2="19" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "full":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="6" y="9" width="16" height="10" rx="2" fill={fill} fillOpacity="0.4" stroke={stroke} strokeWidth="1.5" />
          <line x1="4" y1="7" x2="2" y2="5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <line x1="14" y1="6" x2="14" y2="3" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <line x1="24" y1="7" x2="26" y2="5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <line x1="4" y1="21" x2="2" y2="23" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <line x1="24" y1="21" x2="26" y2="23" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "open":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="8" width="20" height="12" rx="2" stroke={stroke} strokeWidth="1.5" />
          <circle cx="10" cy="14" r="1.8" fill={fill} />
          <circle cx="14" cy="14" r="1.8" fill={fill} />
          <circle cx="18" cy="14" r="1.8" fill={fill} />
        </svg>
      );
    default:
      return null;
  }
}
