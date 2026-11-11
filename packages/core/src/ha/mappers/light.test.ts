import { describe, expect, it } from "vitest";
import { lightFromHass } from "./light";
import { formatHaTime } from "../time";

const raw = {
  entity_id: "light.living_room",
  state: "on",
  attributes: {
    friendly_name: "Living room",
    supported_color_modes: ["color_temp", "brightness"],
    brightness: 128,
    color_temp_kelvin: 3000,
    min_color_temp_kelvin: 2000,
    max_color_temp_kelvin: 5000,
  },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};

describe("lightFromHass", () => {
  it("maps brightness, color-temperature capability, identity, and timestamps", () => {
    expect(lightFromHass(raw, raw.entity_id, { area: "Living room" })).toMatchObject({
      entityId: "light.living_room",
      name: "Living room",
      area: "Living room",
      state: "on",
      supportsBrightness: true,
      brightness: 50,
      supportsColorTemp: true,
      kelvin: 3000,
      minKelvin: 2000,
      maxKelvin: 5000,
    });
    expect(lightFromHass(raw, raw.entity_id).lastChanged).toBeDefined();
  });

  it("maps an hs-only lamp's colour, and no colour temperature", () => {
    // The nursery sound machine's night light, as the Tuya integration reports it.
    const lamp = {
      ...raw,
      entity_id: "light.nursery",
      attributes: { friendly_name: "Nursery", supported_color_modes: ["hs"], color_mode: "hs", brightness: 8, hs_color: [31.086, 94.488], rgb_color: [255, 139, 14] },
    };
    expect(lightFromHass(lamp, lamp.entity_id)).toMatchObject({ supportsBrightness: true, brightness: 3, supportsColorTemp: false, kelvin: undefined, supportsColor: true, hs: [31.086, 94.488] });
  });

  it("leaves the colour out while the lamp shows a colour temperature, is off, or reports a bad hs", () => {
    const both = { ...raw, attributes: { ...raw.attributes, supported_color_modes: ["color_temp", "hs"], color_mode: "color_temp", hs_color: [27, 50] } };
    expect(lightFromHass(both, raw.entity_id)).toMatchObject({ supportsColor: true, hs: undefined, kelvin: 3000 });
    expect(lightFromHass({ ...both, attributes: { ...both.attributes, color_mode: "hs" } }, raw.entity_id).hs).toEqual([27, 50]);
    expect(lightFromHass({ ...both, state: "unavailable", attributes: { ...both.attributes, color_mode: "hs" } }, raw.entity_id).hs).toBeUndefined();
    expect(lightFromHass({ ...both, attributes: { ...both.attributes, color_mode: "hs", hs_color: [400, 50] } }, raw.entity_id).hs).toBeUndefined();
    expect(lightFromHass({ ...both, attributes: { ...both.attributes, color_mode: "hs", hs_color: ["red", 50] } }, raw.entity_id).hs).toBeUndefined();
  });

  it("keeps unknown apart from off and unavailable, with no reading", () => {
    // A light group before its first state, or an optimistic light before its first command.
    const unknown = lightFromHass({ ...raw, state: "unknown", attributes: { ...raw.attributes, brightness: 128, color_temp_kelvin: 3000 } }, raw.entity_id);
    expect(unknown.state).toBe("unknown");
    expect(unknown.brightness).toBeUndefined();
    expect(unknown.kelvin).toBeUndefined();
    expect(unknown.lastSeen).toBeUndefined();
  });

  it("keeps unavailable and missing entities unavailable", () => {
    const unavailable = lightFromHass({ ...raw, state: "unavailable" }, raw.entity_id);
    const missing = lightFromHass(undefined, "light.missing", { name: "Missing" });

    expect(unavailable.state).toBe("unavailable");
    expect(missing).toMatchObject({ entityId: "light.missing", name: "Missing", state: "unavailable" });
    expect(missing.brightness).toBeUndefined();
    expect(unavailable.lastSeen).toBeUndefined();
  });

  it("suppresses stale measurements while an unavailable light retains its capabilities", () => {
    const mapped = lightFromHass({
      ...raw,
      state: "unavailable",
      attributes: {
        ...raw.attributes,
        brightness: 128,
        color_temp_kelvin: 3000,
      },
    }, raw.entity_id);

    expect(mapped.supportsBrightness).toBe(true);
    expect(mapped.supportsColorTemp).toBe(true);
    expect(mapped.brightness).toBeUndefined();
    expect(mapped.kelvin).toBeUndefined();
  });

  it("does not infer brightness support from a stale brightness attribute", () => {
    const mapped = lightFromHass({ ...raw, attributes: { friendly_name: "Hall", brightness: 255 } }, "light.hall");
    expect(mapped.supportsBrightness).toBe(false);
    expect(mapped.brightness).toBeUndefined();
  });

  it("preserves missing brightness instead of presenting a fabricated reading", () => {
    const mapped = lightFromHass({
      ...raw,
      attributes: {
        friendly_name: "Bedroom",
        supported_color_modes: ["brightness"],
      },
    }, "light.bedroom");

    expect(mapped.supportsBrightness).toBe(true);
    expect(mapped.brightness).toBeUndefined();
  });

  it("suppresses out-of-wire brightness while preserving capability metadata", () => {
    const mapped = lightFromHass({
      ...raw,
      attributes: { ...raw.attributes, brightness: -5, supported_color_modes: ["brightness"] },
    }, raw.entity_id);

    expect(mapped.supportsBrightness).toBe(true);
    expect(mapped.brightness).toBeUndefined();
  });
  it("rejects impossible state timestamps instead of accepting normalized dates", () => {
    const mapped = lightFromHass({ ...raw, last_changed: "2026-02-31T10:00:00Z" }, raw.entity_id);

    expect(mapped.lastChanged).toBeUndefined();
  });

  it("rejects unknown color modes instead of exposing a brightness control", () => {
    const mapped = lightFromHass({
      ...raw,
      attributes: { supported_color_modes: ["bogus"], brightness: 255 },
    }, raw.entity_id);

    expect(mapped.supportsBrightness).toBe(false);
    expect(mapped.brightness).toBeUndefined();
  });

  it("omits Kelvin readings outside their own reported bounds", () => {
    const inverted = lightFromHass({
      ...raw,
      attributes: {
        supported_color_modes: ["color_temp"],
        color_temp_kelvin: 3500,
        min_color_temp_kelvin: 5000,
        max_color_temp_kelvin: 2000,
      },
    }, raw.entity_id);

    expect(inverted.supportsColorTemp).toBe(true);
    expect(inverted.kelvin).toBeUndefined();
    expect(inverted.minKelvin).toBeUndefined();
    expect(inverted.maxKelvin).toBeUndefined();

    const outside = lightFromHass({
      ...raw,
      attributes: {
        supported_color_modes: ["color_temp"],
        color_temp_kelvin: 6000,
        min_color_temp_kelvin: 2000,
        max_color_temp_kelvin: 5000,
      },
    }, raw.entity_id);

    expect(outside.kelvin).toBeUndefined();
    expect(outside.minKelvin).toBe(2000);
    expect(outside.maxKelvin).toBe(5000);
  });

  it("rejects nonexistent timezone-less local times during a DST gap", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "America/Toronto";
    try {
      expect(formatHaTime("2026-03-08T02:30:00")).toBeUndefined();
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });

  it("says when Home Assistant only assumes its state, and nothing otherwise", () => {
    const raw = { entity_id: "light.rf", state: "on", attributes: { supported_color_modes: ["onoff"], assumed_state: true }, last_changed: "2026-10-19T10:00:00Z", last_updated: "2026-10-19T10:00:00Z" };
    expect(lightFromHass(raw, raw.entity_id).assumedState).toBe(true);
    expect(lightFromHass({ ...raw, attributes: { supported_color_modes: ["onoff"] } }, raw.entity_id)).not.toHaveProperty("assumedState");
  });
});
