import { describe, expect, it } from "vitest";
import { __name__FromHass } from "./__name__";

const raw = {
  entity_id: "__domain__.living_room",
  state: "42.5",
  attributes: { friendly_name: "Living room", unit_of_measurement: "ppm" },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};

describe("__name__FromHass", () => {
  it("maps identity, the reading, its unit and when it came in", () => {
    const mapped = __name__FromHass(raw, raw.entity_id, { area: "Ground floor" });
    expect(mapped).toMatchObject({ entityId: "__domain__.living_room", name: "Living room", area: "Ground floor", state: "ok", value: 42.5, unit: "ppm" });
    expect(mapped.lastUpdated).toBeDefined();
  });

  it("keeps unknown, unavailable, and missing entities unavailable, with no value", () => {
    for (const state of ["unknown", "unavailable"]) expect(__name__FromHass({ ...raw, state }, raw.entity_id)).toMatchObject({ state: "unavailable", value: undefined });
    expect(__name__FromHass(undefined, "__domain__.missing")).toMatchObject({ name: "__domain__.missing", state: "unavailable" });
  });

  it("is no reading, not a value, when the state isn't a finite number", () => {
    for (const state of ["", "abc", "Infinity"]) expect(__name__FromHass({ ...raw, state }, raw.entity_id)).toMatchObject({ state: "ok", value: undefined });
  });

  it("lets the host's unit win over the raw one", () => {
    expect(__name__FromHass(raw, raw.entity_id, { unit: "%" }).unit).toBe("%");
  });

  it("sets lastSeen only when unavailable", () => {
    expect(__name__FromHass(raw, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBeUndefined();
    expect(__name__FromHass({ ...raw, state: "unavailable" }, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBe("07:00");
  });

  it("rejects impossible state timestamps", () => {
    expect(__name__FromHass({ ...raw, last_updated: "2026-02-31T10:00:00Z" }, raw.entity_id).lastUpdated).toBeUndefined();
  });
});
