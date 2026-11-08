import { describe, expect, it } from "vitest";
import { hourCycleOf } from "../clock";
import { clock, precipitation } from "./conditions";
import type { Condition, HourlyForecast } from "./types";

const hours = (from: number, list: [Condition, number?][]): HourlyForecast[] =>
  list.map(([condition, p], i) => ({ hour: from + 1 + i, temperature: 5, condition, precipitationProbability: p }));

describe("clock", () => {
  it("pads the hour and wraps past midnight on 24 hours", () => {
    expect(clock(9, "h23")).toBe("09:00");
    expect(clock(26, "h23")).toBe("02:00");
  });

  it("says the hour and its period on 12 hours", () => {
    expect(clock(9, "h12")).toBe("9:00\u00a0AM");
    expect(clock(14, "h12")).toBe("2:00\u00a0PM");
    expect(clock(24, "h12")).toBe("12:00\u00a0AM");
  });

  it("follows the browser locale's cycle when given none", () => {
    expect(clock(14)).toBe(clock(14, hourCycleOf()));
  });
});

describe.each([
  ["h23", { thirteen: "13:00", noon: "12:00" }],
  ["h12", { thirteen: "1:00\u00a0PM", noon: "12:00\u00a0PM" }],
] as const)("precipitation on %s", (cycle, at) => {
  it("says when rain starts, with its chance", () => {
    expect(precipitation("partlycloudy", hours(11, [["cloudy", 30], ["rainy", 70]]), 11, cycle)).toBe(`70% rain at ${at.thirteen}`);
  });

  it("names the kind and leaves the chance out when the forecast has none", () => {
    expect(precipitation("cloudy", hours(11, [["snowy"]]), 11, cycle)).toBe(`Snow at ${at.noon}`);
    expect(precipitation("cloudy", hours(11, [["lightning-rainy"]]), 11, cycle)).toBe(`Storms at ${at.noon}`);
  });

  it("says when falling rain or snow stops, in the condition's own words", () => {
    expect(precipitation("pouring", hours(11, [["rainy"], ["cloudy"]]), 11, cycle)).toBe(`Heavy rain until ${at.thirteen}`);
  });

  it("is quiet when the sky keeps its kind for the next 12 hours", () => {
    expect(precipitation("sunny", hours(11, [["cloudy"], ["partlycloudy"]]), 11, cycle)).toBeNull();
    expect(precipitation("sunny", hours(11, [...Array<[Condition]>(12).fill(["cloudy"]), ["rainy", 90]]), 11, cycle)).toBeNull();
    expect(precipitation("sunny", undefined, 11, cycle)).toBeNull();
  });
});
