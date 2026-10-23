import type { LightEntity } from "../../widgets/light/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";

type LightServiceCaller = Pick<HaStore, "callService">;

export interface LightHandlers {
  onToggle: () => void;
  onBrightnessChange: (percent: number) => void;
  onKelvinChange?: (kelvin: number) => void;
}

export interface LightHandlerOptions {
  onError?: (error: HaActionError) => void;
}

const clampPercent = (value: number) => Math.min(100, Math.max(1, Math.round(value)));

/** Create safe callback handlers for the existing LightTile contract. */
export function createLightHandlers(caller: LightServiceCaller, entity: LightEntity, options: LightHandlerOptions = {}): LightHandlers {
  const { run, unsupported, invalidInput, actionable } = serviceRunner(caller, "light", entity, options.onError);

  return {
    onToggle: () => {
      if (actionable()) run("toggle");
    },
    onBrightnessChange: (percent) => {
      if (!actionable()) return;
      if (!entity.supportsBrightness) {
        unsupported(`${entity.entityId} does not support brightness`);
        return;
      }
      if (!Number.isFinite(percent)) {
        invalidInput(`${entity.entityId} brightness must be finite`);
        return;
      }
      run("turn_on", { brightness_pct: clampPercent(percent) });
    },
    onKelvinChange: entity.supportsColorTemp
      ? (kelvin) => {
        if (!actionable()) return;
        if (!Number.isFinite(kelvin) || (entity.minKelvin != null && kelvin < entity.minKelvin) || (entity.maxKelvin != null && kelvin > entity.maxKelvin)) {
          invalidInput(`${entity.entityId} color temperature is outside its supported range`);
          return;
        }
        run("turn_on", { color_temp_kelvin: kelvin });
      }
      : undefined,
  };
}
