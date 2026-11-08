import { normalizeReadings } from "../history";
import type { OwletAlert, Reading, SleepState } from "./types";

export const SLEEP_WORD: Record<SleepState, string> = { deep_sleep: "Deep sleep", light_sleep: "Light sleep", awake: "Awake" };
/** The sleep state as a readout figure, under its Sleep caption. */
export const SLEEP_FIGURE: Record<SleepState, string> = { deep_sleep: "Deep", light_sleep: "Light", awake: "Awake" };
/** While the sock reads but hasn't settled on a sleep state: in words, and as the readout's figure under Sleep. */
export const SLEEP_UNKNOWN = "Sleep unknown";
export const SLEEP_FIGURE_UNKNOWN = "Unknown";

/** On its charger, the reason it reports nothing: the status line's word, and the small print's. */
export const CHARGING = "Charging";

/** The time of a formatted moment, a day dropped ("Fri 18:30" → "18:30"), so a row keeps the part that matters. */
const timeOf = (at?: string) => at?.trim().split(/\s+/).at(-1);

/**
 * Readings that stopped arriving, as a warning's words: "Stopped 11:49", 13 characters at most so a row keeps them
 * whole (a day dropped: "Fri 18:30" stops at "18:30"). `staleSaid` says it whole.
 */
export const staleText = (lastUpdated?: string) => {
  const time = timeOf(lastUpdated);
  return time ? `Stopped ${time}` : "Stopped";
};

/** Readings that stopped, said whole, for a screen reader and the details' list: "No new reading since Fri 18:30". */
export const staleSaid = (lastUpdated?: string) => `No new reading${lastUpdated ? ` since ${lastUpdated}` : ""}`;

export const fmtBpm = (n: number) => String(Math.round(n));
export const fmtOxygen = (n: number) => String(Math.round(n));

/** Scale readings for a Today strip; a day spans at least 1 bpm or 1 %. */
export const normalize = (series: Reading[]) => normalizeReadings(series, 1);

/** Most urgent first: the order alerts lead the card in. */
export const ALERT_ORDER: OwletAlert[] = [
  "critical_oxygen", "low_oxygen", "low_heart_rate", "high_heart_rate", "high_oxygen",
  "sock_disconnected", "sock_off", "lost_power", "critical_battery", "low_battery",
];

/** Alerts about the baby, not the device: the alarm going off. */
export const VITAL_ALERTS = new Set<OwletAlert>(["critical_oxygen", "low_oxygen", "high_oxygen", "low_heart_rate", "high_heart_rate"]);

/**
 * Each alert as a warning's words: 13 characters at most (`WARNING_WORD_MAX`), so an Orb compact row's alarm pill and a
 * 340 px Field row keep them whole (spec/cards.md → a warning's words fit a row). `ALERT_SAID` says each in full.
 */
export const ALERT_WORD: Record<OwletAlert, string> = {
  critical_oxygen: "Critical O₂",
  low_oxygen: "Low oxygen",
  high_oxygen: "High oxygen",
  low_heart_rate: "Low pulse",
  high_heart_rate: "High pulse",
  sock_off: "Sock off",
  sock_disconnected: "Sock offline",
  lost_power: "No base power",
  critical_battery: "Battery dying",
  low_battery: "Battery low",
};

/** Each alert said in full, for a screen reader and the details' list of every alert sounding. */
export const ALERT_SAID: Record<OwletAlert, string> = {
  critical_oxygen: "Critical oxygen",
  low_oxygen: "Low oxygen",
  high_oxygen: "High oxygen",
  low_heart_rate: "Low heart rate",
  high_heart_rate: "High heart rate",
  sock_off: "Sock off",
  sock_disconnected: "Sock disconnected",
  lost_power: "Base lost power",
  critical_battery: "Battery critical",
  low_battery: "Battery low",
};

/** The active alerts, most urgent first, split into the alarm (vitals) and device problems. */
export function rankAlerts(alerts: readonly OwletAlert[] = []) {
  const active = ALERT_ORDER.filter((a) => alerts.includes(a));
  return { vitals: active.filter((a) => VITAL_ALERTS.has(a)), problems: active.filter((a) => !VITAL_ALERTS.has(a)) };
}

/** A vitals alert in a word, beside the figure it is about: "Critical" beside 79% O₂. */
export const ALERT_SHORT: Partial<Record<OwletAlert, string>> = {
  critical_oxygen: "Critical", low_oxygen: "Low", high_oxygen: "High", low_heart_rate: "Low", high_heart_rate: "High",
};

/** Ranked once, in `./severity.ts`; re-exported here, where it was first, for the code that imports it from the readings. */
export { URGENT_PROBLEMS, owletSeverity } from "./severity";
