// Copied from Orb by `npm run new-card -- weather --skin futura`; this skin owns its Seeds from here.
import type { Condition, DailyForecast, HourlyForecast, WeatherEntity, WeatherHistory } from "@dashhaus/core/entities/weather/types";
import type { Reading } from "@dashhaus/core/entities/history";

/** Example data for stories. The clock is fixed at 11:54 (the night example at 22:54). */
export interface WeatherSeed { entity: WeatherEntity; history: WeatherHistory; hourly: HourlyForecast[]; daily: DailyForecast[] }

const base = { entityId: "weather.home", name: "Home", temperatureUnit: "°C", windSpeedUnit: "km/h", pressureUnit: "hPa" } as const;

/** Hourly forecast from the hour after `from`, as [temperature, condition, rain %] per hour. */
const hours = (from: number, list: [number, Condition, number?][]): HourlyForecast[] =>
  list.map(([temperature, condition, p], i) => ({ hour: from + 1 + i, temperature, condition, precipitationProbability: p }));
const history = (past: number[], now: number, currentHour: number): WeatherHistory => ({
  temperature: [...past, now, ...Array(24 - past.length - 1).fill(null)], currentHour,
});

export const WEATHER_SEEDS = {
  partly: {
    entity: { ...base, state: "partlycloudy", isDay: true, temperature: 6.2, apparentTemperature: 3.8, dewPoint: 2.6, humidity: 78, pressure: 1016, windSpeed: 18, windGustSpeed: 32, windBearing: 315, uvIndex: 2, aqi: 42, lastUpdated: "11:50" },
    history: history([3.1, 2.8, 2.5, 2.2, 2.0, 1.9, 2.1, 2.8, 3.6, 4.5, 5.4], 6.2, 11),
    hourly: hours(11, [[6.8, "partlycloudy"], [7.4, "cloudy", 30], [7.6, "rainy", 70], [7.2, "rainy", 80], [6.5, "rainy", 60], [5.6, "cloudy", 30], [4.8, "cloudy"], [4.2, "cloudy"], [3.8, "partlycloudy"], [3.3, "clear-night"], [2.9, "clear-night"], [2.5, "clear-night"]]),
    daily: [
      { day: "Sat", condition: "rainy", high: 7.6, low: 1.9, precipitationProbability: 80 },
      { day: "Sun", condition: "cloudy", high: 9, low: 3 },
      { day: "Mon", condition: "rainy", high: 7, low: 4, precipitationProbability: 80 },
      { day: "Tue", condition: "sunny", high: 11, low: 1 },
      { day: "Wed", condition: "partlycloudy", high: 10, low: 4, precipitationProbability: 20 },
    ],
  },
  rain: {
    entity: { ...base, state: "rainy", isDay: true, temperature: 9.4, apparentTemperature: 7.1, dewPoint: 8.5, humidity: 94, pressure: 1004, windSpeed: 24, windGustSpeed: 41, windBearing: 90, uvIndex: 1, aqi: 18, lastUpdated: "11:52" },
    history: history([10.2, 10.1, 10.0, 9.9, 9.8, 9.6, 9.5, 9.4, 9.4, 9.3, 9.3], 9.4, 11),
    hourly: hours(11, [[9.6, "rainy", 90], [9.8, "pouring", 95], [9.9, "rainy", 80], [10.1, "rainy", 60], [10.0, "cloudy", 30], [9.6, "cloudy"], [9.0, "cloudy"], [8.6, "cloudy"]]),
    daily: [
      { day: "Sat", condition: "rainy", high: 10.2, low: 8.6, precipitationProbability: 95 },
      { day: "Sun", condition: "cloudy", high: 12, low: 7 },
      { day: "Mon", condition: "partlycloudy", high: 13, low: 6 },
      { day: "Tue", condition: "sunny", high: 14, low: 5 },
      { day: "Wed", condition: "sunny", high: 15, low: 6 },
    ],
  },
  night: {
    entity: { ...base, state: "clear-night", isDay: false, temperature: -3.4, apparentTemperature: -8.1, dewPoint: -9.2, humidity: 64, pressure: 1027, windSpeed: 12, windGustSpeed: 20, windBearing: 0, uvIndex: 0, aqi: 31, lastUpdated: "22:50" },
    history: history([-4.8, -5.2, -5.6, -5.9, -6.1, -6.0, -5.2, -3.9, -2.4, -1.1, -0.2, 0.6, 1.2, 1.5, 1.4, 0.9, 0.1, -0.8, -1.6, -2.2, -2.7, -3.0], -3.4, 22),
    hourly: hours(22, [[-3.9, "clear-night"], [-4.4, "clear-night"], [-4.9, "clear-night"]]),
    daily: [
      { day: "Sat", condition: "sunny", high: 1.5, low: -6.1 },
      { day: "Sun", condition: "snowy", high: -1, low: -7, precipitationProbability: 60 },
      { day: "Mon", condition: "cloudy", high: 0, low: -5 },
      { day: "Tue", condition: "partlycloudy", high: 2, low: -4 },
      { day: "Wed", condition: "sunny", high: 3, low: -3 },
    ],
  },
  snow: {
    entity: { ...base, state: "snowy", isDay: true, temperature: -1.2, apparentTemperature: -6.4, dewPoint: -2.8, humidity: 88, pressure: 1009, windSpeed: 30, windGustSpeed: 52, windBearing: 45, uvIndex: 1, aqi: 25, lastUpdated: "11:49" },
    history: history([-3.2, -3.0, -2.9, -2.7, -2.6, -2.4, -2.2, -1.9, -1.6, -1.4, -1.3], -1.2, 11),
    hourly: hours(11, [[-1.0, "snowy", 90], [-0.8, "snowy", 90], [-0.8, "snowy", 80], [-1.1, "snowy", 70], [-1.6, "snowy", 60], [-2.2, "cloudy", 30], [-2.9, "cloudy"]]),
    daily: [
      { day: "Sat", condition: "snowy", high: -0.8, low: -3.2, precipitationProbability: 90 },
      { day: "Sun", condition: "snowy", high: -2, low: -8, precipitationProbability: 40 },
      { day: "Mon", condition: "sunny", high: -4, low: -12 },
      { day: "Tue", condition: "sunny", high: -3, low: -11 },
      { day: "Wed", condition: "partlycloudy", high: 0, low: -6 },
    ],
  },
  summer: {
    entity: { ...base, state: "sunny", isDay: true, temperature: 31.4, apparentTemperature: 35.2, dewPoint: 20.1, humidity: 52, pressure: 1009, windSpeed: 8, windGustSpeed: 14, windBearing: 225, uvIndex: 8, aqi: 128, lastUpdated: "11:53" },
    history: history([22.1, 21.4, 20.9, 20.5, 20.3, 20.6, 22.0, 24.3, 26.5, 28.2, 29.9], 31.4, 11),
    hourly: hours(11, [[32.4, "sunny"], [33.1, "sunny"], [33.4, "sunny"], [33.0, "partlycloudy"], [32.1, "partlycloudy"], [30.6, "lightning-rainy", 60], [28.2, "lightning-rainy", 70], [26.4, "partlycloudy"]]),
    daily: [
      { day: "Sat", condition: "lightning-rainy", high: 33.4, low: 20.3, precipitationProbability: 70 },
      { day: "Sun", condition: "sunny", high: 32, low: 21 },
      { day: "Mon", condition: "sunny", high: 30, low: 19 },
      { day: "Tue", condition: "partlycloudy", high: 27, low: 18, precipitationProbability: 30 },
      { day: "Wed", condition: "sunny", high: 28, low: 17 },
    ],
  },
  unavailable: {
    entity: { ...base, state: "unavailable", lastSeen: "08:20" },
    history: { temperature: [3.1, 2.8, 2.5, 2.2, 2.0, 1.9, 2.1, 2.8, "unavailable", "unavailable", "unavailable", "unavailable", ...Array(12).fill(null)], currentHour: 11 },
    hourly: [],
    daily: [],
  },
} satisfies Record<string, WeatherSeed>;

