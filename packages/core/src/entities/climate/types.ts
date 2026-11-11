import type { HourSample } from "../history";

/** Home Assistant HVAC modes (the climate entity's state). */
export type HvacMode = "off" | "heat" | "cool" | "heat_cool" | "auto" | "dry" | "fan_only";
/** What the unit is doing right now (HA `hvac_action`). */
export type HvacAction = "heating" | "cooling" | "idle" | "off" | "drying" | "fan";

/** Mirrors the parts of a Home Assistant `climate.*` entity the card needs. */
export interface ClimateEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Its area: the `area` option, else the one Home Assistant's registries resolve; none when neither has one. */
  area?: string;
  state: HvacMode | "unavailable";
  hvacModes: HvacMode[];
  /**
   * Whether it declares `climate.turn_on` (`ClimateEntityFeature.TURN_ON`). `false` where it doesn't, so it is turned on
   * into a mode instead (`canTurnOn`, `entities/climate/power.ts`); omitted, it does.
   */
  supportsTurnOn?: boolean;
  /**
   * Whether it declares `climate.turn_off` (`ClimateEntityFeature.TURN_OFF`). `false` where it doesn't, so it is turned
   * off into its `off` mode, or, with none, not at all (`canTurnOff`); omitted, it does.
   */
  supportsTurnOff?: boolean;
  hvacAction?: HvacAction;
  /** The room's temperature as the thermostat reads it, once it has. */
  currentTemperature?: number;
  /**
   * Whether it reports the room's temperature at all. A climate entity declares no feature for it, so its attribute
   * says: `false` where it has no `current_temperature`, so it may never report one ("Not reported"); omitted, or
   * `true`, it does, and a missing `currentTemperature` is one not sent yet ("No reading yet"; spec/cards.md → What
   * every card says).
   */
  reportsCurrentTemperature?: boolean;
  currentHumidity?: number;
  /** Single setpoint (heat, cool, auto). */
  targetTemperature?: number;
  /** Range setpoints (heat_cool). */
  targetLow?: number;
  targetHigh?: number;
  minTemp: number;
  maxTemp: number;
  /** Setpoint step, usually 0.5 or 1. */
  step: number;
  unit: "°C" | "°F";
  presetMode?: string;
  presetModes?: string[];
  fanMode?: string;
  fanModes?: string[];
  lastChanged?: string;
  /** While it is unavailable, when it was last reachable: the `lastSeen` option, else what Home Assistant reports. */
  lastSeen?: string;
}

export interface ClimateHistory {
  /** Share of each hour the unit was running, 0-1. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes running today, including the current hour. */
  activeMinutes: number;
  /** What it was mostly doing, for the summary line. */
  activity: "heating" | "cooling" | "running";
}
