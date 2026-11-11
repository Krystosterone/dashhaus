import type { HourSample } from "../history";

export type ToggleIcon = "bell-off" | "moon" | "volume-off" | "guest" | "away" | "power" | "waves";

/** Mirrors a Home Assistant `input_boolean.*` or `switch.*` used as a mode: Do Not Disturb, Quiet, Guest. */
export interface ToggleEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Where it applies: "Whole home", "Bedroom". */
  area?: string;
  /**
   * `unknown` is reachable but not yet reported (an RF or template switch before its first command): it can still be
   * switched, both ways (`eitherWay`, `entities/assumed.ts`), and is never drawn as off or unavailable.
   */
  state: "on" | "off" | "unknown" | "unavailable";
  /** Home Assistant only assumes it is on or off (`assumed_state`), so both presses are offered (`eitherWay`). */
  assumedState?: boolean;
  icon?: ToggleIcon;
  /**
   * Local time it switches itself off, when it was turned on for a while ("07:00"). The hook doesn't set it: Home
   * Assistant has no timed-on service for these domains, so a host that times a mode supplies it.
   */
  until?: string;
  /** Which duration option it was turned on with; shown as selected in the sheet. Host-owned, like `until`. */
  duration?: string;
  /** One line on what it does, shown in the sheet. */
  description?: string;
  lastChanged?: string;
  /** While it is unavailable, when it was last reachable: the `lastSeen` option, else what Home Assistant reports. */
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
