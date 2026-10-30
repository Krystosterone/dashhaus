import { describe, expect, it } from "vitest";
import { normalizeReadings } from "./history";

describe("normalizeReadings", () => {
  it("scales readings between 0.12 and 1, keeping gaps and hours ahead", () => {
    expect(normalizeReadings([20, 22, "unavailable", null])).toEqual({ samples: [0.12, 1, "unavailable", null], min: 20, max: 22 });
  });
  it("keeps a near-flat day off the top of the strip", () => {
    expect(normalizeReadings([98, 98.2], 1).samples[1]).toBeCloseTo(0.296);
  });
  it("has no low or high before the first reading", () => {
    expect(normalizeReadings([null, "unavailable"])).toEqual({ samples: [null, "unavailable"], min: null, max: null });
  });
});
