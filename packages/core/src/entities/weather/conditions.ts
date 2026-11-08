import { hourCycleOf, timeOfDay } from "../clock";
import type { HourCycle } from "../clock";
import type { Condition, HourlyForecast, WeatherEntity } from "./types";

export const CONDITION_LABEL: Record<Condition, string> = {
  sunny: "Sunny",
  "clear-night": "Clear",
  partlycloudy: "Partly cloudy",
  cloudy: "Cloudy",
  fog: "Fog",
  rainy: "Rain",
  pouring: "Heavy rain",
  snowy: "Snow",
  "snowy-rainy": "Sleet",
  hail: "Hail",
  lightning: "Thunder",
  "lightning-rainy": "Thunderstorms",
  windy: "Windy",
  "windy-variant": "Windy, cloudy",
  exceptional: "Severe weather",
};

/** What the sky draws: a few kinds cover every HA condition. */
export type Sky = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm" | "wind";
export const SKY: Record<Condition, Sky> = {
  sunny: "clear", "clear-night": "clear", partlycloudy: "partly", cloudy: "cloudy", fog: "fog",
  rainy: "rain", pouring: "rain", snowy: "snow", "snowy-rainy": "snow", hail: "snow",
  lightning: "storm", "lightning-rainy": "storm", windy: "wind", "windy-variant": "wind", exceptional: "storm",
};
const WET = new Set<Sky>(["rain", "snow", "storm"]);
export const isWet = (c: Condition) => WET.has(SKY[c]);

/** An hour of the day on the dashboard's hour cycle, "14:00" or "2:00 PM"; hours past midnight wrap. */
export const clock = (hour: number, hourCycle: HourCycle = hourCycleOf()) => timeOfDay(hour % 24, 0, hourCycle);

/**
 * Rain or snow over the next 12 hours, from the hourly forecast: when it stops if it's falling now
 * ("Rain until 15:00"), or when it starts, with its chance if known ("70% rain at 14:00"), on the dashboard's hour
 * cycle ("70% rain at 2:00 PM"). Null when the sky stays as it is.
 */
export function precipitation(now: Condition, hourly: HourlyForecast[] | undefined, currentHour: number, hourCycle: HourCycle = hourCycleOf()): string | null {
  if (!hourly) return null;
  const wet = isWet(now);
  const next = hourly.find((h) => h.hour > currentHour && h.hour <= currentHour + 12 && isWet(h.condition) !== wet);
  if (!next) return null;
  const at = clock(next.hour, hourCycle);
  if (wet) return `${CONDITION_LABEL[now]} until ${at}`;
  const kind = SKY[next.condition] === "snow" ? "snow" : SKY[next.condition] === "storm" ? "storms" : "rain";
  const p = next.precipitationProbability;
  return p != null ? `${Math.round(p)}% ${kind} at ${at}` : `${kind[0].toUpperCase()}${kind.slice(1)} at ${at}`;
}

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const compass = (deg: number) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

export const toKmh = (v: number, unit: WeatherEntity["windSpeedUnit"]) => (unit === "km/h" ? v : unit === "mph" ? v * 1.609 : v * 3.6);
