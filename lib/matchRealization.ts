import type { Realization } from "@/data/realizations";
import type { LightModeId, SignType } from "@/lib/types";

type ConfigSlice = {
  signType: SignType;
  material: string;
  lightMode?: LightModeId;
};

export type MatchResult = {
  best: Realization;
  alternatives: Realization[];
  score: number;
  isFallback: boolean;
};

// ── Scoring weights ───────────────────────────────────────────────────────────
const WEIGHT_SIGN_TYPE  = 50;
const WEIGHT_MATERIAL   = 30;
const WEIGHT_LIGHT_MODE = 10;  // only entries that tag lightModes take part
const WEIGHT_FEATURED   =  1;  // tiebreaker

// Below this score we consider it a fallback match
const FALLBACK_THRESHOLD = WEIGHT_SIGN_TYPE;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Score every realization against the current config and return the best
 * match plus up to 3 alternatives. When no entry meets the threshold
 * the featured entry is returned as a fallback.
 *
 * Pure function — no side effects, no UI imports.
 */
export function matchRealization(
  config: ConfigSlice,
  realizations: Realization[],
): MatchResult {
  if (realizations.length === 0) {
    throw new Error("matchRealization: realizations array is empty");
  }

  const scored = realizations.map((r) => ({
    r,
    score: score(r, config),
  }));

  // Sort descending by score, then by featured flag as secondary sort
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Number(b.r.featured ?? false) - Number(a.r.featured ?? false);
  });

  const best    = scored[0];
  const isFallback = best.score < FALLBACK_THRESHOLD;

  // If score is below threshold, swap in the featured entry as the primary result
  let primary: Realization = best.r;
  if (isFallback) {
    const featured = realizations.find((r) => r.featured);
    if (featured) primary = featured;
  }

  // Alternatives: next 3 entries that are NOT the primary
  const alternatives = scored
    .filter((s) => s.r.id !== primary.id)
    .slice(0, 3)
    .map((s) => s.r);

  return {
    best: primary,
    alternatives,
    score: best.score,
    isFallback,
  };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function score(r: Realization, config: ConfigSlice): number {
  let total = 0;

  if (r.signType.includes(config.signType)) {
    total += WEIGHT_SIGN_TYPE;
  }

  if (r.materials.includes(config.material)) {
    total += WEIGHT_MATERIAL;
  }

  if (config.lightMode && r.lightModes?.includes(config.lightMode)) {
    total += WEIGHT_LIGHT_MODE;
  }

  if (r.featured) {
    total += WEIGHT_FEATURED;
  }

  return total;
}
