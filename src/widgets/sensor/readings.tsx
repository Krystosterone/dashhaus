import { fmt1 } from "../../shared/ui";
import type { HourSample } from "../../shared/ui";
import type { Reading } from "./types";

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

/** Scale readings to 0.12-1 for the Today strip, keeping gaps and hours ahead. */
/** min and max are null when there is no reading yet today. */
export function normalize(series: Reading[]): { samples: HourSample[]; min: number | null; max: number | null } {
  const nums = series.filter((x): x is number => typeof x === "number");
  if (!nums.length) return { samples: series.map((x) => (typeof x === "number" ? 0 : x)), min: null, max: null };
  const min = Math.min(...nums), max = Math.max(...nums);
  const span = Math.max(max - min, 0.5);
  return { samples: series.map((x) => (typeof x === "number" ? 0.12 + (0.88 * (x - min)) / span : x)), min, max };
}

export const fmtTemp = (t: number) => fmt1(t);
export const fmtHum = (h: number) => String(Math.round(h));

const P = { fill: "none", stroke: "currentColor" } as const;
export const IconThermo = () => <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M8 11.6V4.5a2 2 0 1 1 4 0v7.1a3.5 3.5 0 1 1-4 0Z" /><path d="M10 9v5" /></svg>;
export const IconThermoOff = () => <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M8 11.6V4.5a2 2 0 1 1 4 0v7.1a3.5 3.5 0 1 1-4 0Z" /><path d="M3.5 3.5l13 13" /></svg>;
export const IconDrop = () => <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M10 3.2s5 5.3 5 8.6a5 5 0 0 1-10 0c0-3.3 5-8.6 5-8.6Z" /></svg>;
export function TrendIcon({ trend }: { trend: Trend }) {
  const d = trend === "rising" ? "M4 13l5-5 3 3 4-4M12 7h4v4" : trend === "falling" ? "M4 7l5 5 3-3 4 4M12 13h4V9" : "M3.5 10h13M13 7l3 3-3 3";
  return <svg className="sw-trend" viewBox="0 0 20 20" aria-hidden="true" {...P}><path d={d} /></svg>;
}
