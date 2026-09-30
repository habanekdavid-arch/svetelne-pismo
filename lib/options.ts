import type {
  MaterialOption,
  MaterialGroupDef,
  MaterialGroupId,
  LightModeDef,
  ColorOption,
  Config,
  ProfileFinish,
  SignType,
  LightModeId,
  HeightBand,
  PriceTier,
  VariantDef,
  VariantId,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// THE CATALOGUE
//
// Everything below is the price list in its new scheme
// (e-shop_rozsvietto_cennik_nova_schema.xlsx). The customer goes through its
// five steps — Text → Rozmer → Farby čela/steny → Variant → Materiál — and
// each sheet is one table here:
//
//   · "struktura"  which builds each variant is made in (OFFER below);
//   · "fonty"      which of the eight fonts each build is made in;
//   · "parametre"  heights and the thickness each height is built in;
//   · "farby"      what the face and the wall of the letter can be;
//   · "ceny"       unit prices.
//
// Nothing here is invented — if an option is not in that file, it is not in
// the configurator, and a change to the workshop's offer is a change to this
// file. The old split by exteriér / interiér and svietenie hranami are gone
// from the new scheme, so they are gone from here.
// ─────────────────────────────────────────────────────────────────────────────

// ── Fonts ────────────────────────────────────────────────────────────────────
// Named exactly as the price list names them, because the list ties a font to
// a build: a weight is a different font here, not a styling detail.
//
// The files are the ones in /public/fonts_rozsvietto. `name` doubles as the
// @font-face family in globals.css, which is what the font picker previews
// with and what lib/useSignSize.ts measures the sign with, and `file` is what
// the 3D preview extrudes. Spaces in a path have to arrive encoded: the loader
// fetches this string as a URL.

export type FontOption = {
  id: string;
  /** As written in the price list. */
  name: string;
  file: string;
  /** Script faces have thin strokes — the price list keeps them out of alurol. */
  script?: boolean;
};

export const fontOptions: FontOption[] = [
  { id: "archivo-black",          name: "Archivo Black",          file: "/fonts_rozsvietto/archivo-black/ArchivoBlack-Regular.ttf" },
  { id: "montserrat-extrabold",   name: "Montserrat ExtraBold",   file: "/fonts_rozsvietto/montserrat/Montserrat-ExtraBold.ttf" },
  { id: "poppins-extrabold",      name: "Poppins ExtraBold",      file: "/fonts_rozsvietto/poppins/Poppins-ExtraBold.ttf" },
  { id: "oswald-bold",            name: "Oswald Bold",            file: "/fonts_rozsvietto/Oswald/static/Oswald-Bold.ttf" },
  { id: "gotham-bold",            name: "Gotham Bold",            file: "/fonts_rozsvietto/gotham/Gotham/Gotham%20Bold/Gotham%20Bold.otf" },
  { id: "montserrat-bold",        name: "Montserrat Bold",        file: "/fonts_rozsvietto/montserrat/Montserrat-Bold.ttf" },
  { id: "pacifico",               name: "Pacifico",               file: "/fonts_rozsvietto/Pacifico/Pacifico-Regular.ttf", script: true },
  { id: "momo-signature",         name: "Momo Signature",         file: "/fonts_rozsvietto/Momo_Signature,Pacifico/Momo_Signature/MomoSignature-Regular.ttf", script: true },
  // Vyradené — hárok "fonty", spodná tabuľka. No longer offered, but kept so
  // that signs already ordered in them still show their font by name, and a
  // cart line saved in one still renders until normalizeConfig moves it.
  { id: "gotham-medium",          name: "Gotham Medium",          file: "/fonts_rozsvietto/gotham/Gotham/Gotham%20Medium/Gotham%20Medium.otf" },
  { id: "gotham-ultra",           name: "Gotham Ultra",           file: "/fonts_rozsvietto/gotham/Gotham/Gotham%20Ultra/Gotham%20Ultra.otf" },
  { id: "montserrat-semibold",    name: "Montserrat SemiBold",    file: "/fonts_rozsvietto/montserrat/Montserrat-SemiBold.ttf" },
  { id: "poppins-semibold",       name: "Poppins SemiBold",       file: "/fonts_rozsvietto/poppins/Poppins-SemiBold.ttf" },
  { id: "baloo2-semibold",        name: "Baloo2 SemiBold",        file: "/fonts_rozsvietto/baloo-2/static/Baloo2-SemiBold.ttf" },
  { id: "baloo2-extrabold",       name: "Baloo2 ExtraBold",       file: "/fonts_rozsvietto/baloo-2/static/Baloo2-ExtraBold.ttf" },
  { id: "comic-helvetic-medium",  name: "Comic Helvetic Medium",  file: "/fonts_rozsvietto/comic-helvetic/ComicHelvetic_Medium.otf" },
  { id: "comic-helvetic-heavy",   name: "Comic Helvetic HeavyBold", file: "/fonts_rozsvietto/comic-helvetic/ComicHelvetic_Heavy.otf" },
  { id: "oswald-regular",         name: "Oswald Regular",         file: "/fonts_rozsvietto/Oswald/static/Oswald-Regular.ttf" },
  { id: "oswald-semibold",        name: "Oswald SemiBold",        file: "/fonts_rozsvietto/Oswald/static/Oswald-SemiBold.ttf" },
];

/**
 * The eight fonts of hárok "fonty", in its order: six sans faces, two script.
 *
 * Its first row is Arial Black, a licensed Microsoft face that is not in
 * /public/fonts_rozsvietto. Until the file is there its place is taken by
 * Archivo Black — the sheet's own replacement mechanism ("vyradené fonty —
 * stačí presunúť riadok hore"), and it is made in exactly the same builds.
 * Drop the Arial Black file in, add it to fontOptions and globals.css, and
 * swap the id here.
 */
export const CATALOGUE_FONTS = [
  "archivo-black",
  "montserrat-extrabold",
  "poppins-extrabold",
  "oswald-bold",
  "gotham-bold",
  "montserrat-bold",
  "pacifico",
  "momo-signature",
];

// The ✓ columns of hárok "fonty".
/** Alurol (veľké aj malé písmená): the four heavy sans faces — no script. */
const ALUROL_FONTS = ["archivo-black", "montserrat-extrabold", "poppins-extrabold", "oswald-bold"];
/** 30 mm plexi: Gotham Bold, Montserrat Bold, Pacifico. */
const PLEXI30_FONTS = ["gotham-bold", "montserrat-bold", "pacifico"];
/** 3D tlač (s plexi aj plné písmo) and plexi s UV tlačou: all eight. */
const ALL_FONTS = CATALOGUE_FONTS;

export function fontById(id: string): FontOption | undefined {
  return fontOptions.find((f) => f.id === id);
}

// ── Unit prices (hárok "ceny", € per m² without VAT unless noted) ────────────
// Banded by the area of the whole sign: 0–3 m², 3,1–5 m², 5,1 m² and more.
// The sheet derives most of them from three inputs and its discounts
// (nesvetelné −30 %, plast −10 % oproti hliníku, plexi UV −20 % / −30 % za
// množstvo); the results are written out here so a quote can be checked
// against the sheet line by line. Svetelné spredu and zozadu cost the same.
const ALUROL_LIT: PriceTier[] = [
  { maxM2: 3, perM2: 960 },
  { maxM2: 5, perM2: 870 },
  { maxM2: Infinity, perM2: 650 },
];
const ALUROL_PLAIN: PriceTier[] = [   // 960 / 870 / 650 × 0,7
  { maxM2: 3, perM2: 672 },
  { maxM2: 5, perM2: 609 },
  { maxM2: Infinity, perM2: 455 },
];
const PRINT_LIT: PriceTier[] = [      // hliník × 0,9
  { maxM2: 3, perM2: 864 },
  { maxM2: 5, perM2: 783 },
  { maxM2: Infinity, perM2: 585 },
];
const PRINT_PLAIN: PriceTier[] = [    // hliník nesvetelné × 0,9
  { maxM2: 3, perM2: 604.8 },
  { maxM2: 5, perM2: 548.1 },
  { maxM2: Infinity, perM2: 409.5 },
];
/** 30 mm plexi, svetelné spredu: "cena ako hliník". */
const PLEXI30_LIT = ALUROL_LIT;
const PLEXI_UV_PLAIN: PriceTier[] = [ // 460, −20 %, −30 %
  { maxM2: 3, perM2: 460 },
  { maxM2: 5, perM2: 368 },
  { maxM2: Infinity, perM2: 322 },
];
/**
 * Solid 3D print is the one build priced by volume, not by area: 0,07 €/cm³
 * of printed material, net like every other figure in the price list (VAT is
 * added on top, lib/vat.ts).
 */
const SOLID_PRICE_PER_CM3 = 0.07;

// ── Builds ───────────────────────────────────────────────────────────────────
// One entry per row of hárok "parametre". `bands` is that row's height →
// thickness mapping: the customer picks a height, the build decides how thick
// it comes out, exactly as the workshop makes it. `variants` is the build's
// row in hárok "struktura".

export const MATERIALS: MaterialOption[] = [
  {
    id: "alurol-upper",
    group: "aluminium",
    variants: ["front", "back", "plain"],
    displayName: "Alurol – veľké písmená",
    shortName: "Veľké písmená",
    tagline: "Hliník",
    subtitle: "Písmo z hliníkového profilu Alurol — najpevnejšia stavba, na veľké formáty a fasády.",
    bullets: ["Profil 60 / 80 / 100 / 120 mm", "Výška 250 – 2000 mm", "Svetelné spredu, zozadu aj nesvetelné"],
    fonts: ALUROL_FONTS,
    bands: [
      { minMm: 250,  maxMm: 599,  depthMm: 60 },
      { minMm: 600,  maxMm: 999,  depthMm: 80 },
      { minMm: 1000, maxMm: 1499, depthMm: 100 },
      { minMm: 1500, maxMm: 2000, depthMm: 120 },
    ],
    litPrice: ALUROL_LIT,
    plainPrice: ALUROL_PLAIN,
    pbr: {
      // Painted aluminium, not bare metal: at metalness 1 a PBR surface has no
      // diffuse colour at all and a red sign comes out nearly black.
      // Smooth, glossy lacquer on aluminium — no brushing, no grain: a
      // clear top coat over the colour, and the band is the same coat.
      roughness: 0.14,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    },
  },
  {
    id: "alurol-lower",
    group: "aluminium",
    variants: ["front", "back", "plain"],
    displayName: "Alurol – malé písmená",
    shortName: "Malé písmená",
    tagline: "Hliník",
    subtitle: "Ten istý profil pre nápisy písané malými písmenami — začína o niečo vyššie.",
    bullets: ["Profil 60 / 80 / 100 / 120 mm", "Výška 350 – 2000 mm", "Svetelné spredu, zozadu aj nesvetelné"],
    fonts: ALUROL_FONTS,
    bands: [
      { minMm: 350,  maxMm: 599,  depthMm: 60 },
      { minMm: 600,  maxMm: 999,  depthMm: 80 },
      { minMm: 1000, maxMm: 1499, depthMm: 100 },
      { minMm: 1500, maxMm: 2000, depthMm: 120 },
    ],
    litPrice: ALUROL_LIT,
    plainPrice: ALUROL_PLAIN,
    pbr: {
      roughness: 0.14,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    },
  },
  {
    id: "print3d",
    group: "plastic",
    variants: ["front", "back", "plain"],
    displayName: "3D tlač s plexi",
    shortName: "S plexi čelom",
    tagline: "Plast",
    subtitle: "3D tlačené telo s plexisklovým čelom — zvládne aj členité tvary a logá.",
    bullets: ["Hrúbka 20 / 30 / 50 mm podľa výšky", "Výška 120 – 699 mm", "Svetelné spredu, zozadu aj nesvetelné"],
    fonts: ALL_FONTS,
    bands: [
      { minMm: 120, maxMm: 199, depthMm: 20 },
      { minMm: 200, maxMm: 399, depthMm: 30 },
      { minMm: 400, maxMm: 699, depthMm: 50 },
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
    group: "plastic",
    variants: ["plain"],
    displayName: "3D tlač plné písmo",
    shortName: "Plné písmo",
    tagline: "Plast",
    subtitle: "Celé vytlačené písmeno bez podsvietenia — najtenšia a najľahšia stavba.",
    bullets: ["Hrúbka 10 / 20 mm podľa výšky", "Výška 50 – 300 mm", "Nesvetelné"],
    fonts: ALL_FONTS,
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
    id: "plexi30",
    group: "plexi",
    variants: ["front"],
    displayName: "30 mm plexi",
    shortName: "30 mm plexi",
    tagline: "Plexi",
    subtitle: "Plexisklové písmo hrúbky 30 mm z jedného kusa — svieti celou prednou plochou.",
    bullets: ["Hrúbka 30 mm", "Výška 150 – 600 mm", "Svetelné spredu"],
    fonts: PLEXI30_FONTS,
    bands: [{ minMm: 150, maxMm: 600, depthMm: 30 }],
    litPrice: PLEXI30_LIT,
    pbr: {
      // Polished cast acrylic, coloured all the way through: a mirror-smooth
      // face under a clear top coat, and a dense colour that reads the same
      // as the swatch — the way a solid acrylic letter looks in a shop window,
      // not pale glass. Only part of the light goes through; the rest is the
      // sheet's own colour.
      roughness: 0.0,
      metalness: 0,
      transmission: 0.55,
      ior: 1.5,
      thickness: 0.8,
      attenuationDistance: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      // The polished edge is clear acrylic — glass-like, it lets almost
      // all light through and picks up the surroundings.
      sideTransmissionMul: 2.5,
      sideRoughnessMul: 1.5,
      // Solid acrylic glows through its whole body, so its face is nearly as
      // bright as a channel letter's.
      emissiveFrontScale: 1.6,
      emissiveSideScale: 1.4,
      envIntensity: 2.6,
    },
  },
  {
    id: "plexi-uv",
    group: "plexi",
    variants: ["plain"],
    displayName: "Plexi s UV tlačou",
    shortName: "UV tlač",
    tagline: "Plexi",
    subtitle: "Rezané plexi s UV potlačou — cenovo najdostupnejšia voľba.",
    bullets: ["Hrúbka 5 / 8 / 12 mm podľa výšky", "Výška 50 – 250 mm", "Nesvetelné"],
    fonts: ALL_FONTS,
    bands: [
      { minMm: 50,  maxMm: 99,  depthMm: 5 },
      { minMm: 100, maxMm: 149, depthMm: 8 },
      { minMm: 150, maxMm: 250, depthMm: 12 },
    ],
    plainPrice: PLEXI_UV_PLAIN,
    pbr: {
      // Cut acrylic sheet: the printed face is its own material; the polished
      // edges and back are clear, glossy acrylic that catches the light.
      roughness: 0.0,
      metalness: 0,
      transmission: 0.6,
      ior: 1.5,
      thickness: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      envIntensity: 2.4,
    },
  },
];

export const DEFAULT_MATERIAL = "print3d";

export function materialById(id: string): MaterialOption {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
}

/** Fonts this build is made in (hárok "fonty"), in the sheet's order. */
export function fontsFor(materialId: string): FontOption[] {
  const ids = materialById(materialId).fonts;
  return CATALOGUE_FONTS.filter((id) => ids.includes(id)).map((id) => fontById(id)!);
}

// ── Variants and material groups (hárok "struktura") ─────────────────────────

export const VARIANTS: VariantDef[] = [
  {
    id: "front",
    name: "Svetelné spredu",
    shortName: "Spredu",
    description: "Svieti predná plocha písmena — čelo je z presvitného plexi.",
  },
  {
    id: "back",
    name: "Svetelné zozadu",
    shortName: "Zozadu",
    description: "Písmeno svieti dozadu na stenu — okolo neho vznikne svetelná žiara.",
  },
  {
    id: "plain",
    name: "Nesvetelné",
    shortName: "Nesvetelné",
    description: "Písmeno bez podsvietenia.",
  },
];

export const MATERIAL_GROUPS: MaterialGroupDef[] = [
  { id: "aluminium", name: "Hliník", description: "Hliníkový profil Alurol — najpevnejší, na veľké formáty a fasády." },
  { id: "plastic",   name: "Plast",  description: "3D tlač — s plexi čelom, alebo plné písmo bez svietenia." },
  { id: "plexi",     name: "Plexi",  description: "30 mm plexi, ktoré svieti spredu, alebo plexi s UV tlačou." },
];

export function variantById(id: VariantId): VariantDef {
  return VARIANTS.find((v) => v.id === id) ?? VARIANTS[0];
}

export function groupById(id: MaterialGroupId): MaterialGroupDef {
  return MATERIAL_GROUPS.find((g) => g.id === id) ?? MATERIAL_GROUPS[0];
}

/** The variant a sign is — it is stored as signType + lightMode. */
export function variantOf(config: { signType: SignType; lightMode?: string }): VariantId {
  if (config.signType !== "illuminated") return "plain";
  return config.lightMode === "back" ? "back" : "front";
}

/** The Config fields a variant is stored in. */
export function variantFields(variant: VariantId): { signType: SignType; lightMode: LightModeId } {
  return variant === "plain"
    ? { signType: "plain", lightMode: "front" }
    : { signType: "illuminated", lightMode: variant };
}

/** Builds offered in this variant and group — in catalogue order. */
export function buildsFor(variant: VariantId, group: MaterialGroupId): MaterialOption[] {
  return MATERIALS.filter((m) => m.group === group && m.variants.includes(variant));
}

/** Is this build made in this variant at all? */
export function isOffered(variant: VariantId, materialId: string): boolean {
  return MATERIALS.some((m) => m.id === materialId && m.variants.includes(variant));
}

/**
 * The build to land on when the variant or the group changes: the current one
 * when it is still made, otherwise the first build of the wanted group, and
 * failing that the first build of any group this variant is made in.
 */
export function pickBuild(variant: VariantId, group: MaterialGroupId, currentId: string): string {
  if (isOffered(variant, currentId) && materialById(currentId).group === group) return currentId;
  const inGroup = buildsFor(variant, group);
  // Alurol: keep veľké/malé písmená when only the variant changed.
  const sameShape = inGroup.find((m) => m.id === currentId);
  if (sameShape) return sameShape.id;
  if (inGroup.length > 0) return inGroup[0].id;
  for (const g of MATERIAL_GROUPS) {
    const builds = buildsFor(variant, g.id);
    if (builds.length > 0) return builds[0].id;
  }
  return DEFAULT_MATERIAL;
}

/**
 * The build to switch to when the customer picks a font the current one is not
 * made in: another build of the same group first (so a font only changes what
 * it has to), then the other groups — always within the chosen variant.
 * Null when this variant has no build in that font at all.
 */
export function buildForFont(variant: VariantId, currentId: string, fontId: string): string | null {
  const current = materialById(currentId);
  if (current.variants.includes(variant) && current.fonts.includes(fontId)) return current.id;
  const order = [current.group, ...MATERIAL_GROUPS.map((g) => g.id).filter((g) => g !== current.group)];
  for (const group of order) {
    const hit = buildsFor(variant, group).find((m) => m.fonts.includes(fontId));
    if (hit) return hit.id;
  }
  return null;
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

// ── Light modes ─────────────────────────────────────────────────────────────
// How a lit sign's variant reads on an order sheet. The two lit variants are
// the only ways of lighting the new price list sells — svietenie hranami is
// not in it any more.

export const LIGHT_MODES: LightModeDef[] = [
  { id: "front", name: "Spredu", description: "Svetlo cez prednú plochu písmena" },
  { id: "back",  name: "Zozadu", description: "Žiara za písmenom na stene" },
];

/**
 * The variant as the order sheet says it: "Svetelné spredu", "Nesvetelné"…
 * Orders placed under the old price list may be edge-lit, and are named so.
 */
export function variantLabel(config: { signType: SignType; lightMode?: string }): string {
  if (config.signType === "illuminated" && config.lightMode === "edge") return "Svetelné hranami (pôvodná ponuka)";
  return variantById(variantOf(config)).name;
}

// ── Light colour ────────────────────────────────────────────────────────────
//
// White, always — there is no choice of LED colour. The colour a customer
// sees is the FACE's: white LEDs behind a red acrylic face make a red letter
// (components/three/LetterScene.tsx filteredThroughFace), and a halo letter
// throws plain white light onto the wall behind it.

export type LightColorOption = {
  id: string;
  label: string;
  /** What the 3D preview and the order sheet carry — Config.lightColor. */
  value: string;
  hint: string;
};

export const LIGHT_COLORS: LightColorOption[] = [
  { id: "white", label: "Biela", value: "#ffffff", hint: "Biele LED svetlo" },
];

export const DEFAULT_LIGHT_COLOR = LIGHT_COLORS[0].value;

/**
 * Always white. Signs saved while warm white or coloured LEDs were offered
 * come back white, since that is the only light still made.
 */
export function clampLightColor(_value: string): string {
  void _value;
  return DEFAULT_LIGHT_COLOR;
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
  { id: "silver", label: "Strieborná",  value: "#b9bcc0", finish: "metallic" },
  { id: "gold",   label: "Zlatá",       value: "#d4a93c", finish: "metallic" },
];

// Silver and gold are metallic lacquers: they show on their swatch as a sheen
// and in the preview as metal. The matt white is gone ("odstrániť matnú
// bielu"); an order that still carries it keeps its hex on the order sheet.

/** Cut (non-lit) letters: lacquered sheet, the same range. */
export const letterColorOptions: ColorOption[] = PROFILE_COLORS;

/** Lit letters: the same range. */
export const profileColorOptions: ColorOption[] = PROFILE_COLORS;

// Light has to get through a front-lit face, so it is translucent acrylic —
// and black, silver or gold acrylic lets nothing through (hárok "farby": pri
// svetelnom spredu je čelo "presvitné").
const TRANSLUCENT_IDS = new Set(["white", "yellow", "orange", "red", "green", "blue"]);
const TRANSLUCENT_COLORS = PROFILE_COLORS.filter((c) => TRANSLUCENT_IDS.has(c.id));

// ── Čelo a stena (hárok "farby") ─────────────────────────────────────────────
//
// A made letter is two parts that are rarely the same material: the WALL
// (stena, the band round its side — painted aluminium coil on alurol, printed
// plastic on 3D print, the acrylic edge on plexi UV) and the FACE (čelo) the
// customer looks at. Each gets its own colour, because that is how these signs
// are ordered: black walls with a white face is the classic lit channel letter.
//
//   · Svetelné spredu — čelo presvitné, stena ľubovoľná nepriesvitná;
//   · Svetelné zozadu — čelo nepriesvitné, stena ľubovoľná nepriesvitná;
//   · Nesvetelné      — čelo aj stena ľubovoľné.
//
// The one exception is 30 mm plexi. It is cut from a single block of acrylic,
// so there is no seam between face and wall and one colour for the whole
// letter — and since it only comes front-lit, a colour light gets through.
//
// In a Config the wall is `bodyColor` and the face `faceColor`, the names the
// orders already stored carry.

export function hasSeparateFace(materialId: string): boolean {
  return materialId !== "plexi30";
}

/**
 * What the face is made of, for this build lit this way — which decides how it
 * looks and whether it lights up:
 *   · "acrylic" — a translucent plexi face. Lit from the front it glows, and
 *     the light comes out in ITS colour (LetterScene: LED × face).
 *   · "same"    — the same material as the wall, opaque (a halo letter's
 *     face, a painted alurol face, a solid print).
 *   · "print"   — a UV-printed face on an acrylic sheet.
 *   · "none"    — no separate face at all (30 mm plexi).
 */
export type FaceKind = "acrylic" | "same" | "print" | "none";

export function faceKindFor(
  materialId: string,
  signType: SignType,
  lightMode: LightModeId,
): FaceKind {
  if (!hasSeparateFace(materialId)) return "none";
  if (materialId === "plexi-uv") return "print";
  const lit = signType === "illuminated";
  if (materialId.startsWith("alurol")) return lit && lightMode === "front" ? "acrylic" : "same";
  // "3D tlač s plexi" has a plexi face — except the halo version, whose front
  // is closed and printed so all the light goes to the wall behind it.
  if (materialId === "print3d") return lit && lightMode === "back" ? "same" : "acrylic";
  return "same";
}

/**
 * The colours the wall (stena) can be made in — or, for 30 mm plexi, the one
 * colour of the whole letter.
 */
export function bodyColorOptionsFor(
  materialId: string,
  signType: SignType,
  lightMode: LightModeId,
): ColorOption[] {
  if (!hasSeparateFace(materialId) && signType === "illuminated" && lightMode === "front") {
    return TRANSLUCENT_COLORS;
  }
  return signType === "illuminated" ? profileColorOptions : letterColorOptions;
}

/** The colours the face (čelo) can be made in, or none when it has no face of its own. */
export function faceColorOptionsFor(
  materialId: string,
  signType: SignType,
  lightMode: LightModeId,
): ColorOption[] {
  if (!hasSeparateFace(materialId)) return [];
  if (signType === "illuminated" && lightMode === "front") return TRANSLUCENT_COLORS;
  return signType === "illuminated" ? profileColorOptions : letterColorOptions;
}

/** A colour's name, for the order sheet — "Biela", "Čierna"… */
export function colorLabel(value: string): string {
  const v = value.toLowerCase();
  return profileColorOptions.find((c) => c.value.toLowerCase() === v)?.label ?? value;
}

/** The colour the face actually is — the wall's, where there is no separate face. */
export function faceColorOf(config: {
  material: string;
  bodyColor: string;
  faceColor?: string;
}): string {
  return hasSeparateFace(config.material) ? (config.faceColor ?? config.bodyColor) : config.bodyColor;
}

function clampTo(options: ColorOption[], value: string): string {
  if (options.length === 0) return value;
  return options.some((c) => c.value.toLowerCase() === value.toLowerCase()) ? value : options[0].value;
}

/**
 * The face colour kept, or the nearest one this face can be made in — so
 * switching a black-faced sign to front lighting lands on a white face that
 * lets the light through, instead of a black one that would stay dark.
 */
export function clampFaceColor(
  materialId: string,
  signType: SignType,
  lightMode: LightModeId,
  value: string,
): string {
  return clampTo(faceColorOptionsFor(materialId, signType, lightMode), value);
}

/** The wall colour kept, or the first one this build and variant are made in. */
export function clampBodyColor(
  materialId: string,
  signType: SignType,
  lightMode: LightModeId,
  value: string,
): string {
  return clampTo(bodyColorOptionsFor(materialId, signType, lightMode), value);
}

// ── Which build within a group — chosen, not asked ──────────────────────────
//
// The price list keeps a few builds apart that a customer should not have to
// pick between: alurol comes as "veľké písmená" and "malé písmená" (the same
// profile, the second starting at 350 mm), and unlit 3D print as a letter
// with a plexi face or printed solid (50–300 mm, sold by volume). The
// configurator asks only for the group; the build follows from what is
// already set:
//   · alurol — by the text: any lower-case letter makes it "malé písmená";
//   · plast, unlit — by the height: under 120 mm, where the plexi-faced build
//     does not go, it is printed solid.

const SOLID_BELOW_MM = 120;

/** Does the text have a lower-case letter in it? */
export function hasLowercase(text: string): boolean {
  return text !== text.toLocaleUpperCase("sk-SK");
}

/** The build a group is made in for this variant, text and height — or null when the group is not offered. */
export function autoBuild(
  variant: VariantId,
  group: MaterialGroupId,
  text: string,
  heightMm: number,
): string | null {
  const builds = buildsFor(variant, group);
  if (builds.length === 0) return null;
  if (group === "aluminium") return hasLowercase(text) ? "alurol-lower" : "alurol-upper";
  if (builds.some((b) => b.id === "print3d-solid") && builds.some((b) => b.id === "print3d")) {
    return heightMm < SOLID_BELOW_MM ? "print3d-solid" : "print3d";
  }
  return builds[0].id;
}

/** The builds the height slider covers for a group: the one the text decides for alurol, all of them otherwise. */
function slidingBuilds(variant: VariantId, group: MaterialGroupId, text: string): MaterialOption[] {
  if (group === "aluminium") {
    const id = autoBuild(variant, group, text, 0);
    return id ? [materialById(id)] : [];
  }
  return buildsFor(variant, group);
}

/** Heights a group is made in, for this variant and text. */
export function groupHeightRange(variant: VariantId, group: MaterialGroupId, text: string): { minMm: number; maxMm: number } {
  const builds = slidingBuilds(variant, group, text);
  if (builds.length === 0) return { minMm: 50, maxMm: 2000 };
  return {
    minMm: Math.min(...builds.map((b) => heightRange(b.id).minMm)),
    maxMm: Math.max(...builds.map((b) => heightRange(b.id).maxMm)),
  };
}

/** How a chosen colour behaves under light — used by the 3D preview. */
export function finishForColor(hex: string): ProfileFinish {
  const v = hex.toLowerCase();
  return profileColorOptions.find((c) => c.value.toLowerCase() === v)?.finish ?? "gloss";
}

// ── Settling a sign onto the catalogue ───────────────────────────────────────

/**
 * A sign moved onto what the price list makes, changing only what has to
 * change. Used for every sign that comes from somewhere else — a cart line
 * saved in the browser, a sign sent back from the cart for changes — because
 * those may have been saved under the old price list: with a placement,
 * edge lighting, a build not made in their variant, or one of the retired
 * fonts.
 */
export function normalizeConfig(config: Config): Config {
  // Svietenie hranami was only ever 30 mm plexi, which now glows through its
  // front: the nearest thing still made.
  const variant = variantOf(config);
  const { signType, lightMode } = variantFields(variant);
  const wantedGroup = MATERIALS.find((m) => m.id === config.material)?.group ?? "plastic";
  const group = buildsFor(variant, wantedGroup).length > 0
    ? wantedGroup
    : (MATERIAL_GROUPS.find((g) => buildsFor(variant, g.id).length > 0)?.id ?? "plastic");
  const range = groupHeightRange(variant, group, config.text);
  const wantedHeight = Math.min(range.maxMm, Math.max(range.minMm, Number(config.height) || range.minMm));
  const material = autoBuild(variant, group, config.text, wantedHeight) ?? DEFAULT_MATERIAL;
  const fonts = materialById(material).fonts;
  const font = fonts.includes(config.font) ? config.font : fonts[0];
  // The old Config carried `placement`; the new price list does not ask.
  const { placement: _placement, ...rest } = config as Config & { placement?: unknown };
  void _placement;
  return {
    ...rest,
    signType,
    lightMode,
    material,
    font,
    height: clampHeight(material, wantedHeight),
    lightColor: clampLightColor(String(config.lightColor ?? "")),
    bodyColor: clampBodyColor(material, signType, lightMode, config.bodyColor ?? "#0a0a0a"),
    faceColor: hasSeparateFace(material)
      ? clampFaceColor(material, signType, lightMode, config.faceColor ?? config.bodyColor ?? "#f1f0ea")
      : undefined,
  };
}
