import { describe, expect, it } from "vitest";
import { NUMERIC_WORDS, isNumericClass, numericFact, numericLimitFact, numericTodaySaid, numericWarningSaid, numericWarningWord, numericWords } from "./words";
import type { NumericClass } from "./types";

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

describe("numericWarningWord", () => {
  it("says High or Low and what it measures, a symbol or an acronym in its case, an ordinary word lower-case", () => {
    expect(numericWarningWord("carbon_dioxide", "above")).toBe("High CO₂");
    expect(numericWarningWord("pm25", "above")).toBe("High PM2.5");
    expect(numericWarningWord("volatile_organic_compounds", "below")).toBe("Low VOC");
    expect(numericWarningWord("power", "above")).toBe("High power");
    expect(numericWarningWord("voltage", "below")).toBe("Low voltage");
    expect(numericWarningWord("humidity", "above")).toBe("High humidity");
    expect(numericWarningWord("illuminance", "below")).toBe("Low light");
  });

  it("says Too warm or Too cold for a temperature", () => {
    expect(numericWarningWord("temperature", "above")).toBe("Too warm");
    expect(numericWarningWord("temperature", "below")).toBe("Too cold");
  });

  it("says Too high or Too low, on both sides, where High <label> would not fit a row, and for a plain reading", () => {
    for (const cls of ["power_factor", "data_rate", "frequency", "precipitation_intensity"] as NumericClass[]) {
      expect(numericWarningWord(cls, "above"), cls).toBe("Too high");
      expect(numericWarningWord(cls, "below"), cls).toBe("Too low");
    }
    expect(numericWarningWord(undefined, "above")).toBe("Too high");
  });

  it("never says the same class two ways: both sides are High and Low, or both Too", () => {
    for (const cls of Object.keys(NUMERIC_WORDS) as NumericClass[]) {
      const [above, below] = [numericWarningWord(cls, "above"), numericWarningWord(cls, "below")];
      expect(above.startsWith("Too"), cls).toBe(below.startsWith("Too"));
    }
  });
});

describe("numericWarningSaid", () => {
  it("says the class's long name, the side and the limit with its unit", () => {
    expect(numericWarningSaid({ deviceClass: "carbon_dioxide", unit: "ppm", warnAbove: 1200 }, "above")).toBe("Carbon dioxide above 1200 ppm");
    expect(numericWarningSaid({ deviceClass: "temperature", unit: "°C", warnBelow: -25 }, "below")).toBe("Temperature below -25°C");
    expect(numericWarningSaid({ unit: "ppm", warnAbove: 1200 }, "above")).toBe("above 1200 ppm");
    expect(numericWarningSaid({ unit: "ppm", warnAbove: 1200 }, "below")).toBe("");
  });
});

describe("numericLimitFact", () => {
  it("says the limits set, whether or not it warns, low before high", () => {
    expect(numericLimitFact({ unit: "ppm", warnAbove: 1200 })).toBe("Warns above 1200 ppm");
    expect(numericLimitFact({ unit: "°C", warnBelow: -25 })).toBe("Warns below -25°C");
    expect(numericLimitFact({ unit: "°C", warnBelow: 18, warnAbove: 24 })).toBe("Warns below 18°C or above 24°C");
    expect(numericLimitFact({ warnAbove: 0.5 })).toBe("Warns above 0.5");
    expect(numericLimitFact({ unit: "W" })).toBe("");
  });
});
