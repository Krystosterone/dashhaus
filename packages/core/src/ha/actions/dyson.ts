import type { FanDirection } from "../../entities/fan/types";
import type { DysonEntity } from "../../entities/dyson/types";
import { DYSON_LOCAL_ANGLES, DYSON_MIN_SWEEP, DYSON_SWEEPS, sweepAngles, sweepLabel } from "../../entities/dyson/labels";
import type { HaActionError, HaStore } from "../types";
import { createFanHandlers } from "./fan";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

export interface DysonHandlers {
  /** Calls `fan.toggle`. */
  onToggle: () => void;
  /** Calls `fan.set_percentage`, 1-100; it leaves Auto, and setting a speed while off turns the fan on. */
  onPercentageChange: (percent: number) => void;
  /** Calls `fan.set_preset_mode`, Auto or its other preset (`Normal`). */
  onAutoChange: (auto: boolean) => void;
  /** Calls `fan.oscillate`. */
  onOscillateChange: (oscillating: boolean) => void;
  /**
   * Sets the range it sweeps, one of `oscillationModes`, which turns oscillation on: `dyson_local.set_angle` around
   * the current centre on a Pure Cool, `select.select_option` on its oscillation mode select on a Humidify+Cool.
   */
  onOscillationModeChange: (mode: string) => void;
  /**
   * Aims a Pure Cool or Hot+Cool, `dyson_local.set_angle`, which starts it oscillating: one angle twice holds it still,
   * pointing there; two at least 30° apart sweep between them, inside its `angles`.
   */
  onAngleChange: (low: number, high: number) => void;
  /** Calls `fan.set_direction`: `forward` is the front airflow, `reverse` the back. */
  onDirectionChange: (direction: FanDirection) => void;
  /** Switches its night-mode switch, `switch.turn_on` or `switch.turn_off`. */
  onNightModeChange: (on: boolean) => void;
  /** Calls `climate.set_hvac_mode` on its heater: `heat` on, `cool` off (the fan alone). */
  onHeatChange: (on: boolean) => void;
  /** Calls `climate.set_temperature` on its heater, inside its own limits and on its step. */
  onHeatTargetChange: (temperature: number) => void;
}

/** What each handler is, for a card drawing a Dyson without knowing it (`ActionKind`). */
export const DYSON_ACTIONS = {
  onToggle: { takes: "nothing" },
  onPercentageChange: { takes: "level", field: "percentage", min: 1, wakes: true },
  onAutoChange: { takes: "switch", field: "auto" },
  onOscillateChange: { takes: "switch", field: "oscillating" },
  onOscillationModeChange: { takes: "choice", field: "oscillationMode", options: "oscillationModes" },
  onAngleChange: { takes: "value" },
  onDirectionChange: { takes: "choice", field: "direction", options: ["forward", "reverse"] },
  onNightModeChange: { takes: "switch", field: "nightMode" },
  onHeatChange: { takes: "switch", field: "heatOn" },
  onHeatTargetChange: { takes: "level", field: "heatTarget", min: "heatMin", max: "heatMax" },
} as const satisfies ActionKinds<DysonHandlers, DysonEntity>;

export interface DysonHandlerOptions {
  /** Its night-mode switch (`switch.*_night_mode`). */
  nightModeEntityId?: string;
  /** Its heater (`climate.*`), on a Hot+Cool. */
  heatEntityId?: string;
  /** Its oscillation mode select (`select.*_oscillation_mode`), on a Humidify+Cool. */
  oscillationModeEntityId?: string;
  onError?: (error: HaActionError) => void;
}

/**
 * Create safe callback handlers for the DysonTile contract. The fan's own come from the fan's handlers; each companion's
 * runs on its own entity, and only where the model says the device has it: what it can't do is reported as
 * unsupported, never sent.
 */
export function createDysonHandlers(caller: Pick<HaStore, "callService">, entity: DysonEntity, options: DysonHandlerOptions = {}): DysonHandlers {
  const { onError } = options;
  const fan = createFanHandlers(caller, entity, { onError });
  const { run, actionable, unsupported, invalidInput } = serviceRunner(caller, "fan", entity, onError);
  const id = entity.entityId;
  /** Available, and the device has it, or reported. */
  const can = (supported: boolean | undefined, what: string) => {
    if (!actionable()) return false;
    if (supported) return true;
    unsupported(`${id} does not support ${what}`);
    return false;
  };
  /** A companion's own runner, so its errors name its entity. */
  const on = (domain: string, entityId: string) => serviceRunner(caller, domain, { entityId, state: entity.state }, onError).run;
  const sweep = (mode: string) => DYSON_SWEEPS.find((s) => sweepLabel(s) === mode);

  return {
    onToggle: fan.onToggle,
    onPercentageChange: fan.onPercentageChange,
    onDirectionChange: fan.onDirectionChange,
    onOscillateChange: fan.onOscillateChange,
    onAutoChange: (auto) => {
      if (!can(entity.supportsAuto, "auto mode")) return;
      const preset = auto ? entity.autoPreset : entity.manualPreset;
      if (!preset) {
        unsupported(`${id} has no preset that leaves auto mode`);
        return;
      }
      run("set_preset_mode", { preset_mode: preset });
    },
    onOscillationModeChange: (mode) => {
      if (!can(entity.supportsOscillate && !!entity.oscillationModes?.length, "an oscillation range")) return;
      if (!entity.oscillationModes!.includes(mode)) {
        invalidInput(`${id} has no oscillation range "${mode}"`);
        return;
      }
      if (entity.oscillationBy === "select") {
        if (!options.oscillationModeEntityId) {
          unsupported(`${id} has no oscillation mode select`);
          return;
        }
        on("select", options.oscillationModeEntityId)("select_option", { option: mode });
        return;
      }
      on("dyson_local", id)("set_angle", sweepAngles(sweep(mode)!, entity.oscillationCentre, entity.angles));
    },
    onAngleChange: (low, high) => {
      if (!can(entity.supportsOscillate && entity.oscillationBy === "angle", "oscillation angles")) return;
      const { min, max } = entity.angles ?? DYSON_LOCAL_ANGLES;
      const inside = (a: number) => Number.isInteger(a) && a >= min && a <= max;
      if (!inside(low) || !inside(high) || (low !== high && high - low < DYSON_MIN_SWEEP)) {
        invalidInput(`${id} angles must be whole degrees from ${min} to ${max}, equal or at least ${DYSON_MIN_SWEEP} apart`);
        return;
      }
      on("dyson_local", id)("set_angle", { angle_low: low, angle_high: high });
    },
    onNightModeChange: (night) => {
      if (!can(entity.supportsNightMode && !!options.nightModeEntityId, "night mode")) return;
      on("switch", options.nightModeEntityId!)(night === true ? "turn_on" : "turn_off");
    },
    onHeatChange: (heat) => {
      if (!can(entity.supportsHeat && !!options.heatEntityId, "heat")) return;
      on("climate", options.heatEntityId!)("set_hvac_mode", { hvac_mode: heat === true ? "heat" : "cool" });
    },
    onHeatTargetChange: (temperature) => {
      if (!can(entity.supportsHeat && !!options.heatEntityId, "heat")) return;
      if (!Number.isFinite(temperature)) {
        invalidInput(`${id} heat target must be finite`);
        return;
      }
      const step = entity.heatStep ?? 1;
      const stepped = Math.round(temperature / step) * step;
      const clamped = Math.min(entity.heatMax ?? 37, Math.max(entity.heatMin ?? 1, stepped));
      on("climate", options.heatEntityId!)("set_temperature", { temperature: Number(clamped.toFixed(1)) });
    },
  };
}
