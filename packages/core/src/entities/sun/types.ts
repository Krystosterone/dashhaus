import type { HourSample } from "../history";

/**
 * Mirrors Home Assistant's `sun.*` entity (the `sun` integration's `sun.sun`): whether the sun is up, and when it
 * next rises, sets, dawns, dusks and peaks. A reading: it has no actions and no warnings. Every time is in ms since
 * the epoch.
 */
export interface SunEntity {
  entityId: string;
  /** The entity's name: "Sun". */
  name: string;
  /** Its area: the `area` option, else the one Home Assistant's registries resolve; the sun usually has none. */
  area?: string;
  /** "unavailable" while it can't be read (`unknown`, `unavailable`, missing); "ok" otherwise. */
  state: "ok" | "unavailable";
  /** Above the horizon (`above_horizon`); omitted while it isn't known. Its active set (`isActive`). */
  up?: boolean;
  /** When it next rises and sets (`next_rising`, `next_setting`); omitted until Home Assistant reports them. */
  nextRising?: number;
  nextSetting?: number;
  /** When civil twilight next begins and ends (`next_dawn`, `next_dusk`), and the sun next peaks (`next_noon`). */
  nextDawn?: number;
  nextDusk?: number;
  nextNoon?: number;
  /** Its height above the horizon, in degrees (`elevation`): below zero at night. */
  elevation?: number;
  /** Its compass bearing, in degrees from north (`azimuth`). */
  azimuth?: number;
  /**
   * The minute the card counts from, in ms since the epoch: the hook's minute clock, or a seed's fixed minute.
   * "Sets in 4h 35m" and where the sun is drawn on today's path are counted from it.
   */
  now: number;
  /** When Home Assistant last updated it ("11:54"). */
  lastUpdated?: string;
  /** While it is unavailable, when it was last reachable. */
  lastSeen?: string;
}

/**
 * Today's path of the sun, worked out from the home's latitude and longitude (`sunDay`), from local midnight to the
 * next. Omitted where the location isn't known.
 */
export interface SunHistory {
  /** The sun's elevation in degrees, `SUN_PATH_STEPS + 1` points evenly spaced over the local day. */
  path: number[];
  /** Per hour, 0 to 1: the sun's highest elevation in that hour against the day's peak; 0 while it is down. */
  samples: HourSample[];
  currentHour: number;
  /** Where now falls in the day, 0 to 1. */
  nowAt: number;
  /** Where today's sunrise and sunset fall in the day, 0 to 1; omitted on a day it doesn't rise or set. */
  riseAt?: number;
  setAt?: number;
  /** When today's sunrise and sunset are, in ms since the epoch, from the path; omitted with `riseAt` and `setAt`. */
  rise?: number;
  set?: number;
  /** Today's highest elevation, in degrees. */
  peak: number;
  /** Minutes the sun is up today. */
  daylightMinutes: number;
}
