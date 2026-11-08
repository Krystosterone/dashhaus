import type { HassEntity } from "../types";
import { formatHaTime, parseHaTime } from "../time";
import { isRecord, stringValue } from "../util";
import { batteryFromHass, inlineBattery } from "./battery";
import { isBinarySensorClass } from "../../entities/binarySensor/words";
import type { BinarySensorEntity } from "../../entities/binarySensor/types";

export interface BinarySensorMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /** A companion on the same device, `device_class: battery`. */
  batteryEntity?: HassEntity;
}

/**
 * Map one raw Home Assistant `binary_sensor.*` state, and its device's battery, to the card model. Only `on` and `off`
 * are states; `unknown`, `unavailable`, anything else and a missing entity are unavailable, never a safe-looking off
 * (a smoke detector that can't be reached is not Clear). A device class Home Assistant doesn't define is none.
 */
export function binarySensorFromHass(raw: HassEntity | undefined, entityId: string, options: BinarySensorMapOptions = {}): BinarySensorEntity {
  const attributes = isRecord(raw?.attributes) ? raw.attributes : {};
  const state = raw?.state === "on" ? "on" : raw?.state === "off" ? "off" : "unavailable";
  const unav = state === "unavailable";
  const deviceClass = attributes.device_class;

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    deviceClass: isBinarySensorClass(deviceClass) ? deviceClass : undefined,
    lastChanged: formatHaTime(raw?.last_changed, options.now),
    changedAt: parseHaTime(raw?.last_changed)?.getTime(),
    battery: unav ? undefined : inlineBattery(attributes) ?? batteryFromHass(options.batteryEntity),
    lastSeen: unav ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now) : undefined,
  };
}
