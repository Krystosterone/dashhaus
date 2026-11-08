import type { SunEntity, SunHistory } from "../entities/sun/types";
import { sunDay, sunEvents, sunPosition } from "../entities/sun/position";
import { clockTime } from "../entities/calendar/words";

/**
 * Example data for stories. Each seed is a fixed minute at a fixed latitude, its times and today's path worked out
 * by core's own solar position, so they agree. The longitude follows the local time zone (15° an hour), so solar noon
 * falls near 12:00 wherever the stories are drawn and a screenshot reads the same in every zone.
 */
const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month - 1, day, hour, minute).getTime();
/** The seeds' usual minute: Monday 19 October 2026, 11:54, as the calendar's. */
export const SUN_NOW = at(10, 19, 11, 54);

/** The longitude whose solar noon is the local zone's midday on the day `ms` falls on. */
const zoneLongitude = (ms: number) => -new Date(ms).getTimezoneOffset() / 4;

export interface SunSeed { entity: SunEntity; history?: SunHistory }

/** The latitude the usual seeds are drawn at: Montréal's. */
export const SUN_LATITUDE = 45.5;

/** A seed at a minute and a latitude: what Home Assistant would report there, and today's path. */
function seed(now: number, latitude: number, entity: Partial<SunEntity> = {}): SunSeed {
  const longitude = zoneLongitude(now);
  const { elevation, azimuth } = sunPosition(now, latitude, longitude);
  const full: SunEntity = {
    entityId: "sun.sun",
    name: "Sun",
    state: "ok",
    up: elevation >= -0.833,
    ...sunEvents(now, latitude, longitude),
    elevation: Math.round(elevation * 100) / 100,
    azimuth: Math.round(azimuth * 100) / 100,
    now,
    // Written on 24 hours, as every seed is; `onHourCycle` says it on another clock.
    lastUpdated: clockTime(now - 4 * 60_000, "h23"),
    ...entity,
  };
  return { entity: full, history: sunDay(now, latitude, longitude) };
}

const SEEDS = {
  /** Late morning: up, and it sets at the end of the afternoon. */
  normal: seed(SUN_NOW, SUN_LATITUDE),
  /** The evening: down since sunset, and it rises tomorrow. */
  evening: seed(at(10, 19, 20, 40), SUN_LATITUDE),
  /** Just before sunrise, in the dawn: a countdown of minutes. */
  dawn: seed(at(10, 19, 6, 5), SUN_LATITUDE),
  /** A summer afternoon at the same latitude: a long day, setting near 20:00. */
  summer: seed(at(6, 21, 15, 55), SUN_LATITUDE),
  /** High in the Arctic in June: up, and no sunset reported for weeks. */
  polarDay: seed(at(6, 21, 11, 54), 78.2, { name: "Sun in Longyearbyen" }),
  /** Reachable, but Home Assistant hasn't reported where it is yet. */
  waiting: { entity: { entityId: "sun.sun", name: "Sun", state: "ok", now: SUN_NOW } },
  unavailable: { entity: { entityId: "sun.sun", name: "Sun", state: "unavailable", now: SUN_NOW, lastSeen: "08:20" }, history: seed(SUN_NOW, SUN_LATITUDE).history },
  /** Worst case: a long name and area, in the polar night: down, with no sunrise reported for weeks (break-ui skill). */
  long: seed(at(12, 21, 11, 54), 78.2, { name: "Sun over the back garden by the allotments", area: "Outside the primary bedroom and walk-in closet" }),
} satisfies Record<string, SunSeed>;

export type SunSeedName = keyof typeof SEEDS;
export const SUN_SEEDS: Record<SunSeedName, SunSeed> = SEEDS;

/** Worst-case data: the card's Worst case story and Orb → Foundations → Worst case both draw these. */
export const SUN_WORST_CASE: SunSeed[] = [SUN_SEEDS.long, SUN_SEEDS.polarDay];
