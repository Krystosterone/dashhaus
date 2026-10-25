import type { AlarmEntity, AlarmMode } from "../../domains/alarm/types";
import { HaActionError } from "../types";
import type { HaStore } from "../types";

type AlarmServiceCaller = Pick<HaStore, "callService">;

export interface AlarmHandlers {
  onArm: (mode: AlarmMode, code?: string) => Promise<boolean>;
  onDisarm: (code?: string) => Promise<boolean>;
}

export interface AlarmHandlerOptions {
  onError?: (error: HaActionError) => void;
}

const ARM_SERVICE: Record<AlarmMode, string> = {
  home: "alarm_arm_home",
  away: "alarm_arm_away",
  night: "alarm_arm_night",
  vacation: "alarm_arm_vacation",
  custom_bypass: "alarm_arm_custom_bypass",
};

/**
 * A rejection that means "wrong code" rather than "didn't go through". The transport layer sanitizes the
 * raw Home Assistant error into this scalar on the HaActionError it rejects with. A bare
 * `service_validation_error` code is NOT wrong-code evidence on its own: without the raw message the
 * failure is ambiguous, so the keypad must report that the call did not go through.
 */
function isWrongCode(cause: unknown): boolean {
  if (typeof cause !== "object" || cause === null) return false;
  const error = cause as { translationKey?: unknown };
  return error.translationKey === "invalid_code";
}

/**
 * Create arm/disarm handlers for the existing AlarmTile contract. Resolve true when accepted, false for a
 * wrong code (the keypad shakes), reject when the call did not go through.
 */
export function createAlarmHandlers(caller: AlarmServiceCaller, entity: AlarmEntity, options: AlarmHandlerOptions = {}): AlarmHandlers {
  const call = async (service: string, code?: string): Promise<boolean> => {
    const serviceData: Record<string, unknown> = { entity_id: entity.entityId };
    if (code) serviceData.code = code;
    try {
      await caller.callService("alarm_control_panel", service, serviceData);
      return true;
    } catch (cause) {
      if (isWrongCode(cause)) return false;
      const error = cause instanceof HaActionError
        ? cause
        : new HaActionError("service_failed", `Home Assistant rejected alarm_control_panel.${service}`, {
          domain: "alarm_control_panel",
          service,
          entityId: entity.entityId,
        });
      options.onError?.(error);
      throw cause;
    }
  };

  return {
    onArm: (mode, code) => {
      if (!entity.modes.includes(mode)) {
        const error = new HaActionError("unsupported", `${entity.entityId} does not support arming ${mode}`, {
          domain: "alarm_control_panel",
          entityId: entity.entityId,
        });
        options.onError?.(error);
        return Promise.reject(error);
      }
      return call(ARM_SERVICE[mode], code);
    },
    onDisarm: (code) => call("alarm_disarm", code),
  };
}
