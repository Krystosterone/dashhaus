import { describe, expect, it } from "vitest";
import { canSwitch, canTurnOff, canTurnOn, onMode } from "./power";

describe("a climate unit's power", () => {
  it("turns on and off by the services it declares, or by its modes", () => {
    expect(canTurnOff({ state: "heat", hvacModes: ["heat"] })).toBe(true);
    expect(canTurnOff({ state: "heat", hvacModes: ["off", "heat"], supportsTurnOff: false })).toBe(true);
    expect(canTurnOff({ state: "heat", hvacModes: ["heat"], supportsTurnOff: false })).toBe(false);
    expect(canTurnOn({ state: "off", hvacModes: ["off"], supportsTurnOn: false })).toBe(false);
    expect(onMode({ hvacModes: ["off", "cool", "heat"] })).toBe("cool");
  });

  it("can switch only the way its state allows, and never while unavailable", () => {
    const heatOnly = { hvacModes: ["heat"] as const, supportsTurnOn: false, supportsTurnOff: false };
    expect(canSwitch({ ...heatOnly, hvacModes: [...heatOnly.hvacModes], state: "heat" })).toBe(false);
    expect(canSwitch({ state: "off", hvacModes: ["off", "heat"], supportsTurnOn: false })).toBe(true);
    expect(canSwitch({ state: "unavailable", hvacModes: ["off", "heat"] })).toBe(false);
  });
});
