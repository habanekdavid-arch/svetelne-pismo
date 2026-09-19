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

/**
 * OpenType/CFF faces (.otf — Gotham, Comic Helvetic here) draw their outlines
 * the other way round from TrueType: outer contours run counter-clockwise
 * instead of clockwise. Extruded as-is, the fill flips — counters fill in, the
 * letter itself hollows out and separate marks like the accent on "á"
 * disappear into the shape below them. TTFLoader can reverse the commands; it
 * just has to be told which files need it.
 */
function needsReversedWinding(url: string): boolean {
  return /\.otf(\?|$)/i.test(url);
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

  const loader = getTTFLoader();
  loader.reversed = needsReversedWinding(url);
  const promise = loader
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

// ─────────────────────────────────────────────────────────────────────────────
// Halo glow texture ("Zozadu")
// ─────────────────────────────────────────────────────────────────────────────
// A back-lit sign is not a glowing letter — the letter stays dark and the wall
// behind it carries the light, brightest right at the contour and fading out
// over roughly half a letter height. Lights parked behind the sign cannot draw
// that: a point light makes a round pool, so a wide nápis got blobs that
// ignored the letterforms completely.
//
// So the halo is drawn from the letterforms themselves. The glyph outlines are
// painted into a canvas as a white silhouette, ringed by strokes that step
// outward with a falling alpha, and that texture is laid on the wall with
// additive blending (see LetterScene's HaloGlow). The letter body then occludes
// the silhouette itself, so what is left on screen is exactly the spill around
// the contour — including inside counters like the bowl of an "A", where the
// same rings fade toward the middle of the hole.
//
// Why strokes and not a blur: ctx.filter is unsupported in older Safari, and a
// hand-rolled blur over a 2K canvas is far too slow to run on every text edit.
// Stroking the path with a round join is exact, cheap and works everywhere; a
// small ctx.filter blur is applied on top only when the browser has it.

/** Glow reach beyond the glyph contour, in GLYPH_SIZE units. */
export const HALO_GLOW_MARGIN = 0.95;
/** Canvas resolution. Capped so a long nápis cannot allocate a huge texture. */
const HALO_GLOW_PX_PER_UNIT = 240;
const HALO_GLOW_MAX_PX = 2048;
/** Number of rings. More = smoother ramp, linearly more drawing work. */
const HALO_GLOW_STEPS = 36;
/**
 * Outline resolution for the glow only. The halo is soft by definition, so it
 * does not need the letters' own curve resolution — halving it halves the
 * work of every ring pass, which is what keeps a long nápis responsive while
 * the text is being typed.
 */
const HALO_CURVE_SEGMENTS = 6;
/** Extra dead space around the glow, as a fraction of its reach. */
const HALO_GLOW_EDGE_PAD = 0.3;
/**
 * Falloff exponent of the ring profile, as brightness over distance from the
 * contour: 1 = linear, higher = light hugs the letter more tightly. 2.6 is
 * roughly what a strip of LEDs a few centimetres off the wall throws.
 */
const HALO_GLOW_FALLOFF = 1.9;

export type HaloGlowBuild = {
  texture: THREE.CanvasTexture | null; // null when the text has no drawable glyphs
  width: number;   // plane size in the same units as the letter geometry
  height: number;
};

const EMPTY_HALO: HaloGlowBuild = { texture: null, width: 0, height: 0 };

type Outline = { outer: THREE.Vector2[]; holes: THREE.Vector2[][] };

function polygon(ctx: CanvasRenderingContext2D, pts: THREE.Vector2[], toPx: (p: THREE.Vector2) => [number, number]) {
  if (pts.length < 2) return;
  const [x0, y0] = toPx(pts[0]);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = toPx(pts[i]);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function buildHaloGlowTexture(font: Font, text: string): HaloGlowBuild {
  if (typeof document === "undefined") return EMPTY_HALO;

  const shapes = font.generateShapes(text, GLYPH_SIZE) as THREE.Shape[];

  const outlines: Outline[] = [];
  const box = new THREE.Box2();
  box.makeEmpty();
  for (const shape of shapes) {
    const outer = shape.getPoints(HALO_CURVE_SEGMENTS);
    if (outer.length < 3) continue;
    const holes = shape.holes.map((h) => h.getPoints(HALO_CURVE_SEGMENTS)).filter((h) => h.length >= 3);
    outlines.push({ outer, holes });
    for (const p of outer) box.expandByPoint(p);
  }
  if (outlines.length === 0) return EMPTY_HALO;

  const margin = HALO_GLOW_MARGIN * GLYPH_SIZE;
  // The plane is a little larger than the glow's own reach. Without that
  // headroom the falloff ends exactly on the texture's border, and the final
  // smoothing pass leaves a faint rectangle where the plane stops.
  const pad = margin * (1 + HALO_GLOW_EDGE_PAD);
  const size = box.getSize(new THREE.Vector2());
  const width  = size.x + pad * 2;
  const height = size.y + pad * 2;

  const scale = Math.min(HALO_GLOW_PX_PER_UNIT, HALO_GLOW_MAX_PX / Math.max(width, height));
  const pxW = Math.max(8, Math.round(width  * scale));
  const pxH = Math.max(8, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return EMPTY_HALO;

  // Additive blending ignores black, so an opaque black ground contributes
  // nothing outside the glow.
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, pxW, pxH);

  // Shape space → canvas pixels. Y flips: canvas grows downward.
  const min = box.min;
  const toPx = (p: THREE.Vector2): [number, number] => [
    (p.x - min.x + pad) * scale,
    pxH - (p.y - min.y + pad) * scale,
  ];

  const trace = () => {
    ctx.beginPath();
    for (const o of outlines) {
      polygon(ctx, o.outer, toPx);
      for (const h of o.holes) polygon(ctx, h, toPx);
    }
  };

  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Rings, widest and faintest first. Each ring is stroked centred on the
  // contour, so a ring of width 2d reaches d outward. Painted over one
  // another with source-over, the alpha at distance d accumulates — so each
  // step's own alpha is solved from the profile it has to land on rather than
  // guessed, which is what keeps the ramp smooth instead of banded.
  let covered = 0;
  for (let i = 0; i < HALO_GLOW_STEPS; i++) {
    const t = (i + 1) / HALO_GLOW_STEPS;      // 0 → contour distance margin, 1 → contour
    const d = margin * (1 - t);
    const target = Math.pow(t, HALO_GLOW_FALLOFF);
    const alpha = (target - covered) / (1 - covered);
    covered = target;
    if (alpha <= 0.001 || d <= 0) continue;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.lineWidth = Math.max(1, d * 2 * scale);
    trace();
    ctx.stroke();
  }

  // The silhouette itself is solid — it sits behind the letter and is only
  // ever seen where the letter does not cover it.
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  trace();
  ctx.fill("evenodd");

  // Optional final smoothing where the browser supports canvas filters.
  let source: HTMLCanvasElement = canvas;
  const blurPx = Math.max(1, Math.round(margin * scale * 0.06));
  const probe = canvas.getContext("2d");
  if (probe) {
    probe.filter = `blur(${blurPx}px)`;
    if (probe.filter === `blur(${blurPx}px)`) {
      const smoothed = document.createElement("canvas");
      smoothed.width = pxW;
      smoothed.height = pxH;
      const sctx = smoothed.getContext("2d");
      if (sctx) {
        sctx.filter = `blur(${blurPx}px)`;
        sctx.drawImage(canvas, 0, 0);
        source = smoothed;
      }
    }
    probe.filter = "none";
  }

  const texture = new THREE.CanvasTexture(source);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return { texture, width, height };
}
