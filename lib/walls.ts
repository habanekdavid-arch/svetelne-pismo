// The wall the sign is previewed on. Not part of the order: the wall is where
// the customer imagines the sign, not something we make — so it lives beside
// Config (lib/types.ts), never inside it.
//
// It is chosen in three places (components/configurator/WallPicker.tsx):
//   · Farba          — painted plaster in a colour;
//   · Povrch         — omietka, tehla, drevo or kov, each in its own look;
//   · Vlastný návrh  — the customer's own photo.
// The textures are real images (public/textures/walls, made by
// scripts/generate-wall-textures.py), seamless and at true scale.

export type WallSurfaceId = "plaster" | "brick" | "wood" | "metal";

export type WallSurface = {
  id: WallSurfaceId;
  label: string;
  hint: string;
  /** Plaster takes the chosen paint colour; the others keep their own. */
  paintable: boolean;
  roughness: number;
  metalness: number;
  /** How deep the height map reads under light. */
  bump: number;
};

export const WALL_SURFACES: WallSurface[] = [
  { id: "plaster", label: "Omietka", hint: "Zrnitá fasádna omietka",        paintable: true,  roughness: 0.95, metalness: 0,    bump: 0.9 },
  { id: "brick",   label: "Tehla",   hint: "Lícová tehla s maltou",        paintable: false, roughness: 0.9,  metalness: 0,    bump: 1.4 },
  { id: "wood",    label: "Drevo",   hint: "Drevený obklad z dosiek",      paintable: false, roughness: 0.75, metalness: 0,    bump: 0.8 },
  { id: "metal",   label: "Kov",     hint: "Brúsené kovové fasádne panely", paintable: false, roughness: 0.42, metalness: 0.55, bump: 0.5 },
];

export type WallColor = { id: string; label: string; value: string };

/** Paint for the plaster — grey first, the wall the preview opens on. */
export const WALL_COLORS: WallColor[] = [
  { id: "grey",       label: "Sivá",       value: "#c9c8c4" },
  { id: "light-grey", label: "Svetlosivá", value: "#dfded9" },
  { id: "white",      label: "Biela",      value: "#f4f3ef" },
  { id: "beige",      label: "Béžová",     value: "#e3d6c3" },
  { id: "anthracite", label: "Antracit",   value: "#5a5c61" },
  { id: "black",      label: "Čierna",     value: "#2a2a2c" },
];

export type Wall = { surface: WallSurfaceId; color: string };

/** Grey plaster. */
export const DEFAULT_WALL: Wall = { surface: "plaster", color: WALL_COLORS[0].value };

export function wallSurface(id: WallSurfaceId): WallSurface {
  return WALL_SURFACES.find((s) => s.id === id) ?? WALL_SURFACES[0];
}

/** The colour the surface is multiplied by — the paint on plaster, none on the rest. */
export function wallTint(wall: Wall): string {
  return wallSurface(wall.surface).paintable ? wall.color : "#ffffff";
}

export function wallTextureUrl(id: WallSurfaceId, kind: "color" | "height"): string {
  return `/textures/walls/${id}-${kind}.jpg`;
}

/** Biggest photo we will load into the preview — a phone photo fits well under it. */
export const MAX_BACKGROUND_BYTES = 12 * 1024 * 1024;
