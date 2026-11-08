import type { Condition, DailyForecast, HourlyForecast, WeatherEntity } from "../../entities/weather/types";
import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import type { HourCycle } from "../../entities/clock";
import { finiteNumber, stringValue } from "../util";

export interface WeatherMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  /** The dashboard's hour cycle its times are said on (`useHourCycle`); the browser locale's when left out. */
  hourCycle?: HourCycle;
  name?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  aqiEntity?: HassEntity;
  aqiScale?: "US";
  sunEntity?: HassEntity;
  temperatureUnit?: WeatherEntity["temperatureUnit"];
  windSpeedUnit?: WeatherEntity["windSpeedUnit"];
  pressureUnit?: WeatherEntity["pressureUnit"];
}

type ForecastType = "hourly" | "daily";

const CONDITIONS = new Set<Condition>([
  "sunny", "clear-night", "partlycloudy", "cloudy", "fog", "rainy", "pouring", "snowy",
  "snowy-rainy", "hail", "lightning", "lightning-rainy", "windy", "windy-variant", "exceptional",
]);

function conditionValue(value: unknown): Condition | undefined {
  return typeof value === "string" && CONDITIONS.has(value as Condition) ? value as Condition : undefined;
}

function temperatureUnit(value: unknown): WeatherEntity["temperatureUnit"] | undefined {
  if (value === "°C" || value === "C" || value === "℃") return "°C";
  if (value === "°F" || value === "F" || value === "℉") return "°F";
  return undefined;
}

function windSpeedUnit(value: unknown): WeatherEntity["windSpeedUnit"] | undefined {
  if (value === "km/h" || value === "kph" || value === "kmh") return "km/h";
  if (value === "mph" || value === "mi/h") return "mph";
  if (value === "m/s" || value === "mps" || value === "ms") return "m/s";
  return undefined;
}

function pressureUnit(value: unknown): WeatherEntity["pressureUnit"] | undefined {
  if (value === "hPa" || value === "mbar") return "hPa";
  if (value === "kPa") return "kPa";
  if (value === "inHg") return "inHg";
  return undefined;
}

function bearing(value: unknown) {
  const numeric = finiteNumber(value);
  if (numeric != null && numeric >= 0 && numeric <= 360) return numeric;
  if (typeof value !== "string") return undefined;
  const directions: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
  return directions[value.trim().toUpperCase()];
}

function percentage(value: unknown) {
  const numeric = finiteNumber(value);
  return numeric != null && numeric >= 0 && numeric <= 100 ? numeric : undefined;
}

function aqiValue(raw: HassEntity | undefined, scale: "US" | undefined) {
  if (scale !== "US") return undefined;
  if (!raw || typeof raw.state !== "string" || !raw.attributes || typeof raw.attributes !== "object" || Array.isArray(raw.attributes)) return undefined;
  if (raw.state === "unknown" || raw.state === "unavailable" || raw.state.trim().length === 0) return undefined;
  if (typeof raw.attributes.device_class !== "string" || raw.attributes.device_class !== "aqi") return undefined;
  const value = Number(raw.state);
  return Number.isFinite(value) && value >= 0 && value <= 500 ? value : undefined;
}

function dayValue(raw: HassEntity | undefined) {
  if (!raw || raw.state === "unknown" || raw.state === "unavailable") return undefined;
  if (raw.state === "above_horizon") return true;
  if (raw.state === "below_horizon") return false;
  return undefined;
}

/** Map one raw Home Assistant weather state and explicit companion entities. */
export function weatherFromHass(raw: HassEntity | undefined, entityId: string, options: WeatherMapOptions = {}): WeatherEntity {
  const attributes = raw?.attributes ?? {};
  const state = conditionValue(raw?.state);
  const available = state != null;
  const friendlyName = stringValue(attributes.friendly_name);
  const temperatureUnitValue = options.temperatureUnit ?? temperatureUnit(attributes.temperature_unit) ?? temperatureUnit(attributes.native_temperature_unit) ?? "°C";
  const windSpeedUnitValue = options.windSpeedUnit ?? windSpeedUnit(attributes.wind_speed_unit) ?? windSpeedUnit(attributes.native_wind_speed_unit) ?? "km/h";
  const pressureUnitValue = options.pressureUnit ?? pressureUnit(attributes.pressure_unit) ?? pressureUnit(attributes.native_pressure_unit) ?? "hPa";

  return {
    entityId,
    name: options.name ?? friendlyName ?? entityId,
    state: state ?? "unavailable",
    temperature: available ? finiteNumber(attributes.temperature) : undefined,
    apparentTemperature: available ? finiteNumber(attributes.apparent_temperature) : undefined,
    dewPoint: available ? finiteNumber(attributes.dew_point) : undefined,
    humidity: available ? percentage(attributes.humidity) : undefined,
    pressure: available ? positive(attributes.pressure) : undefined,
    windSpeed: available ? nonNegative(attributes.wind_speed) : undefined,
    windGustSpeed: available ? nonNegative(attributes.wind_gust_speed) : undefined,
    windBearing: available ? bearing(attributes.wind_bearing) : undefined,
    uvIndex: available ? nonNegative(attributes.uv_index) : undefined,
    temperatureUnit: temperatureUnitValue,
    windSpeedUnit: windSpeedUnitValue,
    pressureUnit: pressureUnitValue,
    aqi: available ? aqiValue(options.aqiEntity, options.aqiScale) : undefined,
    isDay: available ? dayValue(options.sunEntity) : undefined,
    lastUpdated: formatHaTime(raw?.last_updated ?? raw?.last_reported, options.now, options.hourCycle),
    lastSeen: !available ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now, options.hourCycle) : undefined,
  };
}

