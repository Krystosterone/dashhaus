import { describe, expect, it } from "vitest";
import { TODAY_SHORT_PLACES, fmtNumeric, isNumericStateClass, numericFigure, numericToday, withUnit } from "./readings";
import { NO_READINGS_TODAY } from "../today";
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

describe("isNumericStateClass", () => {
  it("knows only Home Assistant's state classes", () => {
    expect(isNumericStateClass("total_increasing")).toBe(true);
    expect(isNumericStateClass("totally")).toBe(false);
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
    expect(numericToday({}, day([null, "unavailable", null]))).toEqual({ long: NO_READINGS_TODAY, samples: [null, "unavailable", null] });
  });

  it("keeps a flat day flat rather than filling the strip with noise", () => {
    const { samples } = numericToday({ unit: "W" }, day([1000, 1001]));
    expect(samples[1] as number).toBeLessThan(0.25);
  });
});

describe("TODAY_SHORT_PLACES", () => {
  it("holds a measurement's range and a meter's rise, and not a range below zero", () => {
    expect(TODAY_SHORT_PLACES).toBe(9);
    const fits = (readings: number[], stateClass?: "total_increasing") =>
      numericToday({ unit: "W", stateClass }, day(readings)).short!.length <= TODAY_SHORT_PLACES;
    expect(fits([470, 940])).toBe(true); // "470–940"
    expect(fits([-5, 42])).toBe(true); // "-5 to 42"
    expect(fits([1514.7, 1523.3], "total_increasing")).toBe(true); // "+8.6"
    expect(fits([310, -1240, 420])).toBe(false); // "-1240 to 420"
  });
});

describe("numericToday's rise", () => {
  it("starts from the reading in effect at midnight where there is one", () => {
    const history = { ...day([100.5, 108.6]), start: 100 };
    expect(numericToday({ unit: "kWh", stateClass: "total_increasing" }, history).long).toBe("+8.6 kWh today");
  });

  it("starts from the day's first reading when midnight's was unavailable", () => {
    const history = { ...day([100.5, 108.6]), start: "unavailable" as const };
    expect(numericToday({ unit: "kWh", stateClass: "total_increasing" }, history).long).toBe("+8.1 kWh today");
  });

  it("starts from the day's first reading when a daily meter reset just after midnight", () => {
    const history = { ...day([0.2, 1.4, 3.1]), start: 12.3 };
    expect(numericToday({ unit: "kWh", stateClass: "total_increasing" }, history).long).toBe("+2.9 kWh today");
  });
});
