import { describe, expect, it } from "vitest";
import { batteryFromHass, inlineBattery, isBatteryEntity } from "./battery";
import type { HassEntity } from "../types";

const sensor = (state: string, attributes: Record<string, unknown> = { device_class: "battery", unit_of_measurement: "%" }): HassEntity =>
  ({ entity_id: "sensor.battery", state, attributes, last_changed: "", last_updated: "" });

describe("a same-device battery", () => {
  it("reads a battery companion's level", () => {
    expect(batteryFromHass(sensor("64"))).toBe(64);
    expect(batteryFromHass(sensor("8", { unit_of_measurement: "%" }))).toBe(8);
  });

  it("reads nothing from a companion that is unavailable, isn't a battery, or is out of range", () => {
    expect(batteryFromHass(undefined)).toBeUndefined();
    expect(batteryFromHass(sensor("unavailable"))).toBeUndefined();
    expect(batteryFromHass(sensor("unknown"))).toBeUndefined();
    expect(batteryFromHass(sensor(""))).toBeUndefined();
    expect(batteryFromHass(sensor("140"))).toBeUndefined();
    expect(batteryFromHass(sensor("21", { device_class: "temperature", unit_of_measurement: "°C" }))).toBeUndefined();
    expect(isBatteryEntity(sensor("50", { device_class: "humidity", unit_of_measurement: "%" }))).toBe(false);
  });

  it("reads an entity's own battery attribute", () => {
    expect(inlineBattery({ battery_level: 41 })).toBe(41);
    expect(inlineBattery({ battery: 77 })).toBe(77);
    expect(inlineBattery({ battery_level: -1 })).toBeUndefined();
    expect(inlineBattery(undefined)).toBeUndefined();
  });
});
