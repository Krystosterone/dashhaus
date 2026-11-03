import type { ClimateEntity, HvacMode } from "../../entities/climate/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

 type ClimateServiceCaller = Pick<HaStore, "callService">;

export interface ClimateHandlers {
  onToggle: () => void;
  onTargetChange: (temperature: number) => void;
  onRangeChange?: (low: number, high: number) => void;
  onModeChange?: (mode: HvacMode) => void;
  onPresetChange?: (preset: string) => void;
  onFanChange?: (fan: string) => void;
}

/** What each handler is, for a card drawing climate without knowing it (`ActionKind`). */
export const CLIMATE_ACTIONS = {
  onToggle: { takes: "nothing" },
  onTargetChange: { takes: "value" },
  onRangeChange: { takes: "value" },
  onModeChange: { takes: "value" },
  onPresetChange: { takes: "value" },
  onFanChange: { takes: "value" },
} as const satisfies ActionKinds<ClimateHandlers>;

export interface ClimateHandlerOptions {
  onError?: (error: HaActionError) => void;
}

const inRange = (value: number, entity: ClimateEntity) => value >= entity.minTemp && value <= entity.maxTemp;

/** Create safe callback handlers for the existing ClimateTile contract. */
export function createClimateHandlers(caller: ClimateServiceCaller, entity: ClimateEntity, options: ClimateHandlerOptions = {}): ClimateHandlers {
  const { run, unsupported, invalidInput, actionable } = serviceRunner(caller, "climate", entity, options.onError);
  const validTemperature = (value: number) => {
    if (!Number.isFinite(value)) {
      invalidInput(`${entity.entityId} temperature must be finite`);
      return false;
    }
    if (!inRange(value, entity)) {
      invalidInput(`${entity.entityId} temperature is outside its supported range`);
      return false;
    }
    return true;
  };

  return {
    onToggle: () => {
      if (actionable()) run(entity.state === "off" ? "turn_on" : "turn_off");
    },
    onTargetChange: (temperature) => {
      if (!actionable() || !validTemperature(temperature)) return;
      run("set_temperature", { temperature });
    },
    onRangeChange: entity.hvacModes.includes("heat_cool")
      ? (low, high) => {
        if (!actionable()) return;
        if (!Number.isFinite(low) || !Number.isFinite(high)) {
          invalidInput(`${entity.entityId} target range must be finite`);
          return;
        }
        const targetLow = Math.min(low, high);
        const targetHigh = Math.max(low, high);
        if (!inRange(targetLow, entity) || !inRange(targetHigh, entity)) {
          invalidInput(`${entity.entityId} target range is outside its supported range`);
          return;
        }
        run("set_temperature", { target_temp_low: targetLow, target_temp_high: targetHigh });
      }
      : undefined,
    onModeChange: entity.hvacModes.length > 0
      ? (mode) => {
        if (!actionable()) return;
        if (!entity.hvacModes.includes(mode)) {
          unsupported(`${entity.entityId} does not support HVAC mode ${mode}`);
          return;
        }
        run("set_hvac_mode", { hvac_mode: mode });
      }
      : undefined,
    onPresetChange: entity.presetModes && entity.presetModes.length > 0
      ? (preset) => {
        if (!actionable()) return;
        if (!entity.presetModes?.includes(preset)) {
          unsupported(`${entity.entityId} does not support preset ${preset}`);
          return;
        }
        run("set_preset_mode", { preset_mode: preset });
      }
      : undefined,
    onFanChange: entity.fanModes && entity.fanModes.length > 0
      ? (fan) => {
        if (!actionable()) return;
        if (!entity.fanModes?.includes(fan)) {
          unsupported(`${entity.entityId} does not support fan mode ${fan}`);
          return;
        }
        run("set_fan_mode", { fan_mode: fan });
      }
      : undefined,
  };
}
