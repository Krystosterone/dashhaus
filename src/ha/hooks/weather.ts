import { useEffect, useMemo, useRef } from "react";
import type { DailyForecast, HourlyForecast, WeatherEntity, WeatherHistory } from "../../domains/weather/types";
import { forecastFromHass, weatherFromHass } from "../mappers/weather";
import { weatherHistoryFromHass } from "../history";
import { useHaHistory } from "../useHaHistory";
import { useNow } from "../../hooks/useNow";
import type { HaStore } from "../types";
import { useHaEntity } from "../provider";
import { useHaRequest } from "../useHaRequest";

type Forecasts = { hourly: HourlyForecast[]; daily: DailyForecast[] };
type ForecastType = keyof Forecasts;

const fetchForecast = (store: HaStore, entityId: string, type: ForecastType) => store.query("weather", "get_forecasts", { type }, {
  target: { entity_id: entityId },
  returnResponse: true,
});

/** Read one forecast type once per hour; the previous hour's forecast stays up while the next loads. */
function useForecast<K extends ForecastType>(entityId: string, type: K, load: boolean, hour: number, onError: (error: unknown) => void) {
  const { value, error } = useHaRequest(
    load ? `forecast:${entityId}:${type}:${hour}` : undefined,
    (store) => fetchForecast(store, entityId, type),
    { keepPrevious: true },
  );
  useEffect(() => {
    if (error !== undefined) onError(error);
    // The error object identifies one failed read; the callback is read through a ref by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);
  return useMemo(() => {
    if (value === undefined) return undefined;
    return (type === "hourly" ? forecastFromHass(value, entityId, "hourly") : forecastFromHass(value, entityId, "daily")) as Forecasts[K];
  }, [value, entityId, type]);
}

export interface HaWeatherOptions {
  aqiEntityId?: string;
  /** Explicit host-owned assertion that the companion uses the US AQI scale. */
  aqiScale?: "US";
  sunEntityId?: string;
  name?: string;
  lastSeen?: string;
  temperatureUnit?: WeatherEntity["temperatureUnit"];
  windSpeedUnit?: WeatherEntity["windSpeedUnit"];
  pressureUnit?: WeatherEntity["pressureUnit"];
  hourly?: HourlyForecast[];
  daily?: DailyForecast[];
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: WeatherHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  /** Set false when forecasts are supplied by another application-owned query. */
  loadForecasts?: boolean;
  onForecastError?: (error: unknown) => void;
}

export interface HaWeather {
  entity: WeatherEntity;
  history: WeatherHistory;
  /** Undefined until the first forecast read settles. */
  hourly?: HourlyForecast[];
  daily?: DailyForecast[];
}

/** One live weather entity for any UI: its conditions with AQI and sun companions, today's history and the forecasts. */
export function useHaWeather(entityId: string, {
  aqiEntityId,
  aqiScale,
  sunEntityId,
  name,
  lastSeen,
  temperatureUnit,
  windSpeedUnit,
  pressureUnit,
  hourly: providedHourly,
  daily: providedDaily,
  history,
  loadHistory = true,
  loadForecasts = true,
  onForecastError,
}: HaWeatherOptions = {}): HaWeather {
  const raw = useHaEntity(entityId);
  const aqiEntity = useHaEntity(aqiEntityId ?? "");
  const sunEntity = useHaEntity(sunEntityId ?? "");
  const onForecastErrorRef = useRef(onForecastError);
  onForecastErrorRef.current = onForecastError;
  const reportForecastError = (error: unknown) => onForecastErrorRef.current?.(error);

  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => weatherHistoryFromHass(records, entityId, now), [records, entityId, now]);

  const hour = Math.floor(now.getTime() / 3_600_000);
  const hourly = useForecast(entityId, "hourly", loadForecasts && providedHourly === undefined, hour, reportForecastError);
  const daily = useForecast(entityId, "daily", loadForecasts && providedDaily === undefined, hour, reportForecastError);

  const entity = useMemo(() => weatherFromHass(raw, entityId, {
    aqiEntity,
    aqiScale,
    sunEntity,
    name,
    lastSeen,
    temperatureUnit,
    windSpeedUnit,
    pressureUnit,
    now,
  }), [raw, entityId, aqiEntity, aqiScale, sunEntity, name, lastSeen, temperatureUnit, windSpeedUnit, pressureUnit, now]);

  return { entity, history: history ?? parsedHistory, hourly: providedHourly ?? hourly, daily: providedDaily ?? daily };
}
