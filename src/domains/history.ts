/** One sample per hour: 0 = nothing, 0-1 = intensity, "unavailable", or null for hours still ahead. */
export type HourSample = number | "unavailable" | null;

/** One measured reading per hour: a number, "unavailable", or null for hours ahead and before the first reading. */
export type Reading = number | "unavailable" | null;

/**
 * Scale readings to 0.12-1 for a Today strip, keeping gaps and hours ahead; min and max are null with no
 * reading yet. `minSpan` keeps a near-flat day from filling the strip (0.5° for a temperature, 1 bpm …).
 */
export function normalizeReadings(series: Reading[], minSpan = 0.5): { samples: HourSample[]; min: number | null; max: number | null } {
  const nums = series.filter((x): x is number => typeof x === "number");
  if (!nums.length) return { samples: series.map((x) => (typeof x === "number" ? 0 : x)), min: null, max: null };
  const min = Math.min(...nums), max = Math.max(...nums);
  const span = Math.max(max - min, minSpan);
  return { samples: series.map((x) => (typeof x === "number" ? 0.12 + (0.88 * (x - min)) / span : x)), min, max };
}
