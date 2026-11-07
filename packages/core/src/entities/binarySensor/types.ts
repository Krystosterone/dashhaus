import type { HourSample } from "../history";

/**
 * Home Assistant's binary sensor device classes (`BinarySensorDeviceClass`): what `on` and `off` mean. An entity with
 * none, or with one Home Assistant doesn't define, is a plain on/off sensor.
 */
export type BinarySensorClass =
  | "battery"
  | "battery_charging"
  | "carbon_monoxide"
  | "cold"
  | "connectivity"
  | "door"
  | "garage_door"
  | "gas"
  | "heat"
  | "light"
  | "lock"
  | "moisture"
  | "motion"
  | "moving"
  | "occupancy"
  | "opening"
  | "plug"
  | "power"
  | "presence"
  | "problem"
  | "running"
  | "safety"
  | "smoke"
  | "sound"
  | "tamper"
  | "update"
  | "vibration"
  | "window";

/**
 * Mirrors one Home Assistant `binary_sensor.*` (a door, a window, a leak, a smoke detector), and its device's battery,
 * as the card needs them. `unknown`, `unavailable` and a missing entity are all `unavailable`, never a safe-looking off.
 */
export interface BinarySensorEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Where it is: "Kitchen". */
  area?: string;
  state: "on" | "off" | "unavailable";
  /** What on and off mean (HA `device_class`); none is a plain on/off. */
  deviceClass?: BinarySensorClass;
  /** When it last changed state (HA `last_changed`), formatted. */
  lastChanged?: string;
  /** When the current state started, in ms since the epoch (HA `last_changed`): an alarm's start, for its timing. */
  changedAt?: number;
  /** The same device's battery, 0–100, where it has one. */
  battery?: number;
  /** While it is unavailable, when it was last reachable: the `lastSeen` option, else what Home Assistant reports. */
  lastSeen?: string;
}

export interface BinarySensorHistory {
  /** 1 for hours it was on (open, wet, detected), 0 off, "unavailable", null for hours ahead. Fractions for part of an hour. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes on today, including the current hour. */
  onMinutes: number;
}
