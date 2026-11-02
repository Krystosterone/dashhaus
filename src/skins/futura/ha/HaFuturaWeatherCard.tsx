import { useHaWeather } from "@dashhaus/core";
import type { HaWeatherOptions } from "@dashhaus/core";
import { FuturaWeatherCard } from "../cards/weather/FuturaWeatherCard";
import type { FuturaWeatherCardProps } from "../cards/weather/FuturaWeatherCard";

export interface HaFuturaWeatherCardProps extends HaWeatherOptions, Pick<FuturaWeatherCardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHaWeather hook above Futura's presentational Card. */
export function HaFuturaWeatherCard({ entityId, footprint, defaultOpen, ...options }: HaFuturaWeatherCardProps) {
  const result = useHaWeather(entityId, options);
  return <FuturaWeatherCard entity={result.entity} history={result.history} footprint={footprint} defaultOpen={defaultOpen} />;
}
