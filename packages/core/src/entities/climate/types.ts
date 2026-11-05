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
  hvacAction?: HvacAction;
  currentTemperature?: number;
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
