import { describe, expect, it } from "vitest";
import { soundFromHass, soundVolumeCandidates, soundVolumeFromHass } from "./sound";

const raw = {
  entity_id: "switch.bedroom",
  state: "on",
  attributes: { friendly_name: "Bedroom" },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};

describe("soundFromHass", () => {
  it("maps identity, state, and timestamps", () => {
    expect(soundFromHass(raw, raw.entity_id, { area: "Upstairs" })).toMatchObject({
      entityId: "switch.bedroom",
      name: "Bedroom",
      area: "Upstairs",
      state: "on",
    });
    expect(soundFromHass(raw, raw.entity_id).lastChanged).toBeDefined();
  });

  it("maps off to off", () => {
    expect(soundFromHass({ ...raw, state: "off" }, raw.entity_id).state).toBe("off");
  });

  it("keeps unknown, unavailable, and missing entities unavailable", () => {
    expect(soundFromHass({ ...raw, state: "unknown" }, raw.entity_id).state).toBe("unavailable");
    expect(soundFromHass({ ...raw, state: "unavailable" }, raw.entity_id).state).toBe("unavailable");
    const missing = soundFromHass(undefined, "switch.missing");
    expect(missing).toMatchObject({ entityId: "switch.missing", name: "switch.missing", state: "unavailable" });
    expect(missing.lastSeen).toBeUndefined();
  });

  it("falls back from an empty friendly name to the entity id", () => {
    expect(soundFromHass({ ...raw, attributes: { friendly_name: "" } }, raw.entity_id).name).toBe("switch.bedroom");
  });

  it("sets lastSeen only when unavailable, preferring the explicit option", () => {
    const attributes = { ...raw.attributes, last_seen: "2026-10-19T08:20:00Z" };
    expect(soundFromHass({ ...raw, attributes }, raw.entity_id).lastSeen).toBeUndefined();
    expect(soundFromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id).lastSeen).toBeDefined();
    expect(soundFromHass({ ...raw, state: "unavailable", attributes }, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBe("07:00");
  });

  it("rejects impossible state timestamps", () => {
    expect(soundFromHass({ ...raw, last_changed: "2026-02-31T10:00:00Z" }, raw.entity_id).lastChanged).toBeUndefined();
  });

  // The nursery sound machine's volume, as the Tuya integration reports it.
  const volume = {
    entity_id: "number.nursery_volume",
    state: "62.0",
    attributes: { friendly_name: "Nursery Volume", min: 0, max: 100, step: 1, mode: "auto" },
    last_changed: "2026-10-20T01:48:22Z",
    last_updated: "2026-10-20T01:48:22Z",
  };

  it("reads the volume as a percent of the number's range", () => {
    expect(soundFromHass(raw, raw.entity_id, { volumeEntity: volume }).volume).toBe(62);
    expect(soundFromHass({ ...raw, state: "off" }, raw.entity_id, { volumeEntity: volume }).volume).toBe(62);
    const levels = { ...volume, state: "6", attributes: { min: 1, max: 16, step: 1 } };
    expect(soundFromHass(raw, raw.entity_id, { volumeEntity: levels }).volume).toBe(33);
  });

  it("leaves the volume out without a usable reading, range, or sound", () => {
    expect(soundFromHass(raw, raw.entity_id).volume).toBeUndefined();
    expect(soundFromHass(raw, raw.entity_id, { volumeEntity: { ...volume, state: "unavailable" } }).volume).toBeUndefined();
    expect(soundFromHass(raw, raw.entity_id, { volumeEntity: { ...volume, state: "140" } }).volume).toBeUndefined();
    expect(soundFromHass(raw, raw.entity_id, { volumeEntity: { ...volume, attributes: { min: 100, max: 0 } } }).volume).toBeUndefined();
    expect(soundFromHass({ ...raw, state: "unavailable" }, raw.entity_id, { volumeEntity: volume }).volume).toBeUndefined();
  });

  it("keeps the volume's native range for setting it back", () => {
    expect(soundVolumeFromHass(volume)).toEqual({ entityId: "number.nursery_volume", min: 0, max: 100, step: 1, value: 62 });
    expect(soundVolumeFromHass({ ...volume, attributes: {} })).toMatchObject({ min: 0, max: 100, step: 1 });
    expect(soundVolumeFromHass(undefined)).toBeUndefined();
  });

  it("looks for the volume beside the sound switch, then beside its device", () => {
    expect(soundVolumeCandidates("switch.nursery_music")).toEqual(["number.nursery_music_volume", "number.nursery_volume"]);
    expect(soundVolumeCandidates("switch.noise")).toEqual(["number.noise_volume"]);
  });
});
