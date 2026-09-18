"use client";

import { useEffect, useState } from "react";

// Measured big, then scaled down: the ratio is what matters, and rounding
// error in it shrinks the larger the measuring size.
const MEASURE_PX = 240;

// Cap height is measured from a letter that has no ascender, no descender and
// no diacritic — the height a sign maker means by "10 cm letters".
const CAP_SAMPLE = "H";

export type SignSize = {
  /** Overall width of the whole inscription, in centimetres. */
  widthCm: number;
  /** Overall height, ascenders and diacritics included, in centimetres. */
  heightCm: number;
};

/**
 * How big the finished sign actually is.
 *
 * The customer sets the height of the LETTERS; what goes on the wall is the
 * whole inscription, which is as wide as its text and can be taller than its
 * letters — "Kaviareň" needs room above the caps for the ň and below the
 * baseline for nothing, "Gýč" needs both. That full size is what has to fit
 * the façade, so it is worth showing next to the price.
 *
 * Measured with the same TTF the preview extrudes, through the @font-face
 * families registered in globals.css (fontOptions[].name doubles as the
 * family name), so one text is never measured in a fallback face.
 */
export function useSignSize(
  text: string,
  fontFamily: string,
  letterHeightCm: number,
): SignSize | null {
  // Ink box of the text, expressed in cap heights — the shape of the
  // inscription, independent of how big it is ordered.
  const [ratio, setRatio] = useState<{ w: number; h: number } | null>(null);

  // Measuring is asynchronous by nature: the webfont has to be loaded before a
  // canvas can measure it, and until it is there is nothing to derive a size
  // from. This is an external read settling into state, not state that could
  // have been computed during render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    const sample = text.trim();
    if (!sample) {
      setRatio(null);
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
        setRatio({ w: width / cap, h: height / cap });
      } catch {
        // A size readout is a nicety — never let it take the configurator down.
      }
    }

    measure();
    return () => { cancelled = true; };
  }, [text, fontFamily]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!ratio) return null;
  return {
    widthCm:  ratio.w * letterHeightCm,
    heightCm: ratio.h * letterHeightCm,
  };
}

/** "152 × 41 cm" — whole centimetres, which is how a façade gets measured. */
export function formatSignSize(size: SignSize): string {
  const round = (v: number) => Math.max(1, Math.round(v));
  return `${round(size.widthCm)} × ${round(size.heightCm)} cm`;
}
