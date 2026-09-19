#!/usr/bin/env node
// scripts/fetch-catalog-fonts.mjs
//
// Downloads the exact font WEIGHTS the price list names (e-shop_rozsvietto
// cennik → sheet "parametre"): Montserrat SemiBold/Bold/ExtraBold, Oswald
// Regular/SemiBold/Bold, Baloo2 SemiBold/ExtraBold, Poppins SemiBold/ExtraBold,
// Archivo Black, Pacifico.
//
// Why not scripts/fetch-fonts.mjs: that one pulls one file per family straight
// out of the google/fonts repo, and most families there now ship only a
// VARIABLE ttf. A variable font renders at its default weight, so Montserrat
// SemiBold and Montserrat ExtraBold would come out identical — and the
// configurator quotes by weight. The Google Fonts CSS API still serves static,
// single-weight TTFs to old user agents, which is what this asks it for.
//
// Archivo Black and Pacifico are single-weight families already in
// /public/fonts from scripts/fetch-fonts.mjs, so they are not re-fetched here.
//
// Idempotent: existing files are kept unless --force is passed.
//
// Usage: node scripts/fetch-catalog-fonts.mjs [--force]

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "..", "public", "fonts");
const FORCE = process.argv.includes("--force");

// An Android 2.3 browser: the last user agent Google Fonts still answers with
// plain TrueType instead of woff2 (modern UA) or EOT (IE6).
const TTF_UA =
  "Mozilla/5.0 (Linux; U; Android 2.3.3; en-us; Nexus S Build/GRI20) AppleWebKit/533.1";

const SK_CHARS = [
  "á", "ä", "é", "í", "ó", "ô", "ú", "ý",
  "č", "ď", "ľ", "ĺ", "ň", "ŕ", "š", "ť", "ž",
  "Á", "Ä", "É", "Í", "Ó", "Ô", "Ú", "Ý",
  "Č", "Ď", "Ľ", "Ĺ", "Ň", "Ŕ", "Š", "Ť", "Ž",
];

// id → what the price list calls it, and the Google family + weight to fetch.
const FONTS = [
  { id: "montserrat-semibold",   family: "Montserrat",    weight: 600, label: "Montserrat SemiBold" },
  { id: "montserrat-bold",       family: "Montserrat",    weight: 700, label: "Montserrat Bold" },
  { id: "montserrat-extrabold",  family: "Montserrat",    weight: 800, label: "Montserrat ExtraBold" },
  { id: "oswald-regular",        family: "Oswald",        weight: 400, label: "Oswald Regular" },
  { id: "oswald-semibold",       family: "Oswald",        weight: 600, label: "Oswald SemiBold" },
  { id: "oswald-bold",           family: "Oswald",        weight: 700, label: "Oswald Bold" },
  { id: "baloo2-semibold",       family: "Baloo 2",       weight: 600, label: "Baloo2 SemiBold" },
  { id: "baloo2-extrabold",      family: "Baloo 2",       weight: 800, label: "Baloo2 ExtraBold" },
  { id: "poppins-semibold",      family: "Poppins",       weight: 600, label: "Poppins SemiBold" },
  { id: "poppins-extrabold",     family: "Poppins",       weight: 800, label: "Poppins ExtraBold" },
];

async function ttfUrlFor(family, weight) {
  const api = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
  const res = await fetch(api, { headers: { "User-Agent": TTF_UA } });
  if (!res.ok) throw new Error(`css2 HTTP ${res.status} for ${family} ${weight}`);
  const css = await res.text();
  const match = /url\((https:[^)]+\.ttf)\)/.exec(css);
  if (!match) throw new Error(`no ttf in css for ${family} ${weight}`);
  return match[1];
}

function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function checkDiacritics(buffer) {
  let font;
  try {
    font = opentype.parse(toArrayBuffer(buffer));
  } catch (e) {
    return { ok: false, missing: SK_CHARS, error: e.message };
  }
  const missing = SK_CHARS.filter((ch) => {
    const glyph = font.charToGlyph(ch);
    return !glyph || glyph.index === 0;
  });
  return { ok: missing.length === 0, missing };
}

await mkdir(FONTS_DIR, { recursive: true });

let failed = 0;
for (const f of FONTS) {
  const out = path.join(FONTS_DIR, `${f.id}.ttf`);
  if (existsSync(out) && !FORCE) {
    console.log(`· ${f.id}.ttf — already there`);
    continue;
  }
  try {
    const url = await ttfUrlFor(f.family, f.weight);
    const res = await fetch(url, { headers: { "User-Agent": TTF_UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const check = checkDiacritics(buf);
    if (!check.ok) {
      failed++;
      console.error(`✗ ${f.id} (${f.label}) — missing Slovak glyphs: ${check.missing.join(" ")}`);
      continue;
    }
    await writeFile(out, buf);
    console.log(`✓ ${f.id}.ttf — ${f.label} (${(buf.length / 1024).toFixed(0)} kB)`);
  } catch (e) {
    failed++;
    console.error(`✗ ${f.id} (${f.label}) — ${e.message}`);
  }
}

// Fonts the price list names that are commercial and cannot be fetched from
// Google Fonts. They stay out of the configurator until the licensed files
// are dropped into /public/fonts under these ids.
console.log(
  "\nNot fetchable (licensed, need the real files):\n" +
    "  arial-black.ttf, gotham-medium.ttf, gotham-bold.ttf, gotham-ultra.ttf,\n" +
    "  comic-helvetic-medium.ttf, comic-helvetic-heavybold.ttf, momo-signature.ttf",
);

process.exit(failed > 0 ? 1 : 0);
