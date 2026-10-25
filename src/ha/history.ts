import type { HourSample } from "../domains/history";
import type { LightHistory } from "../domains/light/types";
import type { ClimateHistory } from "../domains/climate/types";
import type { CoverHistory } from "../domains/cover/types";
import type { ToggleHistory } from "../domains/toggle/types";
import type { AlarmHistory } from "../domains/alarm/types";
import type { SensorHistory, Reading } from "../domains/sensor/types";
import type { WeatherHistory } from "../domains/weather/types";
import type { OwletHistory, SleepState } from "../domains/owlet/types";
import { SLEEP_SAMPLE } from "../domains/owlet/sleep";
import { finiteNumber, isRecord, stringList } from "./util";

/* ------------------------------------------------------------------ *
 * One flat record per recorded row, parsed defensively from the       *
 * `history/history_during_period` response: an object keyed by        *
 * entity id, each holding compressed rows `{ s, a, lu, lc? }` with    *
 * epoch-second timestamps.                                            *
 * ------------------------------------------------------------------ */

export interface HaHistoryRecord {
  entityId: string;
  state: string;
  changed: Date;
  attributes: Record<string, unknown>;
}

const epochSeconds = (value: unknown): Date | undefined =>
  typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000) : undefined;

/**
 * Flatten the per-entity rows for the requested entities. A row's time is `lu` (any recorded change,
 * attributes included), falling back to `lc`; rows without a valid time are dropped. A row without
 * attributes (a `minimal_response` row) carries the previous row's attributes forward.
 */
