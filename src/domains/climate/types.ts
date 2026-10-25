import type { HourSample } from "../history";

/** Home Assistant HVAC modes (the climate entity's state). */
export type HvacMode = "off" | "heat" | "cool" | "heat_cool" | "auto" | "dry" | "fan_only";
/** What the unit is doing right now (HA `hvac_action`). */
export type HvacAction = "heating" | "cooling" | "idle" | "off" | "drying" | "fan";

/** Mirrors the parts of a Home Assistant `climate.*` entity the widget needs. */
export interface ClimateEntity {
  entityId: string;
  name: string;
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
