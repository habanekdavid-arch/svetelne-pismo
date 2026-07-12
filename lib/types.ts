export type SignType = "illuminated" | "plain";

export type LightModeId = "front" | "halo" | "sides" | "outline" | "full" | "combined";

// Where the glow visually reads as coming from — drives both the 3D emissive
// mix (LetterScene.tsx FACE_EMISSIVE) and the flat glyph preview tiles
// (ConfiguratorStage.tsx LightModeGlyphPreview).
export type LightModeDirection = "front" | "back" | "sides" | "outline" | "full" | "both";

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
  useTag: MaterialUseTag;
  priceMultiplier: number;
  supportsIlluminated: boolean;
  supportsPlain: boolean;
  lightModes: LightModeId[];
  pbr: MaterialPbr;
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
