/* The value math every slider and dial shares: where a value sits between its limits, and back again. */

const clamp01 = (f: number) => Math.min(1, Math.max(0, f));

/** A value's place between `min` and `max`, 0-1; a degenerate range sits at 0. */
export const rangePosition = (value: number, min: number, max: number) => (max > min ? clamp01((value - min) / (max - min)) : 0);

/** 0-1 to a value on the step grid from `min`, inside min and max, without float residue (21.499999…). */
export function stepValue(f: number, min: number, max: number, step: number) {
  const decimals = (String(step).split(".")[1] ?? "").length;
  const v = min + Math.round((clamp01(f) * (max - min)) / step) * step;
  return +Math.min(max, Math.max(min, v)).toFixed(decimals);
}
