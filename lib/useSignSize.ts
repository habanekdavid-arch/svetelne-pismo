"use client";

import { useEffect, useState } from "react";

// Measured big, then scaled down: the ratio is what matters, and rounding
// error in it shrinks the larger the measuring size.
const MEASURE_PX = 240;

// Cap height is measured from a letter that has no ascender, no descender and
// no diacritic — the height a sign maker means by "600 mm letters".
const CAP_SAMPLE = "H";

/** Resolution the ink coverage is counted at — enough to be stable, cheap to draw. */
const COVERAGE_PX = 256;

export type SignSize = {
  /** Overall width of the whole inscription, in millimetres. */
  widthMm: number;
  /** Overall height, ascenders and diacritics included, in millimetres. */
  heightMm: number;
  /**
   * How much of that box the letters actually fill, 0–1. A quote for solid
   * 3D print is by volume of printed material, and material follows the
   * letterform, not the rectangle around it.
   */
  inkRatio: number;
};

type Shape = { w: number; h: number; ink: number };

/**
 * How big the finished sign actually is.
 *
 * The customer sets the height of the LETTERS; what goes on the wall is the
 * whole inscription, which is as wide as its text and can be taller than its
 * letters — "Kaviareň" needs room above the caps for the ň. That full size is
 * what has to fit the façade, and what the price list bills by the square
 * metre, so it is measured rather than guessed.
 *
 * Measured with the same TTF the preview extrudes, through the @font-face
 * families registered in globals.css (fontOptions[].name doubles as the
 * family name), so one text is never measured in a fallback face.
 */
export function useSignSize(
  text: string,
  fontFamily: string,
  letterHeightMm: number,
): SignSize | null {
  // The inscription's shape, in cap heights — independent of how big it is
  // ordered, so changing the height alone never re-measures.
  const [shape, setShape] = useState<Shape | null>(null);

  // Measuring is asynchronous by nature: the webfont has to be loaded before a
  // canvas can measure it, and until it is there is nothing to derive a size
  // from. This is an external read settling into state, not state that could
  // have been computed during render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    const sample = text.trim();
    if (!sample || !fontFamily) {
      setShape(null);
      return;
    }

    async function measure() {
      try {
        const face = `${MEASURE_PX}px "${fontFamily}"`;
        if (document.fonts?.load) await document.fonts.load(face, sample + CAP_SAMPLE);

        const ctx = document.createElement("canvas").getContext("2d");
        if (!ctx || cancelled) return;
        ctx.font = face;

        const ink = ctx.measureText(sample);
        const cap = ctx.measureText(CAP_SAMPLE).actualBoundingBoxAscent;
        const width  = ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight;
        const height = ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent;
        if (cancelled || !(cap > 0) || !(width > 0) || !(height > 0)) return;

        setShape({ w: width / cap, h: height / cap, ink: coverage(sample, fontFamily, width, height) });
      } catch {
        // A size readout is a nicety — never let it take the configurator down.
      }
    }

    measure();
    return () => { cancelled = true; };
  }, [text, fontFamily]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!shape) return null;
  return {
    widthMm:  shape.w * letterHeightMm,
    heightMm: shape.h * letterHeightMm,
    inkRatio: shape.ink,
  };
}

/**
 * Share of the text's own box that is actually ink: the text is drawn into a
 * small canvas and the opaque pixels are counted. Cheap, exact enough to price
 * printed material by, and it costs nothing to keep alongside the measurement
 * that already had to happen.
 */
function coverage(text: string, fontFamily: string, inkW: number, inkH: number): number {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = COVERAGE_PX;
    canvas.height = Math.max(8, Math.round((COVERAGE_PX * inkH) / inkW));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return 0.42;

    // Scale the measuring size so the inscription fills the canvas width.
    const size = (MEASURE_PX * COVERAGE_PX) / inkW;
    ctx.font = `${size}px "${fontFamily}"`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 24) painted++;
    const ratio = painted / (canvas.width * canvas.height);
    return ratio > 0.02 && ratio < 1 ? ratio : 0.42;
  } catch {
    return 0.42;
  }
}

/** "1 520 × 410 mm" — millimetres, which is how a sign gets ordered. */
export function formatSignSize(size: SignSize): string {
  const round = (v: number) => Math.max(1, Math.round(v));
  return `${round(size.widthMm)} × ${round(size.heightMm)} mm`;
}

/** "0,62 m²" — the area the price list bills by. */
export function formatArea(m2: number): string {
  return `${m2.toFixed(2).replace(".", ",")} m²`;
}
