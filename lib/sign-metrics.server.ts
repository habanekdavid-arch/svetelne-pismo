import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
// Named imports, not a default one: opentype.js ships both a CommonJS build
// (which has a default export) and an ESM one (which has only these), and
// the bundler picks the ESM build.
import { parse as parseFont, type Font } from "opentype.js";
import { fontOptions } from "@/lib/options";
import { signLines } from "@/lib/sign-text";
import type { SignSize } from "@/lib/useSignSize";

// The same measurement lib/useSignSize.ts makes in the browser, made here
// instead — from the very same font file, with no browser in the loop.
//
// Why it exists: the price is worked out from the measured size of the sign,
// and a size that arrives from the browser is a number the customer's machine
// chose. Before Stripe that only affected a quote; now it decides what is
// charged, so the server measures for itself and the client's figure is never
// trusted with money.

/** Must match lib/useSignSize.ts — a two-line sign is measured as it is built. */
const LINE_HEIGHT_RATIO = 1.34;

/** Cap height comes off a letter with no ascender, descender or diacritic. */
const CAP_SAMPLE = "H";

type Loaded = Font;

// Parsed fonts are cached for the life of the serverless instance: the files
// are a few hundred kB each and a basket re-measures the same face repeatedly.
const cache = new Map<string, Promise<Loaded>>();

async function loadFont(fontId: string): Promise<Loaded> {
  const option = fontOptions.find((f) => f.id === fontId);
  if (!option) throw new Error(`neznámy font: ${fontId}`);

  const cached = cache.get(fontId);
  if (cached) return cached;

  // FontOption.file is a URL path with its spaces percent-encoded (the 3D
  // preview fetches it); on disk those are ordinary spaces again.
  const relative = decodeURIComponent(option.file).replace(/^\//, "");
  const full = path.join(process.cwd(), "public", relative);

  const promise = readFile(full).then((buf) =>
    parseFont(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
  );
  cache.set(fontId, promise);
  // A font that fails to load must not poison the cache for every later request.
  promise.catch(() => cache.delete(fontId));
  return promise;
}

type Box = { w: number; h: number };

/** A glyph's inked box in font units, or null for a space (which inks nothing). */
function glyphBox(font: Loaded, char: string): Box | null {
  const glyph = font.charToGlyph(char);
  const bb = glyph.getBoundingBox();
  const w = bb.x2 - bb.x1;
  const h = bb.y2 - bb.y1;
  if (!(w > 0) || !(h > 0)) return null;
  return { w, h };
}

/**
 * How big this sign really is, in millimetres, and how much of it is letter.
 * Returns null when the text is empty or the font cannot be read — the caller
 * then falls back to lib/pricing.ts's own estimate rather than quoting zero.
 */
export async function measureSign(
  text: string,
  fontId: string,
  letterHeightMm: number,
): Promise<SignSize | null> {
  const lines = signLines(text.trim());
  if (lines.length === 0 || !(letterHeightMm > 0)) return null;

  let font: Loaded;
  try {
    font = await loadFont(fontId);
  } catch (err) {
    // Falling back to lib/pricing.ts's estimate keeps a quote on screen, but
    // it is an estimate — this is worth knowing about, not swallowing.
    console.error(`[ceny] font ${fontId} sa nepodarilo načítať, cena je odhad:`, err);
    return null;
  }

  const unitsPerEm = font.unitsPerEm || 1000;
  // Everything is measured at one em and then expressed in cap heights, so the
  // size it was measured at cancels out.
  const capBox = glyphBox(font, CAP_SAMPLE);
  const cap = capBox ? capBox.h : unitsPerEm * 0.7;
  if (!(cap > 0)) return null;

  // Width is the widest row; height is the top of the first row to the bottom
  // of the last, with the rows a line-height apart.
  let widest = 0;
  let letters = 0;
  let maxLetterW = 0;
  let maxLetterH = 0;
  let firstAscent = 0;
  let lastDescent = 0;

  lines.forEach((line, i) => {
    const bbox = font.getPath(line, 0, 0, unitsPerEm).getBoundingBox();
    const lineWidth = Number.isFinite(bbox.x2 - bbox.x1) ? bbox.x2 - bbox.x1 : 0;
    widest = Math.max(widest, lineWidth);

    // getPath draws with y growing downwards, so what sticks out above the
    // baseline is -y1 and what hangs below it is y2.
    if (i === 0) firstAscent = Math.max(0, -bbox.y1);
    if (i === lines.length - 1) lastDescent = Math.max(0, bbox.y2);

    for (const char of Array.from(line)) {
      if (!char.trim()) continue;
      const box = glyphBox(font, char);
      if (box) {
        letters += box.w * box.h;
        maxLetterW = Math.max(maxLetterW, box.w);
        maxLetterH = Math.max(maxLetterH, box.h);
      }
    }
  });

  const drop = (lines.length - 1) * LINE_HEIGHT_RATIO * cap;
  const totalHeight = firstAscent + drop + lastDescent;
  if (!(widest > 0) || !(totalHeight > 0)) return null;

  const perCap = letterHeightMm / cap;
  const widthMm = widest * perCap;
  const heightMm = totalHeight * perCap;

  return {
    widthMm,
    heightMm,
    // Share of the sign's own box that is ink. Measured from the outlines
    // rather than from pixels: the glyph boxes overstate it (a letter does not
    // fill its own rectangle), so it is scaled by the usual fill of a bold
    // letterform. Only the volume-priced build reads this.
    inkRatio: clamp((letters / (widthMm * heightMm / (perCap * perCap))) * 0.72, 0.15, 0.95),
    letterAreaM2: (letters * perCap * perCap) / 1_000_000,
    maxLetterWidthMm: maxLetterW * perCap,
    maxLetterHeightMm: maxLetterH * perCap,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}
