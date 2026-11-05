import { describe, expect, it } from "vitest";
import { toggleFromHass } from "./toggle";

const raw = {
  entity_id: "input_boolean.guest_mode",
  state: "on",
  attributes: {
    friendly_name: "Guest",
  },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};

describe("toggleFromHass", () => {
  it("maps identity, state, and timestamps", () => {
    expect(toggleFromHass(raw, raw.entity_id, { area: "Whole home" })).toMatchObject({
      entityId: "input_boolean.guest_mode",
      name: "Guest",
      area: "Whole home",
      state: "on",
    });
    expect(toggleFromHass(raw, raw.entity_id).lastChanged).toBeDefined();
  });

  it("maps off to off", () => {
    expect(toggleFromHass({ ...raw, state: "off" }, raw.entity_id).state).toBe("off");
  });

  it("keeps unknown, unavailable, and missing entities unavailable", () => {
    const unknown = toggleFromHass({ ...raw, state: "unknown" }, raw.entity_id);
    const unavailable = toggleFromHass({ ...raw, state: "unavailable" }, raw.entity_id);
    const missing = toggleFromHass(undefined, "switch.missing", { name: "Missing" });

    expect(unknown.state).toBe("unavailable");
    expect(unavailable.state).toBe("unavailable");
    expect(missing).toMatchObject({ entityId: "switch.missing", name: "Missing", state: "unavailable" });
    expect(missing.lastSeen).toBeUndefined();
  });

  it("passes host metadata through options instead of reading attributes", () => {
    const mapped = toggleFromHass(raw, raw.entity_id, {
      icon: "guest",
      description: "Lets visitors on the Wi-Fi.",
    });

    expect(mapped.icon).toBe("guest");
    expect(mapped.description).toBe("Lets visitors on the Wi-Fi.");
  });

  it("does not infer icon or description from raw attributes", () => {
    const mapped = toggleFromHass({
      ...raw,
      attributes: { ...raw.attributes, icon: "moon", color: "blue", description: "fake" },
    }, raw.entity_id);

    expect(mapped.icon).toBeUndefined();
    expect(mapped.description).toBeUndefined();
  });

  it("sets lastSeen only when unavailable", () => {
    const unavailable = toggleFromHass({
      ...raw,
      state: "unavailable",
      attributes: { ...raw.attributes, last_seen: "2026-10-19T08:20:00Z" },
    }, raw.entity_id);
    const on = toggleFromHass(raw, raw.entity_id);

    expect(unavailable.lastSeen).toBeDefined();
    expect(on.lastSeen).toBeUndefined();
  });

  it("prefers an explicit lastSeen option over the raw attribute", () => {
    const mapped = toggleFromHass({
      ...raw,
      state: "unavailable",
      attributes: { ...raw.attributes, last_seen: "2026-10-19T08:20:00Z" },
    }, raw.entity_id, { lastSeen: "2026-10-19T07:00:00Z" });

    expect(mapped.lastSeen).toBe(toggleFromHass({ ...raw, state: "unavailable" }, raw.entity_id, { lastSeen: "2026-10-19T07:00:00Z" }).lastSeen);
  });

  it("rejects impossible state timestamps", () => {
    expect(toggleFromHass({ ...raw, last_changed: "2026-02-31T10:00:00Z" }, raw.entity_id).lastChanged).toBeUndefined();
  });
});
