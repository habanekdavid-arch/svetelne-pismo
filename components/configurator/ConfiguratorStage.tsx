"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDown, Plus } from "lucide-react";
import EyebrowPill from "@/components/ui/EyebrowPill";
import { TooltipProvider, useTip } from "@/components/ui/Tooltip";
import WallPicker from "@/components/configurator/WallPicker";
import { DEFAULT_WALL, MAX_BACKGROUND_BYTES, type WallGrain } from "@/lib/walls";
import { MAX_LINES } from "@/lib/sign-text";
import type { ColorOption, Config, MaterialGroupId, VariantId } from "@/lib/types";
import { useSharedConfig } from "@/lib/config-context";
import { useCart } from "@/lib/cart-context";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { calculatePrice, priceBreakdown, isMinimumPrice, MIN_PRICE_GROSS } from "@/lib/pricing";
import { formatEur, netFromGross, vatFromGross, VAT_RATE, formatAmount } from "@/lib/vat";
import {
  CATALOGUE_FONTS,
  MATERIAL_GROUPS,
  VARIANTS,
  LIGHT_COLORS,
  DEFAULT_LIGHT_COLOR,
  DEFAULT_MATERIAL,
  fontById,
  materialById,
  groupById,
  variantById,
  variantOf,
  variantFields,
  buildsFor,
  isOffered,
  pickBuild,
  buildForFont,
  hasSeparateFace,
  faceColorOptionsFor,
  bodyColorOptionsFor,
  faceColorOf,
  faceKindFor,
  clampFaceColor,
  clampBodyColor,
  clampLightColor,
  colorLabel,
  applyTextCase,
  textCaseFor,
  heightRange,
  depthMmFor,
  clampHeight,
  bandStarts,
  normalizeConfig,
  lightColorOption,
} from "@/lib/options";
import { useSignSize, formatSignSize, formatArea } from "@/lib/useSignSize";
import type { DragTarget } from "@/components/three/LetterScene";

// 3D preview needs WebGL — never render it on the server. Suspense shows a
// skeleton until the chunk loads; the scene itself renders instantly on top
// since Config already ships with non-empty defaults (text/font/material).
/** Where the night slider starts — kept in step with LetterScene's DEFAULT_NIGHT_LEVEL. */
const DEFAULT_NIGHT_PCT = 70;

const LetterScene = dynamic(() => import("@/components/three/LetterScene"), {
  ssr: false,
  loading: () => <LetterSceneSkeleton />,
});

// ─────────────────────────────────────────────────────────────────────────────
//
// Six steps, in the order the shop asked for:
//
//   1  Text        — what the sign says;
//   2  Rozmer      — the height of the letters (the build fixes the thickness);
//   3  Farby       — the face (čelo) and the body (telo) of the letter;
//   4  Svietenie   — Svetelné spredu / Svetelné zozadu / Nesvetelné;
//   5  Prevedenie  — Hliník / Plast / Plexi, and the build within it;
//   6  Font        — the fonts that build is made in (hárok "fonty").
//
// Everything a customer picks is a small tile — a colour is a dot, a font is
// the first letter of their own text set in that font — and the full name
// comes up on hover (components/ui/Tooltip.tsx). The chosen option's name is
// also written beside each step, which is what a phone, with no hover, reads.
//
// The later steps decide what the earlier ones can be: a build is made only
// in some fonts, heights and colours. Choosing one never leaves the sign in a
// state nobody makes — whatever has to move to fit, moves, and the step says
// what it changed (see `apply`).
// ─────────────────────────────────────────────────────────────────────────────

// Two lines, and no more: a third Enter does nothing rather than quietly
// dropping the row when the sign is built (letterGeometry.ts splitLines).
const MAX_TEXT_LENGTH = 40;

function limitLines(value: string): string {
  const lines = value.split("\n");
  return lines.length <= MAX_LINES ? value : lines.slice(0, MAX_LINES).join("\n");
}

function sameColor(a: string | undefined, b: string | undefined): boolean {
  return (a ?? "").toLowerCase() === (b ?? "").toLowerCase();
}

type StepNote = { step: number; text: string };

// ─────────────────────────────────────────────────────────────────────────────

export default function ConfiguratorStage() {
  return (
    <TooltipProvider>
      <Configurator />
    </TooltipProvider>
  );
}

