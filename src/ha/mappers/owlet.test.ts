import { describe, expect, it } from "vitest";
import { owletCompanionIds, owletFromHass } from "./owlet";
import type { HassEntity } from "../types";

const sensor = (entity_id: string, state: string, last_updated = "2026-10-19T10:00:00Z"): HassEntity => ({
  entity_id,
  state,
  attributes: {},
  last_changed: last_updated,
  last_updated,
});

const sleep: HassEntity = { ...sensor("sensor.owlet_sock_ac0_sleep_state", "deep_sleep"), attributes: { friendly_name: "Owlet Sock AC0 Sleep state", device_class: "enum" } };
const heartRate = sensor("sensor.owlet_sock_ac0_heart_rate", "121", "2026-10-19T10:05:00Z");
const oxygen = sensor("sensor.owlet_sock_ac0_o2_saturation", "98");

describe("owletFromHass", () => {
  it("maps the sleep state and both readings", () => {
    expect(owletFromHass(sleep, sleep.entity_id, { heartRateEntity: heartRate, oxygenEntity: oxygen, area: "Nursery" })).toMatchObject({
      entityId: "sensor.owlet_sock_ac0_sleep_state",
      name: "Owlet Sock AC0",
      area: "Nursery",
      state: "deep_sleep",
      heartRate: 121,
      oxygen: 98,
    });
  });

  it("maps light sleep and awake", () => {
    expect(owletFromHass({ ...sleep, state: "light_sleep" }, sleep.entity_id).state).toBe("light_sleep");
    expect(owletFromHass({ ...sleep, state: "awake" }, sleep.entity_id).state).toBe("awake");
  });

  it("keeps unknown, unavailable, missing and unrecognized sleep states unavailable", () => {
    for (const state of ["unknown", "unavailable", "rem_sleep"]) expect(owletFromHass({ ...sleep, state }, sleep.entity_id).state).toBe("unavailable");
    expect(owletFromHass(undefined, "sensor.missing_sleep_state")).toMatchObject({ name: "sensor.missing_sleep_state", state: "unavailable" });
  });

  it("keeps the readings when only the sleep state is unknown", () => {
    const mapped = owletFromHass({ ...sleep, state: "unknown" }, sleep.entity_id, { heartRateEntity: heartRate, oxygenEntity: oxygen });
    expect(mapped).toMatchObject({ state: "unavailable", heartRate: 121, oxygen: 98 });
    expect(mapped.lastUpdated).toBeDefined();
  });

  it("drops each reading that is unavailable, not a number, zero or out of range", () => {
    const map = (hr: string, o2: string) => owletFromHass(sleep, sleep.entity_id, { heartRateEntity: { ...heartRate, state: hr }, oxygenEntity: { ...oxygen, state: o2 } });
    expect(map("unavailable", "unknown")).toMatchObject({ heartRate: undefined, oxygen: undefined });
    expect(map("", "abc")).toMatchObject({ heartRate: undefined, oxygen: undefined });
    expect(map("0", "0")).toMatchObject({ heartRate: undefined, oxygen: undefined });
    expect(map("301", "101")).toMatchObject({ heartRate: undefined, oxygen: undefined });
    expect(map("Infinity", "98")).toMatchObject({ heartRate: undefined, oxygen: 98 });
  });

  it("takes the newest update across the three entities, and none while offline", () => {
    const later = owletFromHass(sleep, sleep.entity_id, { heartRateEntity: heartRate, oxygenEntity: oxygen, now: new Date("2026-10-19T12:00:00Z") });
    const sleepOnly = owletFromHass(sleep, sleep.entity_id, { now: new Date("2026-10-19T12:00:00Z") });
    expect(later.lastUpdated).not.toBe(sleepOnly.lastUpdated);
    const offline = owletFromHass({ ...sleep, state: "unavailable" }, sleep.entity_id, { lastSeen: "07:12" });
    expect(offline).toMatchObject({ lastUpdated: undefined, lastSeen: "07:12" });
  });

  it("is live while a reading changed within the stale window, and stale after it", () => {
    const at = (minutes: number) => new Date(Date.parse("2026-10-19T10:05:00Z") + minutes * 60_000);
    const map = (now: Date, staleAfterMinutes?: number) => owletFromHass(sleep, sleep.entity_id, { heartRateEntity: heartRate, oxygenEntity: oxygen, now, staleAfterMinutes });
    expect(map(at(0)).live).toBe(true);
    expect(map(at(3)).live).toBe(true);
    expect(map(at(4)).live).toBe(false);
    expect(map(at(4), 10).live).toBe(true);
  });

  it("can't tell whether an offline or timestamp-less sock is live", () => {
    expect(owletFromHass({ ...sleep, state: "unavailable" }, sleep.entity_id).live).toBeUndefined();
    expect(owletFromHass({ ...sleep, last_updated: undefined }, sleep.entity_id).live).toBeUndefined();
  });

  it("sets lastSeen only while the sock reports nothing", () => {
    expect(owletFromHass(sleep, sleep.entity_id, { lastSeen: "07:12" }).lastSeen).toBeUndefined();
  });
});

describe("owletCompanionIds", () => {
  it("derives the integration's heart rate and oxygen ids", () => {
    expect(owletCompanionIds("sensor.owlet_sock_ac0_sleep_state")).toEqual({
      heartRate: "sensor.owlet_sock_ac0_heart_rate",
      oxygen: "sensor.owlet_sock_ac0_o2_saturation",
    });
  });
  it("gives up on ids that don't follow the integration's naming", () => {
    expect(owletCompanionIds("sensor.nova_sleep")).toBeUndefined();
    expect(owletCompanionIds("binary_sensor.x_sleep_state")).toBeUndefined();
  });
});
