import { describe, expect, it } from "vitest";
import { guestWifiCompanions, guestWifiFromHass } from "./guestWifi";
import { formatHaTime } from "../time";
import fixture from "../fixtures/guestWifi.json";
import type { HassEntity } from "../types";

const raw = fixture["sensor.maple_voucher"] as HassEntity;
const now = new Date("2026-11-05T22:00:00");
const qrEntity: HassEntity = {
  entity_id: "image.maple_qr_code",
  state: "2026-11-03T02:18:46+00:00",
  attributes: { wlan_name: "Maple Guests", entity_picture: "/api/image_proxy/image.maple_qr_code?token=abc", friendly_name: "UniFi Hotspot Manager Guest WLAN QR code" },
  last_changed: "2026-11-03T02:18:46+00:00",
  last_updated: "2026-11-03T02:18:46+00:00",
};
const newCodeEntity: HassEntity = { entity_id: "button.maple_create", state: "unknown", attributes: {}, last_changed: "", last_updated: "" };

describe("guestWifiCompanions", () => {
  it("finds the QR code and buttons the integration names beside its code", () => {
    expect(guestWifiCompanions("sensor.67d9d6d6ad84e044caf4621c_voucher")).toEqual({
      qr: "image.67d9d6d6ad84e044caf4621c_qr_code",
      newCode: "button.67d9d6d6ad84e044caf4621c_create",
      refresh: "button.67d9d6d6ad84e044caf4621c_update",
    });
  });

  it("finds none for any other entity: its host names them", () => {
    expect(guestWifiCompanions("input_text.guest_wifi_password")).toEqual({});
    expect(guestWifiCompanions("sensor.guest_password")).toEqual({});
  });
});

describe("guestWifiFromHass", () => {
  it("maps the code, its network, uses and length", () => {
    expect(guestWifiFromHass(raw, raw.entity_id, { now, area: "Hall", qrEntity })).toMatchObject({
      entityId: "sensor.maple_voucher",
      name: "Guest Wi-Fi",
      area: "Hall",
      state: "ready",
      network: "Maple Guests",
      code: "98668-49366",
      allowed: 1,
      used: 0,
      lastsMinutes: 1440,
    });
  });

  it("reads a voucher sensor as a code, and an input_text or text as a password, unless told", () => {
    expect(guestWifiFromHass(raw, raw.entity_id).access).toBe("code");
    const password = fixture["input_text.guest_wifi_password"] as HassEntity;
    expect(guestWifiFromHass(password, password.entity_id, { network: "Maple Guests 5G" })).toMatchObject({
      state: "ready", access: "password", code: "ripe-Mango-sunset-42", network: "Maple Guests 5G", allowed: undefined, lastsMinutes: undefined,
    });
    expect(guestWifiFromHass({ ...password, entity_id: "text.guest" }, "text.guest").access).toBe("password");
    expect(guestWifiFromHass(raw, raw.entity_id, { access: "password" }).access).toBe("password");
  });

  it("takes the network's name from the option before the integration's", () => {
    expect(guestWifiFromHass(raw, raw.entity_id, { network: "Visitors" }).network).toBe("Visitors");
  });

  it("names it Guest Wi-Fi, not the integration's friendly name, unless told", () => {
    expect(guestWifiFromHass(raw, raw.entity_id).name).toBe("Guest Wi-Fi");
    expect(guestWifiFromHass(raw, raw.entity_id, { name: "Visitors" }).name).toBe("Visitors");
  });

  it("reads a code in use: its uses so far and the time it has left", () => {
    const shared = fixture["sensor.cottage_voucher"] as HassEntity;
    expect(guestWifiFromHass(shared, shared.entity_id, { now })).toMatchObject({ allowed: 5, used: 2, lastsMinutes: 1440, leftMinutes: 1092 });
  });

  it("reads a quota of 0 as unlimited uses", () => {
    expect(guestWifiFromHass({ ...raw, attributes: { ...raw.attributes, quota: 0 } }, raw.entity_id).allowed).toBe("unlimited");
  });

  it("drops uses and lengths that don't parse, never guessing", () => {
    const odd = guestWifiFromHass({ ...raw, attributes: { ...raw.attributes, quota: -1, used: 1.5, duration: "a while", status_expires: "" } }, raw.entity_id);
    expect(odd).toMatchObject({ state: "ready", code: "98668-49366" });
    expect(odd.allowed).toBeUndefined();
    expect(odd.used).toBeUndefined();
    expect(odd.lastsMinutes).toBeUndefined();
    expect(odd.leftMinutes).toBeUndefined();
  });

  it("formats when it was made against the card's clock", () => {
    expect(guestWifiFromHass(raw, raw.entity_id, { now }).created).toBe(formatHaTime("2026-07-09T22:11:02", now));
    expect(guestWifiFromHass(raw, raw.entity_id, { now }).created).toMatch(/Jul/);
  });

  it("is none, not unavailable, when there is no code but one can be made", () => {
    const empty = fixture["sensor.garage_voucher"] as HassEntity;
    const none = guestWifiFromHass(empty, empty.entity_id, { qrEntity, newCodeEntity });
    expect(none).toMatchObject({ state: "none", network: "Maple Guests" });
    expect(none.code).toBeUndefined();
    expect(guestWifiFromHass(undefined, "sensor.maple_voucher", { newCodeEntity }).state).toBe("none");
  });

  it("is unavailable when neither the code nor a way to make one can be reached", () => {
    for (const id of ["sensor.annex_voucher", "sensor.garage_voucher"] as const) {
      const entity = fixture[id] as HassEntity;
      expect(guestWifiFromHass(entity, id, { qrEntity }).state).toBe("unavailable");
      expect(guestWifiFromHass(entity, id, { qrEntity, newCodeEntity: { ...newCodeEntity, state: "unavailable" } }).state).toBe("unavailable");
    }
    const gone = guestWifiFromHass(undefined, "sensor.missing", { qrEntity, lastSeen: "08:20" });
    expect(gone).toMatchObject({ state: "unavailable", lastSeen: "08:20" });
    expect(gone.network).toBeUndefined();
    expect(gone.qr).toBeUndefined();
  });

  it("reads the network from the QR code's image while it can be reached, and never its picture: the hook adds that", () => {
    const unnamed: HassEntity = { ...raw, attributes: { ...raw.attributes, wlan_name: undefined } };
    const named = guestWifiFromHass(unnamed, raw.entity_id, { qrEntity });
    expect(named.network).toBe("Maple Guests");
    expect(named.qr).toBeUndefined();
    expect(guestWifiFromHass(unnamed, raw.entity_id, { qrEntity: { ...qrEntity, state: "unavailable" } }).network).toBeUndefined();
  });

  it("sets lastSeen only while unavailable", () => {
    expect(guestWifiFromHass(raw, raw.entity_id, { lastSeen: "08:20" }).lastSeen).toBeUndefined();
  });
});