export function historyRecords(response: unknown, entityIds: readonly string[]): HaHistoryRecord[] {
  if (!isRecord(response)) return [];
  const out: HaHistoryRecord[] = [];
  for (const entityId of entityIds) {
    const rows = Object.prototype.hasOwnProperty.call(response, entityId) ? response[entityId] : undefined;
    if (!Array.isArray(rows)) continue;
    let attributes: Record<string, unknown> = {};
    for (const row of rows) {
      if (!isRecord(row)) continue;
      const changed = epochSeconds(row.lu) ?? epochSeconds(row.lc);
      if (changed == null) continue;
      if (isRecord(row.a)) attributes = row.a;
      out.push({ entityId, state: typeof row.s === "string" ? row.s : "unavailable", changed, attributes });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Hour walk: 24 local hours 0..23 for today.                          *
 * ------------------------------------------------------------------ */

const safeNow = (now?: Date): Date =>
  now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();

type Records = readonly HaHistoryRecord[] | undefined;

const only = (records: Records, entityId: string): HaHistoryRecord[] =>
  (records ?? []).filter((record) => record.entityId === entityId);

const localMidnight = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate());

/** Records between local midnight and `now`. */
const today = (records: readonly HaHistoryRecord[], now: Date) => {
  const start = localMidnight(now).getTime();
  return records.filter((record) => record.changed.getTime() >= start && record.changed <= now);
};

/**
 * For each local hour 0..23, the record in effect (last change at or before that hour). The latest
 * record from before local midnight is the state carried into hour 0; records after `now` are ignored.
 */
function hourStates(records: readonly HaHistoryRecord[], now: Date): Array<HaHistoryRecord | undefined> {
  const start = localMidnight(now).getTime();
  const sorted = records
    .filter((record) => record.changed <= now)
    .sort((a, b) => a.changed.getTime() - b.changed.getTime());
  const states = new Array<HaHistoryRecord | undefined>(24).fill(undefined);
  let idx = 0;
  let current: HaHistoryRecord | undefined;
  while (idx < sorted.length && sorted[idx].changed.getTime() < start) current = sorted[idx++];
  for (let hour = 0; hour < 24; hour++) {
    while (idx < sorted.length && sorted[idx].changed.getHours() <= hour) current = sorted[idx++];
    states[hour] = current;
  }
  return states;
}

interface BuildOptions {
  value: (state: string, attributes: Record<string, unknown>) => HourSample;
  /** Whether a given state counts toward today's "on"-style minutes. */
  on?: (state: string, attributes: Record<string, unknown>) => boolean;
  /** Sample for an hour before the first record. Defaults to "unavailable". */
  noData?: HourSample;
}

function build(records: readonly HaHistoryRecord[], now: Date, options: BuildOptions) {
  const states = hourStates(records, now);
  const currentHour = now.getHours();
  const samples: HourSample[] = new Array(24).fill(null);
  for (let hour = 0; hour <= currentHour && hour < 24; hour++) {
    const record = states[hour];
    samples[hour] = record == null ? (options.noData ?? "unavailable") : options.value(record.state, record.attributes);
  }
  let minutes = 0;
  if (options.on) {
    for (let hour = 0; hour < currentHour; hour++) {
      const record = states[hour];
      if (record != null && options.on(record.state, record.attributes)) minutes += 60;
    }
    const current = states[currentHour];
    if (current != null && options.on(current.state, current.attributes)) minutes += now.getMinutes();
  }
  return { samples, currentHour, minutes };
}

/* ------------------------------------------------------------------ *
 * Light                                                               *
 * ------------------------------------------------------------------ */

const BRIGHTNESS_MODES: Record<string, true> = {
  brightness: true, color_temp: true, hs: true, xy: true, rgb: true, rgbw: true, rgbww: true, white: true,
};

/** HA `brightness` (0-255) to percent (1-100), clamped like the light mapper. */
const brightnessPercent = (value: number): number | undefined =>
  value >= 0 && value <= 255 ? Math.min(100, Math.max(1, Math.round((value / 255) * 100))) : undefined;

function lightSample(state: string, attributes: Record<string, unknown>): HourSample {
  if (state === "on") {
    const modes = stringList(attributes.supported_color_modes);
    if (!modes.some((mode) => mode in BRIGHTNESS_MODES)) return 1;
    const brightness = finiteNumber(attributes.brightness);
    if (brightness == null) return "unavailable";
    const percent = brightnessPercent(brightness);
    return percent == null ? "unavailable" : percent / 100;
  }
  if (state === "off") return 0;
  return "unavailable";
}

/** Replicates the hourly intensity + onMinutes computation of `useDemoLight`. */
export function lightHistoryFromHass(records: Records, entityId: string, now?: Date): LightHistory {
  const when = safeNow(now);
  const { samples, currentHour, minutes } = build(only(records, entityId), when, {
    value: lightSample,
    on: (state) => state === "on",
  });
  return { samples, currentHour, onMinutes: minutes };
}

/* ------------------------------------------------------------------ *
 * On/off: toggles, and any entity whose state is "on" or "off"        *
 * ------------------------------------------------------------------ */

/** Today for an on/off entity: 1 for hours on, 0 off, and minutes on. Any other state is unavailable. */
export interface OnOffHistory {
  samples: HourSample[];
  currentHour: number;
  onMinutes: number;
}

function onOffSample(state: string): HourSample {
  if (state === "on") return 1;
  if (state === "off") return 0;
  return "unavailable";
}

/** Today's on/off history for any domain whose state is "on" or "off" (switch, fan, input_boolean…). */
export function onOffHistoryFromHass(records: Records, entityId: string, now?: Date): OnOffHistory {
  const when = safeNow(now);
  const { samples, currentHour, minutes } = build(only(records, entityId), when, {
    value: onOffSample,
    on: (state) => state === "on",
  });
  return { samples, currentHour, onMinutes: minutes };
}

/** Replicates the binary 1/0 + onMinutes computation of `useDemoToggle`. */
export const toggleHistoryFromHass: (records: Records, entityId: string, now?: Date) => ToggleHistory = onOffHistoryFromHass;

/* ------------------------------------------------------------------ *
 * Cover                                                               *
 * ------------------------------------------------------------------ */

function coverSample(state: string, attributes: Record<string, unknown>): HourSample {
  if (state === "unavailable" || state === "unknown") return "unavailable";
  const position = finiteNumber(attributes.current_position);
  if (position != null && position >= 0 && position <= 100) return position / 100;
  if (state === "open") return 1;
  if (state === "closed") return 0;
  return "unavailable";
}

/** Replicates the open fraction from position computation of `useDemoCover`. */
export function coverHistoryFromHass(records: Records, entityId: string, now?: Date): CoverHistory {
  const when = safeNow(now);
  const { samples, currentHour } = build(only(records, entityId), when, { value: coverSample });
  return { samples, currentHour };
}

/* ------------------------------------------------------------------ *
 * Alarm                                                               *
 * ------------------------------------------------------------------ */

const DISARMED: Record<string, true> = { disarmed: true, arming: true, disarming: true };

function alarmArmed(state: string): boolean {
  return state.startsWith("armed") || state === "pending" || state === "triggered";
}

function alarmSample(state: string): HourSample {
  if (state === "unavailable" || state === "unknown") return "unavailable";
  if (alarmArmed(state)) return 1;
  if (state in DISARMED) return 0;
  return "unavailable";
}

/** Replicates the 1/0 + armedMinutes computation of `useDemoAlarm`. */
export function alarmHistoryFromHass(records: Records, entityId: string, now?: Date): AlarmHistory {
  const when = safeNow(now);
  const { samples, currentHour, minutes } = build(only(records, entityId), when, {
    value: alarmSample,
    on: alarmArmed,
  });
  return { samples, currentHour, armedMinutes: minutes };
}

/* ------------------------------------------------------------------ *
 * Climate                                                             *
 * ------------------------------------------------------------------ */

function climateSample(state: string): HourSample {
  if (state === "off") return 0;
  if (state === "unavailable" || state === "unknown") return "unavailable";
  return 1;
}

function climateActivity(records: readonly HaHistoryRecord[]): ClimateHistory["activity"] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const action = record.attributes.hvac_action;
    if (typeof action !== "string" || action === "") continue;
    counts.set(action, (counts.get(action) ?? 0) + 1);
  }
  if (counts.size === 0) return "running";
  let max = 0;
  for (const count of counts.values()) if (count > max) max = count;
  const top = [...counts.entries()].filter(([, count]) => count === max).map(([action]) => action);
  if (top.includes("heating")) return "heating";
  if (top.includes("cooling")) return "cooling";
  return "running";
}

