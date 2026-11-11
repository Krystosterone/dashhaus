import { describe, expect, it } from "vitest";
import { coverFromHass } from "./cover";
import type { HassEntity } from "../types";

const raw: HassEntity = {
  entity_id: "cover.living_room",
  state: "open",
  attributes: {
    friendly_name: "Living room blinds",
    device_class: "blind",
    current_position: 100,
    current_tilt_position: 50,
    supported_features: 1 | 2 | 4 | 8 | 128,
  },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};

describe("coverFromHass", () => {
  it("maps identity, device class, position, tilt, and capability flags", () => {
    expect(coverFromHass(raw, raw.entity_id, { area: "Living room" })).toMatchObject({
      entityId: "cover.living_room",
      name: "Living room blinds",
      area: "Living room",
      state: "open",
      deviceClass: "blind",
      position: 100,
      tilt: 50,
      supportsPosition: true,
      supportsStop: true,
      supportsTilt: true,
      supportsOpen: true,
      supportsClose: true,
      supportsTiltOpen: false,
    });
    expect(coverFromHass(raw, raw.entity_id).lastChanged).toBeDefined();
  });

  it("says when Home Assistant only assumes where it is, and nothing otherwise", () => {
    expect(coverFromHass({ ...raw, attributes: { ...raw.attributes, assumed_state: true } }, raw.entity_id).assumedState).toBe(true);
    expect(coverFromHass(raw, raw.entity_id)).not.toHaveProperty("assumedState");
  });

  it("reads a cover that only tilts, which stops its slats", () => {
    const slats = coverFromHass({ ...raw, attributes: { ...raw.attributes, supported_features: 16 | 32 | 64 | 128 } }, raw.entity_id);
    expect(slats).toMatchObject({ supportsOpen: false, supportsClose: false, supportsPosition: false, supportsStop: true, supportsTilt: true, supportsTiltOpen: true, supportsTiltClose: true, supportsTiltStop: true });
    // A cover that lifts stops by `stop_cover` alone, never by its slats'.
    expect(coverFromHass({ ...raw, attributes: { ...raw.attributes, supported_features: 1 | 2 | 64 } }, raw.entity_id).supportsStop).toBe(false);
  });

  it("maps open, opening, closed, and closing states through", () => {
    for (const state of ["open", "opening", "closed", "closing"] as const) {
      expect(coverFromHass({ ...raw, state }, raw.entity_id).state).toBe(state);
    }
  });

  it("keeps unknown apart from closed and unavailable, with its stale position and tilt dropped", () => {
    // An RF blind or a sensorless garage door: Home Assistant drives it on an assumed state it never reports.
    const unknown = coverFromHass({ ...raw, state: "unknown", attributes: { ...raw.attributes, assumed_state: true } }, raw.entity_id);
    expect(unknown).toMatchObject({ state: "unknown", supportsPosition: true, supportsStop: true, supportsTilt: true, position: undefined, tilt: undefined, lastSeen: undefined });
  });

  it("keeps unavailable and missing entities unavailable", () => {
    const unavailable = coverFromHass({ ...raw, state: "unavailable" }, raw.entity_id);
    const missing = coverFromHass(undefined, "cover.missing", { name: "Missing" });

    expect(unavailable.state).toBe("unavailable");
    expect(missing).toMatchObject({ entityId: "cover.missing", name: "Missing", state: "unavailable" });
  });

  it("reads each feature bit independently", () => {
    const positionOnly = coverFromHass({ ...raw, attributes: { ...raw.attributes, supported_features: 4 } }, raw.entity_id);
    expect(positionOnly).toMatchObject({ supportsPosition: true, supportsStop: false, supportsTilt: false, position: 100 });

    const stopOnly = coverFromHass({ ...raw, attributes: { ...raw.attributes, supported_features: 8 } }, raw.entity_id);
    expect(stopOnly).toMatchObject({ supportsPosition: false, supportsStop: true, supportsTilt: false, position: undefined });

    const tiltOnly = coverFromHass({ ...raw, attributes: { ...raw.attributes, supported_features: 128 } }, raw.entity_id);
    expect(tiltOnly).toMatchObject({ supportsPosition: false, supportsStop: false, supportsTilt: true, tilt: 50 });
  });

  it("suppresses position and tilt readings when the state or capability is missing", () => {
    const noFeature = coverFromHass({ ...raw, attributes: { ...raw.attributes, supported_features: 0 } }, raw.entity_id);
    expect(noFeature.position).toBeUndefined();
    expect(noFeature.tilt).toBeUndefined();

    const unavailable = coverFromHass({ ...raw, state: "unavailable" }, raw.entity_id);
    expect(unavailable.position).toBeUndefined();
    expect(unavailable.tilt).toBeUndefined();
  });

  it("falls back to the shade device class for unknown or missing device classes", () => {
    expect(coverFromHass({ ...raw, attributes: { ...raw.attributes, device_class: "roller" } }, raw.entity_id).deviceClass).toBe("shade");
    expect(coverFromHass({ ...raw, attributes: {} }, raw.entity_id).deviceClass).toBe("shade");
  });

  it("omits position and tilt outside 0..100 or non-finite", () => {
    const outOfRange = coverFromHass({ ...raw, attributes: { ...raw.attributes, current_position: 120, current_tilt_position: -5 } }, raw.entity_id);
    expect(outOfRange.position).toBeUndefined();
    expect(outOfRange.tilt).toBeUndefined();

    const nonFinite = coverFromHass({ ...raw, attributes: { ...raw.attributes, current_position: Number.NaN } }, raw.entity_id);
    expect(nonFinite.position).toBeUndefined();
  });

  it("reports last seen only when unavailable", () => {
    expect(coverFromHass(raw, raw.entity_id).lastSeen).toBeUndefined();

    const unavailable = coverFromHass(
      { ...raw, state: "unavailable", attributes: { ...raw.attributes, last_seen: "2026-10-19T08:20:00Z" } },
      raw.entity_id,
    );
    expect(unavailable.lastSeen).toBeDefined();
  });
});
