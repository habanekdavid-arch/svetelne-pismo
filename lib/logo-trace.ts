"use client";

import { isPdfLike, logoBoxOutline, type LogoContour, type LogoOutline, type LogoPart, type LogoSegment } from "@/lib/logo";

// The customer's logo file, turned into outlines a sign can be made from.
//
// Whatever the file is — an SVG, a PNG with transparency, a JPG on a white
// background — it is painted into a canvas first, and the logo is read off the
// pixels: what is see-through is not logo, everything else is — white
// included, because in a PNG, SVG or PDF white is a colour somebody chose.
// The one exception is a JPG: it cannot be see-through, so the white round a
// logo saved as JPG is the paper it sits on, and that disappears. The silhouette is then traced into lines
// and curves (imagetracerjs), one part per separate piece, holes included.
//
// A sign has one silhouette, so a logo in several colours becomes one shape.
// Its colours are not lost, though: the logo itself, cropped to exactly the
// box the outlines were traced in, comes back as a picture for the FACE — a
// UV print of the design on the front of the sign (LetterScene maps it onto
// the front caps, whose coordinates are the outline's own).

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
/** The face picture: never wider than this… */
const FACE_MAX_PX = 4096;
/** …at least this on its long side… */
const FACE_MIN_LONG_PX = 2048;
/** …and, where the cap above allows, at least this on its short side. */
const FACE_MIN_SHORT_PX = 512;
/** Rings of colour pushed outward from the logo's edge into the background. */
const FACE_BLEED_PASSES = 6;
/** A background at least this light in every channel… */
const PAPER_WHITE_MIN = 215;
/** …and no more tinted than this is white paper, not a colour. */
const PAPER_WHITE_TINT = 24;

export class LogoTraceError extends Error {
  name = "LogoTraceError";
}

const NOT_A_LOGO =
  "Toto vyzerá skôr ako fotka než logo — má priveľa drobných častí. Nahrajte prosím logo ako SVG alebo PNG na čistom pozadí.";

/** One way of making the sign from the file: its outline and its face artwork. */
export type TracedVersion = {
  outline: LogoOutline;
  /** The artwork for the face, cropped to the outline's box — PNG. */
  face: Blob | null;
};

/**
 * What a file can be made as. At least one of the two is always there.
 *
 *   · `cut`  — the logo cut out on its own, its background left off: what a
 *     logo on white or on transparency is;
 *   · `box`  — a light box: the whole picture, background and all, as one
 *     rectangle with the artwork printed on its face. Offered when the
 *     background is a real colour — someone who sends their logo on red
 *     wants the red too.
 */
export type TracedLogo = {
  cut: TracedVersion | null;
  box: TracedVersion | null;
  /** A file no <img> can show (PDF) drawn as a picture — for the thumbnail. */
  rendered: Blob | null;
};

export async function traceLogo(file: File): Promise<TracedLogo> {
  // A PDF is drawn into a picture first, big enough for a sharp face print,
  // and from there on it is traced like any other picture.
  const source = isPdfLike(file.name) ? await renderPdf(file) : file;
  const img = await loadPicture(source, TRACE_PX);
  try {
    const traced = await traceLoaded(source, img);
    return { ...traced, rendered: source === file ? null : source };
  } finally {
    img.release();
  }
}

/** Long side, in pixels, a PDF's page is drawn at. */
const PDF_RENDER_PX = 4096;
/** pdf.js's (legacy) worker, copied into public/ — its version must match the package. */
const PDF_WORKER_SRC = "/pdfjs/pdf.worker-legacy-6.4.299.min.mjs";

/**
 * The first page of a PDF as a PNG — on transparency, so the empty page is
 * nothing and only what is drawn on it, white shapes included, is the logo.
 * A page filled with a colour (or with white) comes out as a light box.
 */
async function renderPdf(file: File): Promise<File> {
  // The "legacy" build: the modern one leans on JavaScript only the newest
  // browsers have (Map.getOrInsertComputed); this one carries polyfills.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let doc: Awaited<typeof task.promise>;
  try {
    doc = await task.promise;
  } catch {
    throw new LogoTraceError(
      /\.ai$/i.test(file.name)
        ? "Tento súbor AI sa nedá otvoriť — uložte ho prosím v Illustratori ako PDF alebo SVG."
        : "Súbor PDF sa nepodarilo otvoriť — nie je poškodený alebo zaheslovaný?",
    );
  }
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: PDF_RENDER_PX / Math.max(base.width, base.height) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    await page.render({ canvas, viewport, background: "rgba(0,0,0,0)" }).promise;
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) throw new LogoTraceError("PDF sa nepodarilo vykresliť.");
    return new File([png], file.name.replace(/\.(pdf|ai)$/i, "") + ".png", { type: "image/png" });
  } finally {
    void task.destroy();
  }
}

