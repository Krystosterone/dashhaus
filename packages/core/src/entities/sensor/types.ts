import type { Reading } from "../history";

/**
 * A temperature and humidity sensor. In Home Assistant these are usually two sensor entities
 * (device_class temperature and humidity) on one device; the card shows them together, read-only.
 */
export interface SensorEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Usually the room it measures. */
  name: string;
  /** Its area: the `area` option, else the one Home Assistant's registries resolve; none when neither has one. */
  area?: string;
  state: "ok" | "unavailable";
  temperature?: number;
  /** Relative humidity in percent. Omit for temperature-only sensors. */
  humidity?: number;
  unit: "°C" | "°F";
  /** Outdoor sensors skip the indoor comfort reading. */
  outdoor?: boolean;
  /** Battery level in percent, for battery-powered sensors. */
  battery?: number;
  lastUpdated?: string;
  /** While it is unavailable, when it was last reachable: the `lastSeen` option, else what Home Assistant reports. */
  lastSeen?: string;
}

export type { Reading };

export interface SensorHistory {
  /** Hourly readings for today: a value, "unavailable", or null for hours still ahead. */
  temperature: Reading[];
  humidity?: Reading[];
  currentHour: number;
}
