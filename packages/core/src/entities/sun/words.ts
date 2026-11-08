import { hourCycleOf } from "../clock";
import type { HourCycle } from "../clock";
import { fmtDuration } from "../format";
import { clockTime, dayWord } from "../calendar/words";
import type { SunEntity, SunHistory } from "./types";

/**
 * What the sun says, the same on every card and in every skin (spec/cards.md → What every card says). Times are on
 * the dashboard's hour cycle ("20:30", or "8:30 PM"; each function's `hourCycle`, the card's `useHourCycle`, the
 * browser locale's when left out), as the calendar's and the weather's are, and every word is counted from the
 * entity's `now`, never a timer of the card's own.
 */
export const SUN_WORDS = {
  sunrise: "Sunrise",
  sunset: "Sunset",
  dawn: "Dawn",
  dusk: "Dusk",
  noon: "Noon",
  /** No times reported yet: the readout's and a compact row's cue. */
  waiting: "Waiting…",
  /** No times reported yet: the status line, a screen's words and what a screen reader hears, as every reading says it. */
  noReading: "No reading yet",
  /** The state `todaySummary` takes for today's daylight: "Daylight 10h 52m". */
  daylight: "daylight",
  /** A day it never rises, at the poles. */
  noDaylight: "No daylight today",
  /** Up with no sunset reported within two days, as in a polar summer: the figure and the status line. */
  upAllDay: "Up all day",
  /** Down with no sunrise reported within two days, as in a polar winter. */
  downAllDay: "Down all day",
  /** The details' list of what comes next. */
  next: "Next",
  elevation: "Elevation",
  azimuth: "Azimuth",
  /** Today's path said aloud. */
  pathSaid: "The sun's path today",
} as const;

export type SunEventKind = "dawn" | "rising" | "noon" | "setting" | "dusk";

export interface SunEvent {
  kind: SunEventKind;
  at: number;
}

/** Its active set (spec/cards.md → One active signal): the sun above the horizon. */
export const isActive = (e: Pick<SunEntity, "state" | "up">) => e.state === "ok" && e.up === true;

/**
 * What comes next, the one the card leads with: while the sun is up, when it sets; while it is down, when it rises.
 * Omitted until Home Assistant reports it (a polar day reports no setting for weeks).
 */
export function sunNext(e: SunEntity): SunEvent | undefined {
  if (e.state !== "ok" || e.up === undefined) return undefined;
  const at = e.up ? e.nextSetting : e.nextRising;
  return at === undefined ? undefined : { kind: e.up ? "setting" : "rising", at };
}

/**
 * What it says in place of the next event when none is reported: "Up all day" or "Down all day"; nothing while it
 * isn't known whether it is up, or while an event is reported.
 */
export function sunAllDay(e: SunEntity) {
  if (e.state !== "ok" || e.up === undefined || sunNext(e)) return undefined;
  return e.up ? SUN_WORDS.upAllDay : SUN_WORDS.downAllDay;
}

/** The other of the two, the card's second figure: while it is up, the next sunrise; while it is down, the next sunset. */
export function sunAfter(e: SunEntity): SunEvent | undefined {
  if (e.state !== "ok" || e.up === undefined) return undefined;
  const at = e.up ? e.nextRising : e.nextSetting;
  return at === undefined ? undefined : { kind: e.up ? "rising" : "setting", at };
}

const NAME: Record<SunEventKind, string> = { dawn: SUN_WORDS.dawn, rising: SUN_WORDS.sunrise, noon: SUN_WORDS.noon, setting: SUN_WORDS.sunset, dusk: SUN_WORDS.dusk };
const VERB: Record<SunEventKind, string> = { dawn: "Dawn", rising: "Rises", noon: "Noon", setting: "Sets", dusk: "Dusk" };

/** An event's name: "Sunset", "Dawn". */
export const sunEventName = (kind: SunEventKind) => NAME[kind];

/** Minutes until it comes, rounded up, so an event a few seconds off is "in 1m", never "in 0m". */
export const minutesUntil = (at: number, now: number) => Math.max(1, Math.ceil((at - now) / 60_000));

/** The figure: when it comes on the dashboard's hour cycle, "20:30" or "8:30 PM". */
export const sunTime = (event: SunEvent, hourCycle: HourCycle = hourCycleOf()) => clockTime(event.at, hourCycle);

/**
 * When it comes, as one line: within a day how long until it ("Sets in 4h 35m", "Rises in 9m"); further off, on which
 * day ("Rises Thu", as a polar night's sunrise does).
 */
export function sunWhen(event: SunEvent, now: number) {
  const minutes = minutesUntil(event.at, now);
  return minutes < 24 * 60 ? `${VERB[event.kind]} in ${fmtDuration(minutes)}` : `${VERB[event.kind]} ${dayWord(event.at, now)}`;
}

/**
 * When it comes, without the verb, where its name is already said beside it (Field's meta line under "Sunset"): within
 * a day "In 4h 35m", further off its day, "Thu".
 */
export function sunIn(event: SunEvent, now: number) {
  const minutes = minutesUntil(event.at, now);
  return minutes < 24 * 60 ? `In ${fmtDuration(minutes)}` : dayWord(event.at, now);
}

/** What a screen reader hears for it: "Sunset at 20:30, sets in 4h 35m", or on 12 hours "Sunset at 8:30 PM, …". */
export const sunSaid = (event: SunEvent, now: number, hourCycle: HourCycle = hourCycleOf()) =>
  `${NAME[event.kind]} at ${sunTime(event, hourCycle)}, ${sunWhen(event, now).toLowerCase()}`;

/** Every event Home Assistant reports, in the order they come: the details' list. */
export function sunSchedule(e: SunEntity): SunEvent[] {
  if (e.state !== "ok") return [];
  const all: Array<[SunEventKind, number | undefined]> = [["dawn", e.nextDawn], ["rising", e.nextRising], ["noon", e.nextNoon], ["setting", e.nextSetting], ["dusk", e.nextDusk]];
  return all.filter((x): x is [SunEventKind, number] => x[1] !== undefined).map(([kind, at]) => ({ kind, at })).sort((a, b) => a.at - b.at);
}

/**
 * When an event in the list comes: "20:30" today, else its day first, "Tomorrow 06:12"; on 12 hours "8:30 PM",
 * "Tomorrow 6:12 AM".
 */
export function scheduleTime(event: SunEvent, now: number, hourCycle: HourCycle = hourCycleOf()) {
  const day = dayWord(event.at, now);
  const time = clockTime(event.at, hourCycle);
  return day === "Today" ? time : `${day} ${time}`;
}

/** An angle in whole degrees: "38°", "-12°". */
export const degrees = (value: number) => `${Math.round(value) === 0 ? 0 : Math.round(value)}°`;

/** Where the sun is, for the small print: "Elevation 38° · Azimuth 241°". */
export function positionFact(e: Pick<SunEntity, "elevation" | "azimuth">) {
  return [
    e.elevation !== undefined ? `${SUN_WORDS.elevation} ${degrees(e.elevation)}` : undefined,
    e.azimuth !== undefined ? `${SUN_WORDS.azimuth} ${degrees(e.azimuth)}` : undefined,
  ].filter(Boolean).join(" · ") || undefined;
}

/** Today's daylight, as the path's caption says it: "Daylight 10h 52m", or "No daylight today". */
export function daylightSummary(day: Pick<SunHistory, "daylightMinutes">) {
  return day.daylightMinutes > 0 ? `Daylight ${fmtDuration(day.daylightMinutes)}` : SUN_WORDS.noDaylight;
}
