import { describe, expect, it } from "vitest";
import { fanFromHass } from "./fan";
import fixtures from "../fixtures/fan.json";

const raw = {
  entity_id: "fan.bedroom",
  state: "on",
  attributes: {
    friendly_name: "Bedroom",
    percentage: 67,
    percentage_step: 100 / 3,
    preset_mode: "sleep",
    preset_modes: ["normal", "sleep", "nature"],
    oscillating: true,
    direction: "forward",
    supported_features: 1 | 2 | 4 | 8 | 16 | 32,
  },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};
const withAttributes = (attributes: Record<string, unknown>, state = raw.state) => ({ ...raw, state, attributes: { ...raw.attributes, ...attributes } });

describe("fanFromHass", () => {
  it("maps identity, state, and timestamps", () => {
    expect(fanFromHass(raw, raw.entity_id, { area: "Upstairs" })).toMatchObject({
      entityId: "fan.bedroom",
      name: "Bedroom",
      area: "Upstairs",
      state: "on",
    });
    expect(fanFromHass(raw, raw.entity_id).lastChanged).toBeDefined();
  });

  it("maps off to off", () => {
    expect(fanFromHass({ ...raw, state: "off" }, raw.entity_id).state).toBe("off");
  });

  it("reads every declared control and its value", () => {
    expect(fanFromHass(raw, raw.entity_id)).toMatchObject({
      supportsSpeed: true,
      percentage: 67,
      speedCount: 3,
      supportsPreset: true,
      presetModes: ["normal", "sleep", "nature"],
      presetMode: "sleep",
      supportsOscillate: true,
      oscillating: true,
      supportsDirection: true,
      direction: "forward",
    });
  });

  it("reads only what supported_features declares", () => {
    const onOff = fanFromHass(withAttributes({ supported_features: 16 | 32 }), raw.entity_id);
    expect(onOff).toMatchObject({ supportsSpeed: false, supportsPreset: false, supportsOscillate: false, supportsDirection: false });
    expect(onOff.percentage).toBeUndefined();
    expect(onOff.speedCount).toBeUndefined();
    expect(onOff.presetModes).toBeUndefined();
    expect(onOff.presetMode).toBeUndefined();
    expect(onOff.oscillating).toBeUndefined();
    expect(onOff.direction).toBeUndefined();
    const missing = fanFromHass(withAttributes({ supported_features: undefined }), raw.entity_id);
    expect(missing.supportsSpeed).toBe(false);
  });

  it("has no speed or preset while off, but keeps its swing and direction", () => {
    const off = fanFromHass(withAttributes({ percentage: 0, preset_mode: null }, "off"), raw.entity_id);
    expect(off.percentage).toBeUndefined();
    expect(off.presetMode).toBeUndefined();
    expect(off.oscillating).toBe(true);
    expect(off.direction).toBe("forward");
  });

  it("drops impossible values", () => {
    const bad = fanFromHass(withAttributes({ percentage: 140, preset_mode: "turbo", oscillating: "yes", direction: "sideways", preset_modes: ["sleep", "", 4, "sleep"] }), raw.entity_id);
    expect(bad.percentage).toBeUndefined();
    expect(bad.presetMode).toBeUndefined();
    expect(bad.presetModes).toEqual(["sleep"]);
    expect(bad.oscillating).toBeUndefined();
    expect(bad.direction).toBeUndefined();
    expect(fanFromHass(withAttributes({ percentage: Number.NaN }), raw.entity_id).percentage).toBeUndefined();
    expect(fanFromHass(withAttributes({ percentage: 42.6 }), raw.entity_id).percentage).toBe(43);
  });

  it("is stepless without a usable percentage_step", () => {
    expect(fanFromHass(withAttributes({ percentage_step: undefined }), raw.entity_id).speedCount).toBe(100);
    expect(fanFromHass(withAttributes({ percentage_step: 0 }), raw.entity_id).speedCount).toBe(100);
  });

  it("has no preset control when the fan declares presets but lists none", () => {
    expect(fanFromHass(withAttributes({ preset_modes: [] }), raw.entity_id).supportsPreset).toBe(false);
  });

  it("keeps unknown, unavailable, and missing entities unavailable, with no values", () => {
    expect(fanFromHass({ ...raw, state: "unknown" }, raw.entity_id).state).toBe("unavailable");
    const unavailable = fanFromHass({ ...raw, state: "unavailable" }, raw.entity_id);
    expect(unavailable.state).toBe("unavailable");
    expect(unavailable.percentage).toBeUndefined();
    expect(unavailable.oscillating).toBeUndefined();
    expect(unavailable.direction).toBeUndefined();
    const missing = fanFromHass(undefined, "fan.missing");
    expect(missing).toMatchObject({ entityId: "fan.missing", name: "fan.missing", state: "unavailable", supportsSpeed: false });
    expect(missing.lastSeen).toBeUndefined();
  });

  it("falls back from an empty friendly name to the entity id", () => {
    expect(fanFromHass({ ...raw, attributes: { friendly_name: "" } }, raw.entity_id).name).toBe("fan.bedroom");
  });

  it("sets lastSeen only when unavailable, preferring the explicit option", () => {
    const attributes = { ...raw.attributes, last_seen: "2026-10-19T08:20:00Z" };
    expect(fanFromHass({ ...raw, attributes }, raw.entity_id).lastSeen).toBeUndefined();
    expect(fanFromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id).lastSeen).toBeDefined();
    expect(fanFromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBe("07:00");
  });

  it("rejects impossible state timestamps", () => {
    expect(fanFromHass({ ...raw, last_changed: "2026-02-31T10:00:00Z" }, raw.entity_id).lastChanged).toBeUndefined();
  });

  it("reads the fixture's ceiling fan and on/off extractor", () => {
    const ceiling = fanFromHass(fixtures["fan.living_room_ceiling"], "fan.living_room_ceiling");
    expect(ceiling).toMatchObject({ percentage: 40, speedCount: 100, supportsDirection: true, direction: "reverse", supportsOscillate: false, supportsPreset: false });
    const extractor = fanFromHass(fixtures["fan.bathroom_extractor"], "fan.bathroom_extractor");
    expect(extractor).toMatchObject({ state: "off", supportsSpeed: false, supportsPreset: false, supportsOscillate: false, supportsDirection: false });
  });
});
