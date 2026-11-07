import { describe, expect, it } from "vitest";
import { isNumericClass, numericFact, numericTodaySaid, numericWords } from "./words";

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
  });
});

describe("numericTodaySaid", () => {
  it("names today's meter by what it measures, or as a reading", () => {
    expect(numericTodaySaid("carbon_dioxide")).toBe("CO₂ by hour today.");
    expect(numericTodaySaid(undefined)).toBe("Reading by hour today.");
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
