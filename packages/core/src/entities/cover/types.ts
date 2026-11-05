import type { HourSample } from "../history";

/** Home Assistant cover device classes the card draws. */
export type CoverClass = "curtain" | "blind" | "shade" | "shutter" | "awning" | "window" | "garage" | "door" | "gate";

/** Mirrors the parts of a Home Assistant `cover.*` entity the card needs. Position: 0 closed, 100 open. */
export interface CoverEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Its area: the `area` option, else the one Home Assistant's registries resolve; none when neither has one. */
  area?: string;
  /**
   * `unknown` is reachable but not reporting where it is: an RF blind or a garage door with no sensor, which Home
   * Assistant drives on an assumed state. It can be opened, closed and stopped, and it is never drawn as closed or as
   * unavailable.
   */
  state: "open" | "closed" | "opening" | "closing" | "unknown" | "unavailable";
  deviceClass: CoverClass;
  /** current_position, 0-100. Omit when the cover only opens and closes. */
  position?: number;
  /** current_tilt_position, 0-100, for blinds with slats. */
  tilt?: number;
  supportsPosition: boolean;
  supportsStop: boolean;
  supportsTilt?: boolean;
  lastChanged?: string;
  /** While it is unavailable, when it was last reachable: the `lastSeen` option, else what Home Assistant reports. */
  lastSeen?: string;
}

export interface CoverHistory {
  /** How open each hour was, 0-1; "unavailable"; null for hours ahead. */
  samples: HourSample[];
  currentHour: number;
}
