export type SignType = "illuminated" | "plain";

/** Where a lit sign's light comes out: through the face, or onto the wall behind. */
export type LightModeId = "front" | "back";

/**
 * Krok 4 cenníka (hárok "struktura"): Svetelné spredu / Svetelné zozadu /
 * Nesvetelné. In a Config it is stored as signType + lightMode, the shape
 * every saved cart line and order already has (lib/options.ts variantOf).
 */
export type VariantId = "front" | "back" | "plain";

/** Krok 5 cenníka: Hliník / Plast / Plexi — each made in one or two builds. */
export type MaterialGroupId = "aluminium" | "plastic" | "plexi";

export type MaterialPbr = {
  roughness: number;
  metalness?: number;
  transmission?: number;
  ior?: number;
  thickness?: number;
  /**
   * How far light travels through the sheet before the body colour has fully
   * tinted it. Only read for a transmissive build: a smaller number means a
   * more strongly coloured acrylic.
   */
  attenuationDistance?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  anisotropy?: number;
  // In illuminated mode with transmission, pull the bodyColor part-way toward
  // white (LetterScene WHITE_BASE_BLEND) — lit acrylic lightens, but the
  // chosen colour still has to be recognisable.
  useWhiteBase?: boolean;
  // Multipliers applied to the side/bevel group (ExtrudeGeometry group-1)
  sideRoughnessMul?: number;
  /** The side's roughness outright, where it is a different surface (milky opal edges on polished plexi). */
  sideRoughness?: number;
  sideTransmissionMul?: number;
  // Emissive scaling per face group (useful for plexi: very low front glow, more on sides)
  emissiveFrontScale?: number;
  emissiveSideScale?: number;
  /** How strongly the surroundings are reflected (MeshPhysicalMaterial.envMapIntensity). */
  envIntensity?: number;
};

/** A height range and the thickness that build is made in at that height. */
export type HeightBand = {
  minMm: number;
  maxMm: number;
  depthMm: number;
};

/** Unit price up to a given sign area, in € per m² (price list, sheet "ceny"). */
export type PriceTier = {
  maxM2: number;
  perM2: number;
};

// Catalog entries are named by customer-facing benefit, not by the underlying
// technical material — displayName/subtitle are what the UI renders; id/pbr
// are internal only and must never be shown to the user.
export type MaterialOption = {
  id: string;
  /** Hliník / Plast / Plexi — the choice the customer makes in krok 5. */
  group: MaterialGroupId;
  /** Which variants this build is offered in (hárok "struktura"). */
  variants: VariantId[];
  displayName: string;
  /** The build within its group, in a word or two: "Veľké písmená", "Plné písmo"… */
  shortName: string;
  subtitle: string;
  /** Short label above the name in the Materiály section. */
  tagline: string;
  /** What the material is, how it behaves and where it belongs. */
  bullets: string[];
  /** Fonts this build is made in — FontOption ids, from the price list. */
  fonts: string[];
  /** Height ranges and the thickness each one is built in. */
  bands: HeightBand[];
  /** € per m² lit / unlit. A build with neither is not sold that way. */
  litPrice?: PriceTier[];
  plainPrice?: PriceTier[];
  /** Solid 3D print is priced by volume instead: € per cm³. */
  volumePricePerCm3?: number;
  pbr: MaterialPbr;
};

// ── Colours and finishes ─────────────────────────────────────────────────────
// What the surface does to light: a gloss lacquer keeps its sheen, a matt one
// scatters it, a metallic one (silver, gold) mirrors it in its own colour.
// LetterScene reads it to build the right PBR surface.
export type ProfileFinish = "gloss" | "matte" | "metallic";

export type ColorOption = {
  id: string;
  label: string;
  /** The flat colour used by the 3D preview and stored in Config.bodyColor. */
  value: string;
  finish?: ProfileFinish;
};

export type LightModeDef = {
  id: LightModeId;
  name: string;
  description: string;
};

export type VariantDef = {
  id: VariantId;
  /** As the price list writes it: "Svetelné spredu". */
  name: string;
  /** On the icon, where there is room for one word. */
  shortName: string;
  description: string;
};

export type MaterialGroupDef = {
  id: MaterialGroupId;
  name: string;
  description: string;
};

export type Config = {
  text: string;
  font: string;           // FontOption.id
  material: string;       // MaterialOption.id — the build
  signType: SignType;
  /**
   * Only read when the sign is lit. Signs saved before the new price list may
   * still say "edge" (svietenie hranami, no longer made) and carry a
   * `placement` — lib/options.ts normalizeConfig moves both onto the new
   * scheme when such a sign is loaded again.
   */
  lightMode: LightModeId;
  lightColor: string;
  /**
   * The RETURN — the side of the letter, the band a channel letter is built
   * around. Named bodyColor for the orders already stored under that name.
   */
  bodyColor: string;
  /**
   * The FACE — the front the customer looks at. Its own colour on every build
   * except 30 mm plexi, which is one solid piece of acrylic (lib/options.ts
   * hasSeparateFace). Missing on signs saved before the two were split, and
   * then the face is simply the same colour as the return.
   */
  faceColor?: string;
  /**
   * Letter height in MILLIMETRES — the unit the price list is written in, and
   * the only dimension a customer sets. Thickness follows from it through the
   * build's bands (lib/options.ts depthMmFor), so it is derived everywhere
   * rather than stored: one number, one source of truth.
   */
  height: number;
  rotation: number;       // group Y rotation, degrees
};
