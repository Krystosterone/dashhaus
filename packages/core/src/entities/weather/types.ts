/** Home Assistant weather conditions (the `weather.*` entity's state). */
export type Condition =
  | "sunny" | "clear-night" | "partlycloudy" | "cloudy" | "fog"
  | "rainy" | "pouring" | "snowy" | "snowy-rainy" | "hail"
  | "lightning" | "lightning-rainy" | "windy" | "windy-variant" | "exceptional";

/**
 * The home's outdoor conditions: the parts of a Home Assistant `weather.*` entity the card needs.
 * Two values usually live in other entities and are passed in alongside: `aqi` (a sensor with
 * device_class aqi) and `isDay` (from `sun.sun`). Both are optional; missing or unavailable `isDay`
 * remains unknown so the card does not infer a daylight presentation.
 */
export interface WeatherEntity {
  entityId: string;
  /** Usually the home's name. */
  name: string;
  state: Condition | "unavailable";
  temperature?: number;
  apparentTemperature?: number;
  dewPoint?: number;
  /** Relative humidity, percent. */
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  windGustSpeed?: number;
  /** Degrees the wind comes from, 0 = north. */
  windBearing?: number;
  uvIndex?: number;
  temperatureUnit: "°C" | "°F";
  windSpeedUnit: "km/h" | "mph" | "m/s";
  pressureUnit: "hPa" | "kPa" | "inHg";
  /** US AQI, 0-500, from an air-quality sensor. */
  aqi?: number;
  /** From sun.sun; omitted or unavailable means daylight is unknown, not day. */
  isDay?: boolean;
  lastUpdated?: string;
  lastSeen?: string;
}

export interface HourlyForecast {
  /** Hour of the day, 0-23 (today), 24+ for tomorrow. */
  hour: number;
  temperature: number;
  condition: Condition;
  /** Percent. */
  precipitationProbability?: number;
}

export interface DailyForecast {
  /** Short day label, e.g. "Sun". */
  day: string;
  condition: Condition;
  high: number;
  low: number;
  precipitationProbability?: number;
}

export interface WeatherHistory {
  /** Today's hourly temperatures so far: a value, "unavailable", or null for hours not recorded. */
  temperature: (number | "unavailable" | null)[];
  currentHour: number;
}
