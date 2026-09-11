// ─────────────────────────────────────────────────────────────────────────────
// Solid extruded letters, built from real TTF outlines (TTFLoader) so every
// font — including the script/cursive ones — keeps its full glyph set,
// diacritics included, instead of the limited charset baked into the old
// three.js typeface.json fonts.
//
// One geometry per glyph SHAPE (not one ExtrudeGeometry call for the whole
// string): a single malformed/self-intersecting outline (common in cursive
// fonts where strokes overlap) can make ExtrudeGeometry's triangulation
// throw or degenerate. Building per-shape and merging lets one bad glyph be
// skipped without losing the rest of the word.
//
// Each glyph geometry keeps three material groups (side / back cap / front
// cap) so front-lit, back-lit (halo) and edge-lit (outline/sides) modes can
// each target the right faces with emissive — see LetterScene.tsx.
//
// three.js's ExtrudeGeometry always builds the "lid" as one combined group:
// back-cap triangles first, then front-cap triangles, both under the same
// materialIndex — see node_modules/three/src/geometries/ExtrudeGeometry.js
// buildLidFaces(). Since both halves have an equal triangle count, the
// group's index range splits cleanly in two. That's exploited here instead
// of doing any boolean/CSG work.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from "three";
import { FontLoader, type Font } from "three-stdlib";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type { Font };

// ── Tunables ─────────────────────────────────────────────────────────────────

export const GLYPH_SIZE = 0.78;
export const CURVE_SEGMENTS = 10;      // 8–12: smooth enough for round script strokes, cheap enough per-glyph
export const BEVEL_SIZE = 0.018;       // small — just enough for edges to catch light
export const BEVEL_THICKNESS = 0.014;
export const BEVEL_SEGMENTS = 3;

// Safety fallback for shapes that fail to extrude WITH a bevel (self-
// intersecting/overlapping strokes in script fonts are the usual cause) —
// retried once with no bevel before the glyph is given up on entirely.
const NO_BEVEL_RETRY = { bevelEnabled: false } as const;

// Material group indices — order the material array passed to <mesh material={...}> accordingly.
export const MATERIAL_GROUP = {
  SIDE:  0,
  BACK:  1,
  FRONT: 2,
} as const;

// ── typeface.json / pre-parsed font data ────────────────────────────────────

let fontLoaderInstance: FontLoader | null = null;
function getFontLoader(): FontLoader {
  if (!fontLoaderInstance) fontLoaderInstance = new FontLoader();
  return fontLoaderInstance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseFont(typefaceData: any): Font {
  return getFontLoader().parse(typefaceData);
}

// ── TTF loading — lazy, cached, Suspense-compatible ─────────────────────────
// TTFLoader converts a .ttf into the same typeface-JSON shape FontLoader/Font
// already expect (glyphs keyed by codepoint, `.o` outline strings) — every
// glyph the font file actually contains survives the conversion, diacritics
// included, unlike the old baked-in three.js typeface.json fonts which only
// shipped a fixed ASCII-ish subset.

let ttfLoaderInstance: TTFLoader | null = null;
function getTTFLoader(): TTFLoader {
  if (!ttfLoaderInstance) ttfLoaderInstance = new TTFLoader();
  return ttfLoaderInstance;
}

type FontCacheEntry =
  | { status: "pending"; promise: Promise<Font> }
  | { status: "success"; font: Font }
  | { status: "error"; error: unknown };

const ttfFontCache = new Map<string, FontCacheEntry>();

// Suspense-compatible: call during render inside a <Suspense> boundary.
// Throws the in-flight promise while loading (Suspense shows the fallback),
// throws the error on failure (nearest error boundary), returns the parsed
// Font once ready. Parsed fonts are cached by URL for the session so
// switching back to a previously-used font is instant.
export function useTTFFont(url: string): Font {
  const cached = ttfFontCache.get(url);
  if (cached?.status === "success") return cached.font;
  if (cached?.status === "error") throw cached.error;
  if (cached?.status === "pending") throw cached.promise;

  const promise = getTTFLoader()
    .loadAsync(url)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then((json: any) => {
      const font = parseFont(json);
      ttfFontCache.set(url, { status: "success", font });
      return font;
    })
    .catch((error: unknown) => {
      ttfFontCache.set(url, { status: "error", error });
      throw error;
    });

  ttfFontCache.set(url, { status: "pending", promise });
  throw promise;
}

// ── Geometry building ────────────────────────────────────────────────────────

export type SolidLetterBuild = {
  geometry: THREE.BufferGeometry | null; // null only if every glyph failed
  failedCount: number;                   // glyph shapes skipped due to invalid geometry
};

function splitLidGroups(geometry: THREE.BufferGeometry) {
  const original = geometry.groups.slice();
  geometry.clearGroups();
  for (const g of original) {
    if (g.materialIndex === 0) {
      const half = g.count / 2;
      geometry.addGroup(g.start, half, MATERIAL_GROUP.BACK);
      geometry.addGroup(g.start + half, half, MATERIAL_GROUP.FRONT);
    } else {
      geometry.addGroup(g.start, g.count, MATERIAL_GROUP.SIDE);
    }
  }
}

// mergeGeometries(..., useGroups: true) does NOT preserve each source
// geometry's own .groups — it assigns one brand-new incrementing
// materialIndex per input geometry (see BufferGeometryUtils.js
// addGroup(offset, count, i)), discarding the SIDE/BACK/FRONT split
// splitLidGroups() just built. With >3 glyphs that produces materialIndex
// values beyond the 3-entry material array, so three.js silently drops
// those groups — only the first couple of glyphs would ever render.
// Merging with useGroups: false concatenates attributes/index with no
// groups at all, so the per-glyph SIDE/BACK/FRONT groups are re-added
// manually here, offset into the merged index buffer.
function mergeGlyphGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  const merged = mergeGeometries(geometries, false);
  if (!merged) return null;

  let indexOffset = 0;
  for (const geo of geometries) {
    const count = geo.index ? geo.index.count : geo.attributes.position.count;
    for (const g of geo.groups) {
      merged.addGroup(indexOffset + g.start, g.count, g.materialIndex);
    }
    indexOffset += count;
  }
  return merged;
}

