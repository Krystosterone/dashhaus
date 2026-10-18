export const K_MIN = 2200;
export const K_MAX = 6500;
/** Lamp color used for lights without color temperature support. */
export const K_DEFAULT = 2900;

/** Kelvin to OKLCH chroma and hue: golden at 2200 K, butter near 2700-3000 K, neutral near 4800 K, pale blue above. */
export function kelvinToLch(k: number): { c: number; h: number } {
  if (k <= 4800) {
    const t = (k - 2200) / 2600;
    return { c: +(0.16 * Math.pow(1 - t, 0.85) + 0.02 * t).toFixed(3), h: +Math.min(105, 80 + 45 * t).toFixed(1) };
  }
  const t = (k - 4800) / 1700;
  return { c: +(0.02 + t * 0.06).toFixed(3), h: 245 };
}

export function kelvinName(k: number): string {
  if (k <= 2500) return "Candlelight";
  if (k <= 3200) return "Warm white";
  if (k <= 4200) return "Neutral white";
  if (k <= 5500) return "Daylight";
  return "Cool daylight";
}

/** CSS color for a Kelvin value. Lightness comes from the theme token --accent-l. */
export function lampColor(k: number): string {
  const { c, h } = kelvinToLch(k);
  return `oklch(var(--accent-l) ${c} ${h})`;
}

/** Gradient stops for the warmth ruler, from min to max Kelvin. */
export function warmGradient(min = K_MIN, max = K_MAX): string {
  const steps = 10;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const k = min + ((max - min) * i) / steps;
    return `${lampColor(k)} ${((i / steps) * 100).toFixed(1)}%`;
  }).join(", ");
}
