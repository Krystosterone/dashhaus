import type { VacuumEntity } from "../../entities/vacuum/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

export interface VacuumHandlers {
  /** Calls `vacuum.start`: it starts cleaning, or resumes after a pause. A vacuum without `START` reports `unsupported`. */
  onStart: () => void;
  /** Calls `vacuum.pause`, where it stops in place. A vacuum without `PAUSE` reports `unsupported`. */
  onPause: () => void;
  /** Calls `vacuum.return_to_base`. A vacuum without `RETURN_HOME` reports `unsupported`. */
  onReturnToBase: () => void;
  /** Calls `vacuum.locate`: it plays a sound to be found. A vacuum without `LOCATE` reports `unsupported`. */
  onLocate: () => void;
  /**
   * Calls `vacuum.set_fan_speed`. A vacuum without fan speeds reports `unsupported`; a speed it doesn't list reports
   * `invalid_input`.
   */
  onFanSpeedChange: (speed: string) => void;
}

/** What each handler is, for a card drawing vacuum without knowing it (`ActionKind`). */
export const VACUUM_ACTIONS = {
  onStart: { takes: "nothing" },
  onPause: { takes: "nothing" },
  onReturnToBase: { takes: "nothing" },
  onLocate: { takes: "nothing" },
  onFanSpeedChange: { takes: "choice", field: "fanSpeed", options: "fanSpeeds" },
} as const satisfies ActionKinds<VacuumHandlers, VacuumEntity>;

export interface VacuumHandlerOptions {
  onError?: (error: HaActionError) => void;
}

/**
 * Create safe callback handlers for the VacuumTile contract. Each handler builds one native `vacuum.*` service call,
 * gated on what the entity declares in `supported_features`: what it can't do is reported as unsupported, never sent.
 */
export function createVacuumHandlers(caller: Pick<HaStore, "callService">, entity: VacuumEntity, options: VacuumHandlerOptions = {}): VacuumHandlers {
  const { run, actionable, unsupported, invalidInput } = serviceRunner(caller, "vacuum", entity, options.onError);
  const id = entity.entityId;
  /** Available and declaring the feature, or reported. */
  const can = (supported: boolean | undefined, what: string) => {
    if (!actionable()) return false;
    if (supported) return true;
    unsupported(`${id} does not support ${what}`);
    return false;
  };
  return {
    onStart: () => {
      if (can(entity.supportsStart, "start")) run("start");
    },
    onPause: () => {
      if (can(entity.supportsPause, "pause")) run("pause");
    },
    onReturnToBase: () => {
      if (can(entity.supportsReturn, "return to base")) run("return_to_base");
    },
    onLocate: () => {
      if (can(entity.supportsLocate, "locate")) run("locate");
    },
    onFanSpeedChange: (speed) => {
      if (!can(entity.supportsFanSpeed, "fan speeds")) return;
      if (!entity.fanSpeeds?.includes(speed)) {
        invalidInput(`${id} has no fan speed "${speed}"`);
        return;
      }
      run("set_fan_speed", { fan_speed: speed });
    },
  };
}
