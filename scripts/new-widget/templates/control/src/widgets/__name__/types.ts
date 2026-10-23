import type { HourSample } from "../../shared/ui";

/** Mirrors one Home Assistant `__domain__.*` entity. Add the attributes the card shows; keep raw HA shapes out. */
export interface __Name__Entity {
  entityId: string;
  name: string;
  /** Where it is: "Bedroom". */
  area?: string;
  state: "on" | "off" | "unavailable";
  lastChanged?: string;
  lastSeen?: string;
}

export interface __Name__History {
  /** 1 for hours it was on, 0 off, "unavailable", null for hours ahead. Fractions for part of an hour. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes on today, including the current hour. */
  onMinutes: number;
}