function Configurator() {
  const [manualMode, setManualMode] = useState<"day" | "night" | null>(null);
  // How dark the night preview is, 0–100 % — from dusk (the LEDs are on but
  // the wall is still lit) to a dark street where the sign is the only light.
  const [nightPct, setNightPct] = useState(DEFAULT_NIGHT_PCT);
  // Preview-only: which wall the sign is shown against, and the customer's own
  // photo of it. Neither is part of Config — the wall is where they imagine
  // the sign, not something we make — so neither reaches the cart or an order.
  const [wall, setWall] = useState<WallGrain>(DEFAULT_WALL);
  const [background, setBackground] = useState<{ url: string; name: string } | null>(null);
  // Where the sign sits on the customer's photo, and how far the photo itself
  // has been pushed behind it. Preview-only, like the wall.
  const [signOffset, setSignOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [photoOffset, setPhotoOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState<DragTarget>("sign");
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  // What a later step had to change in an earlier one, said where it happened.
  const [note, setNote] = useState<StepNote | null>(null);
  const { setConfig: publishConfig } = useSharedConfig();
  const {
    add: addToCart, checkout, syncDraft,
    editingId, applyEdit, cancelEdit, pendingConfig, consumePending,
  } = useCart();

  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [config, setConfig] = useState<Config>({
    // Plain black "Váš text" on load — a blank, legible canvas, visible the
    // instant the page loads. The customer turns the light on themselves.
    text:       "Váš text",
    font:       CATALOGUE_FONTS[0],
    material:   DEFAULT_MATERIAL,
    signType:   "plain",
    lightMode:  "front",
    // Inert while the sign is unlit; used once a lit variant is chosen.
    lightColor: DEFAULT_LIGHT_COLOR,
    bodyColor:  "#0a0a0a",
    // Millimetres, and inside what 3D tlač s plexi is made in (120–699 mm).
    height:     300,
    rotation:   0, // sign no longer rotates — kept for the Config shape / pricing
  });

  // Keep ShowcaseSection in sync with every config change
  useEffect(() => { publishConfig(config); }, [config, publishConfig]);

  // ── Derived state ────────────────────────────────────────────────────────
  const currentMat = materialById(config.material);
  const variant = variantOf(config);
  const isIlluminated = config.signType === "illuminated";
  const currentFont = fontById(config.font);
  const textCase = textCaseFor(config.material);
  const buildsInGroup = buildsFor(variant, currentMat.group);

  // Height is the only dimension chosen; the build turns it into a thickness.
  const { minMm: minHeight, maxMm: maxHeight } = heightRange(config.material);
  const depthMm = depthMmFor(config.material, config.height);
  const heightChips = bandStarts(config.material);

  // The letter every font dot is drawn with: the first one the customer typed.
  const previewChar = Array.from(config.text.trim())[0] ?? "A";

  // The customer's own Deň/Noc choice always wins; a halo letter defaults to
  // night, because its light is only visible on the wall in the dark.
  const autoMode: "day" | "night" = isIlluminated && config.lightMode === "back" ? "night" : "day";
  const previewMode: "day" | "night" = manualMode ?? autoMode;
  const isNight = previewMode === "night";
  const litColor = config.lightColor;

  // Face and wall colours (hárok "farby"): a front-lit face is translucent,
  // everything else can be any colour; 30 mm plexi is one colour throughout.
  const separateFace = hasSeparateFace(config.material);
  const faceColors = faceColorOptionsFor(config.material, config.signType, config.lightMode);
  const bodyColors = bodyColorOptionsFor(config.material, config.signType, config.lightMode);
  const currentFaceColor = faceColorOf(config);
  const faceGlows = isIlluminated && config.lightMode === "front"
    && faceKindFor(config.material, config.signType, config.lightMode) === "acrylic";

  // How big the sign comes out — and it is not a nicety: the price list bills
  // by the square metre of the letters, so this IS the quote's basis.
  const signSize = useSignSize(config.text, currentFont?.name ?? "", config.height);
  const signSizeLabel = signSize ? formatSignSize(signSize) : null;
  const price = useMemo(() => calculatePrice(config, signSize), [config, signSize]);
  const breakdown = useMemo(() => priceBreakdown(config, signSize), [config, signSize]);
  // When the sign is so small that area × €/m² does not reach the minimum,
  // the minimum sets the price — and the breakdown has to say so.
  const atMinimum = useMemo(() => isMinimumPrice(config, signSize), [config, signSize]);

  // ── The sign goes in the cart by itself ────────────────────────────────────
  // From the first letter typed, and in step with every parameter clicked
  // after that. The cart is stored in the browser, so this is also what makes
  // a half-configured sign survive a refresh. Debounced, so typing does not
  // rewrite the cart per keystroke.
  const [touched, setTouched] = useState(false);
  const draftConfig = useDebouncedValue(config, 500);
  const draftSize = useDebouncedValue(signSize, 500);
  useEffect(() => {
    if (!touched) return;
    syncDraft(draftConfig, draftSize);
  }, [touched, draftConfig, draftSize, syncDraft]);

  // Live one-line recap shown under the 3D preview.
  const summary = [
    currentFont?.name,
    `${config.height} mm`,
    `hrúbka ${depthMm} mm`,
    variantById(variant).name,
    currentMat.displayName,
    ...(signSizeLabel ? [`celkovo ${signSizeLabel}`] : []),
  ].filter(Boolean) as string[];

  // ── Actions ──────────────────────────────────────────────────────────────

  function patch(update: Partial<Config>) {
    // First touch of the configurator. Until then there is nothing of the
    // customer's to keep — the page opens on a sample sign, and putting THAT
    // in the cart would show a visitor who has not done anything a basket
    // with one item in it.
    setTouched(true);
    setConfig((prev) => ({ ...prev, ...update }));
  }

  // A sign sent back from the cart ("Upraviť") arrives as pendingConfig. It is
  // loaded here rather than pushed from the cart, because the configurator
  // owns this state — and consuming it immediately means a later, unrelated
  // render cannot load the same sign a second time over newer edits.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!pendingConfig) return;
    // A sign saved under the old price list is moved onto the new one.
    setConfig(normalizeConfig(pendingConfig.config));
    setNote(null);
    consumePending();
    // Only when the customer asked for it ("Upraviť" in the cart). The same
    // hand-off also restores the half-configured sign after a refresh, and a
    // page that scrolls itself down on every load would be its own bug.
    if (pendingConfig.scroll) {
      document.getElementById("konfigurator")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pendingConfig, consumePending]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Every change has to land on a combination the price list actually makes:
  // the variant decides the builds, and the build decides the fonts, heights
  // and colours. One helper settles the whole set at once instead of each
  // control clamping the others behind the scenes.
  function reconcile(next: Partial<Config>): Config {
    const merged: Config = { ...config, ...next };
    const v = variantOf(merged);
    const { signType, lightMode } = variantFields(v);

    const material = isOffered(v, merged.material)
      ? merged.material
      : pickBuild(v, materialById(merged.material).group, merged.material);
    const fonts = materialById(material).fonts;
    const font = fonts.includes(merged.font) ? merged.font : fonts[0];

    return {
      ...merged,
      signType,
      lightMode,
      material,
      font,
      height: clampHeight(material, merged.height),
      lightColor: clampLightColor(merged.lightColor),
      // Alurol comes as veľké or malé písmená, so the text follows the build.
      text: applyTextCase(merged.text, material),
      bodyColor: clampBodyColor(material, signType, lightMode, merged.bodyColor),
      faceColor: hasSeparateFace(material)
        ? clampFaceColor(material, signType, lightMode, merged.faceColor ?? merged.bodyColor)
        : merged.faceColor,
    };
  }

  /**
   * Applies a change made in `step`, and tells the customer in that step what
   * else had to move for the sign to still be one we make.
   */
  function apply(update: Partial<Config>, step: number) {
    const next = reconcile(update);
    const changed: string[] = [];
    if (update.material === undefined && next.material !== config.material) {
      changed.push(`materiál ${materialById(next.material).displayName}`);
    }
    if (update.font === undefined && next.font !== config.font) {
      changed.push(`písmo ${fontById(next.font)?.name ?? next.font}`);
    }
    if (update.height === undefined && next.height !== config.height) {
      changed.push(`výška ${next.height} mm`);
    }
    if (update.faceColor === undefined && hasSeparateFace(next.material)
        && !sameColor(faceColorOf(next), faceColorOf(config))) {
      changed.push(`čelo ${colorLabel(faceColorOf(next))}`);
    }
    if (update.bodyColor === undefined && !sameColor(next.bodyColor, config.bodyColor)) {
      changed.push(`${hasSeparateFace(next.material) ? "telo" : "farba"} ${colorLabel(next.bodyColor)}`);
    }
    if (update.text === undefined && next.text !== config.text) {
      changed.push(textCaseFor(next.material) === "upper" ? "text veľkými písmenami" : "text malými písmenami");
    }
    setNote(changed.length > 0
      ? { step, text: `Upravili sme ${changed.join(", ")} — tak sa nápis v tomto prevedení vyrába.` }
      : null);
    patch(next);
  }

  function chooseVariant(v: VariantId) {
    // A new variant starts from its natural view again: a halo at night.
    setManualMode(null);
    apply(variantFields(v), 4);
  }

  function chooseGroup(group: MaterialGroupId) {
    apply({ material: pickBuild(variant, group, config.material) }, 5);
  }

  function chooseFont(fontId: string) {
    if (currentMat.fonts.includes(fontId)) {
      setNote(null);
      patch({ font: fontId });
      return;
    }
    // Not made in this build — move to one that is, in the same variant.
    const build = buildForFont(variant, config.material, fontId);
    if (build) apply({ font: fontId, material: build }, 6);
  }

  function handleTextKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    // A newline is a real character here, not a submit — but only the first
    // one. Past two lines the key does nothing, so the field always shows
    // exactly what will be made.
    if (config.text.split("\n").length >= MAX_LINES) e.preventDefault();
  }

  // "Ďalší nápis": bank the sign that is on screen and clear the text so the
  // next one can be typed straight away. Everything else stays — a second
  // sign for the same shopfront is usually the same build with other words.
  function startAnotherSign() {
    addToCart(config, { open: false, size: signSize });
    patch({ text: "" });
    textInputRef.current?.focus();
  }

  /** Sign back in the middle, photo back in its frame. */
  function recenterPreview() {
    setSignOffset({ x: 0, y: 0 });
    setPhotoOffset({ x: 0, y: 0 });
  }

  // The photo is read straight from the file into an object URL: it stays in
  // this browser, is never uploaded, and is released the moment it is replaced
  // or the page goes away.
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

  const backgroundUrl = background?.url ?? null;
  useEffect(() => {
    return () => {
      if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
    };
  }, [backgroundUrl]);

  const noteFor = (step: number) => (note?.step === step ? note.text : null);

  // ── Render ───────────────────────────────────────────────────────────────
  // One large rounded panel, split into a sticky 3D preview on the left and
  // the five steps in the column beside it.

  return (
    <div className="mx-auto mt-14 max-w-7xl">
      <div className="config-shell rounded-[32px] p-4 sm:p-6 md:p-7">

        {/* ── Panel header ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <EyebrowPill>6 krokov</EyebrowPill>
            <h2
              className="section-heading mt-3 text-2xl md:text-3xl"
              style={{ color: "var(--color-foreground)" }}
            >
              Nastav si nápis
            </h2>
            <p
              className="mt-2 max-w-lg text-[14px] leading-6 tracking-[0.005em]"
              style={{ color: "var(--color-muted)" }}
            >
              Text, rozmer, farby, svietenie, prevedenie a font — náhľad aj cena sa menia okamžite.
              Názov každej voľby uvidíte, keď na ňu prejdete myšou.
            </p>
          </div>

          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold"
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
            up, stays pinned under the site header while the settings column
            to its right scrolls past it. Nothing here clips its overflow,
            which is what lets `sticky` work at all. ── */}
        <div className="space-y-4">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(22rem,1fr)]">
        <div
          className="rounded-[26px] p-4 lg:sticky lg:top-20 lg:z-10"
          style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[14px] font-extrabold" style={{ color: "var(--color-foreground)" }}>
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
                  className="rounded-full px-3 py-1.5 text-[12px] font-bold tracking-[0.01em] transition-all"
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

          {isNight && isIlluminated && (
            <label className="mb-3 flex items-center gap-3 rounded-full px-3 py-1.5" style={{ background: "var(--color-surface)" }}>
              <span className="shrink-0 text-[12px] font-bold" style={{ color: "var(--color-muted)" }}>
                Intenzita noci
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={nightPct}
                onChange={(e) => setNightPct(Number(e.target.value))}
                aria-label="Intenzita noci v percentách"
                className="h-1.5 min-w-0 flex-1 cursor-pointer"
                style={{ accentColor: "var(--accent)" }}
              />
              <span
                className="w-10 shrink-0 text-right text-[12px] font-extrabold tabular-nums"
                style={{ color: "var(--color-foreground)" }}
              >
                {nightPct} %
              </span>
            </label>
          )}

          <div
            className="relative h-105 w-full overflow-hidden rounded-[20px] transition-colors duration-500 lg:h-[clamp(18rem,calc(100vh_-_17rem),32rem)]"
            style={{
              background: isNight
                ? "radial-gradient(ellipse at 50% 38%, #1c1c22 0%, #0a0a0d 80%)"
                : "radial-gradient(ellipse at 50% 40%, var(--color-background) 0%, var(--color-surface-raised) 120%)",
            }}
          >
            {/* Only a halo letter lights the wall around it. A front-lit one
                shines forward, so nothing is painted behind it. */}
            {isNight && isIlluminated && config.lightMode === "back" && (
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
              faceColor={currentFaceColor}
              thickness={depthMm}
              material={config.material}
              signType={config.signType}
              lightMode={config.lightMode}
              height={config.height}
              previewMode={previewMode}
              nightLevel={nightPct / 100}
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

          {/* Live recap on the left, the wall the sign stands on at the right. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {summary.map((item) => (
              <span
                key={item}
                className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold tracking-[0.01em]"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-foreground-soft)",
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

        {/* ── The five steps ───────────────────────────────────────────────
            From lg up the column is pinned next to the preview and scrolls
            inside itself, so going through every step never takes the sign
            off screen. Below lg it is an ordinary block under the preview. ── */}
        <div className="space-y-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh_-_7rem)] lg:overflow-y-auto lg:pr-1.5">

          {/* ── 1 · Text ── */}
          <StepCard
            step={1}
            title="Text"
            note={noteFor(1)}
          >
            <textarea
              ref={textInputRef}
              value={config.text}
              onChange={(e) => patch({ text: applyTextCase(limitLines(e.target.value), config.material) })}
              onKeyDown={handleTextKeyDown}
              rows={2}
              maxLength={MAX_TEXT_LENGTH}
              className="w-full resize-none rounded-2xl px-5 py-4 text-center text-xl font-extrabold leading-8 tracking-[0.01em] outline-none transition-colors"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
                fontFamily: currentFont?.name,
              }}
              placeholder="Napíšte váš text…"
              aria-label="Text na nápis"
            />
            <Hint>
              Enter pridá druhý riadok (najviac {MAX_LINES}).
              {textCase === "upper" && " Alurol – veľké písmená sa vyrába len veľkými písmenami."}
              {textCase === "lower" && " Alurol – malé písmená sa vyrába len malými písmenami."}
            </Hint>
          </StepCard>

          {/* ── 2 · Size ── */}
          <StepCard
            step={2}
            title="Rozmer"
            aside={`${config.height} mm`}
            note={noteFor(2)}
          >
            <Label flush>Výška písmen</Label>
            <SliderBox
              value={config.height}
              min={minHeight}
              max={maxHeight}
              suffix=" mm"
              chips={heightChips}
              onChange={(v) => { setNote(null); patch({ height: v }); }}
              ariaLabel="Výška písmen"
            />
            {/* Thickness is not a control: every build is made in a fixed
                thickness per height band, so it is shown as what it is — the
                consequence of the height. */}
            <div
              className="mt-3 flex items-baseline justify-between gap-3 rounded-2xl px-4 py-2.5"
              style={{ background: "var(--color-surface)" }}
            >
              <span className="text-[13px] font-bold tracking-[0.01em]" style={{ color: "var(--color-muted)" }}>
                Hrúbka písma
              </span>
              <span className="text-[15px] font-black" style={{ color: "var(--color-foreground)" }}>
                {depthMm} mm
              </span>
            </div>
            <Hint>
              {currentMat.displayName}: výška {minHeight} – {maxHeight} mm, hrúbka sa určí podľa výšky.
              {signSizeLabel && <> Celý nápis {signSizeLabel}, účtovaná plocha písmen {formatArea(breakdown.areaM2)}.</>}
            </Hint>
          </StepCard>

          {/* ── 3 · Colours ── */}
          <StepCard
            step={3}
            title="Farby čela a tela"
            aside={separateFace
              ? `${colorLabel(currentFaceColor)} / ${colorLabel(config.bodyColor)}`
              : colorLabel(config.bodyColor)}
            note={noteFor(3)}
          >
            <div className="flex items-start gap-3">
              <FaceReturnSwatch face={currentFaceColor} edge={config.bodyColor} glow={faceGlows} />
              <div className="min-w-0 flex-1 space-y-3">
                {separateFace ? (
                  <>
                    <ColorRow
                      label="Čelo"
                      hint="predná plocha písmena"
                      options={faceColors}
                      value={currentFaceColor}
                      onPick={(c) => { setNote(null); patch({ faceColor: c.value }); }}
                    />
                    <ColorRow
                      label="Telo"
                      hint="bok písmena"
                      options={bodyColors}
                      value={config.bodyColor}
                      onPick={(c) => { setNote(null); patch({ bodyColor: c.value }); }}
                    />
                  </>
                ) : (
                  <ColorRow
                    label="Farba písmena"
                    hint="čelo aj telo"
                    options={bodyColors}
                    value={config.bodyColor}
                    onPick={(c) => { setNote(null); patch({ bodyColor: c.value }); }}
                  />
                )}
              </div>
            </div>
            <Hint>
              {!separateFace
                ? "30 mm plexi je jeden kus presvitného akrylátu — svieti celé v tejto farbe."
                : variant === "front"
                  ? "Pri svietení spredu je čelo z presvitného plexi a svieti vo svojej farbe."
                  : variant === "back"
                    ? "Pri svietení zozadu je čelo nepriesvitné — svetlo ide dozadu na stenu."
                    : "Čelo aj telo môžu mať ľubovoľnú farbu."}
            </Hint>
          </StepCard>

          {/* ── 4 · Variant ── */}
          <StepCard
            step={4}
            title="Svietenie"
            aside={variantById(variant).name}
            note={noteFor(4)}
          >
            <div role="radiogroup" aria-label="Svietenie" className="grid grid-cols-3 gap-2">
              {VARIANTS.map((v) => (
                <OptionTile
                  key={v.id}
                  active={variant === v.id}
                  label={v.shortName}
                  tip={v.name}
                  tipSub={v.description}
                  onClick={() => chooseVariant(v.id)}
                >
                  <VariantGlyph
                    variant={v.id}
                    char={previewChar}
                    fontFamily={currentFont?.name}
                    glowColor={litColor}
                  />
                </OptionTile>
              ))}
            </div>

            {isIlluminated && (
              <>
                <Label>Farba svetla</Label>
                {/* Teplá a studená biela — farbu nápisu robí čelo, LED
                    rozhoduje iba o tom, či svieti teplo alebo studeno. */}
                <div className="flex items-center gap-3">
                  {LIGHT_COLORS.map((c) => (
                    <SwatchDot
                      key={c.id}
                      color={c.value}
                      glow
                      active={sameColor(config.lightColor, c.value)}
                      label={c.label}
                      sub={c.hint}
                      onClick={() => patch({ lightColor: c.value })}
                    />
                  ))}
                  <span className="text-[13px] font-semibold tracking-[0.01em]" style={{ color: "var(--color-foreground-soft)" }}>
                    {lightColorOption(config.lightColor)?.label}
                  </span>
                </div>
              </>
            )}
          </StepCard>

          {/* ── 5 · Material ── */}
          <StepCard
            step={5}
            title="Prevedenie"
            aside={currentMat.displayName}
            note={noteFor(5)}
          >
            <div role="radiogroup" aria-label="Prevedenie" className="grid grid-cols-3 gap-2">
              {MATERIAL_GROUPS.map((g) => {
                const builds = buildsFor(variant, g.id);
                const made = builds.length > 0;
                return (
                  <OptionTile
                    key={g.id}
                    active={currentMat.group === g.id}
                    disabled={!made}
                    label={g.name}
                    tip={made ? g.name : `${g.name} — nevyrába sa`}
                    tipSub={made
                      ? builds.map((b) => b.displayName).join(" · ")
                      : `Pri variante ${variantById(variant).name.toLocaleLowerCase("sk-SK")} ${g.name.toLocaleLowerCase("sk-SK")} neponúkame.`}
                    onClick={() => chooseGroup(g.id)}
                  >
                    <GroupIcon group={g.id} />
                  </OptionTile>
                );
              })}
            </div>

            {buildsInGroup.length > 1 && (
              <>
                <Label>Typ</Label>
                <div role="radiogroup" aria-label="Typ prevedenia" className="grid grid-cols-2 gap-2">
                  {buildsInGroup.map((b) => (
                    <BuildPill
                      key={b.id}
                      active={config.material === b.id}
                      label={b.shortName}
                      tip={b.displayName}
                      tipSub={b.subtitle}
                      onClick={() => apply({ material: b.id }, 5)}
                    />
                  ))}
                </div>
              </>
            )}

            <p
              className="mt-3 rounded-2xl px-4 py-3 text-[13px] leading-6 tracking-[0.005em]"
              style={{ background: "var(--color-surface)", color: "var(--color-foreground-soft)" }}
            >
              <strong style={{ color: "var(--color-foreground)" }}>{groupById(currentMat.group).name} · {currentMat.shortName}.</strong>{" "}
              {currentMat.subtitle}
            </p>
          </StepCard>

          {/* ── 6 · Font ── */}
          <StepCard
            step={6}
            title="Font"
            aside={currentFont?.name}
            note={noteFor(6)}
          >
            <FontDots
              char={previewChar}
              value={config.font}
              availableIn={currentMat.fonts}
              materialName={currentMat.displayName}
              canSwitchTo={(id) => buildForFont(variant, config.material, id)}
              onPick={chooseFont}
            />
            <Hint>Písma, ktoré sa v prevedení {currentMat.displayName} nevyrábajú, sú stlmené — po ich výbere prepneme prevedenie.</Hint>
          </StepCard>

        </div>{/* settings column */}
        </div>{/* preview + settings */}

        {/* ── Price ───────────────────────────────────────────────────────── */}
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
                {atMinimum
                  ? `Minimálna cena za nápis je ${MIN_PRICE_GROSS} € s DPH.`
                  : "Záväznú cenu dostanete po overení parametrov."}
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
              <TechLine label="Variant" value={variantById(variant).name} />
              <TechLine label="Materiál" value={currentMat.displayName} />
              <TechLine label="Písmo" value={currentFont?.name ?? "—"} />
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
                label={separateFace ? "Čelo / telo" : "Farba"}
                value={separateFace
                  ? `${colorLabel(currentFaceColor)} / ${colorLabel(config.bodyColor)}`
                  : colorLabel(config.bodyColor)}
              />
              {isIlluminated && (
                <TechLine label="Farba svetla" value={lightColorOption(config.lightColor)?.label ?? "—"} />
              )}
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
        <span className="text-[12px] font-medium tracking-wide" style={{ color: "var(--color-muted)" }}>
          Pozri realizáciu, ktorá najviac sedí s tvojím výberom
        </span>
        <ArrowDown size={16} className="animate-bounce" style={{ color: "var(--accent)" }} />
      </a>

    </div>
  );
}

