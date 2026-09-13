import type { MaterialOption, LightModeDef, SignType, LightModeId } from "@/lib/types";

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
//
// Thickness is ONE range for the whole configurator. It used to depend on
// whether the sign was lit, which meant switching Svetelné/Nesvetelné silently
// rewrote a thickness the customer had already chosen — the setting moved
// under their hands. What each build is usually made in is advice now
// (usualDepthMm below), shown as a note, never applied to the value.
export const MIN_HEIGHT_CM = 10;
export const MAX_HEIGHT_CM = 55;

export const MIN_DEPTH_MM = 4;
export const MAX_DEPTH_MM = 200;

// What the workshop normally builds: a cut letter is a sheet; a lit letter is
// a box deep enough for the LEDs; a face-lit letter in the exterior composite
// is the one build that goes really deep, because the LEDs have to sit far
// enough behind the face to light it evenly.
export const USUAL_DEPTH_MM_PLAIN          = 10;
export const USUAL_DEPTH_MM_ILLUMINATED    = 50;
export const USUAL_DEPTH_MM_FRONT_EXTERIOR = 200;
const DEEP_BUILD_MATERIAL = "kompozit";

/** The thickness this build is usually made in — guidance for the UI only. */
export function usualDepthMm(signType: SignType, lightMode?: LightModeId, materialId?: string): number {
  if (signType !== "illuminated") return USUAL_DEPTH_MM_PLAIN;
  if (lightMode === "front" && materialId === DEEP_BUILD_MATERIAL) return USUAL_DEPTH_MM_FRONT_EXTERIOR;
  return USUAL_DEPTH_MM_ILLUMINATED;
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

// Finishes a sign is actually made in. The first four are the standard
// aluminium-profile colours — the ones a profile is stocked in, so they need
// no special order — and the rest are common RAL powder coats. Novelty metal
// finishes (gold, copper) were dropped: they are not stock profile colours,
// and a flat swatch is a poor promise of what a metallic finish looks like.
export const letterColorOptions = [
  { id: "white",    label: "Biela",        value: "#f2f2f2" }, // RAL 9016
  { id: "black",    label: "Čierna",       value: "#1a1a1a" }, // RAL 9005
  { id: "charcoal", label: "Antracit",     value: "#3a3a3a" }, // RAL 7016
  { id: "silver",   label: "Strieborná",   value: "#b0b8c1" }, // prírodný elox
  { id: "red",      label: "Červená",      value: "#c41e3a" }, // RAL 3020
  { id: "navy",     label: "Tmavomodrá",   value: "#1e3a8a" }, // RAL 5010
  { id: "green",    label: "Tmavá zelená", value: "#166534" }, // RAL 6005
];
