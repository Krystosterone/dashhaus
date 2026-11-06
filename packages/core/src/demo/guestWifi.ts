import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { createDemoTransport } from "./transport";
import type { DemoService } from "./transport";
import { QR_MAPLE, QR_PASSWORD } from "./qr";

const SITE = "guest_wifi";
/** The demo's code sensor: UniFi Hotspot Manager names its entities after the site, `sensor.<site>_voucher`. */
export const GUEST_WIFI_DEMO_ID = `sensor.${SITE}_voucher`;
/** The demo's other network: a Wi-Fi password in an `input_text`, its QR code an `image`, and a script that changes it. */
export const GUEST_WIFI_DEMO_PASSWORD = { entityId: "input_text.guest_wifi_password", qr: "image.guest_wifi_password_qr", newCode: "script.new_guest_wifi_password" } as const;

const stamp = "2026-10-19T09:12:00Z";
const entity = (entity_id: string, state: string, attributes: HassEntity["attributes"]): HassEntity => ({ entity_id, state, attributes, last_changed: stamp, last_updated: stamp });
/** The integration's local time, timezone-less: "2026-10-19T09:12:00". */
const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);

/** One site's code, its join QR code and its three buttons, as the integration makes them. */
export const GUEST_WIFI_DEMO_ENTITIES: HassEntities = {
  [GUEST_WIFI_DEMO_ID]: entity(GUEST_WIFI_DEMO_ID, "98668-49366", {
    friendly_name: "UniFi Hotspot Manager Voucher",
    icon: "mdi:numeric",
    wlan_name: "Maple Guests",
    id: "6a5054b78f48bad7321935a4",
    quota: 1,
    used: 0,
    duration: "1 d",
    status: "valid_one",
    create_time: local(new Date(Date.now() - 26 * 3_600_000)),
    last_pull: new Date().toISOString(),
  }),
  [`image.${SITE}_qr_code`]: entity(`image.${SITE}_qr_code`, stamp, { friendly_name: "UniFi Hotspot Manager Guest WLAN QR code", wlan_name: "Maple Guests", entity_picture: QR_MAPLE, icon: "mdi:qrcode" }),
  [`button.${SITE}_create`]: entity(`button.${SITE}_create`, "unknown", { friendly_name: "UniFi Hotspot Manager Create voucher", device_class: "restart" }),
  [`button.${SITE}_update`]: entity(`button.${SITE}_update`, "unknown", { friendly_name: "UniFi Hotspot Manager Update", device_class: "update" }),
  [GUEST_WIFI_DEMO_PASSWORD.entityId]: entity(GUEST_WIFI_DEMO_PASSWORD.entityId, "ripe-Mango-sunset-42", { friendly_name: "Guest Wi-Fi password", mode: "text", min: 8, max: 63 }),
  [GUEST_WIFI_DEMO_PASSWORD.qr]: entity(GUEST_WIFI_DEMO_PASSWORD.qr, stamp, { friendly_name: "Guest Wi-Fi QR code", entity_picture: QR_PASSWORD }),
  [GUEST_WIFI_DEMO_PASSWORD.newCode]: entity(GUEST_WIFI_DEMO_PASSWORD.newCode, "off", { friendly_name: "New guest Wi-Fi password" }),
};

/** A new ten-digit code, in the integration's two groups of five. */
const newCode = () => Array.from({ length: 2 }, () => String(Math.floor(10_000 + Math.random() * 90_000))).join("-");

/** A press is the button's new state, its time; creating a code and fetching them change the code's sensor too. */
const press: DemoService = ({ entity: button, also }) => {
  const now = new Date();
  const voucher = button.entity_id.replace(/^button\./, "sensor.").replace(/_(create|update)$/, "_voucher");
  if (button.entity_id.endsWith("_create")) {
    also(voucher, { state: newCode(), attributes: { id: now.getTime().toString(16), quota: 1, used: 0, duration: "1 d", status: "valid_one", create_time: local(now), last_pull: now.toISOString() } });
  } else if (button.entity_id.endsWith("_update")) {
    also(voucher, { attributes: { last_pull: now.toISOString() } });
  } else {
    throw new Error(`The guest Wi-Fi demo only presses its own buttons: ${button.entity_id}`);
  }
  return { state: now.toISOString() };
};

const WORDS = ["ripe", "Mango", "sunset", "Cedar", "quiet", "Harbor", "amber", "Willow"];
const word = () => WORDS[Math.floor(Math.random() * WORDS.length)];

/**
 * The password's script: a new password of three words and a number. The demo can't draw its QR code, so the old one
 * goes unavailable rather than joining with a password that no longer works.
 */
const newPassword: DemoService = ({ entity: script, also }) => {
  if (script.entity_id !== GUEST_WIFI_DEMO_PASSWORD.newCode) throw new Error(`The guest Wi-Fi demo only runs its own script: ${script.entity_id}`);
  also(GUEST_WIFI_DEMO_PASSWORD.entityId, { state: `${word()}-${word()}-${word()}-${10 + Math.floor(Math.random() * 90)}` });
  also(GUEST_WIFI_DEMO_PASSWORD.qr, { state: "unavailable" });
  return { state: "off" };
};

/**
 * Storybook-only guest Wi-Fi transport: the real store, mapper and actions, answered locally. UniFi Hotspot Manager's
 * `button.press` on the create button makes a new code, and on the update button fetches them again; the password's
 * `script.turn_on` changes it. Every other call is refused.
 */
export function createDemoGuestWifiHaTransport(seed: HassEntities = GUEST_WIFI_DEMO_ENTITIES): HaTransport {
  return createDemoTransport({
    seed,
    services: { "button.press": press, "script.turn_on": newPassword },
    refuse: (domain, service) => new Error(`The guest Wi-Fi code is read-only: ${domain}.${service}`),
  });
}
