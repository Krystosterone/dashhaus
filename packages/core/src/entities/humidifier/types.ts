import type { HourSample } from "../history";

/** What the unit is doing right now (HA `action`). */
export type HumidifierAction = "humidifying" | "drying" | "idle" | "off";

/** Mirrors one Home Assistant `humidifier.*` entity: on or off, a target humidity, and an optional mode. */
export interface HumidifierEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Where it is: "Bedroom". */
  area?: string;
  state: "on" | "off" | "unavailable";
  /** HA `device_class`: a dehumidifier dries to its target. Default humidifier. */
  kind?: "humidifier" | "dehumidifier";
  /** Absent when the device doesn't report it. */
  action?: HumidifierAction;
  /** Relative humidity in the room, 0-100. */
  currentHumidity?: number;
  /** Target relative humidity, 0-100. Absent when the device has no setpoint. */
  targetHumidity?: number;
  minHumidity: number;
  maxHumidity: number;
  mode?: string;
  /** HA `available_modes`: "normal", "eco", "sleep", "boost"… */
  modes?: string[];
  lastChanged?: string;
  /** While it is unavailable, when it was last reachable: the `lastSeen` option, else what Home Assistant reports. */
  lastSeen?: string;
}

export interface HumidifierHistory {
  /** 1 for hours it was on, 0 off, "unavailable", null for hours ahead. Fractions for part of an hour. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes on today, including the current hour. */
  onMinutes: number;
}
