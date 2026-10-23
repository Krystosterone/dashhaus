import { describe, expect, it } from "vitest";
import { __name__FromHass } from "./__name__";

const raw = {
  entity_id: "__domain__.bedroom",
  state: "on",
  attributes: { friendly_name: "Bedroom" },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};

describe("__name__FromHass", () => {
  it("maps identity, state, and timestamps", () => {
    expect(__name__FromHass(raw, raw.entity_id, { area: "Upstairs" })).toMatchObject({
      entityId: "__domain__.bedroom",
      name: "Bedroom",
      area: "Upstairs",
      state: "on",
    });
    expect(__name__FromHass(raw, raw.entity_id).lastChanged).toBeDefined();
  });

  it("maps off to off", () => {
    expect(__name__FromHass({ ...raw, state: "off" }, raw.entity_id).state).toBe("off");
  });

  it("keeps unknown, unavailable, and missing entities unavailable", () => {
    expect(__name__FromHass({ ...raw, state: "unknown" }, raw.entity_id).state).toBe("unavailable");
    expect(__name__FromHass({ ...raw, state: "unavailable" }, raw.entity_id).state).toBe("unavailable");
    const missing = __name__FromHass(undefined, "__domain__.missing");
    expect(missing).toMatchObject({ entityId: "__domain__.missing", name: "__domain__.missing", state: "unavailable" });
    expect(missing.lastSeen).toBeUndefined();
  });

  it("falls back from an empty friendly name to the entity id", () => {
    expect(__name__FromHass({ ...raw, attributes: { friendly_name: "" } }, raw.entity_id).name).toBe("__domain__.bedroom");
  });

  it("sets lastSeen only when unavailable, preferring the explicit option", () => {
    const attributes = { ...raw.attributes, last_seen: "2026-10-19T08:20:00Z" };
    expect(__name__FromHass({ ...raw, attributes }, raw.entity_id).lastSeen).toBeUndefined();
    expect(__name__FromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id).lastSeen).toBeDefined();
    expect(__name__FromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBe("07:00");
  });

  it("rejects impossible state timestamps", () => {
    expect(__name__FromHass({ ...raw, last_changed: "2026-02-31T10:00:00Z" }, raw.entity_id).lastChanged).toBeUndefined();
  });
});
