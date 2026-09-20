"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Lightbulb, LightbulbOff, ArrowDown, Plus } from "lucide-react";
import EyebrowPill from "@/components/ui/EyebrowPill";
import WallPicker from "@/components/configurator/WallPicker";
import { DEFAULT_WALL, MAX_BACKGROUND_BYTES, type WallGrain } from "@/lib/walls";
import { MAX_LINES } from "@/lib/sign-text";
import type { Config, LightModeDirection, LightModeId, Placement, SignType } from "@/lib/types";
import { useSharedConfig } from "@/lib/config-context";
import { useCart } from "@/lib/cart-context";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { calculatePrice, priceBreakdown } from "@/lib/pricing";
import { formatEur, netFromGross, vatFromGross, VAT_RATE, formatAmount } from "@/lib/vat";
import {
  fontOptions,
  fontsFor,
  lightColorsFor,
  clampLightColor,
  resolveLightColor,
  LIGHT_COLOR_AS_BODY,
  DEFAULT_LIGHT_COLOR,
  bodyColorOptionsFor,
  materialById,
  materialsFor,
  lightModesFor,
  heightRange,
  depthMmFor,
  clampHeight,
  bandStarts,
  DEFAULT_MATERIAL,
  PLACEMENTS,
  LIGHT_MODES,
} from "@/lib/options";
import type { FontOption } from "@/lib/options";
import { useSignSize, formatSignSize, formatArea } from "@/lib/useSignSize";
import type { DragTarget } from "@/components/three/LetterScene";

// 3D preview needs WebGL — never render it on the server. Suspense shows a
// skeleton until the chunk loads; the scene itself renders instantly on top
// since Config already ships with non-empty defaults (text/font/material).
const LetterScene = dynamic(() => import("@/components/three/LetterScene"), {
  ssr: false,
  loading: () => <LetterSceneSkeleton />,
});

// ─────────────────────────────────────────────────────────────────────────────

// Light modes that trigger the dark-canvas preview automatically
const NIGHT_MODES: LightModeId[] = ["back", "edge"];

// ── Light mode glyph preview tunables ───────────────────────────────────────
const LIGHT_TILE_GLOW_SIZE  = 32;  // px — svg square inside each mode tile
const LIGHT_TILE_BLUR_TIGHT = 2.5; // front / full — crisp glow on the glyph
const LIGHT_TILE_BLUR_HALO  = 7.5; // back — diffuse halo behind the glyph

// ── Slider quick-picks ──────────────────────────────────────────────────────
// Same "slider + chips" pattern vytlacto3d uses for scale/infill: drag for a
// precise value, or tap a chip for the common one. Every value must sit inside
// the slider's own min/max.
// Height shortcuts are not a fixed list any more: every build has its own
// range and its own points where the thickness steps up (lib/options.ts
// bandStarts), and those are exactly the heights worth one tap.

// Two lines, and no more: a third Enter does nothing rather than quietly
// dropping the row when the sign is built (letterGeometry.ts splitLines).
const MAX_TEXT_LENGTH = 40;

function limitLines(value: string): string {
  const lines = value.split("\n");
  return lines.length <= MAX_LINES ? value : lines.slice(0, MAX_LINES).join("\n");
}

