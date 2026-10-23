import type { HourSample } from "../../shared/ui";
import type { Reading, SleepState } from "./types";

export const SLEEP_WORD: Record<SleepState, string> = { deep_sleep: "Deep sleep", light_sleep: "Light sleep", awake: "Awake" };

/** Today strip height per sleep state: deep sleep is the full stick, awake sits on the baseline. */
export const SLEEP_SAMPLE: Record<SleepState, HourSample> = { deep_sleep: 1, light_sleep: 0.5, awake: 0 };

export const fmtBpm = (n: number) => String(Math.round(n));
export const fmtOxygen = (n: number) => String(Math.round(n));

/** Scale readings to 0.12-1 for a Today strip, keeping gaps and hours ahead. min and max are null with no reading yet. */
export function normalize(series: Reading[]): { samples: HourSample[]; min: number | null; max: number | null } {
  const nums = series.filter((x): x is number => typeof x === "number");
  if (!nums.length) return { samples: series.map((x) => (typeof x === "number" ? 0 : x)), min: null, max: null };
  const min = Math.min(...nums), max = Math.max(...nums);
  const span = Math.max(max - min, 1);
  return { samples: series.map((x) => (typeof x === "number" ? 0.12 + (0.88 * (x - min)) / span : x)), min, max };
}
