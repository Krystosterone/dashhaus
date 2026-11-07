import { describe, expect, it } from "vitest";
import { binarySensorFromHass } from "./binarySensor";

const raw = {
  entity_id: "binary_sensor.front_door",
  state: "on",
  attributes: { friendly_name: "Front door", device_class: "door" },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};
const battery = { entity_id: "sensor.front_door_battery", state: "12", attributes: { device_class: "battery", unit_of_measurement: "%" } };

describe("binarySensorFromHass", () => {
  it("maps identity, the state, its device class and when it last changed", () => {
    const mapped = binarySensorFromHass(raw, raw.entity_id, { area: "Hall" });
    expect(mapped).toMatchObject({ entityId: "binary_sensor.front_door", name: "Front door", area: "Hall", state: "on", deviceClass: "door" });
    expect(mapped.lastChanged).toBeDefined();
    expect(mapped.changedAt).toBe(Date.parse("2026-10-19T10:00:00Z"));
    expect(binarySensorFromHass({ ...raw, state: "off" }, raw.entity_id).state).toBe("off");
  });

  it("keeps unknown, unavailable, any other state and missing entities unavailable, never off", () => {
    for (const state of ["unknown", "unavailable", "open", ""]) expect(binarySensorFromHass({ ...raw, state }, raw.entity_id).state).toBe("unavailable");
    expect(binarySensorFromHass(undefined, "binary_sensor.missing")).toMatchObject({ name: "binary_sensor.missing", state: "unavailable" });
  });

  it("drops a device class Home Assistant doesn't define", () => {
    expect(binarySensorFromHass({ ...raw, attributes: { device_class: "doorbell" } }, raw.entity_id).deviceClass).toBeUndefined();
    expect(binarySensorFromHass({ ...raw, attributes: {} }, raw.entity_id).deviceClass).toBeUndefined();
  });

  it("composes its device's battery, or its own battery attribute, only while reachable", () => {
    expect(binarySensorFromHass(raw, raw.entity_id, { batteryEntity: battery }).battery).toBe(12);
    expect(binarySensorFromHass({ ...raw, attributes: { ...raw.attributes, battery_level: 80 } }, raw.entity_id, { batteryEntity: battery }).battery).toBe(80);
    expect(binarySensorFromHass({ ...raw, state: "unavailable" }, raw.entity_id, { batteryEntity: battery }).battery).toBeUndefined();
  });

  it("sets lastSeen only when unavailable", () => {
    expect(binarySensorFromHass(raw, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBeUndefined();
    expect(binarySensorFromHass({ ...raw, state: "unavailable" }, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBe("07:00");
  });

  it("rejects impossible state timestamps", () => {
    expect(binarySensorFromHass({ ...raw, last_changed: "2026-02-31T10:00:00Z" }, raw.entity_id).lastChanged).toBeUndefined();
  });
});
