import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { WallGrain } from "@/lib/walls";

// The wall behind the sign, painted rather than photographed.
//
// One tile is drawn into a canvas and repeated across the backdrop, so the
// grain keeps a real-world scale (TILE_UNITS below) instead of being stretched
// over the whole plane — a brick stays a brick whether the nápis is one letter
// or twenty. Painting it beats shipping texture files: four surfaces cost no
// download at all, and each is deterministic, so two visitors see the same wall.

/**
 * World units one tile covers. Together with BRICK_ROWS_PER_TILE this is what
 * fixes the real-world scale of the whole preview: one brick course is
 * TILE_UNITS / BRICK_ROWS_PER_TILE units, and that course is 70 mm
 * (components/three/scale.ts) — so the letters, their depth and the wall are
 * all measured in the same millimetres.
 */
export const TILE_UNITS = 2;
/** Brick courses in one tile — see TILE_UNITS. */
export const BRICK_ROWS_PER_TILE = 14;
const TILE_PX = 640;

// Deterministic noise — the same wall every time the preview is opened, and no
// dependence on Math.random ordering between renders.
function makeRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// Big features have to be drawn again at every wrapped position, otherwise the
// tile's edge cuts them and the repeat shows up as a grid across the wall —
// which is exactly what concrete's blotches did before this.
function wrapped(draw: (dx: number, dy: number) => void) {
  for (const dx of [-TILE_PX, 0, TILE_PX]) {
    for (const dy of [-TILE_PX, 0, TILE_PX]) {
      draw(dx, dy);
    }
  }
}

/** Soft tonal drift — what keeps a wall from reading as one flat fill. */
function clouds(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  count: number,
  minR: number,
  maxR: number,
  strength: number,
) {
  for (let i = 0; i < count; i++) {
    const x = rand() * TILE_PX;
    const y = rand() * TILE_PX;
    const r = minR + rand() * (maxR - minR);
    const dark = rand() < 0.55;
    const a = strength * (0.4 + rand() * 0.6);
    wrapped((dx, dy) => {
      const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0, dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    });
  }
}

