import type { Condition } from "../../../../domains/weather/types";
import { SKY } from "../../../../domains/weather/conditions";

/** US AQI bands, with a tone each: green, butter, apricot, red, violet, maroon. */
export function aqiBand(aqi: number): { label: string; short: string; h: number; c: number } {
  if (aqi <= 50) return { label: "Good", short: "Good", h: 150, c: 0.11 };
  if (aqi <= 100) return { label: "Moderate", short: "Moderate", h: 95, c: 0.13 };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", short: "Sensitive", h: 60, c: 0.14 };
  if (aqi <= 200) return { label: "Unhealthy", short: "Unhealthy", h: 30, c: 0.15 };
  if (aqi <= 300) return { label: "Very unhealthy", short: "Very poor", h: 330, c: 0.12 };
  return { label: "Hazardous", short: "Hazardous", h: 10, c: 0.12 };
}

/** WHO UV index bands. */
export function uvBand(uv: number): { label: string; h: number; c: number } {
  if (uv < 3) return { label: "Low", h: 150, c: 0.11 };
  if (uv < 6) return { label: "Moderate", h: 95, c: 0.13 };
  if (uv < 8) return { label: "High", h: 60, c: 0.14 };
  if (uv < 11) return { label: "Very high", h: 30, c: 0.15 };
  return { label: "Extreme", h: 330, c: 0.12 };
}

/* ---------- Icons: 20px, stroked like the rest of the set ---------- */
const P = { fill: "none", stroke: "currentColor" } as const;
const CLOUD = "M6.2 15.5h8a3.2 3.2 0 0 0 .4-6.4 4.4 4.4 0 0 0-8.5 1.1 2.7 2.7 0 0 0 .1 5.3Z";
const CLOUD_UP = "M6.2 12.5h8a3.2 3.2 0 0 0 .4-6.4 4.4 4.4 0 0 0-8.5 1.1 2.7 2.7 0 0 0 .1 5.3Z";

export function ConditionIcon({ condition, night }: { condition: Condition | "unavailable"; night?: boolean }) {
  if (condition === "unavailable") {
    return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d={CLOUD} /><path d="M3.5 3.5l13 13" /></svg>;
  }
  const sky = SKY[condition];
  const dark = night || condition === "clear-night";
  switch (sky) {
    case "clear":
      return dark
        ? <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M15 12.4A5.6 5.6 0 0 1 7.6 5a5.6 5.6 0 1 0 7.4 7.4Z" /></svg>
        : <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><circle cx="10" cy="10" r="3.4" /><path d="M10 2.8v1.6M10 15.6v1.6M2.8 10h1.6M15.6 10h1.6M4.9 4.9l1.1 1.1M14 14l1.1 1.1M4.9 15.1 6 14M14 6l1.1-1.1" /></svg>;
    case "partly":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}>{dark ? <path d="M9.4 6.2A3.6 3.6 0 0 1 4.6 2.6a3.6 3.6 0 1 0 4.8 4.8" transform="translate(1 1)" /> : <><circle cx="7" cy="7" r="2.4" /><path d="M7 2.4v.9M2.4 7h.9M3.8 3.8l.6.6M10.2 3.8l-.6.6" /></>}<path d="M7.6 16h7a2.8 2.8 0 0 0 .3-5.6 3.8 3.8 0 0 0-7.3 1 2.3 2.3 0 0 0 0 4.6Z" /></svg>;
    case "cloudy":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d={CLOUD} /></svg>;
    case "fog":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d={CLOUD_UP} /><path d="M4 15.5h12M6 18h8" /></svg>;
    case "rain":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d={CLOUD_UP} /><path d="M7 14.5l-.8 2.2M10.4 14.5l-.8 2.2M13.8 14.5 13 16.7" /></svg>;
    case "snow":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d={CLOUD_UP} /><path d="M7 15.5h.01M10 17h.01M13 15.5h.01" strokeWidth="2.2" /></svg>;
    case "storm":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d={CLOUD_UP} /><path d="M10.6 13.5 9 16h2.2l-1.4 2.5" /></svg>;
    case "wind":
      return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M3 8h9.5a2.3 2.3 0 1 0-2.2-2.9M3 11.5h12.5a2.3 2.3 0 1 1-2.2 2.9M3 15h6" /></svg>;
  }
}
