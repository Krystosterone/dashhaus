import { describe, expect, it } from "vitest";
import { lockFromHass } from "./lock";
import fixture from "../fixtures/lock.json";
import type { HassEntities, HassEntity } from "../types";

const entities = fixture as HassEntities;
const now = new Date("2026-10-19T12:00:00Z");

describe("lockFromHass", () => {
  it("maps a lock that asks for a code and can open the door", () => {
    expect(lockFromHass(entities["lock.front_door"], "lock.front_door", { now })).toMatchObject({
      entityId: "lock.front_door",
      name: "Front door",
      state: "locked",
      supportsOpen: true,
      codeFormat: "number",
      codePattern: "^\\d{4,6}$",
      changedBy: "Keypad",
    });
  });

  it("maps a lock with no code, and its own battery attribute", () => {
    expect(lockFromHass(entities["lock.back_door"], "lock.back_door", { now })).toMatchObject({ state: "unlocked", supportsOpen: false, codeFormat: null, battery: 64 });
  });

  it("composes the device's battery companion", () => {
    const battery: HassEntity = { entity_id: "sensor.front_door_battery", state: "12", attributes: { device_class: "battery", unit_of_measurement: "%" }, last_changed: "", last_updated: "" };
    expect(lockFromHass(entities["lock.front_door"], "lock.front_door", { now, batteryEntity: battery }).battery).toBe(12);
  });

  it("keeps every Home Assistant lock state", () => {
    for (const state of ["locked", "unlocked", "locking", "unlocking", "jammed", "open", "opening"]) {
      expect(lockFromHass({ ...entities["lock.back_door"], state }, "lock.back_door").state).toBe(state);
    }
  });

  it("never shows unknown, unavailable, an undefined state or a missing entity as locked", () => {
    expect(lockFromHass(entities["lock.porch"], "lock.porch").state).toBe("unavailable");
    expect(lockFromHass({ ...entities["lock.back_door"], state: "secured" }, "lock.back_door").state).toBe("unavailable");
    expect(lockFromHass(undefined, "lock.gone")).toMatchObject({ name: "lock.gone", state: "unavailable", supportsOpen: false });
    const shed = lockFromHass(entities["lock.shed"], "lock.shed", { now });
    expect(shed).toMatchObject({ state: "unavailable", changedBy: undefined, battery: undefined });
    expect(shed.lastSeen).toBeDefined();
  });

  it("takes a name and area from the host", () => {
    expect(lockFromHass(entities["lock.back_door"], "lock.back_door", { name: "Kitchen door", area: "Kitchen" })).toMatchObject({ name: "Kitchen door", area: "Kitchen" });
  });
});