// ── Layout pieces ─────────────────────────────────────────────────────────────

/**
 * One step of the five: its number, its title, the name of what is chosen in
 * it on the right (the label a phone reads, having no hover), and a line under
 * it when another step had to change something here.
 */
function StepCard({
  step,
  title,
  aside,
  note,
  children,
}: {
  step: number;
  title: string;
  aside?: string;
  note?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="field-card rounded-[24px] p-4" aria-label={`Krok ${step}: ${title}`}>
      <div className="flex items-center gap-2.5">
        <span className="step-badge" aria-hidden="true">{step}</span>
        <h3 className="text-[15px] font-extrabold tracking-[0.005em]" style={{ color: "var(--color-foreground)" }}>
          {title}
        </h3>
        {aside && (
          <span
            className="ml-auto truncate text-[13px] font-semibold tracking-[0.01em]"
            style={{ color: "var(--color-foreground-soft)" }}
          >
            {aside}
          </span>
        )}
      </div>
      <div className="mt-3.5">{children}</div>
      {note && (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-[12.5px] leading-5 text-orange-800"
        >
          {note}
        </p>
      )}
    </section>
  );
}

function Label({ children, flush }: { children: React.ReactNode; flush?: boolean }) {
  return (
    <p
      className={`${flush ? "" : "mt-4 "}mb-2 text-[12px] font-bold uppercase tracking-[0.07em]`}
      style={{ color: "var(--color-muted)" }}
    >
      {children}
    </p>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-[12.5px] leading-5 tracking-[0.005em]" style={{ color: "var(--color-muted)" }}>
      {children}
    </p>
  );
}

