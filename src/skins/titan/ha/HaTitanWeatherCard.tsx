import { useHaWeather } from "@dashhaus/core";
import type { HaWeatherOptions } from "@dashhaus/core";
import { TitanWeatherCard } from "../cards/weather/TitanWeatherCard";
import type { TitanWeatherCardProps } from "../cards/weather/TitanWeatherCard";

export interface HaTitanWeatherCardProps extends HaWeatherOptions, Pick<TitanWeatherCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaWeather hook above Titan's presentational Card. */
export function HaTitanWeatherCard({ entityId, footprint, defaultOpen, ...options }: HaTitanWeatherCardProps) {
  const result = useHaWeather(entityId, options);
  return <TitanWeatherCard entity={result.entity} history={result.history} footprint={footprint} defaultOpen={defaultOpen} />;
}
