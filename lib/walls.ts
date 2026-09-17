// Surfaces the sign can be previewed on. Not part of the order: the wall is
// where the customer imagines the sign, not something we make — so it lives
// beside Config (lib/types.ts), never inside it.

export type WallGrain = "fine" | "coarse" | "mottled" | "brick";

export type WallSurface = {
  id: WallGrain;
  label: string;
  hint: string;
  /** Multiplied over the painted tile — how the surface reads by day / at night. */
  dayTint: string;
  nightTint: string;
};

export const WALL_SURFACES: WallSurface[] = [
  {
    id: "fine",
    label: "Omietka",
    hint: "Hladká interiérová omietka",
    dayTint: "#ffffff",
    nightTint: "#cdc8c2",
  },
  {
    id: "coarse",
    label: "Fasáda",
    hint: "Zrnitá fasádna omietka",
    dayTint: "#fbf8f3",
    nightTint: "#c8c3bb",
  },
  {
    id: "mottled",
    label: "Betón",
    hint: "Pohľadový betón",
    dayTint: "#f4f5f6",
    nightTint: "#bfc1c4",
  },
  {
    id: "brick",
    label: "Tehla",
    hint: "Tehlová stena",
    dayTint: "#ffffff",
    nightTint: "#bdb4ac",
  },
];

export const DEFAULT_WALL: WallGrain = "fine";

/** Biggest photo we will load into the preview — a phone photo fits well under it. */
export const MAX_BACKGROUND_BYTES = 12 * 1024 * 1024;