function speckle(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  count: number,
  maxRadius: number,
  alpha: number,
) {
  for (let i = 0; i < count; i++) {
    const x = rand() * TILE_PX;
    const y = rand() * TILE_PX;
    const r = rand() * maxRadius + 0.4;
    const dark = rand() < 0.5;
    ctx.fillStyle = dark
      ? `rgba(0,0,0,${alpha * rand()})`
      : `rgba(255,255,255,${alpha * rand()})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Grains with a side to them: a dark dot with a lighter one pushed up-left, the
 * way a lit granule casts its own shadow. It is the cheapest thing that makes a
 * rendered surface read as rough rather than as noisy paint — and because the
 * same image drives the bump map, the relief follows the same grains.
 */
function granules(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  count: number,
  maxRadius: number,
  alpha: number,
) {
  for (let i = 0; i < count; i++) {
    const x = rand() * TILE_PX;
    const y = rand() * TILE_PX;
    const r = 0.6 + rand() * maxRadius;
    const a = alpha * (0.35 + rand() * 0.65);
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${a * 0.9})`;
    ctx.beginPath();
    ctx.arc(x - r * 0.55, y - r * 0.55, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintBrick(ctx: CanvasRenderingContext2D, rand: () => number) {
  // Courses of 7 cm — a 6.5 cm brick plus its joint — in a running bond, at
  // TILE_UNITS scale, so the bond lines up across repeats. This course height
  // is the ruler the whole preview is measured by (components/three/scale.ts).
  const rows = BRICK_ROWS_PER_TILE;
  const h = TILE_PX / rows;
  const perRow = 4;
  const w = TILE_PX / perRow;
  const joint = Math.max(2.5, h * 0.15);

  // Mortar first, with its own sandy grain — flat grey mortar is what made the
  // old wall look printed.
  ctx.fillStyle = "#cfc8bc";
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);
  speckle(ctx, rand, 5200, 1.3, 0.16);
  clouds(ctx, rand, 14, 40, 150, 0.05);

  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : -w / 2;
    for (let col = -1; col <= perRow; col++) {
      const x = col * w + offset + joint / 2;
      const y = row * h + joint / 2;
      const bw = w - joint;
      const bh = h - joint;

      // Fired clay is never one colour: each brick gets its own tone, and a
      // few come out noticeably darker, the way a real course does.
      const burnt = rand() < 0.16;
      const shade = (burnt ? 0.68 : 0.88) + rand() * 0.22;
      const warm = 0.94 + rand() * 0.14;
      const r = Math.min(255, Math.round(146 * shade * warm));
      const g = Math.round(86 * shade);
      const b = Math.round(72 * shade * (burnt ? 0.92 : 1));

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, bw, bh);
      ctx.clip();

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, bw, bh);

      // Clay grain and the pale lime bloom that settles on old brick.
      for (let i = 0; i < 90; i++) {
        const px = x + rand() * bw;
        const py = y + rand() * bh;
        const pr = rand() * 1.6 + 0.3;
        ctx.fillStyle = rand() < 0.5
          ? `rgba(0,0,0,${0.05 + rand() * 0.12})`
          : `rgba(255,240,225,${0.04 + rand() * 0.1})`;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lit top edge, shaded bottom edge: the joint sits deeper than the face.
      const top = ctx.createLinearGradient(x, y, x, y + bh);
      top.addColorStop(0, "rgba(255,255,255,0.07)");
      top.addColorStop(0.25, "rgba(255,255,255,0)");
      top.addColorStop(0.82, "rgba(0,0,0,0)");
      top.addColorStop(1, "rgba(0,0,0,0.12)");
      ctx.fillStyle = top;
      ctx.fillRect(x, y, bw, bh);

      // A worn edge here and there — a thin nibble at one corner, not the
      // broad triangles this used to cut across whole bricks.
      if (rand() < 0.3) {
        const nx = x + (rand() < 0.5 ? 0 : bw - 1);
        const ny = y + (rand() < 0.5 ? 0 : bh - 1);
        ctx.fillStyle = `rgba(206,198,184,${0.25 + rand() * 0.3})`;
        ctx.beginPath();
        ctx.arc(nx, ny, 1.5 + rand() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Weathering across the whole face — without it every course reads as the
  // same course, which is what gives a tiled wall away.
  clouds(ctx, rand, 18, 60, 200, 0.045);
}

function paintTile(grain: WallGrain): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TILE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const rand = makeRandom(grain.length * 9176 + 31);

  if (grain === "brick") {
    paintBrick(ctx, rand);
    return canvas;
  }

  const base =
    grain === "coarse" ? "#ece6dc" :
    grain === "mottled" ? "#e4e5e6" :
    "#f0eeea";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);

  if (grain === "mottled") {
    // Poured concrete: broad cloudy patches, faint pour lines, air holes. The
    // patches stay faint — a strong blotch at this size is the one thing that
    // makes a repeating tile look like a repeating tile.
    clouds(ctx, rand, 34, 30, 150, 0.05);
    clouds(ctx, rand, 10, 120, 260, 0.03);

    // Formwork seams: where two boards met, one side sits a shade deeper.
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const x = rand() * TILE_PX;
      ctx.strokeStyle = `rgba(0,0,0,${0.012 + rand() * 0.018})`;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (rand() - 0.5) * 10, TILE_PX);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.01 + rand() * 0.014})`;
      ctx.beginPath();
      ctx.moveTo(x + 1.5, 0);
      ctx.lineTo(x + 1.5 + (rand() - 0.5) * 10, TILE_PX);
      ctx.stroke();
    }

    // Air holes — the small dark pores every poured wall has, each with the
    // light rim of its own lip.
    for (let i = 0; i < 260; i++) {
      const x = rand() * TILE_PX;
      const y = rand() * TILE_PX;
      const r = 0.8 + rand() * 2.6;
      ctx.fillStyle = `rgba(0,0,0,${0.1 + rand() * 0.18})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.06 + rand() * 0.1})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.2, r * 1.05, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    speckle(ctx, rand, 2600, 1.1, 0.1);
    return canvas;
  }

  if (grain === "coarse") {
    // Render/stucco: granules big enough to catch the light, plus the arcs a
    // trowel leaves behind.
    clouds(ctx, rand, 20, 40, 160, 0.035);
    granules(ctx, rand, 5200, 2.4, 0.16);
    speckle(ctx, rand, 2600, 1.2, 0.08);
    ctx.lineWidth = 9;
    for (let i = 0; i < 14; i++) {
      const x = rand() * TILE_PX;
      const y = rand() * TILE_PX;
      const r = 70 + rand() * 160;
      const a = rand() * Math.PI * 2;
      const sweep = 0.6 + rand();
      ctx.strokeStyle = `rgba(255,255,255,${0.014 + rand() * 0.02})`;
      wrapped((dx, dy) => {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, a, a + sweep);
        ctx.stroke();
      });
    }
    return canvas;
  }

  // Fine interior plaster — barely there, just the drift of a hand-smoothed
  // surface and a dusting of grain, so it is not flat paint either.
  clouds(ctx, rand, 16, 60, 220, 0.025);
  granules(ctx, rand, 1800, 1.1, 0.07);
  speckle(ctx, rand, 3600, 0.9, 0.07);
  return canvas;
}

