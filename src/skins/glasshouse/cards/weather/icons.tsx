import type { Sky } from "@dashhaus/core/entities/weather/conditions";

/** The weather's small glyph: a cloud over the sun. */
export function IconWeather() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5.5V4M3.8 7.8l-1-1M12.2 7.8l1-1M5 11a3 3 0 1 1 5.6-1.5" /><path d="M8.5 20h9a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 8.4 14 3 3 0 0 0 8.5 20Z" /></svg>;
}

/**
 * The sky drawn big on the weather's face: a sun, a moon or a cloud with what falls from it. The sun and the moon glow
 * warm, the cloud is frosted glass.
 */
export function SkyArt({ sky, night }: { sky: Sky; night: boolean }) {
  const orb = night
    ? <path className="glasshouse-weather-moon" d="M30 10a13 13 0 1 0 14 17A11 11 0 0 1 30 10Z" />
    : <circle className="glasshouse-weather-sun" cx="30" cy="22" r="11" />;
  const cloud = <path className="glasshouse-weather-cloud" d="M20 50h28a10 10 0 0 0 1.2-19.9A14 14 0 0 0 22.4 34 8 8 0 0 0 20 50Z" />;
  const below = sky === "rain" ? <path className="glasshouse-weather-fall" d="M26 55l-2 5M34 55l-2 5M42 55l-2 5" />
    : sky === "snow" ? <path className="glasshouse-weather-fall" d="M26 57h.01M34 59h.01M42 57h.01" />
    : sky === "storm" ? <path className="glasshouse-weather-bolt" d="m35 52-5 7h6l-4 6" />
    : sky === "fog" ? <path className="glasshouse-weather-fall" d="M18 56h30M22 61h22" />
    : sky === "wind" ? <path className="glasshouse-weather-fall" d="M12 40h22a5 5 0 1 0-5-5M14 48h30a5 5 0 1 1-5 5" />
    : null;
  return (
    <svg className="glasshouse-weather-art" viewBox="0 0 64 64" aria-hidden="true">
      {(sky === "clear" || sky === "partly") && orb}
      {sky !== "clear" && sky !== "wind" && cloud}
      {below}
    </svg>
  );
}
