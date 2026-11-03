import { describe, expect, it } from "vitest";
import { fanAbilities, fanMode, presetLabel, speedValueText } from "./labels";
import type { FanEntity } from "./types";

const tower: FanEntity = { entityId: "fan.t", name: "Tower", state: "on", supportsSpeed: true, speedCount: 3, supportsPreset: true, presetModes: ["sleep"], supportsOscillate: true, oscillating: true };

describe("fan labels", () => {
  it("words a preset", () => expect(presetLabel("smart_mode")).toBe("Smart mode"));

  it("says what it runs as: its preset, else its sweep, and nothing while off", () => {
    expect(fanMode(tower)).toBe("Oscillating");
    expect(fanMode({ ...tower, presetMode: "sleep" })).toBe("Sleep");
    expect(fanMode({ ...tower, oscillating: false })).toBeNull();
    expect(fanMode({ ...tower, state: "off" })).toBeNull();
  });

  it("speaks a speed by step or percent, and says when it is off", () => {
    expect(speedValueText(2, 3, true)).toBe("Speed 2 of 3");
    expect(speedValueText(40, 100, true)).toBe("40 percent");
    expect(speedValueText(1, 3, false)).toBe("Off. Last set to speed 1 of 3");
  });

  it("lists what it can do", () => {
    expect(fanAbilities(tower)).toBe("3 speeds, presets, oscillates");
    expect(fanAbilities({ ...tower, speedCount: 100, supportsPreset: false, supportsOscillate: false, supportsDirection: true })).toBe("Variable speed, reverses");
    expect(fanAbilities({ entityId: "fan.x", name: "X", state: "off" })).toBe("On / off");
  });
});
