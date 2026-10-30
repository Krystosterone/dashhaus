import { CONDITION_LABEL, toKmh } from "./conditions";
import type { Condition, DailyForecast, HourlyForecast, WeatherEntity, WeatherHistory } from "./types";

/** The night sky: a clear night, or the sun down. Unknown daylight keeps the day rather than guessing night. */
export const isNight = (e: WeatherEntity) => e.state === "clear-night" || e.isDay === false;

/** The condition in words; a sunny state after dark reads "Clear". */
export const conditionLabel = (c: Condition, night: boolean) => (night && c === "sunny" ? "Clear" : CONDITION_LABEL[c]);

/** Whole degrees, never "-0°". */
export const deg0 = (t: number) => `${Math.round(t) || 0}°`;

/** US AQI bands. */
export function aqiBand(aqi: number): { label: string; short: string } {
  if (aqi <= 50) return { label: "Good", short: "Good" };
  if (aqi <= 100) return { label: "Moderate", short: "Moderate" };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", short: "Sensitive" };
  if (aqi <= 200) return { label: "Unhealthy", short: "Unhealthy" };
  if (aqi <= 300) return { label: "Very unhealthy", short: "Very poor" };
  return { label: "Hazardous", short: "Hazardous" };
}

/** WHO UV index bands. */
export function uvBand(uv: number): { label: string } {
  if (uv < 3) return { label: "Low" };
  if (uv < 6) return { label: "Moderate" };
  if (uv < 8) return { label: "High" };
  if (uv < 11) return { label: "Very high" };
  return { label: "Extreme" };
}

/** Air over this US AQI is a warning. */
export const AQI_WARN = 100;
/** Gusts from this speed are a warning. */
export const GUST_WARN_KMH = 50;
/** A UV index from "Very high" up is a warning. */
export const UV_WARN = 8;

export const airWarns = (e: WeatherEntity) => e.aqi != null && e.aqi > AQI_WARN;
export const gustWarns = (e: WeatherEntity) => e.windGustSpeed != null && toKmh(e.windGustSpeed, e.windSpeedUnit) >= GUST_WARN_KMH;
export const uvWarns = (e: WeatherEntity) => e.uvIndex != null && e.uvIndex >= UV_WARN;

/** What about the weather is worth acting on, most urgent first: poor air, strong gusts, high UV. None while unavailable. */
export function weatherWarnings(e: WeatherEntity): string[] {
  if (e.state === "unavailable") return [];
  return [
    airWarns(e) ? (e.aqi! > 300 ? "Hazardous air" : e.aqi! > 200 ? "Very poor air" : "Poor air") : null,
    gustWarns(e) ? `Gusts ${Math.round(e.windGustSpeed!)} ${e.windSpeedUnit}` : null,
    uvWarns(e) ? `${uvBand(e.uvIndex!).label} UV` : null,
  ].filter((x): x is string => !!x);
}

/**
 * Today's low and high: the readings so far, the rest of today's hourly forecast, now, and the daily forecast's
 * today. Null with nothing to go on.
 */
export function todayRange(now: number | undefined, history?: WeatherHistory, hourly?: HourlyForecast[], daily?: DailyForecast[]): { low: number; high: number } | null {
  const hour = history?.currentHour ?? 0;
  const seen = (history?.temperature ?? []).filter((x): x is number => typeof x === "number");
  const ahead = (hourly ?? []).filter((h) => h.hour > hour && h.hour < 24).map((h) => h.temperature);
  const all = [...seen, ...ahead, ...(now != null ? [now] : []), ...(daily?.[0] ? [daily[0].low, daily[0].high] : [])];
  return all.length ? { low: Math.min(...all), high: Math.max(...all) } : null;
}

/**
 * A low–high in whole degrees ("2°–8°"). A dash beside a minus sign misreads ("-3°–-1°"), so a range below zero is
 * spelled out ("-3° to -1°"). Null when both round to one degree.
 */
export function rangeText(range: { low: number; high: number } | null): string | null {
  if (!range || Math.round(range.high) === Math.round(range.low)) return null;
  return `${deg0(range.low)}${Math.round(range.high) < 0 ? " to " : "–"}${deg0(range.high)}`;
}
