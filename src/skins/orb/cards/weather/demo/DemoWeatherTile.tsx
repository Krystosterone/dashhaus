import { WeatherTile } from "../WeatherTile";
import { WEATHER_SEEDS } from "./weather";
import type { WeatherSeedName, WeatherSeed } from "./weather";

export interface DemoWeatherTileProps {
  /** Which example weather to show. */
  weather: WeatherSeedName | WeatherSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: "compact" | "standard" | "featured";
  /** Compact only: false hides the reading; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

export function DemoWeatherTile({ weather, width, footprint, showControl, defaultOpen }: DemoWeatherTileProps) {
  const s = (typeof weather === "string" ? WEATHER_SEEDS[weather] : weather);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <WeatherTile entity={s.entity} history={s.history} hourly={s.hourly} daily={s.daily} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}
