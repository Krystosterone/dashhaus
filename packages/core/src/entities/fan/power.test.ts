import { describe, expect, it } from "vitest";
import { canSwitchFan } from "./power";

describe("canSwitchFan", () => {
  it("switches it only the way it declares, and never while unavailable", () => {
    expect(canSwitchFan({ state: "on" })).toBe(true);
    expect(canSwitchFan({ state: "on", supportsTurnOff: false })).toBe(false);
    expect(canSwitchFan({ state: "off", supportsTurnOff: false })).toBe(true);
    expect(canSwitchFan({ state: "off", supportsTurnOn: false })).toBe(false);
    expect(canSwitchFan({ state: "unavailable" })).toBe(false);
  });
});
