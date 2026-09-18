import type { MaterialOption, LightModeDef, ColorOption, ProfileFinish, SignType } from "@/lib/types";

// ── Font options ──────────────────────────────────────────────────────────────
// Every font is a real TTF (see /public/fonts, fetched by scripts/fetch-fonts.mjs)
// loaded via TTFLoader — full glyph set including Slovak diacritics, and every
// font extrudes the same way regardless of category (no more "flat" 2D-only
// script fonts). `name` doubles as the @font-face family name registered in
// globals.css, used for the live font-picker preview.

export type FontCategory = "sans" | "serif" | "display" | "script" | "rounded";

export type FontOption = {
  id: string;
  name: string;           // display name + @font-face family (globals.css)
  category: FontCategory;
  file: string;            // /public/fonts/<id>.ttf
  multiplier: number;      // pricing multiplier
};

// Curated down to 8 — one clean, always-visible grid in the configurator
// instead of a scrollable carousel + "show all" grouped by category. Fewer,
// stronger choices are easier for a customer to click through.
export const fontOptions: FontOption[] = [
  { id: "montserrat",       name: "Montserrat",       category: "sans",    file: "/fonts/montserrat.ttf",       multiplier: 1.0  },
  { id: "archivo-black",    name: "Archivo Black",    category: "display", file: "/fonts/archivo-black.ttf",    multiplier: 1.08 },
  { id: "oswald",           name: "Oswald",           category: "display", file: "/fonts/oswald.ttf",           multiplier: 1.05 },
  { id: "playfair-display", name: "Playfair Display", category: "serif",   file: "/fonts/playfair-display.ttf", multiplier: 1.12 },
  { id: "pacifico",         name: "Pacifico",         category: "script",  file: "/fonts/pacifico.ttf",         multiplier: 1.2  },
  { id: "dancing-script",   name: "Dancing Script",   category: "script",  file: "/fonts/dancing-script.ttf",   multiplier: 1.25 },
  { id: "great-vibes",      name: "Great Vibes",      category: "script",  file: "/fonts/great-vibes.ttf",      multiplier: 1.3  },
  { id: "baloo-2",          name: "Baloo 2",          category: "rounded", file: "/fonts/baloo-2.ttf",          multiplier: 1.06 },
];

// ── Size limits ─────────────────────────────────────────────────────────────
// What the workshop actually makes, so the configurator cannot quote a sign
// nobody would build.
export const MIN_HEIGHT_CM = 10;
export const MAX_HEIGHT_CM = 55;

// ── Depth: two different builds, two different scales ───────────────────────
//
// A CUT letter is a sheet: its thickness is the sheet's thickness, a few
// millimetres, chosen freely.
//
// A LIT letter is a channel letter: its side wall is a rolled aluminium
// profile, and a profile is not cut to an arbitrary width — it is stocked in
// fixed ones. These are the widths on the manufacturer's board (3D system,
// "System of building channel letters", 3dsystem.pl), which is what our lit
// letters are built from, whether they light through the face (Spredu) or
// throw the light back onto the wall (Zozadu):
export const PROFILE_WIDTHS_MM = [60, 80, 100, 120, 140, 167, 217] as const;

/** The shallow edge profile on the same board — the flattest lit build. */
export const EDGE_PROFILE_MM = 30;

/** Every depth a lit letter can be built in, shallowest first. */
export const PROFILE_DEPTHS_MM: number[] = [EDGE_PROFILE_MM, ...PROFILE_WIDTHS_MM];

export const MIN_DEPTH_MM = 4;
/** The deepest profile on the board. */
export const MAX_DEPTH_MM = PROFILE_DEPTHS_MM[PROFILE_DEPTHS_MM.length - 1];

/** Sheet thicknesses for a cut letter: what we normally make, and the ceiling. */
export const USUAL_SHEET_DEPTH_MM = 10;
export const MAX_SHEET_DEPTH_MM   = 30;

export function isProfileDepth(mm: number): boolean {
  return PROFILE_DEPTHS_MM.includes(mm);
}

/** The stock profile a custom depth would actually be built from. */
export function nearestProfileDepthMm(mm: number): number {
  return PROFILE_DEPTHS_MM.reduce((best, d) =>
    Math.abs(d - mm) < Math.abs(best - mm) ? d : best,
  PROFILE_DEPTHS_MM[0]);
}

// ── Materials ─────────────────────────────────────────────────────────────────
// Catalog is named by customer-facing benefit (displayName/subtitle/useTag) —
// id/pbr are internal implementation details, never rendered in the UI.
// supportsIlluminated = can have internal LED illumination
// lightModes = which LED modes make physical sense for this material

