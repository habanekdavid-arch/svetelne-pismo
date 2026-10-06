"use client";

import type { Config } from "@/lib/types";

// A picture of the sign as the customer configured it — the 3D preview,
// photographed the moment the sign goes into the cart, with the 4from media
// logo across it as a watermark. It travels with the order: the customer gets
// it in the confirmation e-mail, the shop sees it in the admin.
//
// The configurator registers how to photograph its preview (and which sign it
// is showing); the cart asks for a picture by sign. Pictures are kept for the
// browser session, keyed by the sign's settings, so a line added earlier
// still has its own picture when the order is finally sent.

type Snapshotter = { config: Config; canvas: () => HTMLCanvasElement | null };

let current: Snapshotter | null = null;
const STORE_KEY = "rozsvietto-previews";
const memory = new Map<string, string>();

/** Long side of the stored picture, in pixels. */
const MAX_SIDE = 1200;
const WATERMARK_SRC = "/4from-media.png";

function keyOf(config: Config): string {
  return JSON.stringify(config);
}

function load(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/** Called by the configurator whenever the sign it shows changes. */
export function registerSnapshotter(s: Snapshotter | null): void {
  current = s;
}

/** The picture kept for this sign, if one was taken. */
export function previewFor(config: Config): string | null {
  const k = keyOf(config);
  return memory.get(k) ?? load()[k] ?? null;
}

function remember(config: Config, dataUrl: string): void {
  const k = keyOf(config);
  memory.set(k, dataUrl);
  try {
    const all = load();
    all[k] = dataUrl;
    // Keep the newest few — session storage is small.
    const keys = Object.keys(all);
    for (const old of keys.slice(0, Math.max(0, keys.length - 12))) delete all[old];
    sessionStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    // Storage full or blocked — the picture still lives in memory.
  }
}

let logo: Promise<HTMLCanvasElement | null> | null = null;

/** The 4from media logo with its white background turned transparent. */
function watermarkLogo(): Promise<HTMLCanvasElement | null> {
  if (!logo) {
    logo = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          // Dark ink stays, white paper goes: alpha from how dark the pixel is.
          const lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
          px[i] = px[i + 1] = px[i + 2] = 255;
          px[i + 3] = Math.round((1 - lum) * 255);
        }
        ctx.putImageData(data, 0, 0);
        resolve(c);
      };
      img.onerror = () => resolve(null);
      img.src = WATERMARK_SRC;
    });
  }
  return logo;
}

async function watermark(source: HTMLCanvasElement): Promise<string | null> {
  const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  if (!w || !h) return null;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  // The 3D canvas is transparent where nothing is drawn — give it a backdrop.
  ctx.fillStyle = "#e9e8e4";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);

  const mark = await watermarkLogo();
  if (mark) {
    // A diagonal grid of big logos, white with a dark edge so it reads on a
    // light wall and on a night scene alike — strong enough that the picture
    // cannot pass for a finished design without us.
    const lw = Math.round(w * 0.36);
    const lh = Math.round((lw * mark.height) / mark.width);
    // The same logo in dark ink, drawn just behind the white one as its edge.
    const ink = document.createElement("canvas");
    ink.width = mark.width;
    ink.height = mark.height;
    const ictx = ink.getContext("2d");
    if (ictx) {
      ictx.drawImage(mark, 0, 0);
      ictx.globalCompositeOperation = "source-in";
      ictx.fillStyle = "#000";
      ictx.fillRect(0, 0, ink.width, ink.height);
    }
    const edge = Math.max(1.5, w / 600);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 9);
    const stepX = lw * 1.3;
    const stepY = lh * 1.9;
    const reach = Math.hypot(w, h);
    let row = 0;
    for (let y = -reach / 2; y < reach / 2; y += stepY, row++) {
      const shift = row % 2 ? stepX / 2 : 0;
      for (let x = -reach / 2 - shift; x < reach / 2; x += stepX) {
        ctx.globalAlpha = 0.5;
        for (const [dx, dy] of [[-edge, 0], [edge, 0], [0, -edge], [0, edge]]) {
          ctx.drawImage(ink, x + dx, y + dy, lw, lh);
        }
        ctx.globalAlpha = 0.72;
        ctx.drawImage(mark, x, y, lw, lh);
      }
    }
    ctx.restore();
  }
  try {
    return out.toDataURL("image/jpeg", 0.82);
  } catch {
    return null; // a tainted canvas (should not happen with our own files)
  }
}

/**
 * Photographs the configurator's preview of this sign and keeps the picture.
 * Only works while the configurator shows exactly this sign; otherwise it
 * returns what was kept earlier, or null.
 */
export async function capturePreview(config: Config): Promise<string | null> {
  const kept = previewFor(config);
  if (!current || keyOf(current.config) !== keyOf(config)) return kept;
  const canvas = current.canvas();
  if (!canvas) return kept;
  const url = await watermark(canvas);
  if (url) remember(config, url);
  return url ?? kept;
}

/**
 * Photographs whatever the configurator shows right now, without keeping it —
 * for a logo, which is never a cart line and so has no settings to key it by.
 */
export async function snapshotPreview(): Promise<string | null> {
  const canvas = current?.canvas();
  return canvas ? watermark(canvas) : null;
}