// ── Choices ───────────────────────────────────────────────────────────────────

/** An icon with a short word under it — variants and material groups. */
function OptionTile({
  active,
  disabled,
  label,
  tip,
  tipSub,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  tip: string;
  tipSub?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tipProps = useTip()(tip, tipSub);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={tipSub ? `${tip} — ${tipSub}` : tip}
      disabled={disabled}
      onClick={onClick}
      className="opt-tile"
      {...tipProps}
    >
      {children}
      <span className="opt-label">{label}</span>
    </button>
  );
}

/** One build within a material group: "Veľké písmená", "Plné písmo"… */
function BuildPill({
  active,
  label,
  tip,
  tipSub,
  onClick,
}: {
  active: boolean;
  label: string;
  tip: string;
  tipSub?: string;
  onClick: () => void;
}) {
  const tipProps = useTip()(tip, tipSub);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={tip}
      onClick={onClick}
      className="opt-tile !min-h-0 !flex-row !py-2.5"
      {...tipProps}
    >
      <span className="opt-label">{label}</span>
    </button>
  );
}

/** A round colour swatch; its name comes up on hover. */
function SwatchDot({
  color,
  active,
  label,
  sub,
  glow,
  onClick,
}: {
  color: string;
  active: boolean;
  label: string;
  sub?: string;
  glow?: boolean;
  onClick: () => void;
}) {
  const tipProps = useTip()(label, sub);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      onClick={onClick}
      className="opt-dot h-8 w-8 shrink-0"
      style={{
        background: color,
        // The ring keeps white and black readable on both themes.
        border: "1px solid rgba(0,0,0,.22)",
        boxShadow: active ? undefined : glow ? `0 0 12px ${color}aa` : undefined,
      }}
      {...tipProps}
    />
  );
}

