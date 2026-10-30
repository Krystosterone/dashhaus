import { describe, expect, it } from "vitest";
import { forecastFromHass, weatherFromHass } from "./weather";

const weather = {
  entity_id: "weather.home",
  state: "partlycloudy",
  attributes: {
    friendly_name: "Home",
    temperature: 21.5,
    apparent_temperature: 20.1,
    dew_point: 12.4,
    humidity: 58,
    pressure: 1012,
    wind_speed: 18,
    wind_gust_speed: 31,
    wind_bearing: 315,
    uv_index: 4,
    temperature_unit: "°C",
    wind_speed_unit: "km/h",
    pressure_unit: "hPa",
  },
  last_updated: "2026-10-20T10:00:00Z",
};

const aqi = {
  entity_id: "sensor.home_aqi",
  state: "42",
  attributes: { device_class: "aqi", unit_of_measurement: "AQI" },
  last_updated: "2026-10-20T10:00:00Z",
};

const sun = {
  entity_id: "sun.sun",
  state: "above_horizon",
  attributes: {},
  last_updated: "2026-10-20T10:00:00Z",
};

describe("weatherFromHass", () => {
  it("maps current weather readings and explicit AQI/day companions", () => {
    expect(weatherFromHass(weather, weather.entity_id, { aqiEntity: aqi, aqiScale: "US", sunEntity: sun })).toMatchObject({
      entityId: "weather.home",
      name: "Home",
      state: "partlycloudy",
      temperature: 21.5,
      apparentTemperature: 20.1,
      dewPoint: 12.4,
      humidity: 58,
      pressure: 1012,
      windSpeed: 18,
      windGustSpeed: 31,
      windBearing: 315,
      uvIndex: 4,
      temperatureUnit: "°C",
      windSpeedUnit: "km/h",
      pressureUnit: "hPa",
      aqi: 42,
      isDay: true,
    });
    expect(weatherFromHass(weather, weather.entity_id).lastUpdated).toBeDefined();
  });

  it("does not apply US AQI bands without an explicit scale contract", () => {
    expect(weatherFromHass(weather, weather.entity_id, { aqiEntity: aqi }).aqi).toBeUndefined();
    expect(weatherFromHass(weather, weather.entity_id, { aqiEntity: aqi, aqiScale: "US" }).aqi).toBe(42);
  });

  it("suppresses stale readings while the weather entity is unknown or unavailable", () => {
    const stale = {
      ...weather,
      state: "unavailable",
      attributes: { ...weather.attributes, temperature: 99, humidity: 1, wind_speed: 80, pressure: 900 },
    };
    const mapped = weatherFromHass(stale, weather.entity_id, { lastSeen: "08:20", aqiEntity: aqi, sunEntity: sun });

    expect(mapped.state).toBe("unavailable");
    expect(mapped.temperature).toBeUndefined();
    expect(mapped.humidity).toBeUndefined();
    expect(mapped.windSpeed).toBeUndefined();
    expect(mapped.pressure).toBeUndefined();
    expect(mapped.aqi).toBeUndefined();
    expect(mapped.isDay).toBeUndefined();
    expect(mapped.lastSeen).toBe("08:20");
  });

  it("rejects unsupported conditions and invalid companion values", () => {
    const mapped = weatherFromHass({
      ...weather,
      state: "volcanic",
      attributes: { ...weather.attributes, humidity: 101, wind_bearing: "not-a-direction" },
    }, weather.entity_id, {
      aqiEntity: { ...aqi, state: "501" },
      sunEntity: { ...sun, state: "unavailable" },
    });

    expect(mapped.state).toBe("unavailable");
    expect(mapped.humidity).toBeUndefined();
    expect(mapped.aqi).toBeUndefined();
    expect(mapped.isDay).toBeUndefined();
  });

  it("does not turn a blank AQI state into zero", () => {
    const mapped = weatherFromHass(weather, weather.entity_id, { aqiEntity: { ...aqi, state: "   " } });
    expect(mapped.aqi).toBeUndefined();
  });

  it("omits malformed AQI companions instead of throwing", () => {
    expect(() => weatherFromHass(weather, weather.entity_id, {
      aqiEntity: { ...aqi, state: 42 as unknown as string },
    })).not.toThrow();
    expect(weatherFromHass(weather, weather.entity_id, {
      aqiEntity: { ...aqi, state: "42", attributes: null as unknown as typeof aqi.attributes },
    }).aqi).toBeUndefined();
  });

  it("omits non-physical pressure values", () => {
    const mapped = weatherFromHass({
      ...weather,
      attributes: { ...weather.attributes, pressure: -1 },
    }, weather.entity_id);
    expect(mapped.pressure).toBeUndefined();
  });
});

