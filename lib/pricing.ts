import type { Config } from "@/lib/types";
import { fontOptions, MATERIALS, LIGHT_MODES } from "@/lib/options";

export function calculatePrice(config: Config): number {
  const base = 69;

  const letters = (config.text.trim() || "VÁŠ TEXT").replace(/\s/g, "").length;

  const font     = fontOptions.find((f) => f.id === config.font);
  const material = MATERIALS.find((m) => m.id === config.material);
  const lightMode = config.signType === "illuminated"
    ? LIGHT_MODES.find((l) => l.id === config.lightMode)
    : null;

  const fontMultiplier     = font?.multiplier ?? 1;
  const materialMultiplier = material?.priceMultiplier ?? 1;
  const lightingPrice      = lightMode?.price ?? 0;

  const letterPrice = letters * config.height * 0.85;

  // Depth is priced by what it costs to build, and the two builds are not the
  // same thing. A cut letter's thickness is solid material, so every extra
  // millimetre is paid for. A lit letter's depth is the width of the aluminium
  // profile wrapped around it — a deeper profile costs more per metre, but far
  // from four euros a millimetre, which at the 60–217 mm widths the profiles
  // actually come in (lib/options.ts PROFILE_DEPTHS_MM) would dwarf the rest
  // of the sign.
  const thicknessPrice = config.signType === "illuminated"
    ? config.thickness * 0.5
    : config.thickness * 4;

  return Math.round(
    base +
      letterPrice * fontMultiplier * materialMultiplier +
      lightingPrice +
      thicknessPrice
  );
}
