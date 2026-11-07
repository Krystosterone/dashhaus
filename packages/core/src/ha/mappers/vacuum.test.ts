import { describe, expect, it } from "vitest";
import { vacuumFromHass, VACUUM_FEATURES } from "./vacuum";

const ALL = VACUUM_FEATURES.START | VACUUM_FEATURES.PAUSE | VACUUM_FEATURES.RETURN_HOME | VACUUM_FEATURES.LOCATE | VACUUM_FEATURES.FAN_SPEED | VACUUM_FEATURES.BATTERY;

const raw = {
  entity_id: "vacuum.downstairs",
  state: "cleaning",
  attributes: { friendly_name: "Robot vacuum", battery_level: 72, fan_speed: "standard", fan_speed_list: ["quiet", "standard", "turbo"], status: "Cleaning", supported_features: ALL },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};

describe("vacuumFromHass", () => {
  it("maps identity, state, battery, fan speed and what it can do", () => {
    expect(vacuumFromHass(raw, raw.entity_id, { area: "Hall" })).toMatchObject({
      entityId: "vacuum.downstairs",
      name: "Robot vacuum",
      area: "Hall",
      state: "cleaning",
      battery: 72,
      charging: false,
      fanSpeed: "standard",
      fanSpeeds: ["quiet", "standard", "turbo"],
      supportsStart: true,
      supportsPause: true,
      supportsReturn: true,
      supportsLocate: true,
      supportsFanSpeed: true,
    });
    const mapped = vacuumFromHass(raw, raw.entity_id);
    expect(mapped.lastChanged).toBeDefined();
    expect(mapped.changedAt).toBe(Date.parse("2026-10-19T10:00:00Z"));
    // A status that only repeats the state is kept, and the card leaves it out.
    expect(mapped.status).toBe("Cleaning");
  });

  it.each([
    ["docked", "docked"], ["returning", "returning"], ["paused", "paused"], ["idle", "idle"], ["error", "error"],
    ["charging", "docked"], ["returning_home", "returning"], ["stopped", "idle"], ["on", "cleaning"], ["off", "idle"], ["Stuck", "error"],
  ])("maps %s to %s", (state, expected) => {
    expect(vacuumFromHass({ ...raw, state }, raw.entity_id).state).toBe(expected);
  });

  it("keeps a kind of cleaning as cleaning, said in its own words", () => {
    expect(vacuumFromHass({ ...raw, state: "spot_cleaning" }, raw.entity_id)).toMatchObject({ state: "cleaning", stateText: "Spot cleaning" });
    expect(vacuumFromHass({ ...raw, state: "mopping" }, raw.entity_id)).toMatchObject({ state: "cleaning", stateText: "Mopping" });
  });

  it("falls back to an integration's own state in words, never a guessed one", () => {
    expect(vacuumFromHass({ ...raw, state: "updating_firmware" }, raw.entity_id)).toMatchObject({ state: "other", stateText: "Updating firmware" });
  });

  it("says why it is in error, only while it is", () => {
    const attributes = { ...raw.attributes, error: "main_brush_jammed" };
    expect(vacuumFromHass({ ...raw, state: "error", attributes }, raw.entity_id).error).toBe("Main brush jammed");
    expect(vacuumFromHass({ ...raw, attributes }, raw.entity_id).error).toBeUndefined();
  });

  it("reads charging from the state, the battery icon or the status", () => {
    expect(vacuumFromHass({ ...raw, state: "charging" }, raw.entity_id).charging).toBe(true);
    expect(vacuumFromHass({ ...raw, state: "idle", attributes: { ...raw.attributes, battery_icon: "mdi:battery-charging-60" } }, raw.entity_id).charging).toBe(true);
    expect(vacuumFromHass({ ...raw, state: "docked", attributes: { ...raw.attributes, status: "Charging" } }, raw.entity_id).charging).toBe(true);
    expect(vacuumFromHass({ ...raw, state: "docked", attributes: { ...raw.attributes, status: "Charging completed" } }, raw.entity_id).charging).toBe(false);
  });

  it("declares only what supported_features says, and fan speeds only with a list", () => {
    const bare = vacuumFromHass({ ...raw, attributes: { ...raw.attributes, supported_features: VACUUM_FEATURES.START } }, raw.entity_id);
    expect(bare).toMatchObject({ supportsStart: true, supportsPause: false, supportsReturn: false, supportsLocate: false, supportsFanSpeed: false });
    const noList = vacuumFromHass({ ...raw, attributes: { ...raw.attributes, fan_speed_list: [] } }, raw.entity_id);
    expect(noList.supportsFanSpeed).toBe(false);
  });

  it("drops an impossible battery level", () => {
    expect(vacuumFromHass({ ...raw, attributes: { ...raw.attributes, battery_level: 140 } }, raw.entity_id).battery).toBeUndefined();
  });

  it("keeps unknown, unavailable, and missing entities unavailable", () => {
    expect(vacuumFromHass({ ...raw, state: "unknown" }, raw.entity_id).state).toBe("unavailable");
    expect(vacuumFromHass({ ...raw, state: "unavailable" }, raw.entity_id)).toMatchObject({ state: "unavailable", battery: undefined, fanSpeed: undefined });
    const missing = vacuumFromHass(undefined, "vacuum.missing");
    expect(missing).toMatchObject({ entityId: "vacuum.missing", name: "vacuum.missing", state: "unavailable" });
    expect(missing.lastSeen).toBeUndefined();
  });

  it("falls back from an empty friendly name to the entity id", () => {
    expect(vacuumFromHass({ ...raw, attributes: { friendly_name: "" } }, raw.entity_id).name).toBe("vacuum.downstairs");
  });

  it("sets lastSeen only when unavailable, preferring the explicit option", () => {
    const attributes = { ...raw.attributes, last_seen: "2026-10-19T08:20:00Z" };
    expect(vacuumFromHass({ ...raw, attributes }, raw.entity_id).lastSeen).toBeUndefined();
    expect(vacuumFromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id).lastSeen).toBeDefined();
    expect(vacuumFromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBe("07:00");
  });

  it("rejects impossible state timestamps", () => {
    expect(vacuumFromHass({ ...raw, last_changed: "2026-02-31T10:00:00Z" }, raw.entity_id).lastChanged).toBeUndefined();
  });
});