describe("forecastFromHass", () => {
  const response = {
    result: {
      response: {
        "weather.home": {
          forecast: [
            { datetime: "2026-10-20T12:00:00Z", condition: "sunny", temperature: 23, precipitation_probability: 10 },
            { datetime: "2026-10-20T13:00:00Z", condition: "rainy", temperature: 21, precipitation_probability: 70 },
            { datetime: "2026-10-20T14:00:00Z", condition: "unknown", temperature: 20 },
            { datetime: "2026-10-21T12:00:00Z", condition: "cloudy", temperature: 16, precipitation_probability: 20 },
          ],
        },
      },
    },
  };

  it("maps valid hourly forecast records and drops unsupported conditions", () => {
    const forecast = forecastFromHass(response, "weather.home", "hourly");

    expect(forecast).toHaveLength(3);
    expect(forecast[0]).toMatchObject({ temperature: 23, condition: "sunny", precipitationProbability: 10 });
    expect(forecast[1]).toMatchObject({ temperature: 21, condition: "rainy", precipitationProbability: 70 });
    expect(forecast[0].hour).toBeGreaterThanOrEqual(0);
    expect(forecast[0].hour).toBeLessThan(24);
    expect(forecast[2].hour).toBeGreaterThan(23);
  });

  it("drops hourly and daily records with invalid timestamps even when fallback fields are present", () => {
    expect(forecastFromHass({
      response: { "weather.home": { forecast: [{ datetime: "not-a-date", condition: "sunny", temperature: 20, hour: 12 }] } },
    }, "weather.home", "hourly")).toEqual([]);
    expect(forecastFromHass({
      response: { "weather.home": { forecast: [{ datetime: "not-a-date", condition: "sunny", temperature: 20, templow: 10, day: "Mon" }] } },
    }, "weather.home", "daily")).toEqual([]);
    expect(forecastFromHass({
      response: { "weather.home": { forecast: [{ datetime: "2026-02-31T00:00:00Z", condition: "sunny", temperature: 20, hour: 12 }] } },
    }, "weather.home", "hourly")).toEqual([]);
    expect(forecastFromHass({
      response: { "weather.home": { forecast: [{ datetime: "2025-02-29T00:00:00Z", condition: "sunny", temperature: 20, templow: 10, day: "Sat" }] } },
    }, "weather.home", "daily")).toEqual([]);
  });

  it("rejects contradictory explicit hourly fields", () => {
    const forecast = forecastFromHass({
      response: {
        "weather.home": {
          forecast: [{ datetime: "2026-10-20T01:00:00Z", condition: "sunny", temperature: 20, hour: 99 }],
        },
      },
    }, "weather.home", "hourly");
    expect(forecast).toEqual([]);
  });

  it("keeps next-calendar-day hourly forecasts at hour 24 across DST boundaries", () => {
    const forecast = forecastFromHass({
      response: {
        "weather.home": {
          forecast: [
            { datetime: "2026-03-08T00:00:00", condition: "cloudy", temperature: 10 },
            { datetime: "2026-03-09T00:00:00", condition: "sunny", temperature: 12 },
          ],
        },
      },
    }, "weather.home", "hourly");
    expect(forecast[1].hour).toBe(24);
  });

  it("maps daily high/low records and omits incomplete readings", () => {
    const daily = forecastFromHass({
      response: {
        "weather.home": {
          forecast: [
            { datetime: "2026-10-20T00:00:00Z", condition: "cloudy", temperature: 18, templow: 9, precipitation_probability: 20 },
            { datetime: "2026-10-21T00:00:00Z", condition: "sunny", temperature: 20 },
          ],
        },
      },
    }, "weather.home", "daily");

    expect(daily).toHaveLength(1);
    expect(daily[0]).toMatchObject({ condition: "cloudy", high: 18, low: 9, precipitationProbability: 20 });
    expect(daily[0].day).toBeTruthy();
  });

  it("rejects inverted daily bounds and derives a label for a blank day", () => {
    const daily = forecastFromHass({
      response: {
        "weather.home": {
          forecast: [
            { datetime: "2026-10-20T00:00:00Z", condition: "cloudy", temperature: 10, templow: 20, day: "   " },
          ],
        },
      },
    }, "weather.home", "daily");

    expect(daily).toEqual([]);
    const validLabel = forecastFromHass({
      response: {
        "weather.home": {
          forecast: [
            { datetime: "2026-10-20T00:00:00Z", condition: "cloudy", temperature: 20, templow: 10, day: "  Tue  " },
          ],
        },
      },
    }, "weather.home", "daily");
    expect(validLabel[0].day).toBe("Tue");
  });
});
