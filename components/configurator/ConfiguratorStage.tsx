"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Lightbulb, LightbulbOff } from "lucide-react";
import OrderModal from "@/components/configurator/OrderModal";
import type { Config, LightModeDirection, LightModeId, MaterialUseTag, SignType } from "@/lib/types";
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

const USE_TAG_LABEL: Record<MaterialUseTag, string> = {
  interiér: "Interiér",
  exteriér: "Exteriér",
  oboje:    "Interiér aj exteriér",
};

// ── Light mode glyph preview tunables ───────────────────────────────────────
const LIGHT_TILE_GLOW_SIZE  = 42;  // px — svg square inside each mode tile
const LIGHT_TILE_BLUR_TIGHT = 2.5; // front / full — crisp glow on the glyph
const LIGHT_TILE_BLUR_HALO  = 7.5; // back — diffuse halo behind the glyph

// ── Font picker tunables ─────────────────────────────────────────────────────
const FONT_PREVIEW_SAMPLE = "Žiarivé písmo"; // diacritic sample — shows at a glance whether a font "has" č/š/ž etc.

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

  return (
    <div className="mx-auto mt-14 max-w-6xl">

      {/* ── SignType toggle ─────────────────────────────────────────────── */}
      <div className="mb-10 flex justify-center">
        <div
          className="flex gap-1 rounded-full p-1"
          style={{ background: "var(--color-surface)" }}
        >
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
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all"
                style={
                  active
                    ? { background: "var(--color-foreground)", color: "var(--color-background)" }
                    : { color: "var(--color-muted)" }
                }
              >
                <Icon size={13} strokeWidth={2.5} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Three-column grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[210px_1fr_210px]">

        {/* ── LEFT: Font + Material — stays at the edge, not a full-width bar ── */}
        <aside className="order-2 space-y-8 lg:order-1 lg:pt-8">

          {/* Font picker — compact carousel + expandable "all fonts" grid, sized for the sidebar */}
          <FontPicker
            value={config.font}
            onChange={(id) => patch({ font: id })}
            tileRefs={fontTileRefs}
          />

          {/* Materials — filtered by signType, shown by benefit not by technical name */}
          <section>
            <ControlLabel>Materiál</ControlLabel>
            <div className="space-y-1.5">
              {filteredMaterials.map((mat) => {
                const active = config.material === mat.id;
                return (
                  <button
                    key={mat.id}
                    onClick={() => handleMaterialChange(mat.id)}
                    className={`flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-(--color-foreground) text-(--color-background)"
                        : "bg-(--color-surface) text-(--color-foreground) hover:bg-(--color-surface-raised)"
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-[12px] font-black uppercase">{mat.displayName}</span>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide"
                        style={{
                          background: active ? "rgba(255,255,255,0.18)" : "var(--color-surface-raised)",
                          color: active ? "var(--color-background)" : "var(--color-muted)",
                        }}
                      >
                        {USE_TAG_LABEL[mat.useTag]}
                      </span>
                    </span>
                    <span
                      className="mt-0.5 text-[10px] leading-4"
                      style={{ opacity: active ? 0.75 : 0.55 }}
                    >
                      {mat.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        {/* ── CENTER: 3D Preview ─────────────────────────────────────────── */}
        <section className="order-1 flex flex-col items-center lg:order-2">

          {/* Day / Night toggle — only meaningful in illuminated mode */}
          <div
            className="mb-4 flex items-center self-end rounded-full p-1 transition-opacity duration-300"
            style={{
              background: "var(--color-surface)",
              opacity: config.signType === "illuminated" ? 1 : 0.3,
              pointerEvents: config.signType === "illuminated" ? undefined : "none",
            }}
          >
            {(["day", "night"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setManualMode(mode)}
                className="rounded-full px-4 py-1.5 text-[9px] font-black uppercase transition-all"
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

          {/* Canvas — its own day/night panel; Noc only darkens this box,
              never the rest of the page. */}
          <div
            className="relative h-105 w-full overflow-hidden rounded-3xl transition-colors duration-500"
            style={{
              background: isNight
                ? "radial-gradient(ellipse at 50% 38%, #1c1c22 0%, #0a0a0d 80%)"
                : "transparent",
            }}
          >
            {isNight && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse at 50% 44%, ${config.lightColor}30 0%, transparent 65%)`,
                }}
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

          {/* Height slider */}
          <div className="mt-6 w-full max-w-sm">
            <div
              className="mb-1 flex justify-between text-[10px] font-black uppercase"
              style={{ color: "var(--color-muted)" }}
            >
              <span>Výška</span>
              <span>{config.height} cm</span>
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
          </div>

          {/* Text input */}
          <input
            value={config.text}
            onChange={(e) => patch({ text: e.target.value })}
            maxLength={30}
            className="mt-5 w-full max-w-sm rounded-full px-6 py-3 text-center text-sm font-black uppercase tracking-wide outline-none transition-colors"
            style={{
              background: "var(--color-surface)",
              color: "var(--color-foreground)",
              border: "none",
            }}
            placeholder="Napíšte váš text…"
            aria-label="Text na nápis"
          />
        </section>

        {/* ── RIGHT: Lighting (conditional) + Color + Thickness ─────────── */}
        <aside className="order-3 space-y-8 lg:pt-8">

          {/* Svietenie — animated in/out based on signType */}
          <div
            style={{
              maxHeight: config.signType === "illuminated" ? "520px" : "0px",
              opacity:   config.signType === "illuminated" ? 1 : 0,
              overflow:  "hidden",
              transition: "max-height 0.35s ease, opacity 0.25s ease",
              pointerEvents: config.signType === "illuminated" ? undefined : "none",
            }}
          >
            <div className="space-y-8">

              {/* Light mode grid — visual glow previews, not abstract icons */}
              <section>
                <ControlLabel>Svietenie</ControlLabel>
                {availableLightModes.length === 0 ? (
                  <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                    Tento materiál nepodporuje svietenie.
                  </p>
                ) : (
                  <div
                    role="radiogroup"
                    aria-label="Svietenie"
                    className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                  >
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
                          className="flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center transition-all duration-200 hover:-translate-y-0.5"
                          style={{
                            background: "var(--color-surface)",
                            boxShadow: active
                              ? `0 0 0 2px var(--color-primary), inset 0 0 16px ${config.lightColor}2e`
                              : "none",
                            opacity: active ? 1 : 0.72,
                          }}
                        >
                          <LightModeGlyphPreview
                            direction={opt.direction}
                            glowColor={config.lightColor}
                            char={previewChar}
                          />
                          <span
                            className="text-[11px] font-black"
                            style={{ color: "var(--color-foreground)" }}
                          >
                            {opt.name}
                          </span>
                          <span
                            className="text-[9px] leading-tight"
                            style={{ color: "var(--color-muted)" }}
                          >
                            {opt.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Farba svetla */}
              <section>
                <ControlLabel>Farba svetla</ControlLabel>
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
                <div className="flex flex-wrap gap-2">
                  {lightColors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setLightColorFromSwatch(color.id, color.value, color.hue)}
                      title={color.label}
                      aria-label={color.label}
                      className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 ${
                        selectedSwatch === color.id
                          ? "scale-110 border-(--color-foreground)"
                          : "border-(--color-border)"
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

            </div>
          </div>

          {/* Farba písmena — always visible */}
          <section>
            <ControlLabel>
              {config.signType === "illuminated" ? "Farba tela" : "Farba materiálu"}
            </ControlLabel>
            <div className="flex flex-wrap gap-2">
              {letterColorOptions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setBodyColor(c.id, c.value)}
                  title={c.label}
                  aria-label={c.label}
                  className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 ${
                    selectedBodySwatch === c.id
                      ? "scale-110 border-(--color-foreground)"
                      : "border-(--color-border)"
                  }`}
                  style={{ background: c.value }}
                />
              ))}
            </div>
            <p
              className="mt-1.5 text-[10px] font-black uppercase"
              style={{ color: "var(--color-muted)" }}
            >
              {letterColorOptions.find((c) => c.id === selectedBodySwatch)?.label ?? ""}
            </p>
          </section>

          {/* Hrúbka — funguje rovnako pre každý font aj materiál */}
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <ControlLabel as="span">Hrúbka</ControlLabel>
              <span className="text-[11px] font-black" style={{ color: "var(--color-muted)" }}>
                {config.thickness} mm
              </span>
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
            <div
              className="mt-1 flex justify-between text-[9px] font-black uppercase"
              style={{ color: "var(--color-muted)", opacity: 0.5 }}
            >
              <span>Tenké</span>
              <span>Hrubé</span>
            </div>
          </section>

        </aside>
      </div>

      {/* ── Price + Order row ───────────────────────────────────────────────── */}
      <div
        className="mt-12 flex flex-col items-center justify-between gap-6 border-t pt-8 sm:flex-row"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div>
          <p
            className="text-[11px] font-black uppercase tracking-widest"
            style={{ color: "var(--color-muted)" }}
          >
            Orientačná cena
          </p>
          <p className="mt-0.5 text-4xl font-black leading-none" style={{ color: "var(--color-foreground)" }}>
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

      {orderOpen && (
        <OrderModal config={config} onClose={() => setOrderOpen(false)} />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Font picker — one flat, always-visible grid. Fewer fonts (see
// lib/options.ts fontOptions) means no carousel and no "show all" toggle are
// needed anymore — every choice is a single click away. ─────────────────────

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
    <section>
      <ControlLabel>Font</ControlLabel>
      <div
        role="radiogroup"
        aria-label="Font"
        className="grid grid-cols-2 gap-2"
      >
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
    </section>
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
      title={font.name}
      className="font-tile flex w-full flex-col items-center gap-1 rounded-2xl px-2.5 py-3 text-center"
      style={{
        background: active ? "var(--color-surface-raised)" : "var(--color-surface)",
      }}
    >
      <span
        className="text-[26px] leading-none"
        style={{ fontFamily: font.name, fontWeight: 700, color: "var(--color-foreground)" }}
      >
        Aa
      </span>
      <span
        className="w-full text-[11px] leading-snug break-words"
        style={{ fontFamily: font.name, fontWeight: 600, color: "var(--color-foreground)" }}
      >
        {FONT_PREVIEW_SAMPLE}
      </span>
      <span
        className="w-full text-[8px] font-black uppercase leading-tight tracking-wide"
        style={{ color: active ? "var(--color-primary)" : "var(--color-muted)" }}
      >
        {font.name}
      </span>
    </button>
  );
}

function LetterSceneSkeleton() {
  return (
    <div
      className="h-full w-full animate-pulse rounded-2xl"
      style={{ background: "var(--color-surface)" }}
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
