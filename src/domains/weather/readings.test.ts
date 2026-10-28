import { describe, expect, it } from "vitest";
import { conditionLabel, isNight, rangeText, todayRange, weatherWarnings } from "./readings";
import type { WeatherEntity } from "./types";

const base: WeatherEntity = { entityId: "weather.home", name: "Home", state: "sunny", temperatureUnit: "°C", windSpeedUnit: "km/h", pressureUnit: "hPa" };

describe("isNight and conditionLabel", () => {
  it("keeps the day when daylight is unknown, and calls a sunny night clear", () => {
    expect(isNight(base)).toBe(false);
    expect(isNight({ ...base, isDay: false })).toBe(true);
    expect(isNight({ ...base, state: "clear-night" })).toBe(true);
    expect(conditionLabel("sunny", true)).toBe("Clear");
    expect(conditionLabel("sunny", false)).toBe("Sunny");
  });
});

describe("weatherWarnings", () => {
  it("lists poor air, strong gusts and high UV, most urgent first", () => {
    expect(weatherWarnings({ ...base, aqi: 312, windGustSpeed: 84, windSpeedUnit: "mph", uvIndex: 12 })).toEqual(["Hazardous air", "Gusts 84 mph", "Extreme UV"]);
  });

  it("judges gusts in km/h whatever the unit, and is quiet under the thresholds or while unavailable", () => {
    expect(weatherWarnings({ ...base, windGustSpeed: 14, windSpeedUnit: "m/s" })).toEqual(["Gusts 14 m/s"]);
    expect(weatherWarnings({ ...base, aqi: 100, windGustSpeed: 49, uvIndex: 7.9 })).toEqual([]);
    expect(weatherWarnings({ ...base, state: "unavailable", aqi: 400 })).toEqual([]);
  });
});

describe("todayRange and rangeText", () => {
  const history = { temperature: [1.9, 2.4, 3.1], currentHour: 2 };

  it("combines the readings so far, the rest of today's hours, now and the day's forecast", () => {
    const hourly = [{ hour: 1, temperature: -9, condition: "sunny" as const }, { hour: 3, temperature: 7.6, condition: "sunny" as const }, { hour: 25, temperature: 12, condition: "sunny" as const }];
    expect(todayRange(6.2, history, hourly)).toEqual({ low: 1.9, high: 7.6 });
    expect(todayRange(6.2, history, [], [{ day: "Sat", condition: "sunny", high: 9, low: 0.5 }])).toEqual({ low: 0.5, high: 9 });
    expect(todayRange(undefined)).toBeNull();
  });

  it("prints whole degrees, spells a range below zero out, and is null when both ends round alike", () => {
    expect(rangeText({ low: 1.9, high: 7.6 })).toBe("2°–8°");
    expect(rangeText({ low: -3.2, high: -0.8 })).toBe("-3° to -1°");
    expect(rangeText({ low: -0.4, high: 3 })).toBe("0°–3°");
    expect(rangeText({ low: 2.1, high: 2.4 })).toBeNull();
    expect(rangeText(null)).toBeNull();
  });
});