function nonNegative(value: unknown) {
  const numeric = finiteNumber(value);
  return numeric != null && numeric >= 0 ? numeric : undefined;
}

function positive(value: unknown) {
  const numeric = finiteNumber(value);
  return numeric != null && numeric > 0 ? numeric : undefined;
}

interface ForecastRecord {
  datetime?: unknown;
  condition?: unknown;
  temperature?: unknown;
  templow?: unknown;
  precipitation_probability?: unknown;
  hour?: unknown;
  day?: unknown;
}

function recordList(response: unknown, entityId: string): ForecastRecord[] {
  if (!response || typeof response !== "object") return [];
  const root = response as Record<string, unknown>;
  const result = root.result && typeof root.result === "object" ? root.result as Record<string, unknown> : undefined;
  const responseRoot = root.response && typeof root.response === "object" ? root.response as Record<string, unknown> : undefined;
  const resultResponse = result?.response && typeof result.response === "object" ? result.response as Record<string, unknown> : undefined;
  const entityResponse = resultResponse?.[entityId] ?? responseRoot?.[entityId] ?? root[entityId];
  const forecastRoot = entityResponse && typeof entityResponse === "object" ? entityResponse as Record<string, unknown> : undefined;
  const forecast = forecastRoot?.forecast;
  return Array.isArray(forecast) ? forecast.filter((item): item is ForecastRecord => !!item && typeof item === "object") : [];
}

function forecastDate(record: ForecastRecord) {
  if (typeof record.datetime !== "string") return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.exec(record.datetime);
  if (!match) return undefined;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]
    || hour > 23 || minute > 59 || second > 59
  ) return undefined;
  if (zone && zone !== "Z" && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59)) return undefined;
  const date = new Date(record.datetime);
  if (Number.isNaN(date.getTime())) return undefined;
  if (!zone && (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hour
    || date.getMinutes() !== minute
    || date.getSeconds() !== second
  )) return undefined;
  return date;
}

function calendarDayNumber(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

function calendarHour(date: Date, firstDate: Date) {
  // The card's 0..23 axis is local-calendar time; calendar arithmetic avoids DST's 23/25-hour days.
  return Math.round(calendarDayNumber(date) - calendarDayNumber(firstDate)) * 24 + date.getHours();
}

function precipitation(value: unknown) {
  return percentage(value);
}

/** Map the response returned by `weather.get_forecasts` into the card's normalized forecast models. */
export function forecastFromHass(response: unknown, entityId: string, type: "hourly"): HourlyForecast[];
export function forecastFromHass(response: unknown, entityId: string, type: "daily"): DailyForecast[];
export function forecastFromHass(response: unknown, entityId: string, type: ForecastType): HourlyForecast[] | DailyForecast[] {
  const records = recordList(response, entityId);
  if (type === "hourly") {
    const firstDate = records.map(forecastDate).find((date): date is Date => !!date);
    return records.flatMap((record) => {
      const condition = conditionValue(record.condition);
      const temperature = finiteNumber(record.temperature);
      const date = forecastDate(record);
      const rawHour = finiteNumber(record.hour);
      const derivedHour = date && firstDate ? calendarHour(date, firstDate) : undefined;
      const suppliedHourIsConsistent = rawHour == null || (
        date != null
        && derivedHour != null
        && Number.isInteger(rawHour)
        && rawHour >= 0
        && (rawHour === date.getHours() || rawHour === derivedHour)
      );
      const hour = derivedHour ?? (
        rawHour != null && Number.isInteger(rawHour) && rawHour >= 0 ? rawHour : undefined
      );
      if (!condition || temperature == null || !date || !suppliedHourIsConsistent || hour == null || hour < 0) return [];
      const precipitationProbability = precipitation(record.precipitation_probability);
      return [{ hour, temperature, condition, precipitationProbability }];
    });
  }

  return records.flatMap((record) => {
    const condition = conditionValue(record.condition);
    const high = finiteNumber(record.temperature);
    const low = finiteNumber(record.templow);
    const date = forecastDate(record);
    const suppliedDay = stringValue(record.day)?.trim();
    const day = suppliedDay || (date
      ? date.toLocaleDateString("en-US", { weekday: "short" })
      : undefined);
    if (!condition || high == null || low == null || high < low || !date || !day) return [];
    const precipitationProbability = precipitation(record.precipitation_probability);
    return [{ day, condition, high, low, precipitationProbability }];
  });
}
