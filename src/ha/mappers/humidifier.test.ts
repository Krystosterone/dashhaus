import { describe, expect, it } from "vitest";
import { humidifierFromHass } from "./humidifier";

const raw = {
  entity_id: "humidifier.bedroom",
  state: "on",
  attributes: {
    friendly_name: "Bedroom", device_class: "humidifier", action: "humidifying", current_humidity: 38, humidity: 45,
    min_humidity: 30, max_humidity: 80, mode: "normal", available_modes: ["normal", "eco", "normal", ""],
  },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};

describe("humidifierFromHass", () => {
  it("maps identity, state, and timestamps", () => {
    expect(humidifierFromHass(raw, raw.entity_id, { area: "Upstairs" })).toMatchObject({
      entityId: "humidifier.bedroom",
      name: "Bedroom",
      area: "Upstairs",
      state: "on",
    });
    expect(humidifierFromHass(raw, raw.entity_id).lastChanged).toBeDefined();
  });

  it("maps the humidity, setpoint, action and modes", () => {
    expect(humidifierFromHass(raw, raw.entity_id)).toMatchObject({
      kind: "humidifier", action: "humidifying", currentHumidity: 38, targetHumidity: 45,
      minHumidity: 30, maxHumidity: 80, mode: "normal", modes: ["normal", "eco"],
    });
    expect(humidifierFromHass({ ...raw, attributes: { ...raw.attributes, device_class: "dehumidifier" } }, raw.entity_id).kind).toBe("dehumidifier");
  });

  it("falls back to Home Assistant's 0-100 bounds and drops values it can't trust", () => {
    const mapped = humidifierFromHass({ ...raw, attributes: { humidity: 120, current_humidity: -3, action: "boiling", min_humidity: 90, max_humidity: 20 } }, raw.entity_id);
    expect(mapped).toMatchObject({ minHumidity: 0, maxHumidity: 100 });
    expect(mapped.targetHumidity).toBeUndefined();
    expect(mapped.currentHumidity).toBeUndefined();
    expect(mapped.action).toBeUndefined();
    expect(humidifierFromHass({ ...raw, attributes: { ...raw.attributes, humidity: 25 } }, raw.entity_id).targetHumidity).toBeUndefined();
  });

  it("drops readings while unavailable", () => {
    const mapped = humidifierFromHass({ ...raw, state: "unavailable" }, raw.entity_id);
    expect(mapped.currentHumidity).toBeUndefined();
    expect(mapped.targetHumidity).toBeUndefined();
    expect(mapped.action).toBeUndefined();
  });

  it("maps off to off", () => {
    expect(humidifierFromHass({ ...raw, state: "off" }, raw.entity_id).state).toBe("off");
  });

  it("keeps unknown, unavailable, and missing entities unavailable", () => {
    expect(humidifierFromHass({ ...raw, state: "unknown" }, raw.entity_id).state).toBe("unavailable");
    expect(humidifierFromHass({ ...raw, state: "unavailable" }, raw.entity_id).state).toBe("unavailable");
    const missing = humidifierFromHass(undefined, "humidifier.missing");
    expect(missing).toMatchObject({ entityId: "humidifier.missing", name: "humidifier.missing", state: "unavailable" });
    expect(missing.lastSeen).toBeUndefined();
  });

  it("falls back from an empty friendly name to the entity id", () => {
    expect(humidifierFromHass({ ...raw, attributes: { friendly_name: "" } }, raw.entity_id).name).toBe("humidifier.bedroom");
  });

  it("sets lastSeen only when unavailable, preferring the explicit option", () => {
    const attributes = { ...raw.attributes, last_seen: "2026-10-19T08:20:00Z" };
    expect(humidifierFromHass({ ...raw, attributes }, raw.entity_id).lastSeen).toBeUndefined();
    expect(humidifierFromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id).lastSeen).toBeDefined();
    expect(humidifierFromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBe("07:00");
  });

  it("rejects impossible state timestamps", () => {
    expect(humidifierFromHass({ ...raw, last_changed: "2026-02-31T10:00:00Z" }, raw.entity_id).lastChanged).toBeUndefined();
  });
});