export type WeatherSeedName = keyof typeof WEATHER_SEEDS;

/*
 * Worst-case data: values real Home Assistant installs produce, not random strings. Long and compound names,
 * missing areas, readings at and past their limits, raw floats from integrations, no readings yet. The card's
 * Worst case story and Orb → Foundations → Worst case both draw these.
 */
const H = 11;
export const WEATHER_WORST_CASE: WeatherSeed[] = [
  { // Fahrenheit and mph, a long place name, hazardous air, a gale, no forecast and no history
    entity: { entityId: "weather.farm", name: "Ferme Sainte-Anne-des-Plaines", state: "exceptional", temperature: 104.3, apparentTemperature: 112.8, humidity: 9, pressure: 29.71, windSpeed: 61, windGustSpeed: 84, windBearing: 200, uvIndex: 12, aqi: 312, temperatureUnit: "°F", windSpeedUnit: "mph", pressureUnit: "inHg", lastUpdated: "11:54" },
    history: { temperature: [], currentHour: H }, hourly: [], daily: [],
  },
  { // Only humidity reported: no temperature, no wind, no air quality
    entity: { entityId: "weather.cabin", name: "Cabin", state: "fog", humidity: 100, temperatureUnit: "°C", windSpeedUnit: "km/h", pressureUnit: "hPa" },
    history: { temperature: Array<Reading>(H).fill("unavailable"), currentHour: H }, hourly: [], daily: [],
  },
];