async function traceLoaded(file: File, img: Picture): Promise<Omit<TracedLogo, "rendered">> {
  const scale = TRACE_PX / Math.max(img.width, img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new LogoTraceError("Prehliadač nevie logo spracovať.");
  ctx.drawImage(img.source, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const background = detectBackground(data, w, h);

  // A background that is really there — any colour, and white too unless the
  // file is a JPG — makes a light box. The logo cut out on its own is still
  // offered beside it, unless it cannot be traced, which for a busy design on
  // a coloured ground is no reason to refuse the box.
  const coloured = !background.alpha && !(isJpeg(file) && isPaperWhite(background.colour));
  let cut: TracedVersion | null = null;
  try {
    cut = await traceCut(file, img, data, w, h, background);
  } catch (err) {
    if (!coloured) throw err;
  }
  const box = coloured
    ? {
        outline: logoBoxOutline(img.width / img.height),
        face: await facePicture(file, img, { x0: 0, y0: 0, x1: 1, y1: 1 }, null).catch(() => null),
      }
    : null;
  return { cut, box };
}

/** The logo alone, traced off its background. */
async function traceCut(
  file: File,
  img: Picture,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  background: Background,
): Promise<TracedVersion> {
  const mask = foreground(data, w, h, background);

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

  const outline: LogoOutline = {
    parts,
    aspect: cw / ch,
    inkRatio: Math.min(1, Math.max(0.02, ink / (cw * ch))),
    partsArea,
    maxPartW,
    maxPartH,
  };

  // The box the outlines span, as a share of the picture — the face is cut
  // to exactly this, so it lands on the letters and nowhere else.
  const box = { x0: minX / w, y0: minY / h, x1: (maxX + 1) / w, y1: (maxY + 1) / h };
  const face = await facePicture(file, img, box, background).catch(() => null);
  return { outline, face };
}

/**
 * The logo's artwork at print resolution, cropped to the outlines' box.
 *
 * Where the picture is background — round the edge of the logo, inside its
 * holes — the logo's own colours are pushed outward a few pixels and the rest
 * filled with its average colour. The face only ever shows what lies inside
 * the outline, but a texture is sampled between pixels, and a white
 * background bleeding in would draw a pale rim round every piece.
 */
async function facePicture(
  file: File,
  img: Picture,
  box: { x0: number; y0: number; x1: number; y1: number },
  /** What is background, to bleed the logo's colours into — null for a light box, which is all face. */
  background: Background | null,
): Promise<Blob | null> {
  const bw = box.x1 - box.x0;
  const bh = box.y1 - box.y0;
  const aspect = (bw * img.width) / (bh * img.height);
  let fw: number;
  let fh: number;
  if (aspect >= 1) {
    fw = Math.min(FACE_MAX_PX, Math.max(FACE_MIN_LONG_PX, FACE_MIN_SHORT_PX * aspect));
    fh = fw / aspect;
  } else {
    fh = Math.min(FACE_MAX_PX, Math.max(FACE_MIN_LONG_PX, FACE_MIN_SHORT_PX / aspect));
    fw = fh * aspect;
  }
  fw = Math.max(1, Math.round(fw));
  fh = Math.max(1, Math.round(fh));

  // An SVG is drawn again at the size the crop needs, so the print is sharp;
  // a bitmap is cut from its own pixels.
  let source = img;
  let fresh: Picture | null = null;
  if (img.vector) {
    const fullW = fw / bw;
    const fullH = fh / bh;
    fresh = await loadPicture(file, Math.min(8192, Math.round(Math.max(fullW, fullH))));
    source = fresh;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = fw;
    canvas.height = fh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(
      source.source,
      box.x0 * source.width, box.y0 * source.height, bw * source.width, bh * source.height,
      0, 0, fw, fh,
    );
    if (background) {
      const image = ctx.getImageData(0, 0, fw, fh);
      bleed(image.data, fw, fh, foreground(image.data, fw, fh, background));
      ctx.putImageData(image, 0, 0);
    }
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    fresh?.release();
  }
}

/** Logo colours pushed into the background round them; everything opaque. */
function bleed(data: Uint8ClampedArray, w: number, h: number, mask: Uint8Array): void {
  const filled = mask.slice();
  let r = 0, g = 0, b = 0, n = 0;
  for (let p = 0; p < w * h; p++) {
    if (!filled[p]) continue;
    r += data[p * 4]; g += data[p * 4 + 1]; b += data[p * 4 + 2]; n++;
    data[p * 4 + 3] = 255;
  }
  for (let pass = 0; pass < FACE_BLEED_PASSES; pass++) {
    const next = filled.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (filled[p]) continue;
        let sr = 0, sg = 0, sb = 0, k = 0;
        for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
          if (q < 0 || !filled[q]) continue;
          sr += data[q * 4]; sg += data[q * 4 + 1]; sb += data[q * 4 + 2]; k++;
        }
        if (!k) continue;
        data[p * 4] = sr / k; data[p * 4 + 1] = sg / k; data[p * 4 + 2] = sb / k; data[p * 4 + 3] = 255;
        next[p] = 1;
      }
    }
    filled.set(next);
  }
  const avg = n ? [r / n, g / n, b / n] : [255, 255, 255];
  for (let p = 0; p < w * h; p++) {
    if (filled[p]) continue;
    data[p * 4] = avg[0]; data[p * 4 + 1] = avg[1]; data[p * 4 + 2] = avg[2]; data[p * 4 + 3] = 255;
  }
}

