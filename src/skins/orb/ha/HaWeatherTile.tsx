import { useHaWeather } from "@dashhaus/core";
import type { HaWeatherOptions } from "@dashhaus/core";
import { WeatherTile } from "../cards/weather/WeatherTile";
import type { WeatherTileProps } from "../cards/weather/WeatherTile";

export interface HaWeatherTileProps extends HaWeatherOptions, Omit<WeatherTileProps, "entity" | "history" | "hourly" | "daily"> {
  entityId: string;
}

/** A live weather tile: the useHaWeather hook above the presentational tile. */
export function HaWeatherTile({
  entityId,
  aqiEntityId,
  aqiScale,
  sunEntityId,
  name,
  lastSeen,
  temperatureUnit,
  windSpeedUnit,
  pressureUnit,
  hourly,
  daily,
  history,
  loadHistory,
  loadForecasts,
  onForecastError,
  ...props
}: HaWeatherTileProps) {
  const weather = useHaWeather(entityId, { aqiEntityId, aqiScale, sunEntityId, name, lastSeen, temperatureUnit, windSpeedUnit, pressureUnit, hourly, daily, history, loadHistory, loadForecasts, onForecastError });
  return <WeatherTile {...props} entity={weather.entity} history={weather.history} hourly={weather.hourly} daily={weather.daily} />;
}
