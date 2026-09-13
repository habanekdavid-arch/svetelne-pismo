"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Lightbulb, LightbulbOff, ArrowDown } from "lucide-react";
import EyebrowPill from "@/components/ui/EyebrowPill";
import type { Config, LightModeDirection, LightModeId, SignType } from "@/lib/types";
import { useSharedConfig } from "@/lib/config-context";
import { useCart } from "@/lib/cart-context";
import { calculatePrice } from "@/lib/pricing";
import { formatEur, netFromGross, vatFromGross, VAT_RATE } from "@/lib/vat";
import {
  fontOptions,
  lightColors,
  letterColorOptions,
  MATERIALS,
  MIN_DEPTH_MM,
  maxDepthMm,
  MIN_HEIGHT_CM,
  MAX_HEIGHT_CM,
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

// ── Slider quick-picks ──────────────────────────────────────────────────────
// Same "slider + chips" pattern vytlacto3d uses for scale/infill: drag for a
// precise value, or tap a chip for the common one. Every value must sit inside
// the slider's own min/max.
const HEIGHT_CHIPS = [10, 20, 30, 40, 55];
// Two sets, because the two kinds of sign are built differently: a cut letter
// is a sheet, a lit letter is a box deep enough for the LEDs.
const THICKNESS_CHIPS_PLAIN       = [4, 6, 8, 10];
const THICKNESS_CHIPS_ILLUMINATED = [10, 20, 30, 40, 50];

// ─────────────────────────────────────────────────────────────────────────────

export default function ConfiguratorStage() {
  const [manualMode, setManualMode] = useState<"day" | "night" | null>(null);
  // Default LED colour is the brand yellow — keep the hue slider + swatch
  // selection in sync with lib/options.ts lightColors' "yellow" entry.
  const [lightHue, setLightHue] = useState(41);
  const [selectedSwatch, setSelectedSwatch] = useState<string>("yellow");
  const [selectedBodySwatch, setSelectedBodySwatch] = useState<string>("black");
  const { setConfig: publishConfig } = useSharedConfig();
  const { add: addToCart, checkout } = useCart();

  // Remember the last active light mode so we can restore it when switching
  // back from plain → illuminated
  const lastLightModeRef = useRef<LightModeId>("front");

  const [config, setConfig] = useState<Config>({
    // Plain black "Váš text" on load — a blank, legible canvas, visible the
    // instant the page loads. The user turns on Svetelné/colour themselves.
    text:       "Váš text",
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

  // The customer's own Deň/Noc choice always wins; the light mode only picks
  // the DEFAULT for the modes that read best in the dark.
  //
  // This used to be an OR: halo and full forced night outright, so the Deň
  // button did nothing at all in those modes and an illuminated sign could
  // never be seen in daylight — exactly what a customer wants to judge before
  // buying. Now the automatic choice is only a starting point.
  const autoMode: "day" | "night" =
    config.signType === "illuminated" && NIGHT_MODES.includes(config.lightMode)
      ? "night"
      : "day";
  const previewMode: "day" | "night" = manualMode ?? autoMode;

  const isNight = previewMode === "night";
  const isIlluminated = config.signType === "illuminated";
  const maxThickness  = maxDepthMm(config.signType);

  const currentFont = fontOptions.find((f) => f.id === config.font);
  const currentLightMode = LIGHT_MODES.find((l) => l.id === config.lightMode);

  // Live one-line recap shown under the 3D preview, so the chosen parameters
  // stay readable without looking back up the settings column.
  const summary = [
    currentFont?.name,
    currentMat.displayName,
    `${config.height} cm`,
    `${config.thickness} mm`,
    ...(isIlluminated && currentLightMode ? [currentLightMode.name] : []),
  ].filter(Boolean) as string[];

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
      // A cut letter is a thin sheet, so a 40 mm body from the lit variant
      // has to come back inside the plain range instead of quoting a sign
      // the workshop would not make.
      patch({ signType: type, thickness: Math.min(config.thickness, maxDepthMm("plain")) });
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
  // One large rounded panel (vytlacto3d's configurator shell), split into a
  // sticky 3D preview on the left and EVERY parameter as a card in the column
  // beside it — nothing the customer sets lives below the preview any more.

  return (
    <div className="mx-auto mt-14 max-w-6xl">
      <div className="config-shell rounded-[32px] p-4 sm:p-6 md:p-7">

        {/* ── Panel header ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <EyebrowPill>Krok 1</EyebrowPill>
            <h2
              className="section-heading mt-3 text-2xl md:text-3xl"
              style={{ color: "var(--color-foreground)" }}
            >
              Nastav si nápis
            </h2>
            <p
              className="mt-2 max-w-lg text-sm leading-6"
              style={{ color: "var(--color-muted)" }}
            >
              Každý parameter mení náhľad aj cenu okamžite.
            </p>
          </div>

          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold"
            style={{
              background: "var(--color-background)",
              border: "1px solid var(--color-border)",
              color: "var(--color-muted)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
              aria-hidden="true"
            />
            Cena aktuálna
          </span>
        </div>

        {/* ── Preview, full width ──────────────────────────────────────────
            The preview used to be one narrow column wedged between two
            columns of settings, so the sign rendered small. It now spans the
            whole configurator — roughly three times the width — and the
            parameters sit below it in two groups. */}
        {/* ── CENTRE: 3D preview + price, sticky as one block ───────────── */}
        <div className="space-y-4">
        <div
          className="rounded-[26px] p-4"
          style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[13px] font-extrabold" style={{ color: "var(--color-foreground)" }}>
              Náhľad
            </p>
            <div
              className="flex items-center rounded-full p-1 transition-opacity duration-300"
              style={{
                background: "var(--color-surface)",
                opacity: isIlluminated ? 1 : 0.35,
                pointerEvents: isIlluminated ? undefined : "none",
              }}
            >
              {(["day", "night"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setManualMode(mode)}
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold transition-all"
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
            className="relative h-105 w-full overflow-hidden rounded-[20px] transition-colors duration-500 lg:h-[30rem]"
            style={{
              background: isNight
                ? "radial-gradient(ellipse at 50% 38%, #1c1c22 0%, #0a0a0d 80%)"
                : "radial-gradient(ellipse at 50% 40%, var(--color-background) 0%, var(--color-surface-raised) 120%)",
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

          {/* Live recap of what's currently set */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summary.map((item) => (
              <span
                key={item}
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-muted)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ── Text — first, and across the whole configurator ───────────────
            It is the one thing every customer changes, and the thing the
            preview above is showing, so it leads the settings instead of
            sitting third down a column. ── */}
        <FieldCard title="Text" description="Napíšte, čo má na nápise svietiť.">
          <input
            value={config.text}
            onChange={(e) => patch({ text: e.target.value })}
            maxLength={30}
            className="w-full rounded-2xl px-5 py-4 text-center text-lg font-extrabold outline-none transition-colors"
            style={{ background: "var(--color-surface)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
            placeholder="Napíšte váš text…"
            aria-label="Text na nápis"
          />
        </FieldCard>

        {/* ── The rest — four cards instead of eight ────────────────────────
            Type, lighting direction and LED colour were three separate cards
            for what is really one decision; so were material + colour, and
            height + thickness. Grouping them took the configurator from nine
            panels down to five without removing a single setting. ── */}
        <div className="mt-3 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">

          {/* ── LEFT: lighting, then material and colour ── */}
          <div className="space-y-3">

            <FieldCard title="Svietenie" description="Či nápis svieti, odkiaľ a akou farbou.">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { type: "illuminated" as SignType, label: "Svetelné",   Icon: Lightbulb    },
                    { type: "plain"       as SignType, label: "Nesvetelné", Icon: LightbulbOff },
                  ] as const
                ).map(({ type, label, Icon }) => (
                  <Seg
                    key={type}
                    active={config.signType === type}
                    onClick={() => handleSignTypeChange(type)}
                  >
                    <Icon size={14} strokeWidth={2.25} />
                    {label}
                  </Seg>
                ))}
              </div>

              {isIlluminated && (
                availableLightModes.length === 0 ? (
                  <p className="mt-3 text-[11px]" style={{ color: "var(--color-muted)" }}>
                    Tento materiál nepodporuje svietenie.
                  </p>
                ) : (
                  <>
                    <p className="mb-2 mt-4 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
                      Odkiaľ vychádza svetlo
                    </p>
                    <div role="radiogroup" aria-label="Svietenie" className="grid grid-cols-3 gap-2">
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
                            className="flex flex-col items-center gap-1.5 rounded-2xl px-1.5 py-3 text-center transition-all duration-200 hover:-translate-y-0.5"
                            style={{
                              background: "var(--color-surface)",
                              border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                              boxShadow: active ? `0 6px 18px -8px rgba(255,174,0,.7), inset 0 0 14px ${config.lightColor}2e` : "none",
                              opacity: active ? 1 : 0.72,
                            }}
                          >
                            <LightModeGlyphPreview direction={opt.direction} glowColor={config.lightColor} char={previewChar} />
                            <span className="text-[10px] font-bold" style={{ color: "var(--color-foreground)" }}>
                              {opt.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="mb-2 mt-4 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
                      Farba svetla
                    </p>
                    <input
                      type="range"
                      min="0"
                      max="359"
                      value={lightHue}
                      onChange={(e) => setLightColorFromSlider(Number(e.target.value))}
                      className="range-hue mb-3.5 w-full"
                      style={{
                        background:
                          "linear-gradient(90deg,hsl(0,92%,58%),hsl(40,92%,58%),hsl(60,92%,58%),hsl(120,92%,58%),hsl(180,92%,58%),hsl(240,92%,58%),hsl(300,92%,58%),hsl(359,92%,58%))",
                      }}
                      aria-label="Odtieň farby svetla"
                    />
                    <SwatchRow
                      options={lightColors}
                      selectedId={selectedSwatch}
                      onSelect={(c) => {
                        const hue = lightColors.find((l) => l.id === c.id)?.hue ?? 0;
                        setLightColorFromSwatch(c.id, c.value, hue);
                      }}
                      splitWhite
                    />
                  </>
                )
              )}
            </FieldCard>

            <FieldCard title="Materiál a farba" description="Z čoho je nápis a akú má farbu.">
              <div className="grid grid-cols-2 gap-2">
                {filteredMaterials.map((mat) => (
                  <Seg
                    key={mat.id}
                    active={config.material === mat.id}
                    onClick={() => handleMaterialChange(mat.id)}
                  >
                    {mat.displayName}
                  </Seg>
                ))}
              </div>
              <p
                className="mt-3 rounded-2xl px-3.5 py-2.5 text-[11px] leading-5"
                style={{ background: "var(--color-surface)", color: "var(--color-muted)" }}
              >
                {currentMat.subtitle}
              </p>

              <p className="mb-2 mt-4 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
                {isIlluminated ? "Farba tela" : "Farba materiálu"}
                <span className="ml-1.5 font-semibold" style={{ color: "var(--color-foreground)" }}>
                  — {letterColorOptions.find((c) => c.id === selectedBodySwatch)?.label ?? ""}
                </span>
              </p>
              <SwatchRow
                options={letterColorOptions}
                selectedId={selectedBodySwatch}
                onSelect={(c) => setBodyColor(c.id, c.value)}
              />
            </FieldCard>

          </div>

          {/* ── RIGHT: typeface and dimensions ── */}
          <div className="space-y-3">
            <FieldCard title="Font" description="Písmo, ktorým sa nápis vyreže.">
              <FontPicker
                value={config.font}
                onChange={(id) => patch({ font: id })}
                tileRefs={fontTileRefs}
              />
            </FieldCard>

            <FieldCard title="Rozmery" description="Výška písmen a hrúbka materiálu.">
              <p className="mb-2 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
                Výška písmen
              </p>
              <SliderBox
                value={config.height}
                min={MIN_HEIGHT_CM}
                max={MAX_HEIGHT_CM}
                suffix=" cm"
                chips={HEIGHT_CHIPS}
                onChange={(v) => patch({ height: v })}
                ariaLabel="Výška písmen"
              />

              <p className="mb-2 mt-4 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
                Hrúbka
              </p>
              <SliderBox
                value={config.thickness}
                min={MIN_DEPTH_MM}
                max={maxThickness}
                suffix=" mm"
                chips={isIlluminated ? THICKNESS_CHIPS_ILLUMINATED : THICKNESS_CHIPS_PLAIN}
                onChange={(v) => patch({ thickness: v })}
                ariaLabel="Hrúbka písma"
              />
            </FieldCard>
          </div>
        </div>
        </div>

        {/* ── Price ─────────────────────────────────────────────────────────
            Shape taken from vytlacto3d's price block: the headline figure with
            an amber "Aktuálna cena" badge beside it, then the VAT split and a
            grid of technical details. Its detail fields are 3D-printing ones
            (weight, print time, scale); these are the equivalents for a sign. */}
        <div className="price-card mt-4 rounded-[28px] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
                Orientačná cena s DPH
              </div>
              <div
                className="mt-1 text-4xl font-extrabold tracking-tight"
                style={{ color: "var(--color-foreground)" }}
              >
                {formatEur(price)}
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--color-muted-light)" }}>
                Záväznú cenu dostanete po overení parametrov.
              </div>
            </div>

            <div
              className="rounded-2xl px-4 py-3 text-sm font-extrabold"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Aktuálna cena
            </div>
          </div>

          {/* VAT split */}
          <div
            className="mt-5 rounded-well p-4"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="mb-3 text-xs font-bold tracking-wide" style={{ color: "var(--color-muted)" }}>
              Rozpis DPH
            </div>
            <div className="space-y-2">
              <PriceLine label="Základ bez DPH" value={formatEur(netFromGross(price))} />
              <PriceLine label={`DPH ${Math.round(VAT_RATE * 100)} %`} value={formatEur(vatFromGross(price))} />
              <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
              <PriceLine label="Cena s DPH" value={formatEur(price)} bold />
            </div>
          </div>

          {/* Technical details */}
          <div
            className="mt-3 rounded-well p-4"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="mb-3 text-xs font-bold tracking-wide" style={{ color: "var(--color-muted)" }}>
              Technické detaily
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <TechLine label="Materiál" value={currentMat.displayName} />
              <TechLine label="Písmo" value={currentFont?.name ?? "—"} />
              <TechLine label="Výška písmen" value={`${config.height} cm`} />
              <TechLine label="Hrúbka" value={`${config.thickness} mm`} />
              <TechLine label="Počet znakov" value={String(config.text.replace(/\s/g, "").length)} />
              <TechLine
                label="Svietenie"
                value={isIlluminated ? (currentLightMode?.name ?? "—") : "Bez svietenia"}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={() => addToCart(config)}
              className="btn-press w-full rounded-2xl px-6 py-4 text-sm font-bold sm:w-auto"
              style={{
                background: "var(--color-background)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
              }}
            >
              Pridať do košíka
            </button>

            {/* Objednať opens the cart rather than a checkout of its own: the
                order is always placed from there, so a customer who configured
                two signs does not lose one of them by ordering the other. */}
            <button
              onClick={() => checkout(config)}
              className="btn-press w-full rounded-2xl px-12 py-4 text-sm font-black tracking-wide sm:w-auto"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Objednať
            </button>
          </div>
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

      {/* ── Arrow to the most relevant realization ──────────────────────── */}
      <a
        href="#realizacie"
        className="mt-6 flex flex-col items-center gap-1.5 text-center transition hover:opacity-70"
      >
        <span className="text-[10px] font-medium tracking-wide" style={{ color: "var(--color-muted)" }}>
          Pozri realizáciu, ktorá najviac sedí s tvojím výberom
        </span>
        <ArrowDown size={16} className="animate-bounce" style={{ color: "var(--accent)" }} />
      </a>

    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// One card = one parameter. Bold title + a one-line muted description, lifting
// toward the accent on hover — the same parameter-card pattern vytlacto3d uses.
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
    <div className={`field-card rounded-[24px] p-4 ${className}`}>
      <p className="text-[13px] font-extrabold" style={{ color: "var(--color-foreground)" }}>{title}</p>
      {description && (
        <p className="mt-1 text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>{description}</p>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}

// Segmented option button — amber fill when active, subtle lift when not.
function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-[12px] font-bold leading-tight transition duration-300 hover:-translate-y-0.5"
      style={
        active
          ? {
              background: "var(--color-primary)",
              color: "var(--accent-foreground)",
              border: "1px solid var(--color-primary)",
              boxShadow: "0 6px 18px -8px rgba(255,174,0,.85)",
            }
          : {
              background: "var(--color-surface)",
              color: "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }
      }
    >
      {children}
    </button>
  );
}

// Slider in its own inset box: big live value, range, and quick-pick chips.
function SliderBox({
  value,
  min,
  max,
  suffix,
  chips,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  suffix: string;
  chips: number[];
  onChange: (value: number) => void;
  ariaLabel: string;
}) {
  return (
    <div className="rounded-2xl p-3.5" style={{ background: "var(--color-surface)" }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-black leading-none" style={{ color: "var(--color-foreground)" }}>
          {value}
          <span className="text-[12px] font-bold">{suffix}</span>
        </span>
        <span className="text-[10px] font-semibold" style={{ color: "var(--color-muted)" }}>
          {min}{suffix} – {max}{suffix}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-clean mt-3.5 w-full"
        aria-label={ariaLabel}
      />

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {chips.map((chip) => {
          const active = value === chip;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onChange(chip)}
              className="chip rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={
                active
                  ? {
                      background: "var(--color-primary)",
                      color: "var(--accent-foreground)",
                      border: "1px solid var(--color-primary)",
                    }
                  : {
                      background: "var(--color-background)",
                      color: "var(--color-foreground)",
                      border: "1px solid var(--color-border)",
                    }
              }
            >
              {chip}{suffix}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Colour swatch row shared by the body colour and the LED colour pickers.
function SwatchRow({
  options,
  selectedId,
  onSelect,
  splitWhite = false,
}: {
  options: { id: string; label: string; value: string }[];
  selectedId: string;
  onSelect: (option: { id: string; label: string; value: string }) => void;
  splitWhite?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((c) => {
        const active = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            title={c.label}
            aria-label={c.label}
            aria-pressed={active}
            className="h-7 w-7 rounded-full transition duration-200 hover:scale-110"
            style={{
              background: splitWhite && c.id === "white"
                ? "linear-gradient(135deg,#fff 50%,#e0e0e0 50%)"
                : c.value,
              boxShadow: active
                ? "0 0 0 2px var(--color-background), 0 0 0 4px var(--color-primary)"
                : "0 0 0 1px var(--color-border)",
              transform: active ? "scale(1.1)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Font picker — a two-column grid so all eight faces are visible at once,
// each tile rendering its own name in its own typeface. ──────────────────────

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
    <div role="radiogroup" aria-label="Font" className="grid grid-cols-2 gap-2">
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
      className="font-tile overflow-hidden rounded-2xl px-2 py-3 text-center"
      style={{
        background: active ? "var(--color-primary)" : "var(--color-surface)",
        border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
      }}
    >
      <span
        className="block truncate text-[13px] leading-snug"
        style={{
          fontFamily: font.name,
          fontWeight: 600,
          color: active ? "var(--accent-foreground)" : "var(--color-foreground)",
        }}
      >
        {font.name}
      </span>
    </button>
  );
}

function LetterSceneSkeleton() {
  return (
    <div
      className="h-full w-full animate-pulse rounded-[20px]"
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

// ── Price block rows ──────────────────────────────────────────────────────────
// The two row shapes vytlacto3d uses inside its price block.

function PriceLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-sm ${bold ? "font-extrabold" : ""}`}
        style={{ color: bold ? "var(--color-foreground)" : "var(--color-foreground-soft)" }}
      >
        {label}
      </span>
      <span
        className={`text-sm ${bold ? "font-extrabold" : "font-semibold"}`}
        style={{ color: "var(--color-foreground)" }}
      >
        {value}
      </span>
    </div>
  );
}

function TechLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
      style={{ background: "var(--color-background)" }}
    >
      <span className="shrink-0 text-xs" style={{ color: "var(--color-muted)" }}>{label}</span>
      <span className="truncate text-xs font-bold" style={{ color: "var(--color-foreground)" }}>{value}</span>
    </div>
  );
}
