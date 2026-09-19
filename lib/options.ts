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
// SemiBold and Montserrat ExtraBold are two separate rows). Each id is a real
// static TTF in /public/fonts — see scripts/fetch-catalog-fonts.mjs — and
// `name` doubles as the @font-face family in globals.css, which is what the
// font picker and the size measurement (lib/useSignSize.ts) render with.
//
// Seven fonts from the list are licensed typefaces that cannot be downloaded
// (Arial Black, Gotham Medium/Bold/Ultra, Comic Helvetic Medium/HeavyBold,
// Momo Signature). They are deliberately NOT offered — an option a customer
// can pick has to be one the preview can actually draw — and will slot into
// the sets below the moment the real files land in /public/fonts.

export type FontOption = {
  id: string;
  /** As written in the price list. */
  name: string;
  file: string;
};

export const fontOptions: FontOption[] = [
  { id: "archivo-black",        name: "Archivo Black",        file: "/fonts/archivo-black.ttf" },
  { id: "montserrat-semibold",  name: "Montserrat SemiBold",  file: "/fonts/montserrat-semibold.ttf" },
  { id: "montserrat-bold",      name: "Montserrat Bold",      file: "/fonts/montserrat-bold.ttf" },
  { id: "montserrat-extrabold", name: "Montserrat ExtraBold", file: "/fonts/montserrat-extrabold.ttf" },
  { id: "oswald-regular",       name: "Oswald Regular",       file: "/fonts/oswald-regular.ttf" },
  { id: "oswald-semibold",      name: "Oswald SemiBold",      file: "/fonts/oswald-semibold.ttf" },
  { id: "oswald-bold",          name: "Oswald Bold",          file: "/fonts/oswald-bold.ttf" },
  { id: "baloo2-semibold",      name: "Baloo2 SemiBold",      file: "/fonts/baloo2-semibold.ttf" },
  { id: "baloo2-extrabold",     name: "Baloo2 ExtraBold",     file: "/fonts/baloo2-extrabold.ttf" },
  { id: "poppins-semibold",     name: "Poppins SemiBold",     file: "/fonts/poppins-semibold.ttf" },
  { id: "poppins-extrabold",    name: "Poppins ExtraBold",    file: "/fonts/poppins-extrabold.ttf" },
  { id: "pacifico",             name: "Pacifico",             file: "/fonts/pacifico.ttf" },
];

/** Alurol rows: Arial Black, Archivo Black, Gotham Ultra, Montserrat ExtraBold, Oswald Bold, Poppins ExtraBold. */
const ALUROL_FONTS = [
  "archivo-black",
  "montserrat-extrabold",
  "oswald-bold",
  "poppins-extrabold",
];

/** 30 mm plexi rows: the lighter weights, the rounded faces and the script one. */
const PLEXI30_FONTS = [
  "montserrat-semibold",
  "montserrat-bold",
  "oswald-regular",
  "oswald-semibold",
  "baloo2-semibold",
  "baloo2-extrabold",
  "pacifico",
];

/** 3D print rows: every font in the list. */
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

// ── Light colours (LED colour swatches) ──────────────────────────────────────

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

// ── Body/material colours ────────────────────────────────────────────────────
//
// Taken off the manufacturer's board (3D system, "System of building channel
// letters"): these are the finishes a profile is actually stocked in, so a
// customer picking one is picking something that exists on a shelf rather than
// a colour we would have to have made. The same RAL tones for a cut letter —
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

// The one finish that is not a colour of its own: the same white with the
// gloss taken out of it, so it needs its own id (the hex alone cannot tell
// them apart).
//
// The brushed and mirrored metal finishes from the profile board are NOT here.
// They were asked to stay out of the configurator — "len normálne farby" — and
// a finish that is out is out: no option, no swatch, and no code behind it.
const PROFILE_MATT: ColorOption = {
  id: "white-mat", label: "Biela matná", value: "#eeeee7",
  code: "RAL 9016 MAT", finish: "matte",
};

/** Cut (non-lit) letters: lacquered sheet, the RAL range only. */
export const letterColorOptions: ColorOption[] = PROFILE_RAL;

/** Lit letters: the same RAL range, plus the matt white. */
export const profileColorOptions: ColorOption[] = [
  PROFILE_RAL[0],
  PROFILE_MATT,                  // matt white sits next to the gloss one
  ...PROFILE_RAL.slice(1),
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
