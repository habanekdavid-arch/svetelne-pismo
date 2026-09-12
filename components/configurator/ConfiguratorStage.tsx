"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Lightbulb, LightbulbOff, ArrowDown } from "lucide-react";
import OrderModal from "@/components/configurator/OrderModal";
import EyebrowPill from "@/components/ui/EyebrowPill";
import type { Config, LightModeDirection, LightModeId, SignType } from "@/lib/types";
import { useSharedConfig } from "@/lib/config-context";
import { calculatePrice } from "@/lib/pricing";
import {
  fontOptions,
  lightColors,
  letterColorOptions,
  MATERIALS,
  MIN_DEPTH_MM,
  MAX_DEPTH_MM,
  LIGHT_MODES,
} from "@/lib/options";
import type { FontOption } from "@/lib/options";

// 3D preview needs WebGL — never render it on the server. Suspense shows a
// skeleton until the chunk loads; the scene itself renders instantly on top
// since Config already ships with non-empty defaults (text/font/material).
const LetterScene = dynamic(() => import("@/components/three/LetterScene"), {
  ssr: false,
  loading: () => <LetterSceneSkeleton />,
});

// ─────────────────────────────────────────────────────────────────────────────

// Light modes that trigger the dark-canvas preview automatically
const NIGHT_MODES: LightModeId[] = ["halo", "full"];

// ── Light mode glyph preview tunables ───────────────────────────────────────
const LIGHT_TILE_GLOW_SIZE  = 32;  // px — svg square inside each mode tile
const LIGHT_TILE_BLUR_TIGHT = 2.5; // front / full — crisp glow on the glyph
const LIGHT_TILE_BLUR_HALO  = 7.5; // back — diffuse halo behind the glyph

// ─────────────────────────────────────────────────────────────────────────────