// One painted tile per surface, kept for the session: the 3D wall and every
// swatch in the picker draw from the same canvas, so a swatch shows exactly
// the wall it switches to and nothing is painted twice.
const tileCache = new Map<WallGrain, HTMLCanvasElement>();

function wallTile(grain: WallGrain): HTMLCanvasElement | null {
  const cached = tileCache.get(grain);
  if (cached) return cached;
  const painted = paintTile(grain);
  if (painted) tileCache.set(grain, painted);
  return painted;
}

// How much of a tile a swatch shows. Brick needs a couple of courses to read as
// brick; the rendered surfaces read better close up, where their grain is.
const THUMB_CROP: Record<WallGrain, number> = {
  brick: 0.62,
  coarse: 0.3,
  mottled: 0.38,
  fine: 0.3,
};

/** Paint a surface into a small canvas — the picker's swatch. */
export function drawWallThumbnail(target: HTMLCanvasElement, grain: WallGrain): void {
  const tile = wallTile(grain);
  const ctx = target.getContext("2d");
  if (!tile || !ctx) return;
  const crop = TILE_PX * THUMB_CROP[grain];
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tile, 0, 0, crop, crop, 0, 0, target.width, target.height);
}

/** The repeating surface texture, ready for both `map` and `bumpMap`. */
export function useWallTexture(grain: WallGrain, planeWidth: number, planeHeight: number) {
  const texture = useMemo(() => {
    const canvas = wallTile(grain);
    if (!canvas) return null;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(planeWidth / TILE_UNITS, planeHeight / TILE_UNITS);
    // The wall is seen at a slant and, for a big nápis, from far away — the
    // bricks get small and run away from the camera. Without anisotropic
    // filtering they shimmer into moiré exactly where the eye goes. 16 is the
    // ceiling every GPU clamps to on its own.
    t.anisotropy = 16;
    t.needsUpdate = true;
    return t;
  }, [grain, planeWidth, planeHeight]);

  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

/**
 * The customer's own photo of the wall. Loaded from an object URL created in
 * the browser — the file never leaves the page, and nothing about it is stored
 * with the order.
 */
/** Average colour of an image, for painting whatever lies beyond its edges. */
function averageColor(image: CanvasImageSource): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "#ffffff";
    ctx.drawImage(image, 0, 0, 8, 8);
    const { data } = ctx.getImageData(0, 0, 8, 8);
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const n = data.length / 4;
    const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  } catch {
    return "#ffffff"; // a tainted canvas is not worth failing the preview over
  }
}

export type PhotoBackdrop = {
  texture: THREE.Texture;
  /**
   * The photo's average colour. The wall behind the photo is painted with it,
   * so the sliver that appears past the photo's edge at the far end of the
   * orbit blends in instead of flashing as a pale strip.
   */
  tint: string;
};

export function usePhotoTexture(url: string | null) {
  // Kept as a (url, texture) pair rather than a bare texture: a stale photo
  // then cannot flash into the preview while the new one is still decoding,
  // and nothing has to be reset from inside the effect body to prevent it.
  const [loaded, setLoaded] = useState<{ url: string; backdrop: PhotoBackdrop } | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let texture: THREE.Texture | null = null;

    new THREE.TextureLoader().loadAsync(url).then(
      (t) => {
        if (cancelled) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        texture = t;
        setLoaded({ url, backdrop: { texture: t, tint: averageColor(t.image as CanvasImageSource) } });
      },
      () => {
        // A file the browser cannot decode — the painted wall stays.
      },
    );

    return () => {
      cancelled = true;
      texture?.dispose();
    };
  }, [url]);

  return url && loaded?.url === url ? loaded.backdrop : null;
}
