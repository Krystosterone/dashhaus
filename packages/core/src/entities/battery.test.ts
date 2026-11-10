import { describe, expect, it } from "vitest";
import { BATTERY_ADVICE, batteryAdvice, batteryText, isLowBattery } from "./battery";

describe("battery", () => {
  it("is low at 15% or under, and never when it doesn't say", () => {
    expect(isLowBattery(15)).toBe(true);
    expect(isLowBattery(16)).toBe(false);
    expect(isLowBattery(undefined)).toBe(false);
  });

  it("says a battery in the same words on every card (spec/cards.md → the same physical thing gets the same warning)", () => {
    expect(batteryText(12)).toBe("Battery 12%");
    expect(batteryAdvice(12)).toBe(`Battery 12%, ${BATTERY_ADVICE}`);
  });
});
