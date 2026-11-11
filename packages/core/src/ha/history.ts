import type { HourSample } from "../entities/history";
import type { LightHistory } from "../entities/light/types";
import type { ClimateHistory } from "../entities/climate/types";
import type { CoverHistory } from "../entities/cover/types";
import type { ToggleHistory } from "../entities/toggle/types";
import type { AlarmHistory } from "../entities/alarm/types";
import type { SensorHistory, Reading } from "../entities/sensor/types";
import type { NumericHistory } from "../entities/numeric/types";
import type { WeatherHistory } from "../entities/weather/types";
import type { OwletHistory, SleepState } from "../entities/owlet/types";
import { SLEEP_SAMPLE } from "../entities/owlet/sleep";
import type { MediaPlayerHistory } from "../entities/mediaPlayer/types";
import { meterRise } from "../entities/numeric/readings";
import { mediaPlayerStateOf } from "./mappers/mediaPlayer";
import type { VacuumHistory } from "../entities/vacuum/types";
import { vacuumStateOf } from "./mappers/vacuum";
import { finiteNumber, isRecord, stringList } from "./util";

/* ------------------------------------------------------------------ *
 * One flat record per recorded row, parsed defensively from the       *
 * `history/history_during_period` response: an object keyed by        *
 * entity id, each holding compressed rows `{ s, a, lu, lc? }` with    *
 * epoch-second timestamps.                                            *
 * ------------------------------------------------------------------ */

export interface HaHistoryRecord {
  /** The Home Assistant entity id the change is for. */
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

/** The records up to `now`, oldest first. */
const upTo = (records: readonly HaHistoryRecord[], now: Date) =>
  records.filter((record) => record.changed <= now).sort((a, b) => a.changed.getTime() - b.changed.getTime());

/**
 * For each local hour 0..23, the record in effect (last change at or before that hour). The latest
 * record from before local midnight is the state carried into hour 0; records after `now` are ignored.
 * What the hourly strip draws; how long each state lasted is `stretches`.
 */
function hourStates(records: readonly HaHistoryRecord[], now: Date): Array<HaHistoryRecord | undefined> {
  const start = localMidnight(now).getTime();
  const sorted = upTo(records, now);
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

/**
 * How long each record was in effect today, in ms: from its change (local midnight for the one carried in from
 * before) to the next change or `now`. Real time, so a DST day is 23 or 25 hours long; records that never held
 * today are left out.
 */
function stretches(records: readonly HaHistoryRecord[], now: Date): Array<{ record: HaHistoryRecord; ms: number }> {
  const start = localMidnight(now).getTime();
  const sorted = upTo(records, now);
  const out: Array<{ record: HaHistoryRecord; ms: number }> = [];
  sorted.forEach((record, i) => {
    const from = Math.max(record.changed.getTime(), start);
    const to = i + 1 < sorted.length ? sorted[i + 1].changed.getTime() : now.getTime();
    if (to > from) out.push({ record, ms: to - from });
  });
  return out;
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
  let ms = 0;
  if (options.on) {
    for (const { record, ms: lasted } of stretches(records, now)) if (options.on(record.state, record.attributes)) ms += lasted;
  }
  // Anything on today is at least a minute, so the summary never says "not on" beside an hour the strip draws on.
  return { samples, currentHour, minutes: ms > 0 ? Math.max(1, Math.round(ms / 60_000)) : 0 };
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

/**
 * Today for a robot vacuum, on the same on/off parser: an hour cleaning is on, any other state it reports (docked,
 * paused, in error) off, read through the mapper's names for its states, so an integration's `charging` or
 * `spot_cleaning` counts as Home Assistant's own would.
 */
export function vacuumHistoryFromHass(records: Records, entityId: string, now?: Date): VacuumHistory {
  const when = safeNow(now);
  const cleaning = (state: string) => vacuumStateOf(state).state === "cleaning";
  const { samples, currentHour, minutes } = build(only(records, entityId), when, {
    value: (state) => (vacuumStateOf(state).state === "unavailable" ? "unavailable" : cleaning(state) ? 1 : 0),
    on: cleaning,
  });
  return { samples, currentHour, cleaningMinutes: minutes };
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

/** What the unit did longest today while it ran (idle and off left out); heating or cooling wins a tie, else it was running. */
function climateActivity(records: readonly HaHistoryRecord[], now: Date): ClimateHistory["activity"] {
  const counts = new Map<string, number>();
  for (const { record, ms } of stretches(records, now)) {
    const action = record.attributes.hvac_action;
    if (typeof action !== "string" || action === "" || action === "idle" || action === "off") continue;
    counts.set(action, (counts.get(action) ?? 0) + ms);
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
  return { samples, currentHour, activeMinutes: minutes, activity: climateActivity(own, when) };
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

/**
 * How far a meter rose today: every numeric reading from the one in effect at local midnight (else the day's first)
 * to `now`, through `meterRise`. None before a reading.
 */
function todayRise(records: readonly HaHistoryRecord[], now: Date): number | undefined {
  const start = localMidnight(now).getTime();
  const sorted = upTo(records, now);
  let from = 0;
  while (from + 1 < sorted.length && sorted[from + 1].changed.getTime() <= start) from++;
  const values = sorted.slice(from).map((record) => numericState(record.state)).filter((x): x is number => typeof x === "number");
  return meterRise(values);
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

/** Today's numeric readings for any one sensor, carried forward hour by hour, and how far it rose today if a meter. */
export function readingHistoryFromHass(records: Records, entityId: string, now?: Date): NumericHistory {
  const when = safeNow(now);
  const own = only(records, entityId);
  const rise = todayRise(own, when);
  return { readings: buildReadings(own, when, numericState), currentHour: when.getHours(), ...(rise === undefined ? {} : { rise }) };
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

/* ------------------------------------------------------------------ *
 * Media player: the hours it was playing                              *
 * ------------------------------------------------------------------ */

/**
 * Today for a media player: 1 for hours it was playing (or buffering), 0 for any other state it can be in, and minutes
 * playing. `unknown` and `unavailable` hours are unavailable.
 */
export function mediaPlayerHistoryFromHass(records: Records, entityId: string, now?: Date): MediaPlayerHistory {
  const when = safeNow(now);
  const playing = (state: string) => {
    const s = mediaPlayerStateOf(state).state;
    return s === "playing" || s === "buffering";
  };
  const { samples, currentHour, minutes } = build(only(records, entityId), when, {
    value: (state) => (mediaPlayerStateOf(state).state === "unavailable" ? "unavailable" : playing(state) ? 1 : 0),
    on: playing,
  });
  return { samples, currentHour, playingMinutes: minutes };
}
