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
import { signLines } from "@/lib/sign-text";

export type { Font };

// ── Tunables ─────────────────────────────────────────────────────────────────

export const GLYPH_SIZE = 0.78;

// Two lines are as far as a sign goes here, and they sit a little more than a
// letter height apart — the spacing a sign maker leaves so the rows read as
// one nápis rather than two.
export const LINE_HEIGHT = GLYPH_SIZE * 1.34;

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

// Which way round a font draws its outlines is a property of the FILE, not of
// its extension — one of these .ttf files turned out to be drawn the CFF way
// round. Read it the wrong way and every letter with a counter (a, e, o, á)
// comes out inside out: the hole becomes the shape and the letter's own body
// becomes the hole, so it renders as an empty outline while the letters
// without a counter look perfectly fine. That is exactly what "some fonts are
// broken" looked like.
//
// So it is measured, not guessed. A ring glyph is parsed both ways and the
// reading where the OUTER contour is the bigger of the two wins. Both
// readings produce "one shape with one hole" — that alone says nothing, which
// is why the areas have to be compared.
const WINDING_PROBE = ["o", "e", "a", "O", "b", "p"];

function parseWithWinding(buffer: ArrayBuffer, reversed: boolean): Font {
  const loader = new TTFLoader();
  loader.reversed = reversed;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseFont(loader.parse(buffer) as any);
}

function contourArea(points: THREE.Vector2[]): number {
  return Math.abs(THREE.ShapeUtils.area(points));
}

/** True when a ring glyph really is a ring: a body with a smaller hole in it. */
function drawsCountersCorrectly(font: Font): boolean {
  for (const char of WINDING_PROBE) {
    let shapes: THREE.Shape[];
    try {
      shapes = font.generateShapes(char, 1) as THREE.Shape[];
    } catch {
      continue;
    }
    const shape = shapes[0];
    if (!shape || shape.holes.length === 0) continue; // no counter here — try the next probe

    const outer = contourArea(shape.getPoints(WINDING_PROBE_SEGMENTS));
    const hole = Math.max(
      ...shape.holes.map((h) => contourArea(h.getPoints(WINDING_PROBE_SEGMENTS))),
    );
    return outer > hole;
  }
  return true; // nothing to judge it by — take the file as it is
}

// ── Glyphs wound the other way round ────────────────────────────────────────
//
// Picking one winding per file gets most of the way, but not all of it: some
// of these fonts genuinely mix directions from glyph to glyph. Measured over
// the whole alphabet — Poppins draws "o" one way and "0" the other, Archivo
// Black does it with "Q", Baloo2 with "D", Comic Helvetic with "i", "j" and
// "ä". Whichever way the file is read, those letters came out inside out.
//
// So after the shapes exist they are checked one at a time, against what a
// hole actually is:
//
//   · a "hole" whose middle lies OUTSIDE its shape is not a hole — it is a
//     separate piece of the letter (the two dots of an ä ended up as a shape
//     and a hole of the same size),
//   · and when a real, contained hole is BIGGER than the body around it, the
//     two are the wrong way round and get swapped.
//
// Coarse sampling is plenty here: these comparisons are between areas that
// differ several times over, and containment is tested at the centroid.
const REPAIR_SEGMENTS = 8;

function centroid(points: THREE.Vector2[]): THREE.Vector2 {
  const sum = points.reduce((a, p) => a.add(p), new THREE.Vector2());
  return points.length ? sum.divideScalar(points.length) : sum;
}

