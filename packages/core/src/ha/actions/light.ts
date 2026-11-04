import type { LightEntity } from "../../entities/light/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

type LightServiceCaller = Pick<HaStore, "callService">;

export interface LightHandlers {
  onToggle: () => void;
  onBrightnessChange: (percent: number) => void;
  onKelvinChange?: (kelvin: number) => void;
  onColorChange?: (hs: [number, number]) => void;
}

/** What each handler is, for a card drawing light without knowing it (`ActionKind`). */
export const LIGHT_ACTIONS = {
  onToggle: { takes: "nothing" },
  onBrightnessChange: { takes: "level", field: "brightness", min: 1, wakes: true },
  onKelvinChange: { takes: "value" }, // a warmth, drawn on its own scale
  onColorChange: { takes: "value" },
} as const satisfies ActionKinds<LightHandlers, LightEntity>;

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
    onColorChange: entity.supportsColor
      ? ([h, s]) => {
        if (!actionable()) return;
        if (!Number.isFinite(h) || !Number.isFinite(s) || h < 0 || h > 360 || s < 0 || s > 100) {
          invalidInput(`${entity.entityId} colour is outside hue 0-360 and saturation 0-100`);
          return;
        }
        run("turn_on", { hs_color: [h, s] });
      }
      : undefined,
  };
}
