import type { ClimateEntity, HvacMode } from "../../entities/climate/types";
import type { HaActionError, HaStore } from "../types";
import { onMode } from "../../entities/climate/power";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

 type ClimateServiceCaller = Pick<HaStore, "callService">;

export interface ClimateHandlers {
  /**
   * Turns the unit on while it is off, and off otherwise, as it says it can: `climate.turn_on` and `climate.turn_off`
   * where it declares them, else `climate.set_hvac_mode`, into its first mode that isn't off or into `off`. A unit with
   * neither way (a heat-only thermostat, to turn off) reports `unsupported` (`canTurnOn`, `canTurnOff`).
   */
  onToggle: () => void;
  /**
   * Calls `climate.set_temperature` with `temperature`. A value outside `minTemp` to `maxTemp` reports
   * `invalid_input`.
   */
  onTargetChange: (temperature: number) => void;
  /**
   * Only for a unit with a `heat_cool` mode. Calls `climate.set_temperature` with `target_temp_low` and
   * `target_temp_high`, in either order.
   */
  onRangeChange?: (low: number, high: number) => void;
  /**
   * Only when Home Assistant lists HVAC modes. Calls `climate.set_hvac_mode`; a mode the unit doesn't list reports
   * `unsupported`.
   */
  onModeChange?: (mode: HvacMode) => void;
  /** Only with preset modes. Calls `climate.set_preset_mode`. */
  onPresetChange?: (preset: string) => void;
  /** Only with fan modes. Calls `climate.set_fan_mode`. */
  onFanChange?: (fan: string) => void;
}

/** What each handler is, for a card drawing climate without knowing it (`ActionKind`). */
export const CLIMATE_ACTIONS = {
  onToggle: { takes: "nothing" },
  onTargetChange: { takes: "value" },
  onRangeChange: { takes: "value" },
  onModeChange: { takes: "value" },
  onPresetChange: { takes: "choice", field: "presetMode", options: "presetModes" },
  onFanChange: { takes: "choice", field: "fanMode", options: "fanModes" },
} as const satisfies ActionKinds<ClimateHandlers, ClimateEntity>;

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
      if (!actionable()) return;
      if (entity.state === "off") {
        const mode = onMode(entity);
        if (entity.supportsTurnOn !== false) run("turn_on");
        else if (mode) run("set_hvac_mode", { hvac_mode: mode });
        else unsupported(`${entity.entityId} can't be turned on`);
      } else if (entity.supportsTurnOff !== false) run("turn_off");
      else if (entity.hvacModes.includes("off")) run("set_hvac_mode", { hvac_mode: "off" });
      else unsupported(`${entity.entityId} can't be turned off`);
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
