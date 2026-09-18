export type SignType = "illuminated" | "plain";

export type LightModeId = "front" | "halo" | "full";

// Where the glow visually reads as coming from — drives both the 3D emissive
// mix (LetterScene.tsx FACE_EMISSIVE) and the flat glyph preview tiles
// (ConfiguratorStage.tsx LightModeGlyphPreview).
export type LightModeDirection = "front" | "back" | "full";

export type MaterialPbr = {
  roughness: number;
  metalness?: number;
  transmission?: number;
  ior?: number;
  thickness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  anisotropy?: number;
  // In illuminated mode with transmission, ignore bodyColor — use neutral white base
  useWhiteBase?: boolean;
  // Multipliers applied to the side/bevel group (ExtrudeGeometry group-1)
  sideRoughnessMul?: number;
  sideTransmissionMul?: number;
  // Emissive scaling per face group (useful for plexi: very low front glow, more on sides)
  emissiveFrontScale?: number;
  emissiveSideScale?: number;
};

export type MaterialUseTag = "interiér" | "exteriér" | "oboje";

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
  priceMultiplier: number;
  supportsIlluminated: boolean;
  supportsPlain: boolean;
  lightModes: LightModeId[];
  pbr: MaterialPbr;
};

// ── Colours and finishes ─────────────────────────────────────────────────────
// A lit letter's side wall is a rolled aluminium profile, and a profile is
// stocked in fixed finishes — the ones on the manufacturer's board (3D system,
// "System of building channel letters"). `finish` is what the surface does to
// light: a matt lacquer scatters it, a brushed or mirror-polished aluminium
// reflects it. LetterScene reads it to build the right PBR surface.
export type ProfileFinish = "gloss" | "matte" | "brushed" | "mirror";

export type ColorOption = {
  id: string;
  label: string;
  /** The flat colour used by the 3D preview and stored in Config.bodyColor. */
  value: string;
  /** Manufacturer's own designation, e.g. "RAL 9016" or "Gold Brushed". */
  code?: string;
  finish?: ProfileFinish;
  /** CSS background for the swatch button when a flat fill misreads it. */
  swatch?: string;
};

export type LightModeDef = {
  id: LightModeId;
  name: string;
  description: string;
  direction: LightModeDirection;
  price: number;
};

export type Config = {
  text: string;
  font: string;
  material: string;       // MaterialDef.id
  signType: SignType;
  lightMode: LightModeId;
  lightColor: string;
  bodyColor: string;
  height: number;
  thickness: number;
  rotation: number;       // group Y rotation, degrees
};
