import { describe, expect, it } from "vitest";
import { fmtBpm, fmtOxygen, normalize, rankAlerts } from "./readings";

describe("normalize", () => {
  it("scales readings between 0.12 and 1, keeping gaps and hours ahead", () => {
    const { samples, min, max } = normalize([120, 140, "unavailable", null]);
    expect(samples).toEqual([0.12, 1, "unavailable", null]);
    expect([min, max]).toEqual([120, 140]);
  });
  it("keeps a flat line off the baseline", () => {
    expect(normalize([98, 98]).samples).toEqual([0.12, 0.12]);
  });
  it("has no low or high before the first reading", () => {
    expect(normalize(["unavailable", null])).toEqual({ samples: ["unavailable", null], min: null, max: null });
  });
});

describe("formatting", () => {
  it("rounds to whole beats and whole percent", () => {
    expect(fmtBpm(127.6)).toBe("128");
    expect(fmtOxygen(97.4)).toBe("97");
  });
});

describe("rankAlerts", () => {
  it("splits vitals from device problems, most urgent first", () => {
    expect(rankAlerts(["low_battery", "low_heart_rate", "sock_off", "critical_oxygen"])).toEqual({
      vitals: ["critical_oxygen", "low_heart_rate"],
      problems: ["sock_off", "low_battery"],
    });
  });
  it("is empty without alerts", () => {
    expect(rankAlerts()).toEqual({ vitals: [], problems: [] });
  });
});