function extrudeShape(shape: THREE.Shape, depth: number, noBevel: boolean): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: !noBevel,
    bevelSize: BEVEL_SIZE,
    bevelThickness: BEVEL_THICKNESS,
    bevelSegments: BEVEL_SEGMENTS,
    curveSegments: CURVE_SEGMENTS,
    ...(noBevel ? NO_BEVEL_RETRY : {}),
  });

  const posCount = geometry.attributes.position?.count ?? 0;
  if (posCount === 0) {
    geometry.dispose();
    throw new Error("empty geometry");
  }

  splitLidGroups(geometry);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildSolidLetterGeometry(
  font: Font,
  text: string,
  depth: number,
): SolidLetterBuild {
  const shapes = font.generateShapes(text, GLYPH_SIZE) as THREE.Shape[];
  const perGlyph: THREE.BufferGeometry[] = [];
  let failedCount = 0;

  for (const shape of shapes) {
    // Overlapping/self-intersecting strokes (common in script fonts) can
    // make the bevelled triangulation degenerate — retry once without a
    // bevel before giving up on the glyph so one bad character doesn't take
    // down the whole word.
    let geo: THREE.BufferGeometry | null = null;
    try {
      geo = extrudeShape(shape, depth, false);
    } catch {
      try {
        geo = extrudeShape(shape, depth, true);
      } catch (err) {
        console.warn("[letterGeometry] Skipping a glyph — invalid geometry even without bevel:", err);
        failedCount++;
      }
    }
    if (geo) perGlyph.push(geo);
  }

  if (perGlyph.length === 0) {
    return { geometry: null, failedCount };
  }

  const merged = mergeGlyphGeometries(perGlyph);
  for (const g of perGlyph) g.dispose();

  if (!merged) {
    console.warn("[letterGeometry] mergeGeometries failed — geometries were incompatible");
    return { geometry: null, failedCount: shapes.length };
  }

  // Center the geometry's own local origin on its bounding-box centroid so
  // the sign spins in place around its true middle when rotated, instead of
  // orbiting around the left edge (where generateShapes' baseline origin
  // sits by default). Doing this at the geometry level — rather than relying
  // on drei's <Center> up in LetterScene — means the pivot is correct even
  // before the wrapping <Suspense> boundary has resolved.
  merged.center();

  return { geometry: merged, failedCount };
}
