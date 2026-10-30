import { describe, expect, it } from "vitest";
import { alarmFromHass } from "./alarm";
import type { HassEntity } from "../types";

const raw: HassEntity = {
  entity_id: "alarm_control_panel.main",
  state: "disarmed",
  attributes: {
    friendly_name: "Main alarm",
    code_format: "number",
    code_arm_required: true,
    supported_features: 1 | 2 | 4,
    changed_by: "Alex",
  },
  last_changed: "2026-10-19T08:00:00Z",
  last_updated: "2026-10-19T08:00:00Z",
};

describe("alarmFromHass", () => {
  it("maps identity, state, modes, code metadata, and timestamps", () => {
    const entity = alarmFromHass(raw, raw.entity_id, { area: "Whole home" });
    expect(entity).toMatchObject({
      entityId: "alarm_control_panel.main",
      name: "Main alarm",
      area: "Whole home",
      state: "disarmed",
      modes: ["home", "away", "night"],
      codeFormat: "number",
      codeArmRequired: true,
      changedBy: "Alex",
    });
    expect(entity.changedAt).toBe(Date.parse("2026-10-19T08:00:00Z"));
    expect(entity.lastChanged).toBeDefined();
  });

  it("maps unknown and unavailable states to unavailable", () => {
    expect(alarmFromHass({ ...raw, state: "unknown" }, raw.entity_id).state).toBe("unavailable");
    expect(alarmFromHass({ ...raw, state: "unavailable" }, raw.entity_id).state).toBe("unavailable");
    expect(alarmFromHass({ ...raw, state: "weird" }, raw.entity_id).state).toBe("unavailable");
    expect(alarmFromHass(undefined, raw.entity_id).state).toBe("unavailable");
  });

  it("derives modes in the card's order from the supported_features bitmask", () => {
    const entity = alarmFromHass({ ...raw, attributes: { ...raw.attributes, supported_features: 16 | 32 | 1 } }, raw.entity_id);
    expect(entity.modes).toEqual(["home", "vacation", "custom_bypass"]);
  });

  it("preserves an empty capability set when the panel reports no modes", () => {
    expect(alarmFromHass({ ...raw, attributes: {} }, raw.entity_id).modes).toEqual([]);
  });

  it("maps code_format and defaults code_arm_required to true", () => {
    expect(alarmFromHass({ ...raw, attributes: { ...raw.attributes, code_format: "text" } }, raw.entity_id).codeFormat).toBe("text");
    expect(alarmFromHass({ ...raw, attributes: { ...raw.attributes, code_format: null } }, raw.entity_id).codeFormat).toBeNull();
    expect(alarmFromHass({ ...raw, attributes: { ...raw.attributes, code_arm_required: false } }, raw.entity_id).codeArmRequired).toBe(false);
    expect(alarmFromHass({ ...raw, attributes: {} }, raw.entity_id).codeArmRequired).toBe(true);
  });

  it("resolves armingTo from next_state while arming or pending", () => {
    const arming = alarmFromHass({
      ...raw,
      state: "arming",
      attributes: { ...raw.attributes, next_state: "armed_away" },
    }, raw.entity_id);
    expect(arming.armingTo).toBe("away");

    const pending = alarmFromHass({
      ...raw,
      state: "pending",
      attributes: { ...raw.attributes, next_state: "armed_night" },
    }, raw.entity_id);
    expect(pending.armingTo).toBe("night");

    expect(alarmFromHass({ ...raw, state: "armed_away" }, raw.entity_id).armingTo).toBeUndefined();
  });

  it("prefers the integration's delay attribute over host metadata", () => {
    const entity = alarmFromHass({
      ...raw,
      state: "arming",
      attributes: { ...raw.attributes, delay: 30 },
    }, raw.entity_id, { exitDelay: 60 });
    expect(entity.delay).toBe(30);
  });

  it("falls back to exitDelay and entryDelay when the panel reports no delay", () => {
    const arming = alarmFromHass({ ...raw, state: "arming", attributes: { ...raw.attributes } }, raw.entity_id, { exitDelay: 45 });
    expect(arming.delay).toBe(45);

    const pending = alarmFromHass({ ...raw, state: "pending", attributes: { ...raw.attributes } }, raw.entity_id, { entryDelay: 25 });
    expect(pending.delay).toBe(25);
  });

  it("passes host-composed open sensors through", () => {
    const entity = alarmFromHass(raw, raw.entity_id, { openSensors: ["Back door", "Kitchen window"] });
    expect(entity.openSensors).toEqual(["Back door", "Kitchen window"]);
    expect(alarmFromHass(raw, raw.entity_id).openSensors).toBeUndefined();
  });

  it("takes triggeredBy from host metadata and lastSeen from reachability metadata", () => {
    const triggered = alarmFromHass({ ...raw, state: "triggered", attributes: { ...raw.attributes, changed_by: "Back door" } }, raw.entity_id, { triggeredBy: "Back door" });
    expect(triggered.triggeredBy).toBe("Back door");
    expect(alarmFromHass({ ...raw, state: "triggered" }, raw.entity_id).triggeredBy).toBeUndefined();

    const unavailable = alarmFromHass(
      { ...raw, state: "unavailable", attributes: { ...raw.attributes, last_seen: "2026-10-19T08:20:00Z" } },
      raw.entity_id,
    );
    expect(unavailable.lastSeen).toBeDefined();
    expect(alarmFromHass({ ...raw, state: "unavailable" }, raw.entity_id, { lastSeen: "08:20" }).lastSeen).toBe("08:20");
  });
});
