import { describe, expect, it } from "vitest";
import { HASS_DYSON_ANGLES, aimAngles, aimWords, dysonAbilities, dysonMode, oscillationChoice, sweepAngles, sweepOf } from "./labels";
import type { DysonEntity } from "./types";

const base: DysonEntity = { entityId: "fan.x", name: "X", state: "on", air: [], filters: [] };

describe("a Pure Cool's sweep", () => {
  it("keeps its centre, inside what the fan turns to", () => {
    expect(sweepAngles(90, 180)).toEqual({ angle_low: 135, angle_high: 225 });
    expect(sweepAngles(180, 60)).toEqual({ angle_low: 5, angle_high: 185 });
    expect(sweepAngles(350, 300)).toEqual({ angle_low: 5, angle_high: 355 });
    expect(sweepAngles(45, 340)).toEqual({ angle_low: 310, angle_high: 355 });
  });

  it("keeps to each integration's range, and holds still on one angle twice", () => {
    expect(sweepAngles(350, undefined, HASS_DYSON_ANGLES)).toEqual({ angle_low: 0, angle_high: 350 });
    expect(sweepAngles(90, undefined, HASS_DYSON_ANGLES)).toEqual({ angle_low: 130, angle_high: 220 });
    expect(aimAngles(233, 0, HASS_DYSON_ANGLES)).toEqual({ angle_low: 233, angle_high: 233 });
    expect(aimAngles(340, 90, HASS_DYSON_ANGLES)).toEqual({ angle_low: 260, angle_high: 350 });
    expect(aimAngles(100, 10)).toEqual({ angle_low: 85, angle_high: 115 });
  });

  it("says where it points seen from behind: a lower angle is to its left", () => {
    expect(aimWords(175, 175)).toBe("ahead");
    expect(aimWords(120, 175)).toBe("55° left");
    expect(aimWords(233, 175)).toBe("58° right");
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
