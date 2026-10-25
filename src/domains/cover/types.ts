import type { HourSample } from "../history";

/** Home Assistant cover device classes the widget draws. */
export type CoverClass = "curtain" | "blind" | "shade" | "shutter" | "awning" | "window" | "garage" | "door" | "gate";

/** Mirrors the parts of a Home Assistant `cover.*` entity the widget needs. Position: 0 closed, 100 open. */
export interface CoverEntity {
  entityId: string;
  name: string;
  area?: string;
  state: "open" | "closed" | "opening" | "closing" | "unavailable";
  deviceClass: CoverClass;
  /** current_position, 0-100. Omit when the cover only opens and closes. */
  position?: number;
  /** current_tilt_position, 0-100, for blinds with slats. */
  tilt?: number;
  supportsPosition: boolean;
  supportsStop: boolean;
  supportsTilt?: boolean;
  lastChanged?: string;
  lastSeen?: string;
}

export interface CoverHistory {
  /** How open each hour was, 0-1; "unavailable"; null for hours ahead. */
  samples: HourSample[];
  currentHour: number;
}
