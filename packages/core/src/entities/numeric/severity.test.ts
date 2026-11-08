import { describe, expect, it } from "vitest";
import { numericSeverity, numericWarning } from "./severity";
import type { NumericEntity } from "./types";

const co2: NumericEntity = { entityId: "sensor.co2", name: "Living room CO₂", state: "ok", value: 1450, unit: "ppm", deviceClass: "carbon_dioxide", warnAbove: 1200 };

describe("numericWarning", () => {
  it("warns strictly over the limit above, in the class's words and the limit said with its unit", () => {
    expect(numericWarning(co2)).toEqual({ side: "above", word: "High CO₂", said: "Carbon dioxide above 1200 ppm" });
    expect(numericWarning({ ...co2, value: 1200 })).toBeUndefined();
    expect(numericWarning({ ...co2, value: 1199.9 })).toBeUndefined();
  });

  it("warns strictly under the limit below, and outside a band on either side", () => {
    const freezer: NumericEntity = { entityId: "sensor.freezer", name: "Freezer", state: "ok", value: -12, unit: "°C", deviceClass: "temperature", warnBelow: -25, warnAbove: -15 };
    expect(numericWarning(freezer)).toEqual({ side: "above", word: "Too warm", said: "Temperature above -15°C" });
    expect(numericWarning({ ...freezer, value: -27 })).toEqual({ side: "below", word: "Too cold", said: "Temperature below -25°C" });
    expect(numericWarning({ ...freezer, value: -25 })).toBeUndefined();
    expect(numericWarning({ ...freezer, value: -18 })).toBeUndefined();
  });

  it("says a plain reading's warning without a class", () => {
    expect(numericWarning({ state: "ok", value: 3, warnBelow: 10 })).toEqual({ side: "below", word: "Too low", said: "below 10" });
  });

  it("never warns with no limit, while unavailable, or before a first reading", () => {
    expect(numericWarning({ ...co2, warnAbove: undefined })).toBeUndefined();
    expect(numericWarning({ ...co2, state: "unavailable" })).toBeUndefined();
    expect(numericWarning({ ...co2, value: undefined })).toBeUndefined();
  });
});

describe("numericSeverity", () => {
  it("ranks a crossed limit advisory, never higher: a free number has no meaning core knows", () => {
    expect(numericSeverity(co2)).toBe("advisory");
    expect(numericSeverity({ ...co2, value: 99_999 })).toBe("advisory");
    expect(numericSeverity({ ...co2, value: 650 })).toBeUndefined();
    expect(numericSeverity({ ...co2, state: "unavailable" })).toBeUndefined();
  });
});