export default function ConfiguratorStage() {
  const [manualMode, setManualMode] = useState<"day" | "night" | null>(null);
  // Default LED colour is the brand yellow — keep the hue slider + swatch
  // selection in sync with lib/options.ts lightColors' "yellow" entry.
  const [lightHue, setLightHue] = useState(41);
  const [selectedSwatch, setSelectedSwatch] = useState<string>("yellow");
  const [selectedBodySwatch, setSelectedBodySwatch] = useState<string>("black");
  const [orderOpen, setOrderOpen] = useState(false);
  const { setConfig: publishConfig } = useSharedConfig();

  // Remember the last active light mode so we can restore it when switching
  // back from plain → illuminated
  const lastLightModeRef = useRef<LightModeId>("front");

  const [config, setConfig] = useState<Config>({
    // Plain black "VÁŠ TEXT" on load — a blank, legible canvas, visible the
    // instant the page loads. The user turns on Svetelné/colour themselves.
    text:       "VÁŠ TEXT",
    font:       "archivo-black",
    material:   "plexi",
    signType:   "plain",
    lightMode:  "front",
    // Brand yellow — see lib/options.ts lightColors "yellow" / app/globals.css --color-primary.
    // Inert while signType is "plain"; used once the user switches to Svetelné.
    lightColor: "#FFAE00",
    bodyColor:  letterColorOptions.find((c) => c.id === "black")!.value,
    height:     35,
    thickness:  8,
    rotation:   0, // sign no longer rotates — kept for the Config shape / pricing
  });

  // Keep ShowcaseSection in sync with every config change
  useEffect(() => { publishConfig(config); }, [config, publishConfig]);

  // ── Derived state ────────────────────────────────────────────────────────
  const price = useMemo(() => calculatePrice(config), [config]);

  const currentMat = MATERIALS.find((m) => m.id === config.material) ?? MATERIALS[0];

  const filteredMaterials = MATERIALS.filter((m) =>
    config.signType === "illuminated" ? m.supportsIlluminated : m.supportsPlain,
  );

  const availableLightModes = LIGHT_MODES.filter((l) =>
    currentMat.lightModes.includes(l.id),
  );

  const previewChar = (config.text.trim().charAt(0) || "A").toUpperCase();
  const modeTileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fontTileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const previewMode: "day" | "night" =
    (config.signType === "illuminated" && NIGHT_MODES.includes(config.lightMode)) ||
    manualMode === "night"
      ? "night"
      : "day";

  const isNight = previewMode === "night";
  const isIlluminated = config.signType === "illuminated";

  // ── Side effects ─────────────────────────────────────────────────────────
  // Note: Deň/Noc used to toggle a `dark` class on <html>, re-theming the
  // whole site. That's gone — Noc now only darkens the visualisation panel
  // itself (see the canvas wrapper's background below), nothing else on the
  // page changes.
  //
  // Note: --accent used to be reassigned here to mirror the chosen LED colour
  // (config.lightColor), which meant the OBJEDNAŤ button and every other
  // --accent-driven element sitewide (Footer brand, FAQ, steps…) shifted
  // colour to match whatever LED colour was last picked. Removed — the site
  // accent is now the fixed brand yellow everywhere, matching vytlacto3d.

  // ── Actions ──────────────────────────────────────────────────────────────

  function patch(update: Partial<Config>) {
    setConfig((prev) => ({ ...prev, ...update }));
  }

  function handleSignTypeChange(type: SignType) {
    if (type === "plain") {
      // Remember current lightMode before hiding the panel
      lastLightModeRef.current = config.lightMode;
      setManualMode(null); // clear forced night when switching to plain
      patch({ signType: type });
      return;
    }

    // Switching to illuminated ─────────────────────────────────────────────
    // 1. Make sure current material supports illuminated
    let materialId = config.material;
    if (!currentMat.supportsIlluminated) {
      const firstIlluminable = MATERIALS.find((m) => m.supportsIlluminated);
      materialId = firstIlluminable?.id ?? config.material;
    }

    // 2. Restore last light mode if still valid for the (possibly new) material
    const targetMat = MATERIALS.find((m) => m.id === materialId) ?? currentMat;
    const restoredMode = targetMat.lightModes.includes(lastLightModeRef.current)
      ? lastLightModeRef.current
      : (targetMat.lightModes[0] ?? "front");

    patch({ signType: type, material: materialId, lightMode: restoredMode });
  }

  function handleMaterialChange(materialId: string) {
    const mat = MATERIALS.find((m) => m.id === materialId);
    if (!mat) return;

    // If new material doesn't support the current lightMode → pick first valid
    const validMode = mat.lightModes.includes(config.lightMode)
      ? config.lightMode
      : (mat.lightModes[0] ?? config.lightMode);

    // Thickness is free for every material — switching material never touches it.
    patch({ material: materialId, lightMode: validMode });
  }

  function setLightMode(id: LightModeId) {
    lastLightModeRef.current = id;
    patch({ lightMode: id });
  }

  function handleModeKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const backward = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !backward) return;
    e.preventDefault();
    const modes = availableLightModes;
    const nextIndex = (index + (forward ? 1 : -1) + modes.length) % modes.length;
    setLightMode(modes[nextIndex].id);
    modeTileRefs.current[nextIndex]?.focus();
  }

  function setLightColorFromSwatch(id: string, value: string, hue: number) {
    setSelectedSwatch(id);
    setLightHue(hue);
    patch({ lightColor: value });
  }

  function setLightColorFromSlider(hue: number) {
    setLightHue(hue);
    setSelectedSwatch("");
    patch({ lightColor: `hsl(${hue}, 92%, 58%)` });
  }

  function setBodyColor(id: string, value: string) {
    setSelectedBodySwatch(id);
    patch({ bodyColor: value });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  // Layout: preview column (Svetelné/Nesvetelné above it, Text below it) on
  // the left, every other parameter as a small card stacked beside it on the
  // right — most of the configurator lives next to the preview, not below it.

  return (
    <div className="mx-auto mt-14 max-w-5xl">

      {/* ── Section heading ──────────────────────────────────────────────── */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex justify-center">
          <EyebrowPill>Krok 1</EyebrowPill>
        </div>
        <h2 className="main-heading text-xl md:text-2xl" style={{ color: "var(--color-foreground)" }}>
          Nastav si nápis
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-5" style={{ color: "var(--color-muted)" }}>
          Vyplň parametre — náhľad aj cena sa menia okamžite.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_300px]">

        {/* ── LEFT: toggle above, preview, text below ──────────────────── */}
        <div>
          <div className="mb-3 flex justify-center lg:justify-start">
            <div className="flex gap-1 rounded-full p-1" style={{ background: "var(--color-surface)" }}>
              {(
                [
                  { type: "illuminated" as SignType, label: "Svetelné",   Icon: Lightbulb    },
                  { type: "plain"       as SignType, label: "Nesvetelné", Icon: LightbulbOff },
                ] as const
              ).map(({ type, label, Icon }) => {
                const active = config.signType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleSignTypeChange(type)}
                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium transition-all"
                    style={
                      active
                        ? { background: "var(--color-foreground)", color: "var(--color-background)" }
                        : { color: "var(--color-muted)" }
                    }
                  >
                    <Icon size={13} strokeWidth={2.25} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3D preview */}
          <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-semibold" style={{ color: "var(--color-foreground)" }}>Náhľad</p>
              <div
                className="flex items-center rounded-full p-1 transition-opacity duration-300"
                style={{
                  background: "var(--color-background)",
                  opacity: isIlluminated ? 1 : 0.3,
                  pointerEvents: isIlluminated ? undefined : "none",
                }}
              >
                {(["day", "night"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setManualMode(mode)}
                    className="rounded-full px-3 py-1.5 text-[10px] font-medium transition-all"
                    style={
                      previewMode === mode
                        ? { background: "var(--color-foreground)", color: "var(--color-background)" }
                        : { color: "var(--color-muted)" }
                    }
                  >
                    {mode === "day" ? "☀ Deň" : "☾ Noc"}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="relative h-105 w-full overflow-hidden rounded-xl transition-colors duration-500"
              style={{
                background: isNight
                  ? "radial-gradient(ellipse at 50% 38%, #1c1c22 0%, #0a0a0d 80%)"
                  : "var(--color-background)",
              }}
            >
              {isNight && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: `radial-gradient(ellipse at 50% 44%, ${config.lightColor}30 0%, transparent 65%)` }}
                />
              )}

              <LetterScene
                text={config.text}
                font={config.font}
                lightColor={config.lightColor}
                letterColor={config.bodyColor}
                thickness={config.thickness}
                material={config.material}
                signType={config.signType}
                lightMode={config.lightMode}
                height={config.height}
                previewMode={previewMode}
              />
            </div>
          </div>

          {/* Text — the only thing below the preview */}
          <div className="mx-auto mt-4 max-w-sm">
            <FieldCard title="Text" description="Text, ktorý sa zobrazí na nápise.">
              <input
                value={config.text}
                onChange={(e) => patch({ text: e.target.value })}
                maxLength={30}
                className="w-full rounded-full px-5 py-2.5 text-center text-sm font-semibold outline-none transition-colors"
                style={{ background: "var(--color-background)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
                placeholder="Napíšte váš text…"
                aria-label="Text na nápis"
              />
            </FieldCard>
          </div>
        </div>

        {/* ── RIGHT: everything else, stacked beside the preview ───────── */}
        <div className="space-y-3">

          <FieldCard title="Font" description="Vyber písmo — potiahni pre viac.">
            <FontPicker
              value={config.font}
              onChange={(id) => patch({ font: id })}
              tileRefs={fontTileRefs}
            />
          </FieldCard>

          <FieldCard title="Materiál" description="Ovplyvňuje vzhľad aj cenu.">
            <div className="grid grid-cols-2 gap-1.5">
              {filteredMaterials.map((mat) => {
                const active = config.material === mat.id;
                return (
                  <button
                    key={mat.id}
                    onClick={() => handleMaterialChange(mat.id)}
                    className="rounded-lg px-2 py-2 text-center text-[11px] font-medium leading-tight transition"
                    style={{
                      background: active ? "var(--color-primary)" : "var(--color-background)",
                      color: active ? "#000" : "var(--color-foreground)",
                      border: active ? "none" : "1px solid var(--color-border)",
                    }}
                  >
                    {mat.displayName}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] leading-4" style={{ color: "var(--color-muted)" }}>
              {currentMat.subtitle}
            </p>
          </FieldCard>

          <FieldCard title={isIlluminated ? "Farba tela" : "Farba materiálu"} description="Farba samotného písmena.">
            <div className="flex flex-wrap gap-2">
              {letterColorOptions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setBodyColor(c.id, c.value)}
                  title={c.label}
                  aria-label={c.label}
                  className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 ${
                    selectedBodySwatch === c.id ? "scale-110 border-(--color-foreground)" : "border-(--color-border)"
                  }`}
                  style={{ background: c.value }}
                />
              ))}
            </div>
            <p className="mt-2 text-[10px]" style={{ color: "var(--color-muted)" }}>
              {letterColorOptions.find((c) => c.id === selectedBodySwatch)?.label ?? ""}
            </p>
          </FieldCard>

          <FieldCard title="Výška" description="Výška písmen v centimetroch.">
            <div className="mb-1.5 flex justify-between text-[10px]" style={{ color: "var(--color-muted)" }}>
              <span>15 cm</span>
              <span className="font-semibold" style={{ color: "var(--color-foreground)" }}>{config.height} cm</span>
              <span>55 cm</span>
            </div>
            <input
              type="range"
              min="15"
              max="55"
              value={config.height}
              onChange={(e) => patch({ height: Number(e.target.value) })}
              className="range-clean w-full"
              aria-label="Výška písmen"
            />
          </FieldCard>

          <FieldCard title="Hrúbka" description="Hrúbka ovplyvňuje reliéf aj cenu.">
            <div className="mb-1.5 flex justify-between text-[10px]" style={{ color: "var(--color-muted)" }}>
              <span>Tenké</span>
              <span className="font-semibold" style={{ color: "var(--color-foreground)" }}>{config.thickness} mm</span>
              <span>Hrubé</span>
            </div>
            <input
              type="range"
              min={MIN_DEPTH_MM}
              max={MAX_DEPTH_MM}
              value={config.thickness}
              onChange={(e) => patch({ thickness: Number(e.target.value) })}
              className="range-clean w-full"
              aria-label="Hrúbka písma"
            />
          </FieldCard>

          {isIlluminated && (
            <FieldCard title="Svietenie" description="Odkiaľ vychádza svetlo.">
              {availableLightModes.length === 0 ? (
                <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                  Tento materiál nepodporuje svietenie.
                </p>
              ) : (
                <div role="radiogroup" aria-label="Svietenie" className="grid grid-cols-3 gap-1.5">
                  {availableLightModes.map((opt, i) => {
                    const active = config.lightMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        ref={(el) => { modeTileRefs.current[i] = el; }}
                        role="radio"
                        aria-checked={active}
                        tabIndex={active ? 0 : -1}
                        onClick={() => setLightMode(opt.id)}
                        onKeyDown={(e) => handleModeKeyDown(e, i)}
                        className="flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-center transition-all duration-200 hover:-translate-y-0.5"
                        style={{
                          background: "var(--color-background)",
                          boxShadow: active ? `0 0 0 2px var(--color-primary), inset 0 0 12px ${config.lightColor}2e` : "none",
                          opacity: active ? 1 : 0.72,
                        }}
                      >
                        <LightModeGlyphPreview direction={opt.direction} glowColor={config.lightColor} char={previewChar} />
                        <span className="text-[9.5px] font-medium" style={{ color: "var(--color-foreground)" }}>
                          {opt.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </FieldCard>
          )}

          {isIlluminated && (
            <FieldCard title="Farba svetla" description="Farba LED podsvietenia.">
              <input
                type="range"
                min="0"
                max="359"
                value={lightHue}
                onChange={(e) => setLightColorFromSlider(Number(e.target.value))}
                className="range-hue mb-3 w-full"
                style={{
                  background:
                    "linear-gradient(90deg,hsl(0,92%,58%),hsl(40,92%,58%),hsl(60,92%,58%),hsl(120,92%,58%),hsl(180,92%,58%),hsl(240,92%,58%),hsl(300,92%,58%),hsl(359,92%,58%))",
                }}
                aria-label="Odtieň farby svetla"
              />
              <div className="flex flex-wrap gap-2">
                {lightColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setLightColorFromSwatch(color.id, color.value, color.hue)}
                    title={color.label}
                    aria-label={color.label}
                    className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 ${
                      selectedSwatch === color.id ? "scale-110 border-(--color-foreground)" : "border-(--color-border)"
                    }`}
                    style={{
                      background: color.id === "white" ? "linear-gradient(135deg,#fff 50%,#e0e0e0 50%)" : color.value,
                    }}
                  />
                ))}
              </div>
            </FieldCard>
          )}

        </div>
      </div>

      {/* ── Closing line — same text + font as the hero heading above, so the
          page opens and closes on the same line ────────────────────────── */}
      <p
        className="main-heading mt-10 text-center text-lg md:text-xl"
        style={{ color: "var(--color-primary)" }}
      >
        Poď si s nami vytvoriť tvoj svetelný text
      </p>

      {/* ── Price + Order row ───────────────────────────────────────────────── */}
      <div
        className="mt-4 flex flex-col items-center justify-between gap-6 border-t pt-6 sm:flex-row"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
            Orientačná cena
          </p>
          <p className="mt-0.5 text-3xl font-black leading-none" style={{ color: "var(--color-foreground)" }}>
            {price} €
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--color-muted)" }}>
            Záväznú cenu dostanete po overení parametrov.
          </p>
        </div>

        <button
          onClick={() => setOrderOpen(true)}
          className="rounded-full px-14 py-4 text-sm font-black uppercase transition hover:opacity-85 active:scale-[0.97]"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          Objednať
        </button>
      </div>

      {/* ── Arrow to the most relevant realization ──────────────────────── */}
      <a
        href="#realizacie"
        className="mt-8 flex flex-col items-center gap-1.5 text-center transition hover:opacity-70"
      >
        <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
          Pozri realizáciu, ktorá najviac sedí s tvojím výberom
        </span>
        <ArrowDown size={16} className="animate-bounce" style={{ color: "var(--accent)" }} />
      </a>

      {/* ── Floating price widget — stays visible while scrolling the page ── */}
      <div className="pointer-events-none fixed bottom-5 left-5 z-40 hidden sm:block">
        <button
          onClick={() => setOrderOpen(true)}
          className="pointer-events-auto flex items-center gap-3 rounded-full py-2 pl-5 pr-2 shadow-2xl transition hover:opacity-90 active:scale-[0.97]"
          style={{ background: "var(--color-foreground)" }}
        >
          <span>
            <span className="block text-[9px] font-medium uppercase tracking-widest" style={{ color: "var(--color-background)", opacity: 0.6 }}>
              Orientačná cena
            </span>
            <span className="block text-lg font-black leading-tight" style={{ color: "var(--color-background)" }}>
              {price} €
            </span>
          </span>
          <span className="rounded-full px-4 py-2 text-[11px] font-black uppercase" style={{ background: "var(--accent)", color: "#000" }}>
            Objednať
          </span>
        </button>
      </div>

      {orderOpen && (
        <OrderModal config={config} onClose={() => setOrderOpen(false)} />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// One card = one parameter. Small bold title + a one-line muted description,
// same pattern vytlacto3d uses for its own parameter cards.
function FieldCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl p-3.5 ${className}`}
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <p className="text-[12px] font-semibold" style={{ color: "var(--color-foreground)" }}>{title}</p>
      {description && (
        <p className="mt-0.5 text-[10px] leading-4" style={{ color: "var(--color-muted)" }}>{description}</p>
      )}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

// ── Font picker — a horizontal scroll strip (drag/swipe through the fonts),
// each tile showing only the font's own name set in its own typeface —
// no separate "Aa" glyph line, no all-caps label. ───────────────────────────

function FontPicker({
  value,
  onChange,
  tileRefs,
}: {
  value: string;
  onChange: (id: string) => void;
  tileRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
}) {
  function handleTileKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const backward = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !backward) return;
    e.preventDefault();
    const nextIndex = (index + (forward ? 1 : -1) + fontOptions.length) % fontOptions.length;
    onChange(fontOptions[nextIndex].id);
    tileRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      className="relative -mx-3.5 px-3.5"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 12px, black calc(100% - 20px), transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 12px, black calc(100% - 20px), transparent)",
      }}
    >
      <div role="radiogroup" aria-label="Font" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {fontOptions.map((f, i) => (
          <FontTile
            key={f.id}
            font={f}
            active={value === f.id}
            index={i}
            onClick={() => onChange(f.id)}
            onKeyDown={handleTileKeyDown}
            tileRef={(el) => { tileRefs.current[i] = el; }}
          />
        ))}
      </div>
    </div>
  );
}

function FontTile({
  font,
  active,
  index,
  onClick,
  onKeyDown,
  tileRef,
}: {
  font: FontOption;
  active: boolean;
  index: number;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => void;
  tileRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      type="button"
      ref={tileRef}
      role="radio"
      aria-checked={active}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => onKeyDown(e, index)}
      className="shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-center transition"
      style={{
        background: active ? "var(--color-primary)" : "var(--color-background)",
        border: active ? "none" : "1px solid var(--color-border)",
      }}
    >
      <span
        className="text-[13px]"
        style={{ fontFamily: font.name, fontWeight: 600, color: active ? "#000" : "var(--color-foreground)" }}
      >
        {font.name}
      </span>
    </button>
  );
}

function LetterSceneSkeleton() {
  return (
    <div
      className="h-full w-full animate-pulse rounded-xl"
      style={{ background: "var(--color-surface-raised)" }}
      aria-hidden="true"
    />
  );
}

// ── Light mode glyph preview (inline SVG) ─────────────────────────────────────
// Shows WHERE the glow comes from on an actual letterform (the first character
// of the current text) instead of an abstract icon. Colour tracks the live
// FARBA slider; "muted" parts use currentColor so they inherit the tile's text
// colour and stay readable in both the active and inactive tile states.

function LightModeGlyphPreview({
  direction,
  glowColor,
  char,
}: {
  direction: LightModeDirection;
  glowColor: string;
  char: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const tightId = `lmt-${uid}`;
  const haloId  = `lmh-${uid}`;

  const glyph = { x: 32, y: 43, textAnchor: "middle" as const, fontSize: 42, fontWeight: 900 };

  return (
    <svg
      viewBox="0 0 64 64"
      width={LIGHT_TILE_GLOW_SIZE}
      height={LIGHT_TILE_GLOW_SIZE}
      aria-hidden="true"
    >
      <defs>
        <filter id={tightId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={LIGHT_TILE_BLUR_TIGHT} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={haloId} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation={LIGHT_TILE_BLUR_HALO} />
        </filter>
      </defs>

      {/* back — diffuse halo behind a dim glyph (glow on the wall) */}
      {direction === "back" && (
        <>
          <text {...glyph} fill={glowColor} filter={`url(#${haloId})`} opacity={0.9}>{char}</text>
          <text {...glyph} fill="currentColor" opacity={0.4}>{char}</text>
        </>
      )}

      {/* full — soft outer bloom behind the lit glyph */}
      {direction === "full" && (
        <text {...glyph} fill={glowColor} filter={`url(#${haloId})`} opacity={0.5}>{char}</text>
      )}

      {/* front / full — the glyph itself lit */}
      {(direction === "front" || direction === "full") && (
        <text {...glyph} fill={glowColor} filter={`url(#${tightId})`}>{char}</text>
      )}
    </svg>
  );
}
