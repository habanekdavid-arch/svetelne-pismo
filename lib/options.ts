import type { MaterialOption, LightModeDef } from "@/lib/types";

// ── Font options ──────────────────────────────────────────────────────────────
// Every font is a real TTF (see /public/fonts, fetched by scripts/fetch-fonts.mjs)
// loaded via TTFLoader — full glyph set including Slovak diacritics, and every
// font extrudes the same way regardless of category (no more "flat" 2D-only
// script fonts). `name` doubles as the @font-face family name registered in
// globals.css, used for the live font-picker preview.

export type FontCategory = "sans" | "serif" | "display" | "script" | "rounded" | "slab";

export const FONT_CATEGORY_LABEL: Record<FontCategory, string> = {
  sans:    "Sans",
  serif:   "Serif",
  display: "Display",
  script:  "Písané",
  rounded: "Zaoblené",
  slab:    "Slab",
};

export type FontOption = {
  id: string;
  name: string;           // display name + @font-face family (globals.css)
  category: FontCategory;
  file: string;            // /public/fonts/<id>.ttf
  multiplier: number;      // pricing multiplier
};

export const fontOptions: FontOption[] = [
  { id: "montserrat",       name: "Montserrat",       category: "sans",    file: "/fonts/montserrat.ttf",       multiplier: 1.0  },
  { id: "poppins",          name: "Poppins",          category: "sans",    file: "/fonts/poppins.ttf",          multiplier: 1.0  },
  { id: "inter",            name: "Inter",            category: "sans",    file: "/fonts/inter.ttf",            multiplier: 0.98 },
  { id: "playfair-display", name: "Playfair Display", category: "serif",   file: "/fonts/playfair-display.ttf", multiplier: 1.12 },
  { id: "merriweather",     name: "Merriweather",     category: "serif",   file: "/fonts/merriweather.ttf",     multiplier: 1.1  },
  { id: "oswald",           name: "Oswald",           category: "display", file: "/fonts/oswald.ttf",           multiplier: 1.05 },
  { id: "archivo-black",    name: "Archivo Black",    category: "display", file: "/fonts/archivo-black.ttf",    multiplier: 1.08 },
  { id: "pacifico",         name: "Pacifico",         category: "script",  file: "/fonts/pacifico.ttf",         multiplier: 1.2  },
  { id: "dancing-script",   name: "Dancing Script",   category: "script",  file: "/fonts/dancing-script.ttf",   multiplier: 1.25 },
  { id: "caveat",           name: "Caveat",           category: "script",  file: "/fonts/caveat.ttf",           multiplier: 1.18 },
  { id: "great-vibes",      name: "Great Vibes",      category: "script",  file: "/fonts/great-vibes.ttf",      multiplier: 1.3  },
  { id: "baloo-2",          name: "Baloo 2",          category: "rounded", file: "/fonts/baloo-2.ttf",          multiplier: 1.06 },
  { id: "quicksand",        name: "Quicksand",        category: "rounded", file: "/fonts/quicksand.ttf",        multiplier: 1.04 },
  { id: "roboto-slab",      name: "Roboto Slab",      category: "slab",    file: "/fonts/roboto-slab.ttf",      multiplier: 1.1  },
];

// ── Thickness range (mm) ────────────────────────────────────────────────────
// One shared range for every material — thickness no longer depends on the
// chosen material, and switching material never touches it.
export const MIN_DEPTH_MM = 4;
export const MAX_DEPTH_MM = 200;

// ── Materials ─────────────────────────────────────────────────────────────────
// Catalog is named by customer-facing benefit (displayName/subtitle/useTag) —
// id/pbr are internal implementation details, never rendered in the UI.
// supportsIlluminated = can have internal LED illumination
// lightModes = which LED modes make physical sense for this material

export const MATERIALS: MaterialOption[] = [
  {
    id: "plexi",
    displayName: "Luxusné",
    subtitle: "Priehľadný akryl s prémiovým leskom a hĺbkou presvitu",
    useTag: "oboje",
    priceMultiplier: 1.25,
    supportsIlluminated: true,
    supportsPlain: true,
    lightModes: ["front", "halo", "sides", "outline", "full", "combined"],
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
    subtitle: "3D tlačený plast s jemným presvitom, ideálny dovnútra",
    useTag: "interiér",
    priceMultiplier: 1.0,
    supportsIlluminated: true,
    supportsPlain: true,
    lightModes: ["front", "halo", "sides", "outline", "full", "combined"],
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
    id: "kompozit",
    displayName: "Odolné exteriérové",
    subtitle: "Hliníkový kompozit odolný voči počasiu, pre vonkajšie inštalácie",
    useTag: "exteriér",
    priceMultiplier: 1.15,
    supportsIlluminated: true,
    supportsPlain: true,
    lightModes: ["halo", "sides", "outline"], // opaque metal — edge/back-lit only, face itself doesn't shine through
    pbr: {
      roughness: 0.08,
      metalness: 1.0,
      anisotropy: 1.0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.1,
      sideRoughnessMul: 2.0,
    },
  },
  {
    id: "pvc",
    displayName: "Cenovo dostupné",
    subtitle: "Ľahká penová doska, najúspornejšia voľba pre interiér",
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
// "none" is removed — signType === 'plain' handles the no-light case
// "sides" price is a placeholder (not specified) — picked between front/halo, to confirm.

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
    name: "Zozadu (halo)",
    description: "Žiara za písmenom na okolí",
    direction: "back",
    price: 65,
  },
  {
    id: "sides",
    name: "Z bokov",
    description: "Svetlo vychádza z hrán do strán",
    direction: "sides",
    price: 60, // placeholder — not specified, to confirm
  },
  {
    id: "outline",
    name: "Obrys",
    description: "Svetelná kontúra po okraji písmena",
    direction: "outline",
    price: 75,
  },
  {
    id: "full",
    name: "Plné",
    description: "Celé písmeno rovnomerne svieti",
    direction: "full",
    price: 95,
  },
  {
    id: "combined",
    name: "Spredu + zozadu",
    description: "Kombinácia predného a halo svetla",
    direction: "both",
    price: 85,
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

export const letterColorOptions = [
  { id: "white",    label: "Biela",        value: "#f2f2f2" },
  { id: "black",    label: "Čierna",       value: "#1a1a1a" },
  { id: "silver",   label: "Strieborná",   value: "#b0b8c1" },
  { id: "gold",     label: "Zlatá",        value: "#c9a227" },
  { id: "copper",   label: "Medená",       value: "#b45a2a" },
  { id: "red",      label: "Červená",      value: "#c41e3a" },
  { id: "navy",     label: "Tmavomodrá",   value: "#1e3a8a" },
  { id: "green",    label: "Tmavá zelená", value: "#166534" },
  { id: "orange",   label: "Oranžová",     value: "#c75000" },
  { id: "charcoal", label: "Antracit",     value: "#3a3a3a" },
];
