import { describe, expect, it } from "vitest";
import { numericFromHass } from "./numeric";

const raw = {
  entity_id: "sensor.living_room",
  state: "42.5",
  attributes: { friendly_name: "Living room", unit_of_measurement: "ppm" },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};

describe("numericFromHass", () => {
  it("maps identity, the reading, its unit and when it came in", () => {
    const mapped = numericFromHass(raw, raw.entity_id, { area: "Ground floor" });
    expect(mapped).toMatchObject({ entityId: "sensor.living_room", name: "Living room", area: "Ground floor", state: "ok", value: 42.5, unit: "ppm" });
    expect(mapped.lastUpdated).toBeDefined();
  });

  it("keeps unknown, unavailable, and missing entities unavailable, with no value", () => {
    for (const state of ["unknown", "unavailable"]) expect(numericFromHass({ ...raw, state }, raw.entity_id)).toMatchObject({ state: "unavailable", value: undefined });
    expect(numericFromHass(undefined, "sensor.missing")).toMatchObject({ name: "sensor.missing", state: "unavailable" });
  });

  it("is no reading, not a value, when the state isn't a finite number", () => {
    for (const state of ["", "abc", "Infinity"]) expect(numericFromHass({ ...raw, state }, raw.entity_id)).toMatchObject({ state: "ok", value: undefined });
  });

  it("reads what it measures and how it counts, and drops classes it has no words for", () => {
    const co2 = { ...raw, attributes: { ...raw.attributes, device_class: "carbon_dioxide", state_class: "measurement" } };
    expect(numericFromHass(co2, raw.entity_id)).toMatchObject({ deviceClass: "carbon_dioxide", stateClass: "measurement" });
    const odd = { ...raw, attributes: { ...raw.attributes, device_class: "toString", state_class: "sometimes" } };
    expect(numericFromHass(odd, raw.entity_id)).toMatchObject({ deviceClass: undefined, stateClass: undefined });
  });

  it("keeps a negative reading and a reading with no unit", () => {
    expect(numericFromHass({ ...raw, state: "-12.5", attributes: { friendly_name: "Freezer" } }, raw.entity_id)).toMatchObject({ value: -12.5, unit: undefined });
  });

  it("lets the host's unit win over the raw one", () => {
    expect(numericFromHass(raw, raw.entity_id, { unit: "%" }).unit).toBe("%");
  });

  it("sets lastSeen only when unavailable", () => {
    expect(numericFromHass(raw, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBeUndefined();
    expect(numericFromHass({ ...raw, state: "unavailable" }, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBe("07:00");
  });

  it("rejects impossible state timestamps", () => {
    expect(numericFromHass({ ...raw, last_updated: "2026-02-31T10:00:00Z" }, raw.entity_id).lastUpdated).toBeUndefined();
  });
});
