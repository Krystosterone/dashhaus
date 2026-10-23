import type { Reading } from "../../shared/ui";

/** Mirrors one Home Assistant `__domain__.*` reading. Add the attributes the card shows; keep raw HA shapes out. */
export interface __Name__Entity {
  entityId: string;
  name: string;
  /** Where it is: "Living room". */
  area?: string;
  /** "unavailable" while the device can't be reached; "ok" otherwise, even before a first reading. */
  state: "ok" | "unavailable";
  /** The measured value; omitted while there is no reading. */
  value?: number;
  /** As Home Assistant reports it: "%", "ppm", "°C". */
  unit?: string;
  lastUpdated?: string;
  lastSeen?: string;
}

export interface __Name__History {
  /** One reading per hour, carried forward; "unavailable", or null for hours ahead and before the first reading. */
  readings: Reading[];
  currentHour: number;
}
