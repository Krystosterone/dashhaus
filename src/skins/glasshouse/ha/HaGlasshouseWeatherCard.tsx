import { useHaWeather } from "@dashhaus/core";
import type { HaWeatherOptions } from "@dashhaus/core";
import { GlasshouseWeatherCard } from "../cards/weather/GlasshouseWeatherCard";
import type { GlasshouseWeatherCardProps } from "../cards/weather/GlasshouseWeatherCard";

export interface HaGlasshouseWeatherCardProps extends HaWeatherOptions, Pick<GlasshouseWeatherCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaWeather hook above Glasshouse's presentational Card, with its forecasts. */
export function HaGlasshouseWeatherCard({ entityId, footprint, defaultOpen, ...options }: HaGlasshouseWeatherCardProps) {
  const result = useHaWeather(entityId, options);
  return <GlasshouseWeatherCard entity={result.entity} history={result.history} hourly={result.hourly} daily={result.daily} footprint={footprint} defaultOpen={defaultOpen} />;
}
