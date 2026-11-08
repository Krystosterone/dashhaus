import { describe, expect, it } from "vitest";
import { dysonAbilities, dysonMode, oscillationChoice, sweepAngles, sweepOf } from "./labels";
import type { DysonEntity } from "./types";

const base: DysonEntity = { entityId: "fan.x", name: "X", state: "on", air: [], filters: [] };

describe("a Pure Cool's sweep", () => {
  it("keeps its centre, inside what the fan turns to", () => {
    expect(sweepAngles(90, 180)).toEqual({ angle_low: 135, angle_high: 225 });
    expect(sweepAngles(180, 60)).toEqual({ angle_low: 5, angle_high: 185 });
    expect(sweepAngles(350, 300)).toEqual({ angle_low: 5, angle_high: 355 });
    expect(sweepAngles(45, 340)).toEqual({ angle_low: 310, angle_high: 355 });
  });

  it("reads one of its own from its angles, within two degrees", () => {
    expect(sweepOf(135, 225)).toBe(90);
    expect(sweepOf(5, 355)).toBe(350);
    expect(sweepOf(100, 220)).toBeUndefined();
  });

  it("chooses Off, its range, or On where it has none", () => {
    expect(oscillationChoice({ oscillating: false, oscillationModes: ["45°"] })).toBe("off");
    expect(oscillationChoice({ oscillating: true, oscillationModes: ["45°", "90°"], oscillationMode: "90°" })).toBe("90°");
    expect(oscillationChoice({ oscillating: true, oscillationModes: ["45°"] })).toBeNull();
    expect(oscillationChoice({ oscillating: true })).toBe("on");
    expect(oscillationChoice({})).toBeNull();
  });
});

describe("dysonMode", () => {
  it("says heat first, then Auto, Night and the sweep, and nothing while off", () => {
    expect(dysonMode({ ...base, heatOn: true, heatTarget: 23, auto: true })).toBe("Heat 23°");
    expect(dysonMode({ ...base, auto: true, nightMode: true })).toBe("Auto");
    expect(dysonMode({ ...base, nightMode: true })).toBe("Night");
    expect(dysonMode({ ...base, oscillating: true, oscillationMode: "90°" })).toBe("Sweeps 90°");
    expect(dysonMode({ ...base, state: "off", auto: true })).toBeNull();
  });

  it("says what it can do", () => {
    expect(dysonAbilities({ ...base, supportsSpeed: true, speedCount: 10, supportsAuto: true, supportsOscillate: true, oscillationModes: ["45°", "90°"], supportsNightMode: true, supportsHeat: true }))
      .toBe("10 speeds, auto, oscillates 45°, 90°, night mode, heats");
    expect(dysonAbilities(base)).toBe("On / off");
  });
});
