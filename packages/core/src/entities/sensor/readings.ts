import { fmt1 } from "../format";
import { normalizeReadings } from "../history";
import type { Reading } from "../history";
import type { SensorEntity } from "./types";

/** Tones and comfort bands are in Celsius; convert Fahrenheit readings first. */
export const toCelsius = (t: number, unit: "°C" | "°F") => (unit === "°F" ? ((t - 32) * 5) / 9 : t);

/** Plain-language comfort for indoor sensors, for example "Comfortable" or "Cool, dry". */
export function comfortLabel(t?: number, h?: number, outdoor?: boolean): string {
  if (outdoor || (t == null && h == null)) return "";
  const parts: string[] = [];
  if (t != null) { if (t < 18) parts.push("Cool"); else if (t > 25) parts.push("Warm"); }
  if (h != null) { if (h < 30) parts.push("Dry"); else if (h > 60) parts.push("Humid"); }
  if (!parts.length) return "Comfortable";
  return [parts[0], ...parts.slice(1).map((x) => x.toLowerCase())].join(", ");
}

export type Trend = "rising" | "falling" | "steady";
export const TREND_WORD: Record<Trend, string> = { rising: "Rising", falling: "Falling", steady: "Steady" };

/** Compare the current hour with the hour before. */
export function trendOf(series: Reading[] | undefined, hour: number, threshold = 0.3): Trend | null {
  if (!series) return null;
  const now = series[hour], before = series[hour - 1];
  if (typeof now !== "number" || typeof before !== "number") return null;
  const d = now - before;
  return d > threshold ? "rising" : d < -threshold ? "falling" : "steady";
}

/** At or under this battery percentage a sensor asks for a new battery. */
export const LOW_BATTERY = 15;

/** A reachable sensor whose battery is at or under LOW_BATTERY. */
export const lowBattery = (e: SensorEntity) => e.state !== "unavailable" && e.battery != null && e.battery <= LOW_BATTERY;

/** Scale readings for a Today strip; a temperature or humidity day spans at least half a unit. */
export const normalize = (series: Reading[]) => normalizeReadings(series, 0.5);

export const fmtTemp = (t: number) => fmt1(t);
export const fmtHum = (h: number) => String(Math.round(h));
