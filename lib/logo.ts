import type { SignSize } from "@/lib/useSignSize";

// A logo instead of a text — what the configurator turns a customer's file
// into (lib/logo-trace.ts), and what the 3D preview extrudes and the price
// is worked out from, exactly like the letters of a text.
//
// Plain data on purpose: no three.js here, so the configurator can hold a
// logo without pulling the 3D chunk into the page. letterGeometry.ts turns
// the outlines into shapes.

/**
 * Files the configurator can draw and trace — anything the browser can paint,
 * and PDF (its first page, drawn by pdf.js). An .ai file is tried as a PDF
 * too: Illustrator saves one inside it unless told not to.
 */
export const LOGO_ACCEPT =
  ".svg,.png,.jpg,.jpeg,.webp,.gif,.pdf,.ai,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,application/pdf";
export const LOGO_HINT = "PDF, SVG, PNG, JPG alebo WEBP — najlepšie logo na čistom pozadí";

/**
 * The logo file travels with the consultation request, through one Vercel
 * function whose body limit is 4.5 MB — with the preview picture and the
 * form beside it, 3 MB is what is left for the file.
 */
export const MAX_LOGO_BYTES = 3 * 1024 * 1024;

const LOGO_EXTENSIONS = ["svg", "png", "jpg", "jpeg", "webp", "gif", "pdf", "ai"];

/** A file the configurator draws through pdf.js. */
export function isPdfLike(name: string): boolean {
  return /\.(pdf|ai)$/i.test(name);
}

export function isLogoFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  return dot >= 0 && LOGO_EXTENSIONS.includes(name.slice(dot + 1).toLowerCase());
}

/** A point, then straight lines and quadratic curves back round to it. */
export type LogoSegment =
  | { t: "L"; x: number; y: number }
  | { t: "Q"; cx: number; cy: number; x: number; y: number };

export type LogoContour = { x: number; y: number; segments: LogoSegment[] };

/** One separate piece of the logo — what a letter is to a text. */
export type LogoPart = { outer: LogoContour; holes: LogoContour[] };

export type LogoOutline = {
  /**
   * In logo heights: y runs 0 (bottom) to 1 (top), x from 0 to `aspect`.
   * The ordered height of the sign is the height of the whole logo.
   */
  parts: LogoPart[];
  /** Width over height. */
  aspect: number;
  /** Share of the logo's own box that is actually the logo, 0–1. */
  inkRatio: number;
  /** Every part's own rectangle, added up — in logo heights squared. */
  partsArea: number;
  /** The biggest single part, in logo heights. */
  maxPartW: number;
  maxPartH: number;
};

/** One way of making the sign from a logo file. */
export type LogoVersion = {
  outline: LogoOutline;
  /**
   * Object URL of the artwork cropped to the outline — what the face shows
   * when it is printed with the design. Null if it could not be made.
   */
  faceUrl: string | null;
};

/**
 * How a logo is made: cut out on its own, or — when it came on a coloured
 * background — as a light box, the whole picture one lit rectangle with the
 * artwork printed on its face.
 */
export type LogoShape = "cut" | "box";

/** The customer's logo as the configurator holds it. */
export type LogoAsset = {
  file: File;
  /** Object URL of the file, for the thumbnail. */
  url: string;
  /** The logo cut out on its own — null when it could not be traced. */
  cut: LogoVersion | null;
  /** The light box — only for a logo on a coloured background. */
  box: LogoVersion | null;
};

/** A light box's outline: one rectangle, the whole picture. */
export function logoBoxOutline(aspect: number): LogoOutline {
  const a = Math.max(0.01, aspect);
  return {
    parts: [{
      outer: { x: 0, y: 0, segments: [{ t: "L", x: a, y: 0 }, { t: "L", x: a, y: 1 }, { t: "L", x: 0, y: 1 }, { t: "L", x: 0, y: 0 }] },
      holes: [],
    }],
    aspect: a,
    inkRatio: 1,
    partsArea: a,
    maxPartW: a,
    maxPartH: 1,
  };
}

/**
 * How big the sign comes out with this logo `heightMm` tall — the same
 * measurements a text sign gets from lib/useSignSize.ts, so the price list
 * bills a logo exactly like letters: each separate piece by its own
 * rectangle, and solid print by the material that is really printed.
 */
export function logoSignSize(outline: LogoOutline, heightMm: number): SignSize {
  return {
    widthMm: outline.aspect * heightMm,
    heightMm,
    inkRatio: outline.inkRatio,
    letterAreaM2: (outline.partsArea * heightMm * heightMm) / 1_000_000,
    maxLetterWidthMm: outline.maxPartW * heightMm,
    maxLetterHeightMm: outline.maxPartH * heightMm,
  };
}

/**
 * What the rules of the price list that look at the TEXT (lib/options.ts —
 * alurol is made in capitals or in lower case) should read for a logo: the
 * capitals' build, which is the one made for shapes rather than words.
 */
export const LOGO_RULE_TEXT = "LOGO";
