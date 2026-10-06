"use client";

import type { LogoContour, LogoOutline, LogoPart, LogoSegment } from "@/lib/logo";

// The customer's logo file, turned into outlines a sign can be made from.
//
// Whatever the file is — an SVG, a PNG with transparency, a JPG on a white
// background — it is painted into a canvas first, and the logo is read off the
// pixels: what is see-through or the colour of the background is not logo,
// everything else is. Reading the picture rather than an SVG's own paths is
// deliberate: a white shape drawn over a black one is a hole to the eye, and
// only the painted result says so. The silhouette is then traced into lines
// and curves (imagetracerjs), one part per separate piece, holes included.
//
// A sign has one silhouette — its colours are the face and the return chosen
// in the configurator — so a logo in several colours becomes one shape.

/** Long side of the picture the logo is traced from. */
const TRACE_PX = 900;
/** Empty pixels round the cropped logo, so pieces touching the edge still close. */
const PAD = 2;
/** More than a few per cent see-through: the transparency is what marks the background. */
const ALPHA_MODE_SHARE = 0.02;
/** Colour distance (0–441) from the background that counts as logo. */
const BACKGROUND_DISTANCE = 80;
/** A logo is a handful of shapes; thousands of specks are a photograph. */
const MAX_PARTS = 300;
const MAX_SEGMENTS = 40_000;
/** Pieces smaller than this, in logo heights, are dust and not made. */
const MIN_PART = 0.008;

export class LogoTraceError extends Error {
  name = "LogoTraceError";
}

const NOT_A_LOGO =
  "Toto vyzerá skôr ako fotka než logo — má priveľa drobných častí. Nahrajte prosím logo ako SVG alebo PNG na čistom pozadí.";

export async function traceLogo(file: File): Promise<LogoOutline> {
  const img = await loadPicture(file);
  const scale = TRACE_PX / Math.max(img.width, img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new LogoTraceError("Prehliadač nevie logo spracovať.");
  ctx.drawImage(img.source, 0, 0, w, h);
  img.release();
  const { data } = ctx.getImageData(0, 0, w, h);

  const mask = foreground(data, w, h);

  // The logo's own box — the empty margin round it is not part of the sign.
  let minX = w, minY = h, maxX = -1, maxY = -1, ink = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      ink++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new LogoTraceError("V súbore sme nenašli žiadne logo — je celé jednej farby?");

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const pw = cw + PAD * 2;
  const ph = ch + PAD * 2;
  // Black logo on white, cropped and padded — the two colours the tracer is given.
  const bw = new Uint8ClampedArray(pw * ph * 4).fill(255);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (!mask[(y + minY) * w + (x + minX)]) continue;
      const i = ((y + PAD) * pw + (x + PAD)) * 4;
      bw[i] = bw[i + 1] = bw[i + 2] = 0;
    }
  }

  // Give the "Spracúvam logo…" a frame to show before the tracing takes the thread.
  await new Promise((r) => setTimeout(r, 0));
  const tracer = (await import("imagetracerjs")).default;
  const traced = tracer.imagedataToTracedata(
    { width: pw, height: ph, data: bw },
    {
      ltres: 1,
      qtres: 1,
      pathomit: 8,
      rightangleenhance: true,
      colorsampling: 0,
      numberofcolors: 2,
      colorquantcycles: 1,
      mincolorratio: 0,
      layering: 0,
      blurradius: 0,
      pal: [
        { r: 0, g: 0, b: 0, a: 255 },
        { r: 255, g: 255, b: 255, a: 255 },
      ],
    },
  );
  const layerIndex = traced.palette.findIndex((c) => c.r < 128);
  const layer = traced.layers[layerIndex] ?? [];

  // Pixels → logo heights, y up.
  const nx = (x: number) => (x - PAD) / ch;
  const ny = (y: number) => (ch - (y - PAD)) / ch;
  const contour = (segments: TracedSegment[]): LogoContour => ({
    x: nx(segments[0].x1),
    y: ny(segments[0].y1),
    segments: segments.map((s): LogoSegment =>
      s.type === "Q" && s.x3 !== undefined && s.y3 !== undefined
        ? { t: "Q", cx: nx(s.x2), cy: ny(s.y2), x: nx(s.x3), y: ny(s.y3) }
        : { t: "L", x: nx(s.x2), y: ny(s.y2) },
    ),
  });

  const parts: LogoPart[] = [];
  let partsArea = 0;
  let maxPartW = 0;
  let maxPartH = 0;
  let segmentCount = 0;
  for (const path of layer) {
    if (path.isholepath || path.segments.length < 2) continue;
    const [x0, y0, x1, y1] = path.boundingbox;
    const pwN = (x1 - x0 + 1) / ch;
    const phN = (y1 - y0 + 1) / ch;
    if (pwN < MIN_PART && phN < MIN_PART) continue;
    const holes = path.holechildren
      .map((i) => layer[i])
      .filter((hole) => hole && hole.segments.length >= 2)
      .map((hole) => contour(hole.segments));
    parts.push({ outer: contour(path.segments), holes });
    partsArea += pwN * phN;
    maxPartW = Math.max(maxPartW, pwN);
    maxPartH = Math.max(maxPartH, phN);
    segmentCount += path.segments.length + holes.reduce((n, c) => n + c.segments.length, 0);
    if (parts.length > MAX_PARTS || segmentCount > MAX_SEGMENTS) throw new LogoTraceError(NOT_A_LOGO);
  }
  if (parts.length === 0) throw new LogoTraceError("Logo je príliš drobné alebo tenké — skúste väčší súbor.");

  return {
    parts,
    aspect: cw / ch,
    inkRatio: Math.min(1, Math.max(0.02, ink / (cw * ch))),
    partsArea,
    maxPartW,
    maxPartH,
  };
}