// The one list of materials on the site. The Materiály section on the home
// page and the configurator both render from it, in this order, so the
// names a customer reads in the section are exactly the options they then
// find in the configurator — they used to be two hand-kept lists in two
// files, in two different orders.
export const MATERIALS: MaterialOption[] = [
  {
    id: "kompozit",
    displayName: "Odolné exteriérové",
    tagline: "Prémiový exteriér",
    subtitle: "Hliníkový kompozit odolný voči počasiu — pevný aj v náročných podmienkach.",
    bullets: ["Hliníkový kompozit", "Odolný dažďu aj mrazu", "Fasády a vonkajšie pútače"],
    useTag: "exteriér",
    priceMultiplier: 1.15,
    supportsIlluminated: true,
    supportsPlain: true,
    lightModes: ["front", "halo", "full"],
    pbr: {
      // A composite panel is PAINTED aluminium, not bare metal. At
      // metalness 1 a PBR surface has no diffuse colour at all — it only
      // mirrors its surroundings — so a red or navy sign came out nearly
      // black and the colour the customer picked was simply not there.
      // Low metalness with a clearcoat is what a powder-coated panel is:
      // the colour reads, the sheen stays.
      roughness: 0.32,
      metalness: 0.15,
      anisotropy: 0.3,
      clearcoat: 0.45,
      clearcoatRoughness: 0.14,
      sideRoughnessMul: 1.6,
    },
  },
  {
    id: "plexi",
    displayName: "Luxusné",
    tagline: "Čistý svetelný efekt",
    subtitle: "Priehľadný akryl s prémiovým leskom a hĺbkou presvitu.",
    bullets: ["Priehľadné plexisklo", "Prémiový lesk a presvit", "Interiér aj exteriér"],
    useTag: "oboje",
    priceMultiplier: 1.25,
    supportsIlluminated: true,
    supportsPlain: true,
    lightModes: ["front", "halo", "full"],
    pbr: {
      roughness: 0.0,
      metalness: 0,
      transmission: 1.0,
      ior: 1.49,
      thickness: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      useWhiteBase: true,           // clear acrylic: body colour irrelevant when lit
      sideTransmissionMul: 0.55,
      emissiveFrontScale: 0.4,
      emissiveSideScale: 0.6,
    },
  },
  {
    id: "3dtlac",
    displayName: "Interiérové",
    tagline: "Tvarová voľnosť",
    subtitle: "3D tlačený plast s jemným presvitom — ideálny pre detailné tvary.",
    bullets: ["3D tlačený plast", "Jemný, mäkký presvit", "Aj členité tvary a logá"],
    useTag: "interiér",
    priceMultiplier: 1.0,
    supportsIlluminated: true,
    supportsPlain: true,
    lightModes: ["front", "halo", "full"],
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
    id: "pvc",
    displayName: "Cenovo dostupné",
    tagline: "Praktický interiér",
    subtitle: "Ľahká penová doska — najúspornejšia voľba pre jednoduché nápisy.",
    bullets: ["Ľahká penová doska", "Najnižšia cena z ponuky", "Bez podsvietenia, do interiéru"],
    useTag: "interiér",
    priceMultiplier: 0.9,
    supportsIlluminated: false,
    supportsPlain: true,
    lightModes: [],
    pbr: {
      roughness: 0.6,
      metalness: 0,
    },
  },
];

// ── Light modes ───────────────────────────────────────────────────────────────
// Three simple options for the customer: front-lit face, halo behind the
// letter, or the whole letter glowing. signType === 'plain' handles no-light.

export const LIGHT_MODES: LightModeDef[] = [
  {
    id: "front",
    name: "Spredu",
    description: "Svetlo cez prednú plochu písmena",
    direction: "front",
    price: 55,
  },
  {
    id: "halo",
    name: "Zozadu",
    description: "Žiara za písmenom na stene",
    direction: "back",
    price: 65,
  },
  {
    id: "full",
    name: "Celé",
    description: "Celé písmeno rovnomerne svieti",
    direction: "full",
    price: 95,
  },
];

// ── Light colours (LED colour swatches) ───────────────────────────────────────

