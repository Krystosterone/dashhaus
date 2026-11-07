import { describe, expect, it } from "vitest";
import { fmtNumeric, isNumericClass, numericFact, isNumericStateClass, numericFigure, numericToday, numericWords, withUnit } from "./readings";
import type { NumericHistory } from "./types";

const day = (readings: NumericHistory["readings"], currentHour = readings.length - 1): NumericHistory => ({ readings, currentHour });

describe("fmtNumeric", () => {
  it("is as precise as the number's size needs, never -0", () => {
    expect(fmtNumeric(1450.4)).toBe("1450");
    expect(fmtNumeric(12345.678)).toBe("12346");
    expect(fmtNumeric(21.44)).toBe("21.4");
    expect(fmtNumeric(42)).toBe("42");
    expect(fmtNumeric(0.4234)).toBe("0.42");
    expect(fmtNumeric(7.5)).toBe("7.5");
    expect(fmtNumeric(-12.54)).toBe("-12.5");
    expect(fmtNumeric(-0.001)).toBe("0");
  });
});

describe("numericFigure", () => {
  it("keeps five places at most, scaling with an SI letter rather than cutting a digit", () => {
    expect(numericFigure(12345.678)).toBe("12346");
    expect(numericFigure(123456)).toBe("123k");
    expect(numericFigure(-12345)).toBe("-12k");
    expect(numericFigure(-1234.5)).toBe("-1235");
    expect(numericFigure(1234567)).toBe("1.2M");
    expect(numericFigure(-12.5)).toBe("-12.5");
    for (const n of [99999.9, 999999, -99999, 4.2e13]) expect(numericFigure(n).length).toBeLessThanOrEqual(5);
  });
});

describe("withUnit", () => {
  it("puts a symbol on its figure and a word after a space, and leaves out none", () => {
    expect(withUnit("41", "%")).toBe("41%");
    expect(withUnit("21.4", "°C")).toBe("21.4°C");
    expect(withUnit("650", "ppm")).toBe("650 ppm");
    expect(withUnit("3.2", "kWh")).toBe("3.2 kWh");
    expect(withUnit("12")).toBe("12");
  });
});

describe("numericWords", () => {
  it("names what a class measures, and a plain reading has no label", () => {
    expect(numericWords("carbon_dioxide")).toEqual({ label: "CO₂", long: "Carbon dioxide", picture: "air" });
    expect(numericWords("energy").picture).toBe("meter");
    expect(numericWords("power").picture).toBe("power");
    expect(numericWords(undefined)).toEqual({ label: "", long: "Reading", picture: "gauge" });
  });

  it("knows only Home Assistant's classes, and none from the prototype", () => {
    expect(isNumericClass("pm25")).toBe(true);
    expect(isNumericClass("constructor")).toBe(false);
    expect(isNumericClass("door")).toBe(false);
    expect(isNumericStateClass("total_increasing")).toBe(true);
    expect(isNumericStateClass("totally")).toBe(false);
  });
});

describe("numericFact", () => {
  it("says what the reading is and its unit, as far as it knows", () => {
    expect(numericFact({ deviceClass: "carbon_dioxide", unit: "ppm" })).toBe("Carbon dioxide in ppm");
    expect(numericFact({ deviceClass: "energy" })).toBe("Energy");
    expect(numericFact({ unit: "W" })).toBe("In W");
    expect(numericFact({})).toBe("");
  });
});

describe("numericToday", () => {
  it("says a measurement's low and high, in its unit", () => {
    const today = numericToday({ unit: "ppm" }, day([420, 380, 1450.2, 900]));
    expect(today).toMatchObject({ short: "380–1450", long: "Low 380 ppm · High 1450 ppm" });
    expect(today.samples).toHaveLength(4);
  });

  it("says a range below zero with \"to\", and a day that never moved once", () => {
    expect(numericToday({ unit: "W" }, day([310, -1240, 420])).short).toBe("-1240 to 420");
    expect(numericToday({ unit: "kW" }, day([0, 0, 0]))).toMatchObject({ short: "0", long: "Steady at 0 kW" });
  });

  it("says how far a meter that only climbs rose today", () => {
    expect(numericToday({ unit: "kWh", stateClass: "total_increasing" }, day([1520.1, 1520.4, 1523.3, null], 2)))
      .toMatchObject({ short: "+3.2", long: "+3.2 kWh today" });
  });

  it("falls back to the low and high when a meter reset today", () => {
    expect(numericToday({ unit: "kWh", stateClass: "total_increasing" }, day([12, 14, 0.5])).long).toBe("Low 0.5 kWh · High 14 kWh");
  });

  it("has no reading yet before the first, and keeps gone hours", () => {
    expect(numericToday({}, day([null, "unavailable", null]))).toEqual({ long: "No readings yet today", samples: [null, "unavailable", null] });
  });

  it("keeps a flat day flat rather than filling the strip with noise", () => {
    const { samples } = numericToday({ unit: "W" }, day([1000, 1001]));
    expect(samples[1] as number).toBeLessThan(0.25);
  });
});
