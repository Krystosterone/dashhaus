import { describe, expect, it } from "vitest";
import { comfortLabel, fmtHum, fmtTemp, lowBattery, toCelsius, trendOf } from "./readings";
import type { SensorEntity } from "./types";

const sensor = (patch: Partial<SensorEntity>): SensorEntity => ({ entityId: "sensor.x", name: "X", state: "ok", unit: "°C", ...patch });

describe("comfortLabel", () => {
  it("says comfortable inside every band, and names each band it leaves", () => {
    expect(comfortLabel(21, 45)).toBe("Comfortable");
    expect(comfortLabel(17, 25)).toBe("Cool, dry");
    expect(comfortLabel(26, 70)).toBe("Warm, humid");
    expect(comfortLabel(undefined, 65)).toBe("Humid");
  });

  it("says nothing outdoors or without a reading", () => {
    expect(comfortLabel(30, 90, true)).toBe("");
    expect(comfortLabel()).toBe("");
  });
});

describe("trendOf", () => {
  it("compares this hour with the last, steady inside the threshold", () => {
    expect(trendOf([20, 20.5], 1)).toBe("rising");
    expect(trendOf([20, 19.5], 1)).toBe("falling");
    expect(trendOf([20, 20.2], 1)).toBe("steady");
  });

  it("has no trend across a gap or without history", () => {
    expect(trendOf([20, "unavailable"], 1)).toBeNull();
    expect(trendOf([null, 20], 1)).toBeNull();
    expect(trendOf(undefined, 1)).toBeNull();
  });
});

describe("lowBattery", () => {
  it("is at or under 15%, and only while the sensor answers", () => {
    expect(lowBattery(sensor({ battery: 15 }))).toBe(true);
    expect(lowBattery(sensor({ battery: 16 }))).toBe(false);
    expect(lowBattery(sensor({}))).toBe(false);
    expect(lowBattery(sensor({ battery: 3, state: "unavailable" }))).toBe(false);
  });
});

describe("formatting", () => {
  it("keeps one decimal for temperature, whole percent for humidity, and never prints -0.0", () => {
    expect(fmtTemp(21.44)).toBe("21.4");
    expect(fmtTemp(-0.04)).toBe("0.0");
    expect(fmtHum(44.6)).toBe("45");
  });

  it("converts Fahrenheit to Celsius for the comfort bands", () => {
    expect(toCelsius(212, "°F")).toBe(100);
    expect(toCelsius(21, "°C")).toBe(21);
  });
});
