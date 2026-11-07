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

describe("owletFromHass alerts", () => {
  const binary = (id: string, state: string) => sensor(`binary_sensor.owlet_sock_ac0_${id}`, state);

  it("sounds only the alerts whose sensor is on", () => {
    const mapped = owletFromHass(sleep, sleep.entity_id, {
      alertEntities: {
        low_oxygen: binary("low_oxygen_alert", "on"),
        low_heart_rate: binary("low_heart_rate_alert", "off"),
        sock_off: binary("sock_off", "unavailable"),
        low_battery: binary("low_battery_alert", "unknown"),
      },
    });
    expect(mapped.alerts).toEqual(["low_oxygen"]);
  });

  it("dates the alarm from the first vitals alert sounding now, not from device problems or silent sensors", () => {
    const at = (entity: ReturnType<typeof binary>, stamp: string) => ({ ...entity, last_changed: stamp });
    const mapped = owletFromHass(sleep, sleep.entity_id, {
      alertEntities: {
        low_oxygen: at(binary("low_oxygen_alert", "on"), "2026-10-29T11:52:00Z"),
        low_heart_rate: at(binary("low_heart_rate_alert", "on"), "2026-10-29T11:50:00Z"),
        high_oxygen: at(binary("high_oxygen_alert", "off"), "2026-10-29T11:00:00Z"),
        sock_off: at(binary("sock_off", "on"), "2026-10-29T10:00:00Z"),
      },
    });
    expect(mapped.vitalsSince).toBe(Date.parse("2026-10-29T11:50:00Z"));
    expect(owletFromHass(sleep, sleep.entity_id, { alertEntities: { sock_off: binary("sock_off", "on") } }).vitalsSince).toBeUndefined();
  });

  it("has no alerts without alert sensors", () => {
    expect(owletFromHass(sleep, sleep.entity_id).alerts).toEqual([]);
  });

  it("keeps alerts while the sock is offline: the base station still raises them", () => {
    const mapped = owletFromHass({ ...sleep, state: "unavailable" }, sleep.entity_id, { alertEntities: { sock_off: binary("sock_off", "on") } });
    expect(mapped).toMatchObject({ state: "unavailable", alerts: ["sock_off"] });
  });

  it("never warns of a low battery while the sock charges, and keeps every other alert", () => {
    const alertEntities = { low_battery: binary("low_battery", "on"), critical_battery: binary("critical_battery", "on"), lost_power: binary("lost_power", "on") };
    expect(owletFromHass(sleep, sleep.entity_id, { alertEntities, chargingEntity: binary("charging", "on") }).alerts).toEqual(["lost_power"]);
    expect(owletFromHass(sleep, sleep.entity_id, { alertEntities, chargingEntity: binary("charging", "off") }).alerts).toEqual(["low_battery", "critical_battery", "lost_power"]);
  });

  it("says charging only while the charging sensor is on", () => {
    expect(owletFromHass(sleep, sleep.entity_id, { chargingEntity: binary("charging", "on") }).charging).toBe(true);
    expect(owletFromHass(sleep, sleep.entity_id, { chargingEntity: binary("charging", "unavailable") }).charging).toBe(false);
  });

  it("reads the base station switch only while it says on or off", () => {
    const base = (state: string) => sensor("switch.owlet_sock_ac0_base_station_on", state);
    expect(owletFromHass(sleep, sleep.entity_id, { baseEntity: base("on") }).baseOn).toBe(true);
    expect(owletFromHass(sleep, sleep.entity_id, { baseEntity: base("off") }).baseOn).toBe(false);
    expect(owletFromHass(sleep, sleep.entity_id, { baseEntity: base("unavailable") }).baseOn).toBeUndefined();
    expect(owletFromHass(sleep, sleep.entity_id).baseOn).toBeUndefined();
  });
});

describe("owletCompanionIds", () => {
  it("derives the integration's readings, charging, base station and alert ids", () => {
    const ids = owletCompanionIds("sensor.owlet_sock_ac0_sleep_state");
    expect(ids).toMatchObject({
      heartRate: "sensor.owlet_sock_ac0_heart_rate",
      oxygen: "sensor.owlet_sock_ac0_o2_saturation",
      charging: "binary_sensor.owlet_sock_ac0_charging",
      base: "switch.owlet_sock_ac0_base_station_on",
    });
    expect(ids?.alerts).toMatchObject({
      low_oxygen: "binary_sensor.owlet_sock_ac0_low_oxygen_alert",
      critical_oxygen: "binary_sensor.owlet_sock_ac0_critical_oxygen_alert",
      sock_off: "binary_sensor.owlet_sock_ac0_sock_off",
      sock_disconnected: "binary_sensor.owlet_sock_ac0_sock_disconnected_alert",
      lost_power: "binary_sensor.owlet_sock_ac0_lost_power_alert",
    });
    expect(Object.keys(ids!.alerts)).toHaveLength(10);
  });
  it("gives up on ids that don't follow the integration's naming", () => {
    expect(owletCompanionIds("sensor.nova_sleep")).toBeUndefined();
    expect(owletCompanionIds("binary_sensor.x_sleep_state")).toBeUndefined();
  });
});
