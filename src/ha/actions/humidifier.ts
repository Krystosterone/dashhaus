import type { HumidifierEntity } from "../../widgets/humidifier/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";

export interface HumidifierHandlers {
  onToggle: () => void;
  onTargetChange?: (humidity: number) => void;
  onModeChange?: (mode: string) => void;
}

export interface HumidifierHandlerOptions {
  onError?: (error: HaActionError) => void;
}

/**
 * Create safe callback handlers for the HumidifierTile contract. Each handler builds one native
 * `humidifier.*` service call; gate what the entity can't do and report it rather than sending it.
 */
export function createHumidifierHandlers(caller: Pick<HaStore, "callService">, entity: HumidifierEntity, options: HumidifierHandlerOptions = {}): HumidifierHandlers {
  const { run, unsupported, invalidInput, actionable } = serviceRunner(caller, "humidifier", entity, options.onError);
  return {
    onToggle: () => {
      if (actionable()) run("toggle");
    },
    // Only a device that reports a target can be set; HA takes whole percent.
    onTargetChange: entity.targetHumidity != null
      ? (humidity) => {
        if (!actionable()) return;
        if (!Number.isFinite(humidity)) {
          invalidInput(`${entity.entityId} humidity must be finite`);
          return;
        }
        const value = Math.round(humidity);
        if (value < entity.minHumidity || value > entity.maxHumidity) {
          invalidInput(`${entity.entityId} humidity is outside its supported range`);
          return;
        }
        run("set_humidity", { humidity: value });
      }
      : undefined,
    onModeChange: entity.modes && entity.modes.length > 0
      ? (mode) => {
        if (!actionable()) return;
        if (!entity.modes?.includes(mode)) {
          unsupported(`${entity.entityId} does not support mode ${mode}`);
          return;
        }
        run("set_mode", { mode });
      }
      : undefined,
  };
}
