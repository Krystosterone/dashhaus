/**
 * A fan's speeds as whole steps over Home Assistant's percentage. A three-speed fan reports a `percentage_step` of
 * 33.33 and takes 33, 67 or 100; a stepless one takes any whole percent. Skins set the speed in steps, so a key
 * press or a drag moves one speed, and send the percentage the step stands for.
 */

/** The most speeds a fan is drawn with: one per percent. */
export const MAX_SPEEDS = 100;

/** How many speeds a `percentage_step` gives, 1-100. A missing or impossible step is a stepless fan. */
export function speedCountOf(step: number | undefined): number {
  if (step == null || !Number.isFinite(step) || step <= 0 || step > 100) return MAX_SPEEDS;
  return Math.min(MAX_SPEEDS, Math.max(1, Math.round(100 / step)));
}

/** The speed, 1 to `count`, a percentage stands for; the nearest, and never below the first. */
export function speedOf(percent: number, count: number): number {
  const n = Math.max(1, Math.round(count));
  return Math.min(n, Math.max(1, Math.round((percent / 100) * n)));
}

/** The whole percentage Home Assistant takes for a speed, 1 to `count`. */
export function percentOf(speed: number, count: number): number {
  const n = Math.max(1, Math.round(count));
  return Math.min(100, Math.max(1, Math.round((Math.min(n, Math.max(1, speed)) / n) * 100)));
}

/** The most speeds a fan's speeds are named for ("Speed 2 of 3"); past it, a speed reads as a percent. */
export const MAX_NAMED_SPEEDS = 10;

/** True for a fan whose speeds are few enough to name ("Speed 2") rather than read as a percent. */
export const namedSpeeds = (count: number) => count >= 2 && count <= MAX_NAMED_SPEEDS;

/** A speed in words, for the groove and its readout: "Speed 2" for a three-speed fan, "40%" for a stepless one. */
export const speedText = (percent: number, count: number) => namedSpeeds(count) ? `Speed ${speedOf(percent, count)}` : `${Math.round(percent)}%`;

/** A preset as a word: "breeze" → "Breeze", "smart_mode" → "Smart mode". */
export const presetLabel = (preset: string) => preset.charAt(0).toUpperCase() + preset.slice(1).replace(/_/g, " ");

/** The direction as a word. */
export const DIRECTION_LABEL = { forward: "Forward", reverse: "Reverse" } as const;
