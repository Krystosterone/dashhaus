import { describe, expect, it } from "vitest";
import { TARGET_WORD, climateFacts, rangeFact } from "./words";

describe("climate words", () => {
  it("says what a target does by its mode, the same in every skin", () => {
    expect(TARGET_WORD).toEqual({ heat: "Heat to", cool: "Cool to", auto: "Keep at", heat_cool: "Keep" });
    expect(TARGET_WORD.dry).toBeUndefined();
  });

  it("says what the unit is in small print: the room's humidity, then the range it can be set across", () => {
    expect(rangeFact({ minTemp: 7, maxTemp: 30, unit: "°C" })).toBe("7–30°C");
    expect(climateFacts({ currentHumidity: 41.4, minTemp: 7, maxTemp: 30, unit: "°C" })).toBe("Humidity 41% · 7–30°C");
    expect(climateFacts({ minTemp: 45, maxTemp: 86, unit: "°F" })).toBe("45–86°F");
  });
});
