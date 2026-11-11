import type { HourSample } from "../history";

/** Which way a fan's blades turn: Home Assistant's `direction` attribute. */
export type FanDirection = "forward" | "reverse";

/** Mirrors one Home Assistant `fan.*` entity: on and off, its speed, preset, oscillation and direction. */
export interface FanEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Where it is: "Bedroom". */
  area?: string;
  /**
   * `unknown` is reachable but not yet reported (an RF or IR ceiling fan before its first command): it can still be
   * switched, both ways (`eitherWay`, `entities/assumed.ts`), and is never drawn as off or unavailable.
   */
  state: "on" | "off" | "unknown" | "unavailable";
  /** Home Assistant only assumes it is on or off (`assumed_state`: an RF or IR fan), so both presses are offered. */
  assumedState?: boolean;
  /**
   * Whether it declares `fan.turn_on` (`FanEntityFeature.TURN_ON`). `false` where it doesn't, so nothing turns it on;
   * omitted, it does.
   */
  supportsTurnOn?: boolean;
  /**
   * Whether it declares `fan.turn_off` (`FanEntityFeature.TURN_OFF`). `false` where it doesn't, so nothing turns it off;
   * omitted, it does.
   */
  supportsTurnOff?: boolean;
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
  /** While it is unavailable, when it was last reachable: the `lastSeen` option, else what Home Assistant reports. */
  lastSeen?: string;
}

export interface FanHistory {
  /** 1 for hours it was on, 0 off, "unavailable", null for hours ahead. Fractions for part of an hour. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes on today, including the current hour. */
  onMinutes: number;
}
