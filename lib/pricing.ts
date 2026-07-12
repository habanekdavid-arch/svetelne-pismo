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

  const letterPrice    = letters * config.height * 0.85;
  const thicknessPrice = config.thickness * 4;

  return Math.round(
    base +
      letterPrice * fontMultiplier * materialMultiplier +
      lightingPrice +
      thicknessPrice
  );
}
