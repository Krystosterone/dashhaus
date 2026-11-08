import { describe, expect, it } from "vitest";
import { sensorSeverity } from "./severity";

describe("sensorSeverity", () => {
  it("ranks a low battery advisory, once, in core (spec/cards.md → severity is ranked once)", () => {
    expect(sensorSeverity({ state: "ok", battery: 9 })).toBe("advisory");
    expect(sensorSeverity({ state: "ok", battery: 80 })).toBeUndefined();
    expect(sensorSeverity({ state: "ok" })).toBeUndefined();
  });

  it("ranks nothing while unavailable", () => {
    expect(sensorSeverity({ state: "unavailable", battery: 9 })).toBeUndefined();
  });
});
