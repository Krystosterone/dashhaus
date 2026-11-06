import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import { finiteNumber, stringValue } from "../util";
import { durationMinutes } from "../../entities/guestWifi/words";
import type { GuestWifiEntity } from "../../entities/guestWifi/types";

export interface GuestWifiMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /** The network's join QR code, `image.*_qr_code`. */
  qrEntity?: HassEntity;
  /** What makes a new one (UniFi's `button.*_create`): while it is reachable, no code is `none`, not unavailable. */
  newCodeEntity?: HassEntity;
  /** `code` or `password`. Default: `code` for a `sensor.*`, `password` for an `input_text.*` or `text.*`. */
  access?: GuestWifiEntity["access"];
  /** The network's name, where Home Assistant names none (UniFi's `wlan_name`) or names it otherwise. */
  network?: string;
}

/** What a guest types by default: a sensor's state is a voucher's code; an `input_text` or `text` holds a password. */
export const defaultAccess = (entityId: string): GuestWifiEntity["access"] => (/^(input_text|text)\./.test(entityId) ? "password" : "code");

/**
 * The companions UniFi Hotspot Manager names beside its code: `sensor.<site>_voucher` → `image.<site>_qr_code`,
 * `button.<site>_create`, `button.<site>_update`. Any other entity has none to find: its host names them.
 */
export function guestWifiCompanions(entityId: string): { qr?: string; newCode?: string; refresh?: string } {
  const site = entityId.match(/^sensor\.(\w+)_voucher$/)?.[1];
  return site ? { qr: `image.${site}_qr_code`, newCode: `button.${site}_create`, refresh: `button.${site}_update` } : {};
}

const reachable = (raw: HassEntity | undefined): raw is HassEntity => raw != null && raw.state !== "unavailable";
const count = (value: unknown) => {
  const n = finiteNumber(value);
  return n != null && Number.isInteger(n) && n >= 0 ? n : undefined;
};

/**
 * Map the entity that holds a guest network's code or password, and its companions, to the card model. Its state is
 * the code or password. UniFi Hotspot Manager's code `sensor.*` is the newest code with a use left, and the integration
 * makes it unavailable when there is none: with no code or password, it is `none` while what makes a new one is
 * reachable, and unavailable otherwise, as `unknown` and a missing entity are. Uses, length and time left are read only
 * from the attributes UniFi Hotspot Manager writes, and dropped when they don't parse; the network's name is the
 * `network` option, else its `wlan_name`.
 */
export function guestWifiFromHass(raw: HassEntity | undefined, entityId: string, options: GuestWifiMapOptions = {}): GuestWifiEntity {
  const { now, qrEntity, newCodeEntity } = options;
  const attributes = raw?.attributes ?? {};
  const code = raw && raw.state !== "unavailable" && raw.state !== "unknown" ? stringValue(raw.state.trim()) : undefined;
  const state = code ? "ready" : reachable(newCodeEntity) ? "none" : "unavailable";
  const qr = state !== "unavailable" && reachable(qrEntity) ? qrEntity : undefined;
  const quota = code ? count(attributes.quota) : undefined;

  return {
    entityId,
    name: options.name ?? "Guest Wi-Fi",
    area: options.area,
    state,
    access: options.access ?? defaultAccess(entityId),
    network: state === "unavailable" ? undefined : options.network ?? stringValue(attributes.wlan_name) ?? stringValue(qr?.attributes.wlan_name),
    code,
    qr: stringValue(qr?.attributes.entity_picture),
    allowed: quota === 0 ? "unlimited" : quota,
    used: code ? count(attributes.used) : undefined,
    lastsMinutes: code ? durationMinutes(attributes.duration) : undefined,
    leftMinutes: code ? durationMinutes(attributes.status_expires) : undefined,
    created: code ? formatHaTime(attributes.create_time, now) : undefined,
    lastUpdated: code ? formatHaTime(attributes.last_pull ?? raw?.last_updated, now) : undefined,
    lastSeen: state === "unavailable" ? options.lastSeen : undefined,
  };
}
