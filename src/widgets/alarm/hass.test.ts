import { describe, expect, it, vi } from "vitest";
import { alarmFromHass, callAlarm } from "./hass";
import type { HassAlarmState, HassLike } from "./hass";

const base: HassAlarmState = {
  entity_id: "alarm_control_panel.main",
  state: "disarmed",
  last_changed: "2026-10-18T08:00:00",
  attributes: {},
};

describe("alarmFromHass", () => {
  it("maps an unknown state to unavailable", () => {
    expect(alarmFromHass({ ...base, state: "weird" }, base.entity_id).state).toBe("unavailable");
  });
  it("derives modes from supported features", () => {
    const s = { ...base, attributes: { supported_features: 1 | 4 } };
    expect(alarmFromHass(s, base.entity_id).modes).toEqual(["home", "night"]);
  });
  it("defaults to away when the panel supports nothing", () => {
    expect(alarmFromHass(base, base.entity_id).modes).toEqual(["away"]);
  });
  it("restricts modes to the caller's list", () => {
    const s = { ...base, attributes: { supported_features: 1 | 2 } };
    expect(alarmFromHass(s, base.entity_id, { modes: ["away"] }).modes).toEqual(["away"]);
  });
  it("prefers Alarmo's delay attribute", () => {
    const s = { ...base, state: "arming", attributes: { delay: 30, supported_features: 2 } };
    expect(alarmFromHass(s, base.entity_id, { exitDelay: 60 }).delay).toBe(30);
  });
  it("falls back to the option delay when the panel has none", () => {
    const s = { ...base, state: "pending", attributes: { supported_features: 2 } };
    expect(alarmFromHass(s, base.entity_id, { entryDelay: 45 }).delay).toBe(45);
  });
  it("requires a code by default", () => {
    expect(alarmFromHass(base, base.entity_id).codeArmRequired).toBe(true);
  });
});

describe("callAlarm", () => {
  const hass = (fn: HassLike["callService"]): HassLike => ({ states: {}, callService: fn });

  it("arms with the code and resolves true", async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    await expect(callAlarm(hass(callService), base.entity_id, { kind: "arm", mode: "away" }, "1234")).resolves.toBe(true);
    expect(callService).toHaveBeenCalledWith("alarm_control_panel", "alarm_arm_away", {
      entity_id: base.entity_id,
      code: "1234",
    });
  });
  it("omits the code when absent", async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    await callAlarm(hass(callService), base.entity_id, { kind: "disarm" });
    expect(callService).toHaveBeenCalledWith("alarm_control_panel", "alarm_disarm", { entity_id: base.entity_id });
  });
  it("resolves false for a wrong code", async () => {
    const callService = vi.fn().mockRejectedValue({ translation_key: "invalid_code" });
    await expect(callAlarm(hass(callService), base.entity_id, { kind: "disarm" })).resolves.toBe(false);
  });
  it("resolves false for a service validation error about the code", async () => {
    const callService = vi.fn().mockRejectedValue({ code: "service_validation_error", message: "Invalid code" });
    await expect(callAlarm(hass(callService), base.entity_id, { kind: "disarm" })).resolves.toBe(false);
  });
  it("rejects for anything else", async () => {
    const callService = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(callAlarm(hass(callService), base.entity_id, { kind: "disarm" })).rejects.toThrow("offline");
  });
});