export const lightColors = [
  { id: "white",  label: "Biela",    value: "#ffffff", hue: 0   },
  { id: "red",    label: "Červená",  value: "#ff2a2a", hue: 0   },
  { id: "orange", label: "Oranžová", value: "#ff7a00", hue: 28  },
  { id: "yellow", label: "Žltá",     value: "#FFAE00", hue: 41  }, // brand accent — matches --color-primary
  { id: "green",  label: "Zelená",   value: "#00d084", hue: 152 },
  { id: "cyan",   label: "Cyan",     value: "#00c8ff", hue: 195 },
  { id: "blue",   label: "Modrá",    value: "#245cff", hue: 230 },
  { id: "pink",   label: "Ružová",   value: "#ff4bd8", hue: 310 },
];

// ── Body/material colours ─────────────────────────────────────────────────────
//
// Taken off the manufacturer's board (3D system, "System of building channel
// letters"): these are the finishes a 3D profile is actually stocked in, so a
// customer picking one is picking something that exists on a shelf rather than
// a colour we would have to have made. Same nine RAL tones for a cut letter —
// a lacquered sheet is coated in the same range.
const PROFILE_RAL: ColorOption[] = [
  { id: "white",  label: "Biela",               value: "#f1f0ea", code: "RAL 9016" },
  { id: "yellow", label: "Dopravná žltá",       value: "#fad201", code: "RAL 1023" },
  { id: "orange", label: "Oranžová",            value: "#e75b12", code: "RAL 2004" },
  { id: "red",    label: "Dopravná červená",    value: "#cc0605", code: "RAL 3020" },
  { id: "green",  label: "Mätová zelená",       value: "#20603d", code: "RAL 6029" },
  { id: "blue",   label: "Ultramarínová modrá", value: "#20214f", code: "RAL 5002" },
  { id: "black",  label: "Čierna",              value: "#0a0a0a", code: "RAL 9005" },
  { id: "silver", label: "Strieborná",          value: "#a5a5a5", code: "RAL 9006" },
];

// Profile-only finishes. The matt white is the same RAL tone with the gloss
// taken out of it, so it needs its own id (the hex alone cannot tell them
// apart). The four metal finishes are rolled aluminium, not paint — they are
// back on the board the customer's own supplier prints, which is why gold is
// here again after we dropped the novelty metallics.
const PROFILE_SPECIAL: ColorOption[] = [
  {
    id: "white-mat", label: "Biela matná", value: "#eeeee7",
    code: "RAL 9016 MAT", finish: "matte",
  },
  {
    id: "silver-brushed", label: "Brúsená strieborná", value: "#c7cacd",
    code: "Silver Brushed", finish: "brushed",
    swatch: "linear-gradient(110deg,#b9bdc2 0%,#e6e9ec 38%,#aeb3b8 62%,#d5d9dd 100%)",
  },
  {
    id: "gold-brushed", label: "Brúsená zlatá", value: "#c2a25f",
    code: "Gold Brushed", finish: "brushed",
    swatch: "linear-gradient(110deg,#a98c4c 0%,#e2c684 38%,#a3854a 62%,#d3b872 100%)",
  },
  {
    id: "silver-mirror", label: "Zrkadlová strieborná", value: "#dfe4e8",
    code: "Silver Mirror", finish: "mirror",
    swatch: "linear-gradient(135deg,#ffffff 0%,#c3cad1 45%,#f2f5f8 55%,#aab2ba 100%)",
  },
  {
    id: "gold-mirror", label: "Zrkadlová zlatá", value: "#d9b866",
    code: "Gold Mirror", finish: "mirror",
    swatch: "linear-gradient(135deg,#fff3d0 0%,#c9a94f 45%,#f6e3ae 55%,#a9862f 100%)",
  },
];

/** Cut (non-lit) letters: lacquered sheet, the RAL range only. */
export const letterColorOptions: ColorOption[] = PROFILE_RAL;

/** Lit letters: everything the 3D profile is stocked in. */
export const profileColorOptions: ColorOption[] = [
  PROFILE_RAL[0],
  PROFILE_SPECIAL[0],            // matt white sits next to the gloss one
  ...PROFILE_RAL.slice(1),
  ...PROFILE_SPECIAL.slice(1),   // the metal finishes close the row
];

/** Which colours a sign of this kind can be made in. */
export function bodyColorOptionsFor(signType: SignType): ColorOption[] {
  return signType === "illuminated" ? profileColorOptions : letterColorOptions;
}

/** How a chosen colour behaves under light — used by the 3D preview. */
export function finishForColor(hex: string): ProfileFinish {
  const v = hex.toLowerCase();
  return profileColorOptions.find((c) => c.value.toLowerCase() === v)?.finish ?? "gloss";
}
