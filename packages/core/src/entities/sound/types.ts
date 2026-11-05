import type { HourSample } from "../history";

/** A sound machine's sound, switched by one Home Assistant `switch.*`; its volume is a companion `number.*`. */
export interface SoundEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Where it is: "Bedroom". */
  area?: string;
  state: "on" | "off" | "unavailable";
  /** Volume as a percent of the device's range, 0-100. Absent without a volume entity or a reading. */
  volume?: number;
  lastChanged?: string;
  /** While it is unavailable, when it was last reachable: the `lastSeen` option, else what Home Assistant reports. */
  lastSeen?: string;
}

export interface SoundHistory {
  /** 1 for hours it was on, 0 off, "unavailable", null for hours ahead. Fractions for part of an hour. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes on today, including the current hour. */
  onMinutes: number;
}