/**
 * Which pixels are logo. A picture with real transparency says it itself;
 * an opaque one is read against its background — the colour round its edge.
 */
function foreground(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(w * h);
  let seeThrough = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) seeThrough++;

  if (seeThrough / (w * h) > ALPHA_MODE_SHARE) {
    for (let p = 0; p < w * h; p++) mask[p] = data[p * 4 + 3] >= 128 ? 1 : 0;
    return mask;
  }

  const bg = borderColour(data, w, h);
  const limit = BACKGROUND_DISTANCE * BACKGROUND_DISTANCE;
  for (let p = 0; p < w * h; p++) {
    const dr = data[p * 4] - bg[0];
    const dg = data[p * 4 + 1] - bg[1];
    const db = data[p * 4 + 2] - bg[2];
    mask[p] = dr * dr + dg * dg + db * db > limit ? 1 : 0;
  }
  return mask;
}

/** The median colour of the picture's edge — its background, even if the logo touches it. */
function borderColour(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  const take = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    r.push(data[i]);
    g.push(data[i + 1]);
    b.push(data[i + 2]);
  };
  for (let x = 0; x < w; x++) { take(x, 0); take(x, h - 1); }
  for (let y = 0; y < h; y++) { take(0, y); take(w - 1, y); }
  const median = (v: number[]) => v.sort((a, c) => a - c)[v.length >> 1];
  return [median(r), median(g), median(b)];
}

type Picture = { source: CanvasImageSource; width: number; height: number; release: () => void };

/**
 * The file as something a canvas can draw, at its own proportions. An SVG
 * is given an explicit size first: one without width and height has no
 * natural size in some browsers and would paint as nothing.
 */
async function loadPicture(file: File): Promise<Picture> {
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  let blob: Blob = file;

  if (isSvg) {
    const doc = new DOMParser().parseFromString(await file.text(), "image/svg+xml");
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== "svg") throw new LogoTraceError("Súbor SVG sa nedá prečítať.");
    const box = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
    let vw = box.length === 4 ? box[2] : parseFloat(svg.getAttribute("width") ?? "");
    let vh = box.length === 4 ? box[3] : parseFloat(svg.getAttribute("height") ?? "");
    if (!(vw > 0) || !(vh > 0)) { vw = TRACE_PX; vh = TRACE_PX; }
    if (box.length !== 4) svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    const k = TRACE_PX / Math.max(vw, vh);
    svg.setAttribute("width", String(Math.round(vw * k)));
    svg.setAttribute("height", String(Math.round(vh * k)));
    blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
  }

  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new LogoTraceError("Súbor sa nepodarilo otvoriť ako obrázok."));
      img.src = url;
    });
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
  if (!img.naturalWidth || !img.naturalHeight) {
    URL.revokeObjectURL(url);
    throw new LogoTraceError("Obrázok nemá žiadny rozmer.");
  }
  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

type TracedSegment = { type: "L" | "Q"; x1: number; y1: number; x2: number; y2: number; x3?: number; y3?: number };
