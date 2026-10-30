import { normalizeReadings } from "../history";
import type { Severity } from "../severity";
import type { OwletAlert, Reading, SleepState } from "./types";

export const SLEEP_WORD: Record<SleepState, string> = { deep_sleep: "Deep sleep", light_sleep: "Light sleep", awake: "Awake" };
/** The sleep state as a readout figure, under its Sleep caption. */
export const SLEEP_FIGURE: Record<SleepState, string> = { deep_sleep: "Deep", light_sleep: "Light", awake: "Awake" };

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

export const ALERT_WORD: Record<OwletAlert, string> = {
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

/** Problems that stop the monitoring: the sock off or out of reach, the base without power, a battery about to die. */
export const URGENT_PROBLEMS = new Set<OwletAlert>(["sock_off", "sock_disconnected", "lost_power", "critical_battery"]);

/**
 * How much the sock's state may claim: a vitals alert is the alarm going off; a problem that stops the monitoring, or
 * readings that stopped, is urgent; any other problem (a low battery) is advisory.
 */
export function owletSeverity(alerts: readonly OwletAlert[] = [], stale = false): Severity | undefined {
  const { vitals, problems } = rankAlerts(alerts);
  if (vitals.length) return "alarm";
  if (stale || problems.some((p) => URGENT_PROBLEMS.has(p))) return "urgent";
  return problems.length ? "advisory" : undefined;
}