/** Replicates the running share + activity of `useDemoClimate`. */
export function climateHistoryFromHass(records: Records, entityId: string, now?: Date): ClimateHistory {
  const when = safeNow(now);
  const own = only(records, entityId);
  const { samples, currentHour, minutes } = build(own, when, {
    value: climateSample,
    on: (state) => state !== "off" && state !== "unavailable" && state !== "unknown",
  });
  return { samples, currentHour, activeMinutes: minutes, activity: climateActivity(today(own, when)) };
}

/* ------------------------------------------------------------------ *
 * Sensor / weather (numeric readings, carry-forward)                  *
 * ------------------------------------------------------------------ */

function numericState(state: string): Reading {
  if (state === "unavailable" || state === "unknown") return "unavailable";
  const number = Number(state);
  return state.trim() !== "" && Number.isFinite(number) ? number : "unavailable";
}

function temperatureAttribute(state: string, attributes: Record<string, unknown>): Reading {
  if (state === "unavailable" || state === "unknown") return "unavailable";
  return finiteNumber(attributes.temperature) ?? "unavailable";
}

function buildReadings(records: readonly HaHistoryRecord[], now: Date, reading: (state: string, attributes: Record<string, unknown>) => Reading): Reading[] {
  const states = hourStates(records, now);
  const currentHour = now.getHours();
  const out: Reading[] = new Array(24).fill(null);
  for (let hour = 0; hour <= currentHour && hour < 24; hour++) {
    const record = states[hour];
    out[hour] = record == null ? null : reading(record.state, record.attributes);
  }
  return out;
}

/** Replicates the carry-forward temperature/humidity arrays of the sensor demo seeds. */
export function sensorHistoryFromHass(
  records: Records,
  ids: { temperature: string; humidity?: string },
  now?: Date,
): SensorHistory {
  const when = safeNow(now);
  const temperature = buildReadings(only(records, ids.temperature), when, numericState);
  const humidity = ids.humidity != null ? buildReadings(only(records, ids.humidity), when, numericState) : undefined;
  return { temperature, humidity, currentHour: when.getHours() };
}

/** Today's numeric readings for any one sensor, carried forward hour by hour. */
export function readingHistoryFromHass(records: Records, entityId: string, now?: Date): { readings: Reading[]; currentHour: number } {
  const when = safeNow(now);
  return { readings: buildReadings(only(records, entityId), when, numericState), currentHour: when.getHours() };
}

/** Carry the weather entity's `temperature` attribute forward; its state is a condition, not a reading. */
export function weatherHistoryFromHass(records: Records, entityId: string, now?: Date): WeatherHistory {
  const when = safeNow(now);
  return { temperature: buildReadings(only(records, entityId), when, temperatureAttribute), currentHour: when.getHours() };
}

/* ------------------------------------------------------------------ *
 * Owlet sock: sleep state by hour, heart rate and oxygen carried      *
 * forward                                                             *
 * ------------------------------------------------------------------ */

const isSleepState = (state: string): state is SleepState => Object.hasOwn(SLEEP_SAMPLE, state);

/** Today for an Owlet sock; `unknown` (no sleep state yet) and charging hours are unavailable. */
export function owletHistoryFromHass(records: Records, ids: { sleep: string; heartRate?: string; oxygen?: string }, now?: Date): OwletHistory {
  const when = safeNow(now);
  const { samples, currentHour, minutes } = build(only(records, ids.sleep), when, {
    value: (state) => (isSleepState(state) ? SLEEP_SAMPLE[state] : "unavailable"),
    on: (state) => state === "deep_sleep" || state === "light_sleep",
  });
  return {
    sleep: samples,
    heartRate: ids.heartRate != null ? buildReadings(only(records, ids.heartRate), when, numericState) : undefined,
    oxygen: ids.oxygen != null ? buildReadings(only(records, ids.oxygen), when, numericState) : undefined,
    currentHour,
    asleepMinutes: minutes,
  };
}
