import type { HourSample } from "../history";

/** Which way a fan's blades turn: Home Assistant's `direction` attribute. */
export type FanDirection = "forward" | "reverse";

/** Mirrors one Home Assistant `fan.*` entity: on and off, its speed, preset, oscillation and direction. */
export interface FanEntity {
  entityId: string;
  name: string;
  /** Where it is: "Bedroom". */
  area?: string;
  state: "on" | "off" | "unavailable";
  /** True when the fan takes a speed (`FanEntityFeature.SET_SPEED`). */
  supportsSpeed?: boolean;
  /** Its speed in percent, 1-100, while it is on and reports one. A fan that is off reports none. */
  percentage?: number;
  /** How many speeds it has, from HA `percentage_step`: 3 for a three-speed fan, 100 for a stepless one. */
  speedCount?: number;
  /** True when it takes a preset (`FanEntityFeature.PRESET_MODE`) and lists at least one. */
  supportsPreset?: boolean;
  /** Its presets, as Home Assistant names them ("sleep", "nature"). */
  presetModes?: string[];
  /** The preset it runs, while on. */
  presetMode?: string;
  /** True when it oscillates on request (`FanEntityFeature.OSCILLATE`). */
  supportsOscillate?: boolean;
  oscillating?: boolean;
  /** True when it reverses (`FanEntityFeature.DIRECTION`): a ceiling fan's summer and winter direction. */
  supportsDirection?: boolean;
  direction?: FanDirection;
  lastChanged?: string;
  lastSeen?: string;
}

export interface FanHistory {
  /** 1 for hours it was on, 0 off, "unavailable", null for hours ahead. Fractions for part of an hour. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes on today, including the current hour. */
  onMinutes: number;
}
