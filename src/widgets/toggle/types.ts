import type { HourSample } from "../../shared/ui";

export type ToggleIcon = "bell-off" | "moon" | "volume-off" | "guest" | "away" | "power";
/** A tone per kind of mode: calm for quiet and night, sage for people, apricot for away, blue, or the house butter. */
export type ToggleTone = "calm" | "sage" | "apricot" | "blue" | "butter";

/** Mirrors a Home Assistant `input_boolean.*` or `switch.*` used as a mode: Do Not Disturb, Quiet, Guest. */
export interface ToggleEntity {
  entityId: string;
  name: string;
  /** Where it applies: "Whole home", "Bedroom". */
  area?: string;
  state: "on" | "off" | "unavailable";
  icon?: ToggleIcon;
  tone?: ToggleTone;
  /** Local time it switches itself off, when it was turned on for a while ("07:00"). */
  until?: string;
  /** Which duration option it was turned on with; shown as selected in the sheet. */
  duration?: string;
  /** One line on what it does, shown in the sheet. */
  description?: string;
  lastChanged?: string;
  lastSeen?: string;
}

export interface ToggleHistory {
  /** 1 for hours it was on, 0 off, "unavailable", null for hours ahead. Fractions for part of an hour. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes on today, including the current hour. */
  onMinutes: number;
}

export interface DurationOption { value: string; label: string; sub?: string }
