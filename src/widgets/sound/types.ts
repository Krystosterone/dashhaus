import type { HourSample } from "../../shared/ui";

/** A sound machine's sound, switched by one Home Assistant `switch.*`; its volume is a companion `number.*`. */
export interface SoundEntity {
  entityId: string;
  name: string;
  /** Where it is: "Bedroom". */
  area?: string;
  state: "on" | "off" | "unavailable";
  /** Volume as a percent of the device's range, 0-100. Absent without a volume entity or a reading. */
  volume?: number;
  lastChanged?: string;
  lastSeen?: string;
}

export interface SoundHistory {
  /** 1 for hours it was on, 0 off, "unavailable", null for hours ahead. Fractions for part of an hour. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes on today, including the current hour. */
  onMinutes: number;
}
