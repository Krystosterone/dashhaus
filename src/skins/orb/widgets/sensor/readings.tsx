import { fmt1, normalizeReadings } from "../../shared/ui";
import type { Reading } from "../../../../domains/sensor/types";

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
/** Compare the current hour with the hour before. */
export function trendOf(series: Reading[] | undefined, hour: number, threshold = 0.3): Trend | null {
  if (!series) return null;
  const now = series[hour], before = series[hour - 1];
  if (typeof now !== "number" || typeof before !== "number") return null;
  const d = now - before;
  return d > threshold ? "rising" : d < -threshold ? "falling" : "steady";
}

/** Scale readings for the Today strip; a temperature day spans at least half a degree. */
export const normalize = (series: Reading[]) => normalizeReadings(series, 0.5);

export const fmtTemp = (t: number) => fmt1(t);
export const fmtHum = (h: number) => String(Math.round(h));

const P = { fill: "none", stroke: "currentColor" } as const;
export const IconThermo = () => <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M8 11.6V4.5a2 2 0 1 1 4 0v7.1a3.5 3.5 0 1 1-4 0Z" /><path d="M10 9v5" /></svg>;
export const IconThermoOff = () => <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M8 11.6V4.5a2 2 0 1 1 4 0v7.1a3.5 3.5 0 1 1-4 0Z" /><path d="M3.5 3.5l13 13" /></svg>;
