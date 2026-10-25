import { K_MAX, K_MIN, kelvinToLch } from "../../domains/light/kelvin";

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