function ColorRow({
  label,
  hint,
  options,
  value,
  onPick,
}: {
  label: string;
  hint: string;
  options: ColorOption[];
  value: string;
  onPick: (c: ColorOption) => void;
}) {
  const chosen = options.find((c) => sameColor(c.value, value));
  return (
    <div>
      <p className="mb-2 text-[13px] leading-tight tracking-[0.01em]" style={{ color: "var(--color-foreground)" }}>
        <strong>{label}</strong>
        <span style={{ color: "var(--color-muted)" }}> · {hint}</span>
        {chosen && <span className="font-semibold" style={{ color: "var(--color-foreground-soft)" }}> — {chosen.label}</span>}
      </p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((c) => (
          <SwatchDot
            key={c.id}
            color={c.value}
            active={sameColor(c.value, value)}
            label={c.label}
            onClick={() => onPick(c)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The eight fonts of the price list as dots, each showing the first letter
 * the customer typed, set in that font. A font the current build is not made
 * in is shown dimmed; picking it moves the sign to a build that is.
 */
function FontDots({
  char,
  value,
  availableIn,
  materialName,
  canSwitchTo,
  onPick,
}: {
  char: string;
  value: string;
  availableIn: string[];
  materialName: string;
  canSwitchTo: (fontId: string) => string | null;
  onPick: (fontId: string) => void;
}) {
  const tip = useTip();
  return (
    <div role="radiogroup" aria-label="Font" className="grid grid-cols-8 gap-1.5">
      {CATALOGUE_FONTS.map((id) => {
        const font = fontById(id)!;
        const active = value === id;
        const available = availableIn.includes(id);
        const target = available ? id : canSwitchTo(id);
        const switchTo = target && !available ? materialById(target).displayName : null;
        const sub = available
          ? font.script ? "písané písmo" : undefined
          : switchTo
            ? `V materiáli ${materialName} sa nevyrába — prepneme na ${switchTo}.`
            : "V tomto variante sa nevyrába.";
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${font.name}${sub ? ` — ${sub}` : ""}`}
            disabled={!available && !switchTo}
            onClick={() => onPick(id)}
            className="opt-dot aspect-square w-full max-w-11 justify-self-center text-[21px] leading-none"
            style={{
              fontFamily: font.name,
              background: active ? "var(--color-primary)" : "var(--color-surface)",
              color: active ? "var(--accent-foreground)" : "var(--color-foreground)",
              border: available ? "1px solid var(--color-border)" : "1px dashed var(--color-border-strong)",
              opacity: available ? 1 : 0.5,
              cursor: !available && !switchTo ? "not-allowed" : undefined,
            }}
            {...tip(font.name, sub)}
          >
            {char}
          </button>
        );
      })}
    </div>
  );
}

// Slider in its own inset box: big live value, range, and quick-pick chips at
// the heights where the thickness steps up.
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
        <span className="text-xl font-black leading-none" style={{ color: "var(--color-foreground)" }}>
          {value}
          <span className="text-[13px] font-bold">{suffix}</span>
        </span>
        <span className="text-[12px] font-semibold tracking-[0.01em]" style={{ color: "var(--color-muted)" }}>
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
              className="chip rounded-full px-3 py-1 text-[12px] font-bold tracking-[0.01em]"
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

// ── Icons ─────────────────────────────────────────────────────────────────────

/**
 * What a variant looks like, drawn on the customer's own first letter in the
 * chosen font: lit through its face, glowing onto the wall behind it, or not
 * lit at all.
 */
function VariantGlyph({
  variant,
  char,
  fontFamily,
  glowColor,
}: {
  variant: VariantId;
  char: string;
  fontFamily?: string;
  glowColor: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const tightId = `vgt-${uid}`;
  const haloId = `vgh-${uid}`;
  const glyph = {
    x: 32,
    y: 45,
    textAnchor: "middle" as const,
    fontSize: 40,
    fontWeight: 900,
    style: fontFamily ? { fontFamily } : undefined,
  };
  // Warm white reads as cream on a light tile; the lit face is drawn in the
  // brand amber-white so it is visibly "on".
  const light = glowColor === "#ffffff" ? "#fff6d6" : glowColor;

  return (
    <svg viewBox="0 0 64 64" width={36} height={36} aria-hidden="true">
      <defs>
        <filter id={tightId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={1.6} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={haloId} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation={6.5} />
        </filter>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#16161b" opacity={variant === "plain" ? 0 : 1} />
      {variant === "front" && (
        <text {...glyph} fill={light} stroke="#2a2a30" strokeWidth={1} filter={`url(#${tightId})`}>{char}</text>
      )}
      {variant === "back" && (
        <>
          <text {...glyph} fill={light} filter={`url(#${haloId})`} opacity={0.95}>{char}</text>
          <text {...glyph} fill="#26262c">{char}</text>
        </>
      )}
      {variant === "plain" && (
        <text {...glyph} fill="currentColor">{char}</text>
      )}
    </svg>
  );
}

/** Hliník / Plast / Plexi, as simple sections through what each is. */
function GroupIcon({ group }: { group: MaterialGroupId }) {
  const common = {
    width: 30,
    height: 30,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (group === "aluminium") {
    // A channel letter's profile: an aluminium band round a face.
    return (
      <svg {...common}>
        <path d="M4 20V6.5L8 4h12v13.5L16 20H4Z" fill="currentColor" fillOpacity=".12" />
        <path d="M4 6.5h12V20M16 6.5 20 4" />
        <path d="M7.5 10h5M7.5 13.5h5" opacity=".55" />
      </svg>
    );
  }
  if (group === "plastic") {
    // 3D print: a body built up in layers.
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2.5" fill="currentColor" fillOpacity=".12" />
        <path d="M4 9.5h16M4 13.5h16M4 17h16" opacity=".6" />
        <path d="M10 2.5h4l-2 2.5-2-2.5Z" fill="currentColor" />
      </svg>
    );
  }
  // Plexi: a clear sheet catching light at its edge.
  return (
    <svg {...common}>
      <path d="M6 3.5h9l4 4v13H6z" fill="currentColor" fillOpacity=".08" />
      <path d="M15 3.5v4h4" />
      <path d="M9 16.5 15.5 10M9 12.5l3-3" opacity=".6" />
    </svg>
  );
}

// ── Face + wall at a glance ──────────────────────────────────────────────────
// A letter-shaped block seen from a slight angle: the face in front, the wall
// showing as its side band. It is what the two colours look like TOGETHER,
// which neither row of dots can show on its own.
function FaceReturnSwatch({ face, edge, glow }: { face: string; edge: string; glow: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width="58" height="58" viewBox="0 0 58 58" aria-hidden="true" className="mt-1 shrink-0 overflow-visible">
      <defs>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".45" />
          <stop offset=".45" stopColor="#fff" stopOpacity=".06" />
          <stop offset="1" stopColor="#000" stopOpacity=".12" />
        </linearGradient>
        <linearGradient id={`${id}-top`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset="1" stopColor="#fff" stopOpacity=".42" />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".22" />
          <stop offset="1" stopColor="#000" stopOpacity=".42" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${id}-shadow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* shadow on the surface it stands on */}
      <ellipse cx="29" cy="52" rx="21" ry="3.2" fill="#000" opacity=".18" filter={`url(#${id}-shadow)`} />

      {/* the wall: top and side, lit and shaded */}
      <path d="M8 17 L19 7 L50 7 L39 17 Z" fill={edge} />
      <path d="M8 17 L19 7 L50 7 L39 17 Z" fill={`url(#${id}-top)`} />
      <path d="M39 17 L50 7 L50 38 L39 48 Z" fill={edge} />
      <path d="M39 17 L50 7 L50 38 L39 48 Z" fill={`url(#${id}-side)`} />
      <path
        d="M8 17 L19 7 L50 7 L50 38 L39 48"
        fill="none"
        stroke="rgba(0,0,0,.28)"
        strokeWidth=".8"
        strokeLinejoin="round"
      />

      {/* the face — a lit one glows on its own surface, not around it */}
      <rect x="8" y="17" width="31" height="31" rx="2.5" fill={face} />
      {glow && (
        <rect x="11" y="20" width="25" height="25" rx="2" fill="#fff" opacity=".45" filter={`url(#${id}-glow)`} />
      )}
      <rect x="8" y="17" width="31" height="31" rx="2.5" fill={`url(#${id}-gloss)`} />
      <rect
        x="8.5" y="17.5" width="30" height="30" rx="2.2"
        fill="none"
        stroke="rgba(255,255,255,.35)"
        strokeWidth=".8"
      />
      <rect x="8" y="17" width="31" height="31" rx="2.5" fill="none" stroke="rgba(0,0,0,.3)" strokeWidth=".8" />
    </svg>
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

// ── Price block rows ──────────────────────────────────────────────────────────

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
      <span className="shrink-0 text-[13px]" style={{ color: "var(--color-muted)" }}>{label}</span>
      <span className="truncate text-[13px] font-bold" style={{ color: "var(--color-foreground)" }}>{value}</span>
    </div>
  );
}
