import type { HourSample } from "../history";

/**
 * What a robot vacuum is doing, in Home Assistant's own activities: `cleaning`, `docked`, `returning`, `paused`, `idle`
 * and `error`. The names integrations use for the same thing (`charging`, `returning_home`, `stopped`, an older
 * vacuum's `on` and `off`) are mapped onto them. A state Home Assistant doesn't name but an integration reports
 * (`mopping`, `zone_cleaning`) is `other`, said in its own words (`stateText`), never guessed onto one of these.
 * `unknown`, `unavailable` and a missing entity are `unavailable`.
 */
export type VacuumState = "cleaning" | "docked" | "returning" | "paused" | "idle" | "error" | "other" | "unavailable";

/** Mirrors one Home Assistant `vacuum.*` entity: what it is doing, its battery and fan speed, and what it can do. */
export interface VacuumEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Where it lives: "Hall". */
  area?: string;
  state: VacuumState;
  /** An `other` state in words, as the integration names it: `zone_cleaning` → "Zone cleaning". */
  stateText?: string;
  /** HA `status`: the integration's own words for what it is doing ("Charging", "Cleaning the kitchen"), where it says. */
  status?: string;
  /** While it is in error, why, where the integration says (HA `error`): "Brush jammed". */
  error?: string;
  /** Its battery, 0–100 (HA `battery_level`, an attribute of the vacuum itself). */
  battery?: number;
  /** It is charging, where HA's state, `battery_icon` or `status` says so. A charging or docked vacuum never warns of its battery. */
  charging?: boolean;
  /** It starts or resumes cleaning (`VacuumEntityFeature.START`). */
  supportsStart?: boolean;
  /** It pauses (`VacuumEntityFeature.PAUSE`). */
  supportsPause?: boolean;
  /** It goes back to its dock on request (`VacuumEntityFeature.RETURN_HOME`). */
  supportsReturn?: boolean;
  /** It plays a sound to be found (`VacuumEntityFeature.LOCATE`). */
  supportsLocate?: boolean;
  /** It takes a fan speed (`VacuumEntityFeature.FAN_SPEED`) and lists at least one. */
  supportsFanSpeed?: boolean;
  /** Its fan speeds, as Home Assistant names them ("quiet", "turbo"). */
  fanSpeeds?: string[];
  /** The fan speed it runs at. */
  fanSpeed?: string;
  /** When it last changed state (HA `last_changed`), formatted. */
  lastChanged?: string;
  /** The same, in ms since the epoch. */
  changedAt?: number;
  /** While it is unavailable, when it was last reachable: the `lastSeen` option, else what Home Assistant reports. */
  lastSeen?: string;
}

export interface VacuumHistory {
  /** 1 for hours it was cleaning, 0 for hours it wasn't, "unavailable", null for hours ahead. Fractions for part of an hour. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes cleaning today, including the current hour. */
  cleaningMinutes: number;
}
