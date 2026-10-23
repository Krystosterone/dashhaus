import { normalizeReadings } from "../../shared/ui";
import type { HourSample } from "../../shared/ui";
import type { Reading, SleepState } from "./types";

export const SLEEP_WORD: Record<SleepState, string> = { deep_sleep: "Deep sleep", light_sleep: "Light sleep", awake: "Awake" };

/** Today strip height per sleep state: deep sleep is the full stick, awake sits on the baseline. */
export const SLEEP_SAMPLE: Record<SleepState, HourSample> = { deep_sleep: 1, light_sleep: 0.5, awake: 0 };

export const fmtBpm = (n: number) => String(Math.round(n));
export const fmtOxygen = (n: number) => String(Math.round(n));

/** Scale readings for a Today strip; a day spans at least 1 bpm or 1 %. */
export const normalize = (series: Reading[]) => normalizeReadings(series, 1);
