#!/usr/bin/env node
// scripts/fetch-fonts.mjs
//
// Downloads a curated set of Google Fonts (OFL / Apache licensed) TTFs into
// /public/fonts and verifies each one has full Slovak diacritic coverage
// (Latin Extended-A + the accented Latin-1 vowels). Fonts that fail the
// check are rejected (not written) and reported so a replacement can be
// picked.
//
// Idempotent: re-running skips files that already exist and re-verifies
// them in place. Pass --force to re-download everything.
//
// Usage: node scripts/fetch-fonts.mjs [--force]

import { writeFile, mkdir, readdir, stat, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "..", "public", "fonts");
const FORCE = process.argv.includes("--force");
const RAW_BASE = "https://raw.githubusercontent.com/google/fonts/main/";

// Slovak diacritics — lower + upper case. Latin Extended-A (č ď ľ ĺ ň ŕ š ť ž)
// plus the accented vowels shared with Latin-1 Supplement (á ä é í ó ô ú ý).
const SK_CHARS = [
  "á", "ä", "é", "í", "ó", "ô", "ú", "ý",
  "č", "ď", "ľ", "ĺ", "ň", "ŕ", "š", "ť", "ž",
  "Á", "Ä", "É", "Í", "Ó", "Ô", "Ú", "Ý",
  "Č", "Ď", "Ľ", "Ĺ", "Ň", "Ŕ", "Š", "Ť", "Ž",
];

// One TTF per family. `urls` are candidate paths in the google/fonts repo,
// tried in order — most of these families ship only a variable-font TTF
// (no static/ subfolder in the current repo snapshot); a couple still have
// classic per-weight static files at the family root.
const FONTS = [
  { id: "montserrat",       name: "Montserrat",       category: "sans",    urls: ["ofl/montserrat/Montserrat[wght].ttf"] },
  { id: "poppins",          name: "Poppins",          category: "sans",    urls: ["ofl/poppins/Poppins-Bold.ttf"] },
  { id: "inter",            name: "Inter",            category: "sans",    urls: ["ofl/inter/Inter[opsz,wght].ttf"] },
  { id: "playfair-display", name: "Playfair Display", category: "serif",   urls: ["ofl/playfairdisplay/PlayfairDisplay[wght].ttf"] },
  { id: "merriweather",     name: "Merriweather",     category: "serif",   urls: ["ofl/merriweather/Merriweather[opsz,wdth,wght].ttf"] },
  { id: "oswald",           name: "Oswald",           category: "display", urls: ["ofl/oswald/Oswald[wght].ttf"] },
  { id: "archivo-black",    name: "Archivo Black",    category: "display", urls: ["ofl/archivoblack/ArchivoBlack-Regular.ttf"] },
  { id: "pacifico",         name: "Pacifico",         category: "script",  urls: ["ofl/pacifico/Pacifico-Regular.ttf"] },
  { id: "dancing-script",   name: "Dancing Script",   category: "script",  urls: ["ofl/dancingscript/DancingScript[wght].ttf"] },
  { id: "caveat",           name: "Caveat",           category: "script",  urls: ["ofl/caveat/Caveat[wght].ttf"] },
  { id: "great-vibes",      name: "Great Vibes",      category: "script",  urls: ["ofl/greatvibes/GreatVibes-Regular.ttf"] },
  // Fredoka rejected — missing č ď ľ ĺ ň ŕ ť (+ uppercase). Baloo 2 replaces
  // it in the "rounded" slot; Comfortaa/Varela Round are further fallbacks
  // in case Baloo 2 ever fails the check too.
  {
    id: "baloo-2",
    name: "Baloo 2",
    category: "rounded",
    urls: [
      "ofl/baloo2/Baloo2[wght].ttf",
      "ofl/comfortaa/Comfortaa[wght].ttf",
      "ofl/varelaround/VarelaRound-Regular.ttf",
    ],
  },
  { id: "quicksand",        name: "Quicksand",        category: "rounded", urls: ["ofl/quicksand/Quicksand[wght].ttf"] },
  { id: "roboto-slab",      name: "Roboto Slab",      category: "slab",    urls: ["apache/robotoslab/RobotoSlab[wght].ttf"] },
];

async function downloadCandidate(relPath) {
  const url = RAW_BASE + relPath.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
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
  const missing = [];
  for (const ch of SK_CHARS) {
    let glyph;
    try {
      glyph = font.charToGlyph(ch);
    } catch {
      glyph = null;
    }
    // opentype.js returns the .notdef glyph (index 0) when a codepoint has no mapping
    if (!glyph || glyph.index === 0 || glyph.name === ".notdef") {
      missing.push(ch);
    }
  }
  return { ok: missing.length === 0, missing, familyName: font.getEnglishName?.("fontFamily") };
}

async function main() {
  await mkdir(FONTS_DIR, { recursive: true });
  const results = [];

  for (const font of FONTS) {
    const destPath = path.join(FONTS_DIR, `${font.id}.ttf`);
    const relLabel = `/public/fonts/${font.id}.ttf`;

    if (!FORCE && existsSync(destPath)) {
      const buf = await readFile(destPath);
      const check = checkDiacritics(buf);
      results.push({ ...font, status: "cached", check });
      console.log(
        `✓ cached     ${font.name.padEnd(18)} ${relLabel}  diacritics: ${
          check.ok ? "OK" : "MISSING " + check.missing.join(" ")
        }`,
      );
      continue;
    }

    let downloaded = null;
    let lastErr;
    for (const candidate of font.urls) {
      try {
        downloaded = await downloadCandidate(candidate);
        break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!downloaded) {
      results.push({ ...font, status: "failed", error: lastErr?.message });
      console.log(`✗ FAILED     ${font.name.padEnd(18)} — ${lastErr?.message}`);
      continue;
    }

    const check = checkDiacritics(downloaded);
    if (!check.ok) {
      results.push({ ...font, status: "no-diacritics", check });
      console.log(`✗ REJECTED   ${font.name.padEnd(18)} — missing diacritics: ${check.missing.join(" ")}`);
      continue; // do not write — needs a replacement font
    }

    await writeFile(destPath, downloaded);
    results.push({ ...font, status: "downloaded", check });
    console.log(`✓ downloaded ${font.name.padEnd(18)} ${relLabel}  (${(downloaded.length / 1024).toFixed(0)} KB)`);
  }

  console.log("\n── /public/fonts ──────────────────────────────────────");
  const files = (await readdir(FONTS_DIR)).sort();
  for (const f of files) {
    const s = await stat(path.join(FONTS_DIR, f));
    console.log(`  ${f.padEnd(40)} ${(s.size / 1024).toFixed(0)} KB`);
  }

  const rejected = results.filter((r) => r.status === "no-diacritics" || r.status === "failed");
  console.log("\n── Diacritic check summary ─────────────────────────────");
  if (rejected.length > 0) {
    console.log("Fonts needing a replacement:");
    for (const r of rejected) {
      console.log(`  - ${r.name} (${r.id}): ${r.status}${r.check?.missing ? " — missing: " + r.check.missing.join(" ") : ""}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`All ${results.length} fonts passed the Slovak diacritic check.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
