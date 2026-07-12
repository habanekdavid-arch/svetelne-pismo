#!/usr/bin/env node
/**
 * Stiahni CC0 PBR assety z Poly Haven pre LetterScene.
 * Idempotentný — ak súbor existuje a je väčší ako 0 B, preskočí.
 *
 * Spustenie: node scripts/fetch-assets.mjs
 */

import { createWriteStream, existsSync, mkdirSync, statSync, readdirSync } from "fs";
import { pipeline } from "stream/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC    = join(__dirname, "..", "public");

// ── Asset list ─────────────────────────────────────────────────────────────────
// Kategória "plastic" na Poly Haven vracia prázdnu odpoveď → náhrada:
//   • 3D tlač: ribbed_corduroy (horizontálne ryhy, CC0) — simuluje FDM layer lines
//     pri tiling-u ×8; normal scale sa ladí v LetterScene.tsx (THREED_NORMAL_SCALE).
//   • PVC: čisté PBR hodnoty (roughness 0.62), textúra nie je nutná.
//
// Alubond: metal_plate (brúsený kovový plát, CC0) — 4 mapy (diff/rough/nor/metal).

const ASSETS = [
  // ── HDRI ─────────────────────────────────────────────────────────────────────
  {
    label: "HDRI       studio_small_09  2K .hdr",
    url:   "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/studio_small_09_2k.hdr",
    dest:  "hdri/studio.hdr",
    note:  "neutral studio, jemné vrchné osvetlenie",
  },

  // ── Alubond (metal_plate) ─────────────────────────────────────────────────────
  {
    label: "Alubond    color       (metal_plate 2K jpg)",
    url:   "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/metal_plate/metal_plate_diff_2k.jpg",
    dest:  "textures/alubond/color.jpg",
  },
  {
    label: "Alubond    roughness   (metal_plate 2K jpg)",
    url:   "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/metal_plate/metal_plate_rough_2k.jpg",
    dest:  "textures/alubond/roughness.jpg",
  },
  {
    label: "Alubond    normal (GL) (metal_plate 2K jpg)",
    url:   "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/metal_plate/metal_plate_nor_gl_2k.jpg",
    dest:  "textures/alubond/normal.jpg",
  },
  {
    label: "Alubond    metalness   (metal_plate 2K jpg)",
    url:   "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/metal_plate/metal_plate_metal_2k.jpg",
    dest:  "textures/alubond/metalness.jpg",
  },

  // ── 3D tlač (ribbed_corduroy) ─────────────────────────────────────────────────
  {
    label: "3D tlač    color       (ribbed_corduroy 2K jpg)",
    url:   "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/ribbed_corduroy/ribbed_corduroy_diff_2k.jpg",
    dest:  "textures/3dtlac/color.jpg",
  },
  {
    label: "3D tlač    roughness   (ribbed_corduroy 2K jpg)",
    url:   "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/ribbed_corduroy/ribbed_corduroy_rough_2k.jpg",
    dest:  "textures/3dtlac/roughness.jpg",
  },
  {
    label: "3D tlač    normal (GL) (ribbed_corduroy 2K jpg)",
    url:   "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/ribbed_corduroy/ribbed_corduroy_nor_gl_2k.jpg",
    dest:  "textures/3dtlac/normal.jpg",
  },
];

// ── Core download ──────────────────────────────────────────────────────────────
async function fetchAsset({ url, dest }) {
  const full = join(PUBLIC, dest);
  mkdirSync(dirname(full), { recursive: true });

  if (existsSync(full)) {
    const sz = statSync(full).size;
    if (sz > 0) return { status: "skip", mb: (sz / 1048576).toFixed(1) };
    // zero-byte: remove and re-download
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "rozsvietto-fetch-assets/1.0 (github.com/rozsvietto)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const ws = createWriteStream(full);
  await pipeline(res.body, ws);

  const sz = statSync(full).size;
  if (sz === 0) throw new Error("Stiahnutý súbor je prázdny (0 B)");
  return { status: "ok", mb: (sz / 1048576).toFixed(1) };
}

// ── Run ────────────────────────────────────────────────────────────────────────
console.log("\n🎨  fetch-assets — Poly Haven CC0\n");

const W = 50; // label column width
let ok = 0, skipped = 0, failed = 0;

for (const asset of ASSETS) {
  process.stdout.write(`  ${asset.label.padEnd(W)} … `);
  try {
    const { status, mb } = await fetchAsset(asset);
    if (status === "skip") { console.log(`SKIP  (${mb} MB, existuje)`); skipped++; }
    else                   { console.log(`OK    (${mb} MB)`);           ok++;      }
  } catch (err) {
    console.log(`FAIL  ${err.message}`);
    failed++;
  }
}

console.log(`\n  Stiahnuté: ${ok}  Preskočené: ${skipped}  Chyby: ${failed}`);
if (failed) console.log("  ⚠  Niektoré súbory sa nepodarilo stiahnuť — skontroluj sieť.");

// ── Directory tree ─────────────────────────────────────────────────────────────
function tree(dir, indent = "  ") {
  if (!existsSync(dir)) { console.log(`${indent}(prázdne)`); return; }
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st   = statSync(full);
    if (st.isDirectory()) {
      console.log(`${indent}📁 ${name}/`);
      tree(full, indent + "   ");
    } else {
      console.log(`${indent}📄 ${name}  (${(st.size / 1048576).toFixed(1)} MB)`);
    }
  }
}

console.log("\n📂 /public/hdri/");
tree(join(PUBLIC, "hdri"));
console.log("📂 /public/textures/");
tree(join(PUBLIC, "textures"));
console.log();
