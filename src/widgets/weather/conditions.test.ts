import { describe, expect, it } from "vitest";
import { clock, precipitation } from "./conditions";
import type { Condition, HourlyForecast } from "../../domains/weather/types";

const hours = (from: number, list: [Condition, number?][]): HourlyForecast[] =>
  list.map(([condition, p], i) => ({ hour: from + 1 + i, temperature: 5, condition, precipitationProbability: p }));

describe("clock", () => {
  it("pads the hour and wraps past midnight", () => {
    expect(clock(9)).toBe("09:00");
    expect(clock(26)).toBe("02:00");
  });
});

describe("precipitation", () => {
  it("says when rain starts, with its chance", () => {
    expect(precipitation("partlycloudy", hours(11, [["cloudy", 30], ["rainy", 70]]), 11)).toBe("70% rain at 13:00");
  });

  it("names the kind and leaves the chance out when the forecast has none", () => {
    expect(precipitation("cloudy", hours(11, [["snowy"]]), 11)).toBe("Snow at 12:00");
    expect(precipitation("cloudy", hours(11, [["lightning-rainy"]]), 11)).toBe("Storms at 12:00");
  });

  it("says when falling rain or snow stops, in the condition's own words", () => {
    expect(precipitation("pouring", hours(11, [["rainy"], ["cloudy"]]), 11)).toBe("Heavy rain until 13:00");
  });

  it("is quiet when the sky keeps its kind for the next 12 hours", () => {
    expect(precipitation("sunny", hours(11, [["cloudy"], ["partlycloudy"]]), 11)).toBeNull();
    expect(precipitation("sunny", hours(11, [...Array<[Condition]>(12).fill(["cloudy"]), ["rainy", 90]]), 11)).toBeNull();
    expect(precipitation("sunny", undefined, 11)).toBeNull();
  });
});
