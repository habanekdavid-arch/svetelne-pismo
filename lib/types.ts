export type SignType = "illuminated" | "plain";

/** Where the sign hangs — the price list offers different builds for each. */
export type Placement = "exterior" | "interior";

/** Sheet "strom": svietenie spredu / zozadu / hranami. */
export type LightModeId = "front" | "back" | "edge";

// Where the glow visually reads as coming from — drives both the 3D emissive
// mix (LetterScene.tsx FACE_EMISSIVE) and the flat glyph preview tiles
// (ConfiguratorStage.tsx LightModeGlyphPreview).
export type LightModeDirection = "front" | "back" | "edge";

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
  sideTransmissionMul?: number;
  // Emissive scaling per face group (useful for plexi: very low front glow, more on sides)
  emissiveFrontScale?: number;
  emissiveSideScale?: number;
};

export type MaterialUseTag = "interiér" | "exteriér" | "oboje";

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
// technical material — displayName/subtitle/useTag are what the UI renders;
// id/pbr are internal only and must never be shown to the user.
export type MaterialOption = {
  id: string;
  displayName: string;
  subtitle: string;
  /** Short label above the name in the Materiály section. */
  tagline: string;
  /** What the material is, how it behaves and where it belongs. */
  bullets: string[];
  useTag: MaterialUseTag;
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
// scatters it. LetterScene reads it to build the right PBR surface.
export type ProfileFinish = "gloss" | "matte";

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
  direction: LightModeDirection;
};

export type Config = {
  text: string;
  font: string;           // FontOption.id
  material: string;       // MaterialOption.id — the build
  signType: SignType;
  placement: Placement;
  lightMode: LightModeId;
  lightColor: string;
  bodyColor: string;
  /**
   * Letter height in MILLIMETRES — the unit the price list is written in, and
   * the only dimension a customer sets. Thickness follows from it through the
   * build's bands (lib/options.ts depthMmFor), so it is derived everywhere
   * rather than stored: one number, one source of truth.
   */
  height: number;
  rotation: number;       // group Y rotation, degrees
};