function pointInPolygon(p: THREE.Vector2, poly: THREE.Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const crosses = a.y > p.y !== b.y > p.y;
    if (crosses && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** A Path turned into a Shape of its own, keeping its curves rather than a polyline. */
function asShape(path: THREE.Path): THREE.Shape {
  const shape = new THREE.Shape();
  shape.curves = path.curves;
  shape.autoClose = path.autoClose;
  return shape;
}

/** Every shape of a glyph put right: see the note above. */
function repairShapes(shapes: THREE.Shape[]): THREE.Shape[] {
  const out: THREE.Shape[] = [];

  for (const shape of shapes) {
    const outerPts = shape.getPoints(REPAIR_SEGMENTS);
    const contained: THREE.Path[] = [];

    for (const hole of shape.holes) {
      const holePts = hole.getPoints(REPAIR_SEGMENTS);
      if (pointInPolygon(centroid(holePts), outerPts)) contained.push(hole);
      // Not inside the body at all — its own piece of the letter.
      else out.push(asShape(hole));
    }

    if (contained.length === 0) {
      shape.holes = [];
      out.push(shape);
      continue;
    }

    // Biggest of the contained contours: if it is bigger than the body, the
    // body is really the hole and the two swap places.
    let biggest = contained[0];
    let biggestArea = contourArea(biggest.getPoints(REPAIR_SEGMENTS));
    for (const hole of contained.slice(1)) {
      const a = contourArea(hole.getPoints(REPAIR_SEGMENTS));
      if (a > biggestArea) { biggest = hole; biggestArea = a; }
    }

    if (biggestArea > contourArea(outerPts)) {
      const swapped = asShape(biggest);
      swapped.holes = [asShape(shape), ...contained.filter((h) => h !== biggest)];
      out.push(swapped);
    } else {
      shape.holes = contained;
      out.push(shape);
    }
  }

  return out;
}

/** Coarse is plenty: this compares two areas that differ several times over. */
const WINDING_PROBE_SEGMENTS = 6;

async function loadTTFFont(url: string): Promise<Font> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buffer = await res.arrayBuffer();

  const asDrawn = parseWithWinding(buffer, false);
  if (drawsCountersCorrectly(asDrawn)) return asDrawn;

  const reversed = parseWithWinding(buffer, true);
  return drawsCountersCorrectly(reversed) ? reversed : asDrawn;
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

  const promise = loadTTFFont(url)
    .then((font) => {
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

// ── Cap height ───────────────────────────────────────────────────────────────
//
// The height a customer orders is the height of a capital — the same "H" the
// price is measured by (lib/useSignSize.ts CAP_SAMPLE). Fonts differ in how
// much of their em that capital takes, so it is measured from the font rather
// than assumed; that is what lets every face stand at its true size.
const capHeightCache = new WeakMap<Font, number>();

export function capHeightLocal(font: Font): number {
  const cached = capHeightCache.get(font);
  if (cached) return cached;
  let cap = GLYPH_SIZE * 0.72; // a typical bold face, if "H" cannot be read
  try {
    const shapes = repairShapes(font.generateShapes("H", GLYPH_SIZE) as THREE.Shape[]);
    let minY = Infinity;
    let maxY = -Infinity;
    for (const shape of shapes) {
      for (const p of shape.getPoints(4)) {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }
    if (maxY > minY) cap = maxY - minY;
  } catch {
    // keep the typical value
  }
  capHeightCache.set(font, cap);
  return cap;
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
  // The rounded edge is carved INTO the letter, not added around it. three
  // grows a bevel outward by default, which made every letter 4.8 % taller and
  // wider than ordered — 14 mm on a 30 cm letter — and, with a bevel on both
  // faces, a good deal deeper than its profile. With the offset the outline
  // is exactly the glyph and the depth exactly the build.
  const bevelThickness = Math.min(BEVEL_THICKNESS, depth * 0.3);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: noBevel ? depth : Math.max(depth * 0.2, depth - 2 * bevelThickness),
    bevelEnabled: !noBevel,
    bevelSize: BEVEL_SIZE,
    bevelOffset: -BEVEL_SIZE,
    bevelThickness,
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
  const lines = signLines(text);
  const perGlyph: THREE.BufferGeometry[] = [];
  let failedCount = 0;
  let shapeCount = 0;

  // Line by line, each one built at the origin and then moved into place:
  // dropped a line down by LINE_HEIGHT and slid sideways by half its own
  // width, so the rows end up centred on each other. three's own newline
  // handling would stack them left-aligned, which on a sign looks like a
  // mistake rather than a choice.
  lines.forEach((line, index) => {
    const shapes = repairShapes(font.generateShapes(line, GLYPH_SIZE) as THREE.Shape[]);
    shapeCount += shapes.length;
    const lineGeos: THREE.BufferGeometry[] = [];

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
      if (geo) lineGeos.push(geo);
    }
    if (lineGeos.length === 0) return;

    const bounds = new THREE.Box3();
    for (const geo of lineGeos) {
      geo.computeBoundingBox();
      if (geo.boundingBox) bounds.union(geo.boundingBox);
    }
    const dx = -(bounds.min.x + bounds.max.x) / 2;
    const dy = -index * LINE_HEIGHT;
    for (const geo of lineGeos) {
      geo.translate(dx, dy, 0);
      perGlyph.push(geo);
    }
  });

  if (perGlyph.length === 0) {
    return { geometry: null, failedCount };
  }

  const merged = mergeGlyphGeometries(perGlyph);
  for (const g of perGlyph) g.dispose();

  if (!merged) {
    console.warn("[letterGeometry] mergeGeometries failed — geometries were incompatible");
    return { geometry: null, failedCount: shapeCount };
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
const HALO_GLOW_FALLOFF = 2.6;

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

/**
 * @param reach How far the light spreads beyond the letter's edge, in the
 *   letter's own (unscaled) units. The caller works it out from a real
 *   distance in millimetres, so the halo is as wide as the stand-off makes it
 *   — not a fixed share of the letter, which on a big sign was a wall of light.
 */
export function buildHaloGlowTexture(
  font: Font,
  text: string,
  reach: number = HALO_GLOW_MARGIN * GLYPH_SIZE,
): HaloGlowBuild {
  if (typeof document === "undefined") return EMPTY_HALO;

  const outlines: Outline[] = [];
  const box = new THREE.Box2();
  box.makeEmpty();

  // Laid out exactly like the letters above — same line height, same centring
  // per row — because the glow has to sit behind the sign, not beside it.
  signLines(text).forEach((line, index) => {
    const shapes = repairShapes(font.generateShapes(line, GLYPH_SIZE) as THREE.Shape[]);
    const lineOutlines: Outline[] = [];
    const lineBox = new THREE.Box2();
    lineBox.makeEmpty();

    for (const shape of shapes) {
      const outer = shape.getPoints(HALO_CURVE_SEGMENTS);
      if (outer.length < 3) continue;
      const holes = shape.holes.map((h) => h.getPoints(HALO_CURVE_SEGMENTS)).filter((h) => h.length >= 3);
      lineOutlines.push({ outer, holes });
      for (const p of outer) lineBox.expandByPoint(p);
    }
    if (lineOutlines.length === 0) return;

    const dx = -(lineBox.min.x + lineBox.max.x) / 2;
    const dy = -index * LINE_HEIGHT;
    for (const o of lineOutlines) {
      for (const p of o.outer) p.set(p.x + dx, p.y + dy);
      for (const h of o.holes) for (const p of h) p.set(p.x + dx, p.y + dy);
      outlines.push(o);
      for (const p of o.outer) box.expandByPoint(p);
    }
  });
  if (outlines.length === 0) return EMPTY_HALO;

  const margin = reach;
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