/** How the background is told apart: by transparency, or by its colour. */
type Background = { alpha: true } | { alpha: false; colour: [number, number, number] };

/**
 * A picture with real transparency says itself what is background; an opaque
 * one is read against the colour round its edge. Decided once, on the whole
 * picture — a crop of it has the logo at its edge, not the background.
 */
function detectBackground(data: Uint8ClampedArray, w: number, h: number): Background {
  let seeThrough = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) seeThrough++;
  return seeThrough / (w * h) > ALPHA_MODE_SHARE
    ? { alpha: true }
    : { alpha: false, colour: borderColour(data, w, h) };
}

/** Which pixels are logo. */
function foreground(data: Uint8ClampedArray, w: number, h: number, background: Background): Uint8Array {
  const mask = new Uint8Array(w * h);
  if (background.alpha) {
    for (let p = 0; p < w * h; p++) mask[p] = data[p * 4 + 3] >= 128 ? 1 : 0;
    return mask;
  }

  const bg = background.colour;
  const limit = BACKGROUND_DISTANCE * BACKGROUND_DISTANCE;
  for (let p = 0; p < w * h; p++) {
    const dr = data[p * 4] - bg[0];
    const dg = data[p * 4 + 1] - bg[1];
    const db = data[p * 4 + 2] - bg[2];
    mask[p] = dr * dr + dg * dg + db * db > limit ? 1 : 0;
  }
  return mask;
}

/** A JPG — the one format that cannot say "nothing here" except by being white. */
function isJpeg(file: File): boolean {
  return file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
}

/**
 * White paper, or close to it — a scan's off-white, a JPEG's slightly grey
 * white. Round a JPG logo that is a logo on nothing; anything else is a
 * colour the customer put there.
 */
function isPaperWhite([r, g, b]: [number, number, number]): boolean {
  return Math.min(r, g, b) >= PAPER_WHITE_MIN && Math.max(r, g, b) - Math.min(r, g, b) <= PAPER_WHITE_TINT;
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

type Picture = {
  source: CanvasImageSource;
  width: number;
  height: number;
  /** An SVG — it can be drawn again at any size. */
  vector: boolean;
  release: () => void;
};

/**
 * The file as something a canvas can draw, at its own proportions. An SVG
 * is given an explicit size first: one without width and height has no
 * natural size in some browsers and would paint as nothing.
 */
async function loadPicture(file: File, longSide: number): Promise<Picture> {
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  let blob: Blob = file;

  if (isSvg) {
    const doc = new DOMParser().parseFromString(await file.text(), "image/svg+xml");
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== "svg") throw new LogoTraceError("Súbor SVG sa nedá prečítať.");
    const box = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
    let vw = box.length === 4 ? box[2] : parseFloat(svg.getAttribute("width") ?? "");
    let vh = box.length === 4 ? box[3] : parseFloat(svg.getAttribute("height") ?? "");
    if (!(vw > 0) || !(vh > 0)) { vw = longSide; vh = longSide; }
    if (box.length !== 4) svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    // Stretched to the box exactly, so a crop worked out on one size fits another.
    svg.setAttribute("preserveAspectRatio", "none");
    const k = longSide / Math.max(vw, vh);
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
    vector: isSvg,
    release: () => URL.revokeObjectURL(url),
  };
}

type TracedSegment = { type: "L" | "Q"; x1: number; y1: number; x2: number; y2: number; x3?: number; y3?: number };
