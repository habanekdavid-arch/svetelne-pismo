import type {
  MaterialOption,
  LightModeDef,
  ColorOption,
  ProfileFinish,
  SignType,
  Placement,
  LightModeId,
  HeightBand,
  PriceTier,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// THE CATALOGUE
//
// Everything below is the official price list (e-shop_rozsvietto_cennik.xlsx):
// sheet "strom" decides what is offered where, "parametre" fixes the fonts,
// heights and thicknesses of each build, and "ceny" the unit prices. Nothing
// here is invented — if an option is not in that file, it is not in the
// configurator, and a change to the workshop's offer is a change to this file.
// ─────────────────────────────────────────────────────────────────────────────

// ── Fonts ────────────────────────────────────────────────────────────────────
// Named exactly as the price list names them, because the list ties a font to
// a build: a weight is a different font here, not a styling detail (Montserrat
// SemiBold and Montserrat ExtraBold are two separate rows).
//
// The files are the ones in /public/fonts_rozsvietto — the folder of licensed
// and open faces that belongs to this catalogue. `name` doubles as the
// @font-face family in globals.css, which is what the font picker previews
// with and what lib/useSignSize.ts measures the sign with, and `file` is what
// the 3D preview extrudes. Spaces in a path have to arrive encoded: the loader
// fetches this string as a URL.
//
// One row of the price list has no file yet: Arial Black. It is a licensed
// Microsoft face and nothing in the folder is it, so it is not offered —
// showing a font the preview cannot draw would be worse than leaving it out.
// Drop the file in and add one line here and it is back.

export type FontOption = {
  id: string;
  /** As written in the price list. */
  name: string;
  file: string;
};

export const fontOptions: FontOption[] = [
  { id: "archivo-black",          name: "Archivo Black",          file: "/fonts_rozsvietto/archivo-black/ArchivoBlack-Regular.ttf" },
  { id: "gotham-medium",          name: "Gotham Medium",          file: "/fonts_rozsvietto/gotham/Gotham/Gotham%20Medium/Gotham%20Medium.otf" },
  { id: "gotham-bold",            name: "Gotham Bold",            file: "/fonts_rozsvietto/gotham/Gotham/Gotham%20Bold/Gotham%20Bold.otf" },
  { id: "gotham-ultra",           name: "Gotham Ultra",           file: "/fonts_rozsvietto/gotham/Gotham/Gotham%20Ultra/Gotham%20Ultra.otf" },
  { id: "montserrat-semibold",    name: "Montserrat SemiBold",    file: "/fonts_rozsvietto/montserrat/Montserrat-SemiBold.ttf" },
  { id: "montserrat-bold",        name: "Montserrat Bold",        file: "/fonts_rozsvietto/montserrat/Montserrat-Bold.ttf" },
  { id: "montserrat-extrabold",   name: "Montserrat ExtraBold",   file: "/fonts_rozsvietto/montserrat/Montserrat-ExtraBold.ttf" },
  { id: "poppins-semibold",       name: "Poppins SemiBold",       file: "/fonts_rozsvietto/poppins/Poppins-SemiBold.ttf" },
  { id: "poppins-extrabold",      name: "Poppins ExtraBold",      file: "/fonts_rozsvietto/poppins/Poppins-ExtraBold.ttf" },
  { id: "baloo2-semibold",        name: "Baloo2 SemiBold",        file: "/fonts_rozsvietto/baloo-2/static/Baloo2-SemiBold.ttf" },
  { id: "baloo2-extrabold",       name: "Baloo2 ExtraBold",       file: "/fonts_rozsvietto/baloo-2/static/Baloo2-ExtraBold.ttf" },
  { id: "comic-helvetic-medium",  name: "Comic Helvetic Medium",  file: "/fonts_rozsvietto/comic-helvetic/ComicHelvetic_Medium.otf" },
  { id: "comic-helvetic-heavy",   name: "Comic Helvetic HeavyBold", file: "/fonts_rozsvietto/comic-helvetic/ComicHelvetic_Heavy.otf" },
  { id: "oswald-regular",         name: "Oswald Regular",         file: "/fonts_rozsvietto/Oswald/static/Oswald-Regular.ttf" },
  { id: "oswald-semibold",        name: "Oswald SemiBold",        file: "/fonts_rozsvietto/Oswald/static/Oswald-SemiBold.ttf" },
  { id: "oswald-bold",            name: "Oswald Bold",            file: "/fonts_rozsvietto/Oswald/static/Oswald-Bold.ttf" },
  { id: "pacifico",               name: "Pacifico",               file: "/fonts_rozsvietto/Pacifico/Pacifico-Regular.ttf" },
  { id: "momo-signature",         name: "Momo Signature",         file: "/fonts_rozsvietto/Momo_Signature,Pacifico/Momo_Signature/MomoSignature-Regular.ttf" },
];

// The sets are the price list's own rows, in its own order.

/** Alurol (veľké aj malé písmo): Arial Black*, Archivo Black, Gotham Ultra, Montserrat ExtraBold, Oswald Bold, Poppins ExtraBold. */
const ALUROL_FONTS = [
  "archivo-black",
  "gotham-ultra",
  "montserrat-extrabold",
  "oswald-bold",
  "poppins-extrabold",
];

/** 30 mm plexi: its ten rows, complete. */
const PLEXI30_FONTS = [
  "gotham-medium",
  "gotham-bold",
  "montserrat-semibold",
  "montserrat-bold",
  "oswald-regular",
  "oswald-semibold",
  "baloo2-semibold",
  "baloo2-extrabold",
  "comic-helvetic-medium",
  "pacifico",
];

/** 3D print (svetelné, nesvetelné, plné písmo) and UV plexi: every font in the list. */
const PRINT_FONTS = fontOptions.map((f) => f.id);

// ── Unit prices (sheet "ceny", € per m² without VAT unless noted) ────────────
// Banded by the area of the whole sign: up to 3 m², up to 5 m², above that.
const ALUROL_PLEXI30_LIT: PriceTier[] = [
  { maxM2: 3, perM2: 960 },
  { maxM2: 5, perM2: 870 },
  { maxM2: Infinity, perM2: 650 },
];
const ALUROL_PLAIN: PriceTier[] = [
  { maxM2: 3, perM2: 672 },
  { maxM2: 5, perM2: 609 },
  { maxM2: Infinity, perM2: 455 },
];
const PRINT_LIT: PriceTier[] = [
  { maxM2: 3, perM2: 864 },
  { maxM2: 5, perM2: 783 },
  { maxM2: Infinity, perM2: 585 },
];
const PRINT_PLAIN: PriceTier[] = [
  { maxM2: 3, perM2: 604.8 },
  { maxM2: 5, perM2: 548.1 },
  { maxM2: Infinity, perM2: 409.5 },
];
const PLEXI_UV_PLAIN: PriceTier[] = [
  { maxM2: 3, perM2: 460 },
  { maxM2: 5, perM2: 368 },
  { maxM2: Infinity, perM2: 322 },
];
/** Solid 3D print is the one build priced by volume, not by area: 1 €/cm³. */
const SOLID_PRICE_PER_CM3 = 1;

// ── Builds ───────────────────────────────────────────────────────────────────
// One entry per row group of sheet "parametre". `bands` is that row's height →
// thickness mapping: the customer picks a height, the build decides how thick
// it comes out, exactly as the workshop makes it.

export const MATERIALS: MaterialOption[] = [
  {
    id: "alurol-upper",
    displayName: "Alurol – veľké písmená",
    tagline: "Hliníkový profil",
    subtitle: "Písmo z hliníkového profilu Alurol — najpevnejšia stavba, na veľké formáty a fasády.",
    bullets: ["Profil 60 / 80 / 100 / 120 mm", "Výška 250 – 2000 mm", "Svetelné aj nesvetelné"],
    useTag: "exteriér",
    fonts: ALUROL_FONTS,
    bands: [
      { minMm: 250,  maxMm: 599,  depthMm: 60 },
      { minMm: 600,  maxMm: 999,  depthMm: 80 },
      { minMm: 1000, maxMm: 1499, depthMm: 100 },
      { minMm: 1500, maxMm: 2000, depthMm: 120 },
    ],
    litPrice: ALUROL_PLEXI30_LIT,
    plainPrice: ALUROL_PLAIN,
    pbr: {
      // Painted aluminium, not bare metal: at metalness 1 a PBR surface has no
      // diffuse colour at all and a red sign comes out nearly black.
      roughness: 0.32,
      metalness: 0.15,
      anisotropy: 0.3,
      clearcoat: 0.45,
      clearcoatRoughness: 0.14,
      sideRoughnessMul: 1.6,
    },
  },
  {
    id: "alurol-lower",
    displayName: "Alurol – malé písmená",
    tagline: "Hliníkový profil",
    subtitle: "Ten istý profil pre nápisy písané malými písmenami — začína o niečo vyššie.",
    bullets: ["Profil 60 / 80 / 100 / 120 mm", "Výška 350 – 2000 mm", "Svetelné aj nesvetelné"],
    useTag: "exteriér",
    fonts: ALUROL_FONTS,
    bands: [
      { minMm: 350,  maxMm: 599,  depthMm: 60 },
      { minMm: 600,  maxMm: 999,  depthMm: 80 },
      { minMm: 1000, maxMm: 1499, depthMm: 100 },
      { minMm: 1500, maxMm: 2000, depthMm: 120 },
    ],
    litPrice: ALUROL_PLEXI30_LIT,
    plainPrice: ALUROL_PLAIN,
    pbr: {
      roughness: 0.32,
      metalness: 0.15,
      anisotropy: 0.3,
      clearcoat: 0.45,
      clearcoatRoughness: 0.14,
      sideRoughnessMul: 1.6,
    },
  },
  {
    id: "plexi30",
    displayName: "30 mm plexi",
    tagline: "Čistý svetelný efekt",
    subtitle: "Plexisklové písmo hrúbky 30 mm — svieti prednou plochou alebo hranami.",
    bullets: ["Hrúbka 30 mm", "Výška 150 – 600 mm", "Svietenie spredu alebo hranami"],
    useTag: "oboje",
    fonts: PLEXI30_FONTS,
    bands: [{ minMm: 150, maxMm: 600, depthMm: 30 }],
    litPrice: ALUROL_PLEXI30_LIT,
    pbr: {
      roughness: 0.0,
      metalness: 0,
      // Not 1.0 any more. A 30 mm plexi letter is made from COLOURED cast
      // acrylic, and at full transmission the sheet is clear glass: the body
      // colour the customer picked had almost no effect on it, so red and
      // blue looked the same. Translucent, not transparent.
      transmission: 0.68,
      ior: 1.49,
      thickness: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      useWhiteBase: true,           // lit acrylic lightens — but only a little
      sideTransmissionMul: 0.55,
      emissiveFrontScale: 0.4,
      emissiveSideScale: 0.6,
    },
  },
  {
    id: "print3d",
    displayName: "3D tlač s plexi",
    tagline: "Tvarová voľnosť",
    subtitle: "3D tlačené telo s plexisklovým čelom — zvládne aj členité tvary a logá.",
    bullets: ["Hrúbka 20 / 30 / 50 mm podľa výšky", "Výška 120 – 600 mm", "Interiér aj exteriér"],
    useTag: "oboje",
    fonts: PRINT_FONTS,
    bands: [
      { minMm: 120, maxMm: 199, depthMm: 20 },
      { minMm: 200, maxMm: 399, depthMm: 30 },
      { minMm: 400, maxMm: 600, depthMm: 50 },
    ],
    litPrice: PRINT_LIT,
    plainPrice: PRINT_PLAIN,
    pbr: {
      roughness: 0.52,
      metalness: 0,
      transmission: 0.38,
      ior: 1.46,
      thickness: 0.35,
      sideTransmissionMul: 0.4,
    },
  },
  {
    id: "print3d-solid",
    displayName: "3D tlač plné písmo",
    tagline: "Plné 3D písmo",
    subtitle: "Celé vytlačené písmeno bez podsvietenia — najtenšia a najľahšia stavba.",
    bullets: ["Hrúbka 10 / 20 mm podľa výšky", "Výška 50 – 300 mm", "Bez svietenia"],
    useTag: "oboje",
    fonts: PRINT_FONTS,
    bands: [
      { minMm: 50,  maxMm: 149, depthMm: 10 },
      { minMm: 150, maxMm: 300, depthMm: 20 },
    ],
    volumePricePerCm3: SOLID_PRICE_PER_CM3,
    pbr: {
      roughness: 0.55,
      metalness: 0,
    },
  },
  {
    id: "plexi-uv",
    displayName: "Plexi s UV tlačou",
    tagline: "Potlačené plexi",
    subtitle: "Rezané plexi s UV potlačou — cenovo najdostupnejšia voľba, do interiéru.",
    bullets: ["Hrúbka 5 / 8 / 12 mm podľa výšky", "Výška 50 – 250 mm", "Iba interiér"],
    useTag: "interiér",
    fonts: PRINT_FONTS,
    bands: [
      { minMm: 50,  maxMm: 99,  depthMm: 5 },
      { minMm: 100, maxMm: 149, depthMm: 8 },
      { minMm: 150, maxMm: 250, depthMm: 12 },
    ],
    plainPrice: PLEXI_UV_PLAIN,
    pbr: {
      roughness: 0.12,
      metalness: 0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
    },
  },
];

export const DEFAULT_MATERIAL = "print3d";

export function materialById(id: string): MaterialOption {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
}

// ── What is offered where (sheet "strom") ────────────────────────────────────
// A lit sign is offered by placement AND by where the light comes from; an
// unlit one only by placement. Anything not listed here is not made, which is
// why the configurator never shows it.

const LIT_OFFER: Record<string, string[]> = {
  "exterior|front": ["alurol-upper", "alurol-lower", "plexi30", "print3d"],
  "exterior|back":  ["alurol-upper", "alurol-lower", "print3d"],
  "exterior|edge":  ["plexi30"],
  "interior|front": ["plexi30", "print3d"],
  "interior|back":  ["print3d"],
  "interior|edge":  ["plexi30"],
};

const PLAIN_OFFER: Record<Placement, string[]> = {
  exterior: ["alurol-upper", "alurol-lower", "print3d", "print3d-solid"],
  interior: ["print3d-solid", "plexi-uv"],
};

/** The builds this exact combination is made in — in catalogue order. */
export function materialsFor(
  signType: SignType,
  placement: Placement,
  lightMode: LightModeId,
): MaterialOption[] {
  const ids = signType === "illuminated"
    ? LIT_OFFER[placement + "|" + lightMode] ?? []
    : PLAIN_OFFER[placement];
  return MATERIALS.filter((m) => ids.includes(m.id));
}

/** Which ways of lighting are made at all for this placement. */
export function lightModesFor(placement: Placement): LightModeDef[] {
  return LIGHT_MODES.filter((mode) => (LIT_OFFER[placement + "|" + mode.id] ?? []).length > 0);
}

/** Fonts this build is made in (price list, sheet "parametre"). */
export function fontsFor(materialId: string): FontOption[] {
  const ids = materialById(materialId).fonts;
  return fontOptions.filter((f) => ids.includes(f.id));
}

// ── Heights and thicknesses ──────────────────────────────────────────────────
// Height is what the customer chooses, in millimetres, and the build's bands
// turn it into the thickness the workshop makes it in. There is no thickness
// control: in this catalogue the thickness is not a choice, it is a
// consequence — which is also why nothing can silently rewrite it.

export function heightRange(materialId: string): { minMm: number; maxMm: number } {
  const bands = materialById(materialId).bands;
  return { minMm: bands[0].minMm, maxMm: bands[bands.length - 1].maxMm };
}

export function bandFor(materialId: string, heightMm: number): HeightBand {
  const bands = materialById(materialId).bands;
  return (
    bands.find((b) => heightMm >= b.minMm && heightMm <= b.maxMm) ??
    (heightMm < bands[0].minMm ? bands[0] : bands[bands.length - 1])
  );
}

/** The thickness this height is built in. */
export function depthMmFor(materialId: string, heightMm: number): number {
  return bandFor(materialId, heightMm).depthMm;
}

/** Height clamped into what this build is made in — used when switching build. */
export function clampHeight(materialId: string, heightMm: number): number {
  const { minMm, maxMm } = heightRange(materialId);
  return Math.min(maxMm, Math.max(minMm, heightMm));
}

/** Where the thickness steps up — the height slider offers these as shortcuts. */
export function bandStarts(materialId: string): number[] {
  return materialById(materialId).bands.map((b) => b.minMm);
}

// ── Light modes (sheet "strom": spredu / zozadu / hranami) ───────────────────

export const LIGHT_MODES: LightModeDef[] = [
  {
    id: "front",
    name: "Spredu",
    description: "Svetlo cez prednú plochu písmena",
    direction: "front",
  },
  {
    id: "back",
    name: "Zozadu",
    description: "Žiara za písmenom na stene",
    direction: "back",
  },
  {
    id: "edge",
    name: "Hranami",
    description: "Svetlo vychádza z hrán plexi",
    direction: "edge",
  },
];

export const PLACEMENTS: { id: Placement; label: string; hint: string }[] = [
  { id: "exterior", label: "Exteriér", hint: "Na fasádu, do vonkajšieho prostredia" },
  { id: "interior", label: "Interiér", hint: "Do prevádzky, na stenu v interiéri" },
];

// ── Light colours ───────────────────────────────────────────────────────────
//
// A short, honest list of what the workshop actually fits, not a colour
// picker. Two whites — intense (studená) and warm — plus plain R‑G‑B, which is
// what an RGB LED module does without being driven as a colour-changer.
//
// Not every colour goes with every light mode: a back-lit sign is a wash of
// light on the wall behind the letter, and that is made in white and warm
// white only. lightColorsFor() is the single place that says so, the same way
// materialsFor() and fontsFor() decide the rest of the catalogue.

export type LightColorOption = {
  id: string;
  label: string;
  /** What the 3D preview and the order sheet carry — Config.lightColor. */
  value: string;
  hint: string;
};

/**
 * Not a colour but an instruction: the LEDs take whatever colour the letter
 * body is, and keep following it if that changes. Stored in Config.lightColor
 * in place of a hex, and resolved wherever the real colour is needed
 * (resolveLightColor below).
 */
export const LIGHT_COLOR_AS_BODY = "body";

export const LIGHT_COLORS: LightColorOption[] = [
  { id: "white-warm", label: "Teplá biela",      value: "#ffcf9a", hint: "Mäkké, teplé svetlo — najčastejšia voľba" },
  { id: "white-cool", label: "Biela intenzívna", value: "#ffffff", hint: "Studená biela, najsilnejší svit" },
  { id: "red",        label: "Červená",          value: "#ff2a2a", hint: "RGB modul" },
  { id: "green",      label: "Zelená",           value: "#00d084", hint: "RGB modul" },
  { id: "blue",       label: "Modrá",            value: "#245cff", hint: "RGB modul" },
  {
    id: "as-body",
    label: "Rovnaká ako telo",
    value: LIGHT_COLOR_AS_BODY,
    hint: "Svetlo má farbu písmena — a mení sa s ňou",
  },
];

/**
 * The colour the LEDs actually are. Everything that draws or stores a real
 * colour goes through this, because Config.lightColor may hold the "same as
 * the body" instruction instead of a hex.
 */
export function resolveLightColor(config: {
  lightColor: string;
  bodyColor: string;
}): string {
  return config.lightColor === LIGHT_COLOR_AS_BODY ? config.bodyColor : config.lightColor;
}

/** Warm white: what a sign gets unless the customer says otherwise. */
export const DEFAULT_LIGHT_COLOR = LIGHT_COLORS[0].value;

/** Svietenie zozadu je žiara na stene — robí sa len v bielej a teplej bielej. */
const WHITES_ONLY: LightModeId[] = ["back"];

export function lightColorsFor(mode: LightModeId): LightColorOption[] {
  // "Rovnaká ako telo" is a colour like any other as far as the workshop is
  // concerned, so it follows the same rule as R-G-B: not for a back-lit sign,
  // where only the two whites are made.
  return WHITES_ONLY.includes(mode)
    ? LIGHT_COLORS.filter((c) => c.id.startsWith("white-"))
    : LIGHT_COLORS;
}

/**
 * The colour kept, or the default when this light mode is not made in it —
 * so switching from "hranami" in red to "zozadu" lands on warm white instead
 * of quoting a sign nobody makes.
 */
export function clampLightColor(mode: LightModeId, value: string): string {
  const offered = lightColorsFor(mode);
  return offered.some((c) => c.value.toLowerCase() === value.toLowerCase())
    ? value
    : offered[0].value;
}

/** The option behind a stored hex, for showing its name back to the customer. */
export function lightColorOption(value: string): LightColorOption | undefined {
  return LIGHT_COLORS.find((c) => c.value.toLowerCase() === value.toLowerCase());
}

// ── Body/material colours ────────────────────────────────────────────────────
//
// Taken off the manufacturer's board (3D system, "System of building channel
// letters"): these are the finishes a profile is actually stocked in, so a
// customer picking one is picking something that exists on a shelf rather than
// a colour we would have to have made. The same tones for a cut letter — a
// lacquered sheet is coated in the same range.
//
// Named in plain Slovak, not by RAL number: the code meant nothing to anyone
// choosing a colour on screen and only made the list harder to read.
const PROFILE_COLORS: ColorOption[] = [
  { id: "white",  label: "Biela",       value: "#f1f0ea" },
  { id: "yellow", label: "Žltá",        value: "#fad201" },
  { id: "orange", label: "Oranžová",    value: "#e75b12" },
  { id: "red",    label: "Červená",     value: "#cc0605" },
  { id: "green",  label: "Zelená",      value: "#20603d" },
  { id: "blue",   label: "Modrá",       value: "#20214f" },
  { id: "black",  label: "Čierna",      value: "#0a0a0a" },
  { id: "silver", label: "Strieborná",  value: "#a5a5a5" },
];

// The one finish that is not a colour of its own: the same white with the
// gloss taken out of it, so it needs its own id (the hex alone cannot tell
// them apart).
//
// The brushed and mirrored metal finishes from the profile board are NOT here.
// They were asked to stay out of the configurator — "len normálne farby" — and
// a finish that is out is out: no option, no swatch, and nothing behind it.
const PROFILE_MATT: ColorOption = {
  id: "white-mat", label: "Biela matná", value: "#eeeee7", finish: "matte",
};

/** Cut (non-lit) letters: lacquered sheet, the same range. */
export const letterColorOptions: ColorOption[] = PROFILE_COLORS;

/** Lit letters: the same range, plus the matt white. */
export const profileColorOptions: ColorOption[] = [
  PROFILE_COLORS[0],
  PROFILE_MATT,                  // matt white sits next to the gloss one
  ...PROFILE_COLORS.slice(1),
];

/** Which colours a sign of this kind can be made in. */
export function bodyColorOptionsFor(signType: SignType): ColorOption[] {
  return signType === "illuminated" ? profileColorOptions : letterColorOptions;
}

// ── Veľké / malé písmo ──────────────────────────────────────────────────────
//
// Cenník vedie alurol ako dve samostatné stavby: "veľké písmo" od 250 mm
// a "malé písmo" od 350 mm (hárok "parametre"). Nie je to štýl, ale to, čo sa
// naozaj vyrába — tak nech sa do nápisu ani nedá napísať nič iné. Ostatné
// stavby žiadne takéto obmedzenie nemajú a vracajú null.

export type TextCase = "upper" | "lower";

const TEXT_CASE: Record<string, TextCase> = {
  "alurol-upper": "upper",
  "alurol-lower": "lower",
};

/** Ktorou veľkosťou písmen sa táto stavba vyrába, alebo null keď je jedno. */
export function textCaseFor(materialId: string): TextCase | null {
  return TEXT_CASE[materialId] ?? null;
}

/**
 * Text prepísaný tak, ako sa dá vyrobiť. Prepisuje sa, nie odmieta: kto
 * prepne stavbu na "malé písmená", chce svoj nápis malými, nie prázdne pole.
 * Slovenská diakritika sa mení podľa locale, aby "Č" bolo "č" a nie "C".
 */
export function applyTextCase(text: string, materialId: string): string {
  const mode = textCaseFor(materialId);
  if (!mode) return text;
  return mode === "upper" ? text.toLocaleUpperCase("sk-SK") : text.toLocaleLowerCase("sk-SK");
}

/** How a chosen colour behaves under light — used by the 3D preview. */
export function finishForColor(hex: string): ProfileFinish {
  const v = hex.toLowerCase();
  return profileColorOptions.find((c) => c.value.toLowerCase() === v)?.finish ?? "gloss";
}