// Which swatch a stored colour belongs to. Used when a sign comes back from
// the cart to be changed: the controls have to land where that sign actually
// is, not where they were left.
function swatchIdFor(options: readonly { id: string; value: string }[], value: string): string {
  return options.find((o) => o.value.toLowerCase() === value.toLowerCase())?.id ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ConfiguratorStage() {
  const [manualMode, setManualMode] = useState<"day" | "night" | null>(null);
  // The LED colour lives in config.lightColor alone now — the catalogue is
  // five named colours (lib/options.ts LIGHT_COLORS), so there is no separate
  // hue to keep in step with it.
  const [selectedBodySwatch, setSelectedBodySwatch] = useState<string>("black");
  // Preview-only: which wall the sign is shown against, and the customer's own
  // photo of it. Neither is part of Config — the wall is where they imagine
  // the sign, not something we make — so neither reaches the cart or an order.
  const [wall, setWall] = useState<WallGrain>(DEFAULT_WALL);
  const [background, setBackground] = useState<{ url: string; name: string } | null>(null);
  // Where the sign sits on the customer's photo. Preview-only, like the wall
  // itself: it is where they imagine the sign, not something we make, so it
  // never reaches Config, the cart or an order.
  const [signOffset, setSignOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // …and how far the photo itself has been pushed behind it, so the right part
  // of the wall ends up in the shot.
  const [photoOffset, setPhotoOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState<DragTarget>("sign");
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const { setConfig: publishConfig } = useSharedConfig();
  const {
    add: addToCart, checkout, syncDraft,
    editingId, applyEdit, cancelEdit, pendingConfig, consumePending,
  } = useCart();

  // Remember the last active light mode so we can restore it when switching
  // back from plain → illuminated
  const lastLightModeRef = useRef<LightModeId>("front");
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [config, setConfig] = useState<Config>({
    // Plain black "Váš text" on load — a blank, legible canvas, visible the
    // instant the page loads. The user turns on Svetelné/colour themselves.
    text:       "Váš text",
    font:       "archivo-black",
    material:   DEFAULT_MATERIAL,
    signType:   "plain",
    placement:  "exterior",
    lightMode:  "front",
    // Brand yellow — see lib/options.ts lightColors "yellow" / app/globals.css --color-primary.
    // Inert while signType is "plain"; used once the user switches to Svetelné.
    lightColor: DEFAULT_LIGHT_COLOR,
    bodyColor:  bodyColorOptionsFor("plain").find((c) => c.id === "black")!.value,
    // Millimetres, and inside what 3D tlač s plexi is made in (120–600 mm).
    height:     300,
    rotation:   0, // sign no longer rotates — kept for the Config shape / pricing
  });

  // Keep ShowcaseSection in sync with every config change
  useEffect(() => { publishConfig(config); }, [config, publishConfig]);

  // ── Derived state ────────────────────────────────────────────────────────
  const currentMat = materialById(config.material);
  const isIlluminated = config.signType === "illuminated";

  // What the price list offers for exactly this combination — nothing else is
  // made, so nothing else is shown (sheet "strom").
  const availableMaterials = materialsFor(config.signType, config.placement, config.lightMode);
  const availableLightModes = lightModesFor(config.placement);
  // …and the LED colours are the ones this way of lighting is made in.
  const availableLightColors = lightColorsFor(config.lightMode);
  // config.lightColor may hold "rovnaká ako telo" rather than a colour; this
  // is what the preview and every swatch actually draw.
  const litColor = resolveLightColor(config);
  // …and the fonts are the build's own rows in sheet "parametre".
  const availableFonts = fontsFor(config.material);

  // Height is the only dimension chosen; the build turns it into a thickness.
  const { minMm: minHeight, maxMm: maxHeight } = heightRange(config.material);
  const depthMm = depthMmFor(config.material, config.height);
  const heightChips = bandStarts(config.material);

  const previewChar = (config.text.trim().charAt(0) || "A").toUpperCase();
  const modeTileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fontTileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // The customer's own Deň/Noc choice always wins; the light mode only picks
  // the DEFAULT for the modes that read best in the dark.
  const autoMode: "day" | "night" =
    isIlluminated && NIGHT_MODES.includes(config.lightMode) ? "night" : "day";
  const previewMode: "day" | "night" = manualMode ?? autoMode;
  const isNight = previewMode === "night";

  // A lit letter wears a profile finish, a cut letter a lacquered sheet, so the
  // two offer different ranges. The colours themselves are shared and keep
  // their ids, so switching Svetelné/Nesvetelné never loses what is set.
  const bodyColors = bodyColorOptionsFor(config.signType);
  const currentBodyColor =
    bodyColors.find((c) => c.id === selectedBodySwatch) ??
    bodyColors.find((c) => c.value.toLowerCase() === config.bodyColor.toLowerCase());

  const currentFont = fontOptions.find((f) => f.id === config.font);
  const currentLightMode = LIGHT_MODES.find((l) => l.id === config.lightMode);

  // How big the sign comes out — and it is not a nicety any more: the price
  // list bills by the square metre of the whole inscription, so this IS the
  // quote's basis (lib/pricing.ts).
  const signSize = useSignSize(config.text, currentFont?.name ?? "", config.height);
  const signSizeLabel = signSize ? formatSignSize(signSize) : null;
  const price = useMemo(() => calculatePrice(config, signSize), [config, signSize]);
  const breakdown = useMemo(() => priceBreakdown(config, signSize), [config, signSize]);

  // ── The sign goes in the cart by itself ────────────────────────────────────
  // From the first letter typed, and in step with every parameter clicked
  // after that. The cart is stored in the browser, so this is also what makes
  // a half-configured sign survive a refresh — nothing has to be pressed for
  // the work to be kept.
  //
  // Debounced: a cart line is rewritten (and re-stored) on every change, and
  // typing should not do that per keystroke.
  const [touched, setTouched] = useState(false);
  const draftConfig = useDebouncedValue(config, 500);
  const draftSize = useDebouncedValue(signSize, 500);
  useEffect(() => {
    if (!touched) return;
    syncDraft(draftConfig, draftSize);
  }, [touched, draftConfig, draftSize, syncDraft]);

  // Live one-line recap shown under the 3D preview, so the chosen parameters
  // stay readable without looking back up the settings column.
  const summary = [
    currentFont?.name,
    currentMat.displayName,
    `${config.height} mm`,
    `hrúbka ${depthMm} mm`,
    ...(signSizeLabel ? [`celkovo ${signSizeLabel}`] : []),
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
    // First touch of the configurator. Until then there is nothing of the
    // customer's to keep — the page opens on a sample sign, and putting THAT
    // in the cart would show a visitor who has not done anything a basket
    // with one item in it.
    setTouched(true);
    // patch() itself never rewrites a setting the caller did not name. Where a
    // change really does force another value — a depth that the new build
    // cannot be made in — the caller works that out and passes both together
    // (see depthForBuild), so it is one deliberate decision in one place
    // rather than a clamp hidden in every update.
    setConfig((prev) => ({ ...prev, ...update }));
  }

  // A sign sent back from the cart ("Upraviť") arrives as pendingConfig. It is
  // loaded here rather than pushed from the cart, because the configurator
  // owns this state — and consuming it immediately means a later, unrelated
  // render cannot load the same sign a second time over newer edits.
  // Loading four pieces of state at once is the point here: a sign arrives
  // whole, and the controls have to land on it together. React's rule about
  // setState in an effect is about states that could be derived — this one is
  // an external hand-off that settles in a single pass and then clears itself.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!pendingConfig) return;
    // A sign stored before the LED colours were cut down to a named list can
    // carry a colour that is no longer made; clamp it as it comes back in.
    const incoming: Config = {
      ...pendingConfig.config,
      lightColor: clampLightColor(pendingConfig.config.lightMode, pendingConfig.config.lightColor),
    };
    setConfig(incoming);
    setSelectedBodySwatch(swatchIdFor(bodyColorOptionsFor(incoming.signType), incoming.bodyColor));
    consumePending();
    // Only when the customer asked for it ("Upraviť" in the cart). The same
    // hand-off also restores the half-configured sign after a refresh, and a
    // page that scrolls itself down on every load would be its own bug.
    if (pendingConfig.scroll) {
      document.getElementById("konfigurator")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pendingConfig, consumePending]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Every change below has to land on a combination the price list actually
  // offers: the build decides the fonts and the heights, and the sign type,
  // placement and lighting decide the builds. So one helper settles the whole
  // set at once instead of each control clamping the others behind the scenes.
  function reconcile(next: Partial<Config>): Partial<Config> {
    const signType  = next.signType  ?? config.signType;
    const placement = next.placement ?? config.placement;
    const lightMode = next.lightMode ?? config.lightMode;

    // The light mode has to exist for this placement…
    const modes = lightModesFor(placement);
    const mode = modes.some((m) => m.id === lightMode) ? lightMode : (modes[0]?.id ?? "front");

    // …the build has to be one made in this combination…
    const offered = materialsFor(signType, placement, mode);
    const wanted = next.material ?? config.material;
    const material = offered.some((m) => m.id === wanted)
      ? wanted
      : (offered[0]?.id ?? config.material);

    // …the font has to be one that build is made in…
    const fonts = fontsFor(material);
    const font = fonts.some((f) => f.id === (next.font ?? config.font))
      ? (next.font ?? config.font)
      : (fonts[0]?.id ?? config.font);

    // …and the height has to sit inside that build's range, which is also what
    // decides the thickness. Only a height the build cannot be made in moves.
    const height = clampHeight(material, next.height ?? config.height);

    // …and the LED colour has to be one this way of lighting is made in:
    // switching from red edges to a back-lit sign lands on warm white,
    // because a red wall-wash is not something we make.
    const lightColor = clampLightColor(mode, next.lightColor ?? config.lightColor);

    return { ...next, signType, placement, lightMode: mode, material, font, height, lightColor };
  }

  function apply(update: Partial<Config>) {
    patch(reconcile(update));
  }

  function handleSignTypeChange(type: SignType) {
    if (type === "plain") {
      lastLightModeRef.current = config.lightMode;  // remember it for coming back
      setManualMode(null);                          // clear forced night
      apply({ signType: type });
      return;
    }
    apply({ signType: type, lightMode: lastLightModeRef.current });
  }

  function handlePlacementChange(placement: Placement) {
    apply({ placement });
  }

  function handleMaterialChange(materialId: string) {
    apply({ material: materialId });
  }

  function setLightMode(id: LightModeId) {
    lastLightModeRef.current = id;
    apply({ lightMode: id });
  }

  function handleTextKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    // A newline is a real character here, not a submit — but only the first
    // one. Past two lines the key does nothing, so the field always shows
    // exactly what will be made.
    if (config.text.split("\n").length >= MAX_LINES) e.preventDefault();
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


  // "Ďalší nápis": bank the sign that is on screen and clear the text so the
  // next one can be typed straight away. Font, material, colours and lighting
  // stay — a second sign for the same shopfront is usually the same build with
  // different words. The cart stays closed so it does not cover the field the
  // customer is about to type in; the header's cart badge is the receipt.
  function startAnotherSign() {
    addToCart(config, { open: false, size: signSize });
    patch({ text: "" });
    textInputRef.current?.focus();
  }

  // The photo is read straight from the file into an object URL: it stays in
  // this browser, is never uploaded, and is released the moment it is replaced
  // or the page goes away.
  /** Sign back in the middle, photo back in its frame. */
  function recenterPreview() {
    setSignOffset({ x: 0, y: 0 });
    setPhotoOffset({ x: 0, y: 0 });
  }

  function clearBackground() {
    recenterPreview();
    setBackground((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setBackgroundError(null);
  }

  function handleBackground(file: File) {
    if (!file.type.startsWith("image/")) {
      setBackgroundError("Vyberte prosím obrázok (JPG, PNG alebo WEBP).");
      return;
    }
    if (file.size > MAX_BACKGROUND_BYTES) {
      setBackgroundError(`Obrázok je príliš veľký — maximum je ${Math.round(MAX_BACKGROUND_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    setBackgroundError(null);
    recenterPreview();
    setBackground((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { url: URL.createObjectURL(file), name: file.name };
    });
  }

  function chooseWall(id: WallGrain) {
    setWall(id);
    clearBackground();
  }

  function setBodyColor(id: string, value: string) {
    setSelectedBodySwatch(id);
    patch({ bodyColor: value });
  }

  const backgroundUrl = background?.url ?? null;
  useEffect(() => {
    return () => {
      if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
    };
  }, [backgroundUrl]);

  // ── Render ───────────────────────────────────────────────────────────────
  // One large rounded panel (vytlacto3d's configurator shell), split into a
  // sticky 3D preview on the left and EVERY parameter as a card in the column
  // beside it — nothing the customer sets lives below the preview any more.

  return (
    // Same measure as the sections around it (Hero, Materiály, Ako to
    // funguje): with the settings beside the preview rather than under it,
    // the panel needs every pixel it can share with them.
    <div className="mx-auto mt-14 max-w-7xl">
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

        {/* ── Preview beside the settings ───────────────────────────────────
            The preview keeps the wider half of the configurator and, from lg
            up, stays pinned under the site header (h-18) while the settings
            column to its right scrolls past it — scroll as far as you like and
            the sign you are changing is still on screen. The price and the
            full recap stay under both, across the whole panel.

            Nothing here clips its overflow, which is what lets `sticky` work
            at all — a single `overflow: hidden` anywhere up the tree would
            silently turn it back into a normal block. ── */}
        <div className="space-y-4">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(21rem,1fr)]">
        <div
          className="rounded-[26px] p-4 lg:sticky lg:top-20 lg:z-10"
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
            className="relative h-105 w-full overflow-hidden rounded-[20px] transition-colors duration-500 lg:h-[clamp(18rem,calc(100vh_-_17rem),32rem)]"
            style={{
              background: isNight
                ? "radial-gradient(ellipse at 50% 38%, #1c1c22 0%, #0a0a0d 80%)"
                : "radial-gradient(ellipse at 50% 40%, var(--color-background) 0%, var(--color-surface-raised) 120%)",
            }}
          >
            {isNight && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: `radial-gradient(ellipse at 50% 44%, ${litColor}30 0%, transparent 65%)` }}
              />
            )}

            <LetterScene
              text={config.text}
              font={config.font}
              lightColor={litColor}
              letterColor={config.bodyColor}
              thickness={depthMm}
              material={config.material}
              signType={config.signType}
              lightMode={config.lightMode}
              height={config.height}
              previewMode={previewMode}
              wall={wall}
              backgroundUrl={backgroundUrl}
              offset={signOffset}
              photoOffset={photoOffset}
              onPhotoOffsetChange={backgroundUrl ? setPhotoOffset : undefined}
              dragTarget={dragTarget}
              // Dragging the sign into place is offered only with the
              // customer's own photo behind it — on a painted wall there is no
              // spot to put it on, and the drag would just take the orbit away.
              onOffsetChange={backgroundUrl ? setSignOffset : undefined}
            />
          </div>

          {/* Live recap on the left, the wall the sign stands on at the right —
              one line from sm up, so the parameters and the surfaces read as
              one strip under the preview. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {summary.map((item) => (
              <span
                key={item}
                className="whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold"
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

          <WallPicker
            wall={wall}
            onWall={chooseWall}
            photoName={background?.name ?? null}
            photoUrl={backgroundUrl}
            onPhoto={handleBackground}
            onClearPhoto={clearBackground}
            dragTarget={dragTarget}
            onDragTarget={setDragTarget}
            moved={
              signOffset.x !== 0 || signOffset.y !== 0 ||
              photoOffset.x !== 0 || photoOffset.y !== 0
            }
            onRecenter={recenterPreview}
            error={backgroundError}
          />
          </div>
        </div>

        {/* ── Settings column ──────────────────────────────────────────────
            Text leads it: it is the one thing every customer changes, and the
            thing the preview is showing.

            From lg up the column is pinned next to the preview and scrolls
            inside itself, so going through every setting never moves the page
            and never takes the sign off screen. Below lg it is an ordinary
            block under the preview — a phone has no room for two columns, let
            alone two scrollbars. The extra right padding keeps the cards clear
            of that inner scrollbar. ── */}
        <div className="space-y-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh_-_7rem)] lg:overflow-y-auto lg:pr-1.5">
        <FieldCard title="Text" description="Napíšte, čo má na nápise svietiť. Enter = druhý riadok.">
          <textarea
            ref={textInputRef}
            value={config.text}
            onChange={(e) => patch({ text: limitLines(e.target.value) })}
            onKeyDown={handleTextKeyDown}
            rows={2}
            maxLength={MAX_TEXT_LENGTH}
            className="w-full resize-none rounded-2xl px-5 py-4 text-center text-lg font-extrabold leading-8 outline-none transition-colors"
            style={{ background: "var(--color-surface)", color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
            placeholder="Napíšte váš text…"
            aria-label="Text na nápis"
          />
          <p className="mt-2 text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
            Nápis môže mať {MAX_LINES} riadky — druhý pridáte Enterom.
          </p>
        </FieldCard>

        {/* ── The rest — four cards instead of eight ────────────────────────
            Type, lighting direction and LED colour were three separate cards
            for what is really one decision; so were material + colour, and
            height + thickness. Grouping them took the configurator from nine
            panels down to five without removing a single setting.

            They stack down the column now instead of sitting two abreast: the
            settings share the width with the preview, and one column is what
            makes the scroll past a pinned preview read as one list. ── */}
        <div className="flex flex-col gap-3">

          {/* ── Lighting, then material and colour ── */}
          <div className="space-y-3">

            {/* Placement comes first because the price list hangs off it: what
                can be built, and how it can be lit, is different indoors and
                out (sheet "strom"). */}
            <FieldCard title="Kam príde nápis" description="Exteriér a interiér sa vyrábajú inak.">
              <div className="grid grid-cols-2 gap-2">
                {PLACEMENTS.map((pl) => (
                  <Seg
                    key={pl.id}
                    active={config.placement === pl.id}
                    onClick={() => handlePlacementChange(pl.id)}
                  >
                    {pl.label}
                  </Seg>
                ))}
              </div>
              <p
                className="mt-3 rounded-2xl px-3.5 py-2.5 text-[11px] leading-5"
                style={{ background: "var(--color-surface)", color: "var(--color-muted)" }}
              >
                {PLACEMENTS.find((pl) => pl.id === config.placement)?.hint}
              </p>
            </FieldCard>

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
                    V tomto umiestnení neponúkame svetelné písmo.
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
                              boxShadow: active ? `0 6px 18px -8px rgba(255,174,0,.7), inset 0 0 14px ${litColor}2e` : "none",
                              opacity: active ? 1 : 0.72,
                            }}
                          >
                            <LightModeGlyphPreview direction={opt.direction} glowColor={litColor} char={previewChar} />
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
                    {/* Pomenované farby, nie odtieňový posuvník: vyrábajú sa
                        tieto a žiadne medzi nimi. Zoznam sa mení so spôsobom
                        svietenia — zozadu je to žiara na stene a tá sa robí
                        len v bielej (lib/options.ts lightColorsFor). */}
                    <div className="grid grid-cols-2 gap-2">
                      {availableLightColors.map((c) => {
                        const active = config.lightColor.toLowerCase() === c.value.toLowerCase();
                        // "Rovnaká ako telo" has no colour of its own — show
                        // the one it is currently following.
                        const dot = c.value === LIGHT_COLOR_AS_BODY ? config.bodyColor : c.value;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => patch({ lightColor: c.value })}
                            title={c.hint}
                            aria-pressed={active}
                            className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition"
                            style={{
                              background: "var(--color-surface)",
                              border: active
                                ? "1px solid var(--color-primary)"
                                : "1px solid var(--color-border)",
                              boxShadow: active ? `inset 0 0 16px ${dot}33` : "none",
                              opacity: active ? 1 : 0.78,
                            }}
                          >
                            <span
                              className="h-4 w-4 shrink-0 rounded-full"
                              style={{
                                background: dot,
                                boxShadow: `0 0 0 1px var(--color-border), 0 0 10px ${dot}aa`,
                              }}
                              aria-hidden="true"
                            />
                            <span
                              className="text-[11px] font-bold leading-tight"
                              style={{ color: "var(--color-foreground)" }}
                            >
                              {c.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {config.lightMode === "back" && (
                      <p className="mt-2 text-[11px] leading-5" style={{ color: "var(--color-muted-light)" }}>
                        Svietenie zozadu vyrábame len v bielej a teplej bielej.
                      </p>
                    )}
                  </>
                )
              )}
            </FieldCard>

            <FieldCard title="Materiál a farba" description="Z čoho je nápis a akú má farbu.">
              <div className="grid grid-cols-2 gap-2">
                {availableMaterials.map((mat) => (
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
              <p className="mt-2 text-[11px] leading-5" style={{ color: "var(--color-muted-light)" }}>
                Ponúkame len stavby, ktoré sa v tomto zadaní naozaj vyrábajú.
              </p>

              <p className="mb-2 mt-4 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
                {isIlluminated ? "Farba profilu" : "Farba materiálu"}
                <span className="ml-1.5 font-semibold" style={{ color: "var(--color-foreground)" }}>
                  — {currentBodyColor?.label ?? ""}
                </span>
              </p>
              {/* Farba aj jej názov, nie len bodka: v náhľade sa odtieň mení
                  podľa toho, ako je nápis nasvietený, tak nech je aspoň tu
                  vidieť presne to, čo sa objednáva. */}
              <div className="grid grid-cols-2 gap-2">
                {bodyColors.map((c) => {
                  const active = selectedBodySwatch === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setBodyColor(c.id, c.value)}
                      aria-pressed={active}
                      className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition"
                      style={{
                        background: "var(--color-surface)",
                        border: active
                          ? "1px solid var(--color-primary)"
                          : "1px solid var(--color-border)",
                        opacity: active ? 1 : 0.8,
                      }}
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-full"
                        style={{
                          background: c.value,
                          // Obrys drží aj bielu a čiernu čitateľnú na oboch témach.
                          boxShadow: "inset 0 0 0 1px rgba(0,0,0,.28), 0 0 0 1px var(--color-border)",
                        }}
                        aria-hidden="true"
                      />
                      <span
                        className="text-[11px] font-bold leading-tight"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {isIlluminated && (
                <p className="mt-2 text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
                  Farby, v ktorých sa profil svetelného písma štandardne vyrába.
                </p>
              )}
            </FieldCard>

          </div>

          {/* ── Typeface and dimensions ── */}
          <div className="space-y-3">
            <FieldCard title="Font" description="Písma, v ktorých sa táto stavba vyrába.">
              <FontPicker
                fonts={availableFonts}
                value={config.font}
                onChange={(id) => patch({ font: id })}
                tileRefs={fontTileRefs}
              />
            </FieldCard>

            <FieldCard title="Rozmery" description="Výšku písmen si volíte, hrúbka z nej vyplýva.">
              <p className="mb-2 text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
                Výška písmen
              </p>
              <SliderBox
                value={config.height}
                min={minHeight}
                max={maxHeight}
                suffix=" mm"
                chips={heightChips}
                onChange={(v) => patch({ height: v })}
                ariaLabel="Výška písmen"
              />

              {/* Thickness is not a control any more. In this catalogue every
                  build is made in a fixed thickness per height band, so it is
                  shown as what it is — the consequence of the height — instead
                  of a slider the customer could set to something nobody makes. */}
              <div
                className="mt-3 flex items-baseline justify-between gap-3 rounded-2xl px-3.5 py-2.5"
                style={{ background: "var(--color-surface)" }}
              >
                <span className="text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
                  Hrúbka
                </span>
                <span className="text-[13px] font-black" style={{ color: "var(--color-foreground)" }}>
                  {depthMm} mm
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
                {currentMat.displayName} sa v tejto výške vyrába v hrúbke {depthMm} mm.
              </p>

              {signSizeLabel && (
                <p className="mt-2 text-[11px] leading-5" style={{ color: "var(--color-muted)" }}>
                  Celý nápis: {signSizeLabel} — účtovaná plocha písmen{" "}
                  {formatArea(breakdown.areaM2)}
                </p>
              )}
            </FieldCard>
          </div>
        </div>
        </div>{/* settings column */}
        </div>{/* preview + settings */}

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
              <TechLine label="Umiestnenie" value={config.placement === "exterior" ? "Exteriér" : "Interiér"} />
              <TechLine label="Výška písmen" value={`${config.height} mm`} />
              <TechLine label="Hrúbka" value={`${depthMm} mm`} />
              {/* The size that has to fit the wall: the whole inscription,
                  spaces and all. It is what the customer measures the façade
                  by — but it is NOT what the quote is worked out from. */}
              <TechLine label="Celkový rozmer nápisu" value={signSizeLabel ?? "—"} />
              <TechLine
                label={breakdown.volumeCm3 !== null ? "Objem materiálu" : "Účtovaná plocha písmen"}
                value={
                  breakdown.volumeCm3 !== null
                    ? `${Math.round(breakdown.volumeCm3)} cm³`
                    : formatArea(breakdown.areaM2)
                }
              />
              <TechLine
                label="Jednotková cena"
                value={`${formatAmount(breakdown.unit)} ${breakdown.unitLabel}`}
              />
              <TechLine
                label="Svietenie"
                value={isIlluminated ? (currentLightMode?.name ?? "—") : "Bez svietenia"}
              />
            </div>
          </div>

          {/* Actions — two modes. Normally: put this sign in the cart, start
              another one, or go and order. While a sign from the cart is open
              for changes: save it back under the same line, or leave it as it
              was. ── */}
          <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            {editingId ? (
              <>
                <button
                  onClick={cancelEdit}
                  className="btn-press w-full rounded-2xl px-6 py-4 text-sm font-bold sm:w-auto"
                  style={{
                    background: "var(--color-background)",
                    color: "var(--color-foreground)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  Zrušiť úpravu
                </button>
                <button
                  onClick={() => applyEdit(config, signSize)}
                  className="btn-press w-full rounded-2xl px-12 py-4 text-sm font-black tracking-wide sm:w-auto"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  Uložiť do košíka
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startAnotherSign}
                  className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold sm:w-auto"
                  style={{
                    background: "var(--color-background)",
                    color: "var(--color-foreground)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  Ďalší nápis
                </button>

                <button
                  onClick={() => addToCart(config, { size: signSize })}
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
                  onClick={() => checkout(config, signSize)}
                  className="btn-press w-full rounded-2xl px-12 py-4 text-sm font-black tracking-wide sm:w-auto"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  Objednať
                </button>
              </>
            )}
          </div>
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

// ── Font picker — a two-column grid so all eight faces are visible at once,
// each tile rendering its own name in its own typeface. ──────────────────────

function FontPicker({
  fonts,
  value,
  onChange,
  tileRefs,
}: {
  /** Only the fonts this build is made in — the price list ties the two. */
  fonts: FontOption[];
  value: string;
  onChange: (id: string) => void;
  tileRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
}) {
  function handleTileKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const backward = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !backward) return;
    e.preventDefault();
    const nextIndex = (index + (forward ? 1 : -1) + fonts.length) % fonts.length;
    onChange(fonts[nextIndex].id);
    tileRefs.current[nextIndex]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="Font" className="grid grid-cols-2 gap-2">
      {fonts.map((f, i) => (
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

      {/* edge — the glyph's outline glows, its face stays dark: light coming
          out of the cut edge of a sheet of plexi, not through it */}
      {direction === "edge" && (
        <>
          <text {...glyph} fill="none" stroke={glowColor} strokeWidth={2.2} filter={`url(#${tightId})`}>{char}</text>
          <text {...glyph} fill="currentColor" opacity={0.55}>{char}</text>
        </>
      )}

      {/* front — the glyph itself lit */}
      {direction === "front" && (
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
