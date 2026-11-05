import { useHaWeather } from "@dashhaus/core";
import type { HaWeatherOptions } from "@dashhaus/core";
import { WeatherModule } from "../cards/weather/WeatherModule";
import type { WeatherModuleProps } from "../cards/weather/WeatherModule";

export interface HaWeatherModuleProps extends HaWeatherOptions, Pick<WeatherModuleProps, "footprint" | "defaultOpen"> {
  /** The Home Assistant entity id. */
  entityId: string;
}

/** A live, read-only weather module: the useHaWeather hook, with its AQI and sun companions and forecasts, above field's module. */
export function HaWeatherModule({ entityId, footprint, defaultOpen, ...options }: HaWeatherModuleProps) {
  const { entity, history, hourly, daily } = useHaWeather(entityId, options);
  return <WeatherModule entity={entity} history={history} hourly={hourly} daily={daily} footprint={footprint} defaultOpen={defaultOpen} />;
}
