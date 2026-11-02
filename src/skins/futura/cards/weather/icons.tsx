import type { Condition } from "@dashhaus/core/entities/weather/types";
import { SKY } from "@dashhaus/core/entities/weather/conditions";

const SUN = "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4";
const MOON = "M17.5 14.5A6.5 6.5 0 0 1 9.5 6.5a6.5 6.5 0 1 0 8 8Z";
const CLOUD = "M7 18.5h10a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.6 10 4.3 4.3 0 0 0 7 18.5Z";
const PATHS = {
  clear: SUN,
  partly: "M8.5 4v1.5M3.5 9H5M5 5.5 6 6.5M12.3 7.3a3.5 3.5 0 0 0-6.2 3.2M8 19.5h9a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.7-1.2A3.6 3.6 0 0 0 8 19.5Z",
  cloudy: CLOUD,
  fog: "M4 9h16M6 13h12M4 17h16",
  rain: "M7 14.5h10a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.6 6 4.3 4.3 0 0 0 7 14.5ZM9 17.5l-1 2M13 17.5l-1 2M17 17.5l-1 2",
  snow: "M7 14.5h10a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.6 6 4.3 4.3 0 0 0 7 14.5ZM8.5 18.5h.01M12 20h.01M15.5 18.5h.01",
  storm: "M7 14.5h10a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 7.6 6 4.3 4.3 0 0 0 7 14.5ZM12.5 15l-2 3.5h3l-2 3",
  wind: "M3.5 9h11a2.5 2.5 0 1 0-2.5-2.5M3.5 13h15a2.5 2.5 0 1 1-2.5 2.5M3.5 17h7",
} as const;

/** The sky for an HA condition; a clear sky at night is the moon. */
export function IconWeather({ condition, night }: { condition?: Condition; night?: boolean }) {
  const sky = condition ? SKY[condition] : "cloudy";
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={sky === "clear" && night ? MOON : PATHS[sky] ?? CLOUD} /></svg>;
}
