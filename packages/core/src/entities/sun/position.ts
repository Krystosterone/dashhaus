import type { HourSample } from "../history";
import type { SunHistory } from "./types";

/**
 * Where the sun is, from a place and a time: a low-precision solar position (the Astronomical Almanac's, good to about
 * 0.01° this century), enough to draw today's path and to place the sun on it. Home Assistant's `sun` integration
 * says when the sun rises and sets; this only draws the path between, from the home's `latitude` and `longitude`.
 */

const RAD = Math.PI / 180;
const DAY = 86_400_000;

/** The elevation at which the sun rises and sets, with refraction and its own radius, as Home Assistant counts it. */
export const HORIZON = -0.833;
/** Civil twilight: dawn and dusk. */
export const TWILIGHT = -6;
/** How many steps the day's path is drawn in: one every 10 minutes. */
export const SUN_PATH_STEPS = 144;

/** The sun's elevation above the horizon in degrees, at `ms`, seen from `latitude` and `longitude` in degrees. */
export const sunElevation = (ms: number, latitude: number, longitude: number) => sunPosition(ms, latitude, longitude).elevation;

/**
 * Where the sun is at `ms`, seen from `latitude` and `longitude` in degrees: its elevation above the horizon, and its
 * azimuth, its compass bearing clockwise from north, both in degrees, as Home Assistant's attributes say them.
 */
export function sunPosition(ms: number, latitude: number, longitude: number) {
  const n = ms / DAY + 2440587.5 - 2451545.0;
  const meanLongitude = (280.46 + 0.9856474 * n) % 360;
  const anomaly = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly)) * RAD;
  const obliquity = (23.439 - 0.0000004 * n) * RAD;
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const siderealHours = (18.697374558 + 24.06570982441908 * n) % 24;
  const hourAngle = (siderealHours * 15 + longitude) * RAD - rightAscension;
  const lat = latitude * RAD;
  const sin = Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sin))) / RAD;
  const bearing = Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat)) / RAD + 180;
  return { elevation, azimuth: ((bearing % 360) + 360) % 360 };
}

/** Local midnight of the day `ms` falls on, and the next: a DST day is 23 or 25 hours. */
export function localDay(ms: number) {
  const d = new Date(ms);
  return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), end: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() };
}

/** Where the path crosses `level` going up and going down, as fractions of the day (linear between steps). */
function crossings(path: number[], level: number) {
  let up: number | undefined, down: number | undefined;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1] - level, b = path[i] - level;
    if (a < 0 && b >= 0 && up === undefined) up = (i - 1 + a / (a - b)) / (path.length - 1);
    if (a >= 0 && b < 0) down = (i - 1 + a / (a - b)) / (path.length - 1);
  }
  return { up, down };
}

/**
 * Today's path of the sun at a place, for the day `now` falls on: the elevation through the day, each hour's height
 * against the day's peak, where now, sunrise and sunset fall, and how long it is up.
 */
export function sunDay(now: number, latitude: number, longitude: number): SunHistory {
  const { start, end } = localDay(now);
  const length = end - start;
  const path = Array.from({ length: SUN_PATH_STEPS + 1 }, (_, i) => sunElevation(start + (length * i) / SUN_PATH_STEPS, latitude, longitude));
  const peak = Math.max(...path);
  const { up, down } = crossings(path, HORIZON);

  // The steps inside each clock hour, cut where the clock says it starts: a DST day has an hour of none, or one of two.
  const day = new Date(start);
  const step = (h: number) => (new Date(day.getFullYear(), day.getMonth(), day.getDate(), h).getTime() - start) * SUN_PATH_STEPS / length;
  const samples: HourSample[] = Array.from({ length: 24 }, (_, h) => {
    const top = Math.max(...path.slice(Math.ceil(step(h)), Math.floor(step(h + 1)) + 1));
    return peak > 0 && top > 0 ? Math.min(1, top / peak) : 0;
  });

  let daylight = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1] - HORIZON, b = path[i] - HORIZON;
    daylight += a >= 0 && b >= 0 ? 1 : a < 0 && b < 0 ? 0 : Math.max(a, b) / Math.abs(a - b);
  }

  const nowAt = Math.min(1, Math.max(0, (now - start) / length));
  return {
    path,
    samples,
    currentHour: new Date(now).getHours(),
    nowAt,
    riseAt: up,
    setAt: down,
    rise: up === undefined ? undefined : Math.round((start + up * length) / 60_000) * 60_000,
    set: down === undefined ? undefined : Math.round((start + down * length) / 60_000) * 60_000,
    peak,
    daylightMinutes: Math.round(((daylight / SUN_PATH_STEPS) * length) / 60_000),
  };
}

/** When the sun crosses `level` going up and down on the local day `ms` falls on, in ms, to the minute. */
function crossingTimes(ms: number, latitude: number, longitude: number, level: number) {
  const { start, end } = localDay(ms);
  const at = (from: number, to: number, rising: boolean) => {
    let lo = from, hi = to;
    while (hi - lo > 1000) {
      const mid = (lo + hi) / 2;
      const above = sunElevation(mid, latitude, longitude) >= level;
      if (above === rising) hi = mid; else lo = mid;
    }
    return Math.round(hi / 60_000) * 60_000;
  };
  const step = 10 * 60_000;
  let up: number | undefined, down: number | undefined, noon = start, top = -90;
  let before = sunElevation(start, latitude, longitude);
  for (let t = start + step; t <= end; t += step) {
    const e = sunElevation(t, latitude, longitude);
    if (before < level && e >= level && up === undefined) up = at(t - step, t, true);
    if (before >= level && e < level) down = at(t - step, t, false);
    if (e > top) { top = e; noon = t; }
    before = e;
  }
  // The peak to the minute: the path is flat at the top, so narrow in on it from the step either side.
  let lo = noon - step, hi = noon + step;
  while (hi - lo > 1000) {
    const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
    if (sunElevation(a, latitude, longitude) < sunElevation(b, latitude, longitude)) lo = a; else hi = b;
  }
  noon = Math.round((lo + hi) / 2 / 60_000) * 60_000;
  return { up, down, noon };
}

/** The next time each of the sun's events comes after `now`, within two days, as Home Assistant's attributes say. */
export interface SunEvents {
  nextDawn?: number;
  nextRising?: number;
  nextNoon?: number;
  nextSetting?: number;
  nextDusk?: number;
}

/**
 * The next dawn, sunrise, noon, sunset and dusk after `now` at a place, the way Home Assistant's `sun` integration
 * reports them: the seeds and the demo use it so their times and their path agree. An event that doesn't come
 * within two days (a polar day's sunset) is left out.
 */
export function sunEvents(now: number, latitude: number, longitude: number): SunEvents {
  const days = [now, localDay(now).end + 1, localDay(localDay(now).end + 1).end + 1];
  const first = (pick: (ms: number) => number | undefined) => days.map(pick).find((t): t is number => t !== undefined && t > now);
  const horizon = days.map((d) => crossingTimes(d, latitude, longitude, HORIZON));
  const twilight = days.map((d) => crossingTimes(d, latitude, longitude, TWILIGHT));
  const i = (d: number) => days.indexOf(d);
  return {
    nextDawn: first((d) => twilight[i(d)].up),
    nextRising: first((d) => horizon[i(d)].up),
    nextNoon: first((d) => horizon[i(d)].noon),
    nextSetting: first((d) => horizon[i(d)].down),
    nextDusk: first((d) => twilight[i(d)].down),
  };
}
