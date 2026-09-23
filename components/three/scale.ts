import { BRICK_ROWS_PER_TILE, TILE_UNITS } from "@/components/three/wallTexture";

// ── Real-world scale ─────────────────────────────────────────────────────────
//
// One ruler for the whole preview: the brick course. A course of a real brick
// wall is 7 cm (a 6.5 cm brick and its joint), and the wall texture is drawn
// with a fixed number of courses per tile — so a course is a known number of
// world units, and that fixes how many millimetres a unit is.
//
// Everything that has a real size is converted through this: the letter
// height the customer orders, the depth of the build, the gap to the wall.
// A 30 cm letter therefore stands a little over four courses tall, exactly
// as it would on a real wall — whatever the text, whatever the font.

/** Height of one brick course, joint included. */
export const BRICK_COURSE_MM = 70;

/** Millimetres in one world unit — 490 with the tile as it is drawn today. */
export const MM_PER_UNIT = BRICK_COURSE_MM / (TILE_UNITS / BRICK_ROWS_PER_TILE);

export function mmToUnits(mm: number): number {
  return mm / MM_PER_UNIT;
}
