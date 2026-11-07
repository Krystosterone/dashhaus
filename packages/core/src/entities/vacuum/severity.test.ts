import { describe, expect, it } from "vitest";
import { vacuumSeverity } from "./severity";

describe("vacuumSeverity", () => {
  it("ranks an error urgent, above a low battery", () => {
    expect(vacuumSeverity({ state: "error", battery: 5 })).toBe("urgent");
  });

  it("ranks a low battery advisory while it stands away from the dock and isn't charging", () => {
    expect(vacuumSeverity({ state: "idle", battery: 12 })).toBe("advisory");
    expect(vacuumSeverity({ state: "paused", battery: 12 })).toBe("advisory");
    expect(vacuumSeverity({ state: "other", battery: 12 })).toBe("advisory");
    expect(vacuumSeverity({ state: "cleaning", battery: 9 })).toBeUndefined();
    expect(vacuumSeverity({ state: "returning", battery: 9 })).toBeUndefined();
    expect(vacuumSeverity({ state: "returning", battery: 12, charging: true })).toBeUndefined();
    expect(vacuumSeverity({ state: "docked", battery: 2 })).toBeUndefined();
  });

  it("ranks nothing for a state, however long, or while unavailable", () => {
    expect(vacuumSeverity({ state: "paused", battery: 80 })).toBeUndefined();
    expect(vacuumSeverity({ state: "unavailable", battery: 2 })).toBeUndefined();
  });
});
