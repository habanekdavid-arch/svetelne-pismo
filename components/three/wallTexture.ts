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

/** World units one tile covers. The letters are ~0.78 units tall, ≈ 35 cm. */
export const TILE_UNITS = 2;
const TILE_PX = 512;

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

function paintTile(grain: WallGrain): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TILE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const rand = makeRandom(grain.length * 9176 + 31);

  if (grain === "brick") {
    // Courses of 25 × 6.5 cm bricks with a mortar joint — the real thing at
    // TILE_UNITS scale, so the bond lines up across repeats.
    const mortar = "#d8d2c8";
    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);

    const rows = 14;
    const h = TILE_PX / rows;
    const perRow = 4;
    const w = TILE_PX / perRow;
    const joint = Math.max(2, h * 0.14);

    for (let row = 0; row < rows; row++) {
      const offset = row % 2 === 0 ? 0 : -w / 2; // running bond
      for (let col = -1; col <= perRow; col++) {
        const x = col * w + offset;
        const y = row * h;
        const shade = 0.82 + rand() * 0.36;
        const r = Math.round(150 * shade);
        const g = Math.round(78 * shade);
        const bl = Math.round(60 * shade);
        ctx.fillStyle = `rgb(${r},${g},${bl})`;
        ctx.fillRect(x + joint / 2, y + joint / 2, w - joint, h - joint);
      }
    }
    // Pores and lime bloom over the whole face.
    speckle(ctx, rand, 2600, 1.6, 0.22);
    return canvas;
  }

  const base =
    grain === "coarse" ? "#efeae1" :
    grain === "mottled" ? "#e7e8e9" :
    "#f1efeb";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);

  if (grain === "mottled") {
    // Poured concrete: broad cloudy patches, faint pour lines, pores. The
    // patches are deliberately faint — a strong blotch at this size is the
    // one thing that makes a repeating tile look like a repeating tile.
    for (let i = 0; i < 30; i++) {
      const x = rand() * TILE_PX;
      const y = rand() * TILE_PX;
      const r = 30 + rand() * 110;
      const dark = rand() < 0.55;
      wrapped((dx, dy) => {
        const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        g.addColorStop(0, dark ? "rgba(0,0,0,0.028)" : "rgba(255,255,255,0.032)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      });
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const x = rand() * TILE_PX;
      ctx.strokeStyle = `rgba(0,0,0,${0.01 + rand() * 0.015})`;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (rand() - 0.5) * 8, TILE_PX);
      ctx.stroke();
    }
    speckle(ctx, rand, 1500, 1.1, 0.12);
    return canvas;
  }

  if (grain === "coarse") {
    // Render/stucco: granules big enough to catch the light, plus the arcs a
    // trowel leaves behind. The grain is what the bump map works on, so it
    // stays subtle in colour — at full strength it read as wet sand.
    speckle(ctx, rand, 6500, 2.2, 0.14);
    ctx.lineWidth = 8;
    for (let i = 0; i < 12; i++) {
      const x = rand() * TILE_PX;
      const y = rand() * TILE_PX;
      const r = 60 + rand() * 140;
      const a = rand() * Math.PI * 2;
      const sweep = 0.6 + rand();
      ctx.strokeStyle = `rgba(255,255,255,${0.015 + rand() * 0.02})`;
      wrapped((dx, dy) => {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, a, a + sweep);
        ctx.stroke();
      });
    }
    return canvas;
  }

  // Fine interior plaster — barely there, just enough to stop the wall reading
  // as flat paint.
  speckle(ctx, rand, 4200, 1.0, 0.1);
  return canvas;
}

/** The repeating surface texture, ready for both `map` and `bumpMap`. */
export function useWallTexture(grain: WallGrain, planeWidth: number, planeHeight: number) {
  const texture = useMemo(() => {
    const canvas = paintTile(grain);
    if (!canvas) return null;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(planeWidth / TILE_UNITS, planeHeight / TILE_UNITS);
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
