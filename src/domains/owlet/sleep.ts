import type { HourSample } from "../history";
import type { SleepState } from "./types";

/** Today strip height per sleep state: deep sleep is the full stick, awake sits on the baseline. */
export const SLEEP_SAMPLE: Record<SleepState, HourSample> = { deep_sleep: 1, light_sleep: 0.5, awake: 0 };
