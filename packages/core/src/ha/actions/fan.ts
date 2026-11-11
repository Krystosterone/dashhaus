import type { FanDirection, FanEntity } from "../../entities/fan/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

export interface FanHandlers {
  /**
   * Calls `fan.turn_off` while it is on, `fan.turn_on` otherwise. A fan that doesn't declare the one it needs
   * (`TURN_OFF`, `TURN_ON`) reports `unsupported`, rather than send what Home Assistant refuses.
   */
  onToggle: () => void;
  /**
   * Calls `fan.set_percentage`, rounded to a whole percent from 1 to 100, so it never switches the fan off; setting a
   * speed while it is off turns it on. A fan without speeds reports `unsupported`.
   */
  onPercentageChange: (percent: number) => void;
  /**
   * Calls `fan.set_preset_mode`, which turns the fan on. A fan without presets reports `unsupported`; a preset it
   * doesn't list reports `invalid_input`.
   */
  onPresetChange: (preset: string) => void;
  /** Calls `fan.oscillate`. A fan that doesn't oscillate reports `unsupported`. */
  onOscillateChange: (oscillating: boolean) => void;
  /** Calls `fan.set_direction` with `forward` or `reverse`. A fan that doesn't reverse reports `unsupported`. */
  onDirectionChange: (direction: FanDirection) => void;
}

/** What each handler is, for a card drawing fan without knowing it (`ActionKind`). */
export const FAN_ACTIONS = {
  onToggle: { takes: "nothing" },
  onPercentageChange: { takes: "level", field: "percentage", min: 1, wakes: true },
  onPresetChange: { takes: "choice", field: "presetMode", options: "presetModes" },
  onOscillateChange: { takes: "switch", field: "oscillating" },
  onDirectionChange: { takes: "choice", field: "direction", options: ["forward", "reverse"] },
} as const satisfies ActionKinds<FanHandlers, FanEntity>;

export interface FanHandlerOptions {
  onError?: (error: HaActionError) => void;
}

/**
 * Create safe callback handlers for the FanTile contract. Each handler builds one native `fan.*` service call,
 * gated on what the entity declares in `supported_features`: what it can't do is reported as unsupported, never sent.
 */
export function createFanHandlers(caller: Pick<HaStore, "callService">, entity: FanEntity, options: FanHandlerOptions = {}): FanHandlers {
  const { run, actionable, unsupported, invalidInput } = serviceRunner(caller, "fan", entity, options.onError);
  const id = entity.entityId;
  /** Available and declaring the feature, or reported. */
  const can = (supported: boolean | undefined, what: string) => {
    if (!actionable()) return false;
    if (supported) return true;
    unsupported(`${id} does not support ${what}`);
    return false;
  };
  return {
    onToggle: () => {
      if (entity.state === "on") {
        if (can(entity.supportsTurnOff !== false, "turning off")) run("turn_off");
      } else if (can(entity.supportsTurnOn !== false, "turning on")) run("turn_on");
    },
    onPercentageChange: (percent) => {
      if (!can(entity.supportsSpeed, "speed")) return;
      if (!Number.isFinite(percent)) {
        invalidInput(`${id} speed must be finite`);
        return;
      }
      run("set_percentage", { percentage: Math.min(100, Math.max(1, Math.round(percent))) });
    },
    onPresetChange: (preset) => {
      if (!can(entity.supportsPreset, "preset modes")) return;
      if (!entity.presetModes?.includes(preset)) {
        invalidInput(`${id} has no preset "${preset}"`);
        return;
      }
      run("set_preset_mode", { preset_mode: preset });
    },
    onOscillateChange: (oscillating) => {
      if (!can(entity.supportsOscillate, "oscillation")) return;
      run("oscillate", { oscillating: oscillating === true });
    },
    onDirectionChange: (direction) => {
      if (!can(entity.supportsDirection, "direction")) return;
      if (direction !== "forward" && direction !== "reverse") {
        invalidInput(`${id} direction must be forward or reverse`);
        return;
      }
      run("set_direction", { direction });
    },
  };
}
