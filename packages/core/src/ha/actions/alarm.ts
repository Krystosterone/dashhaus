import type { AlarmEntity, AlarmMode } from "../../entities/alarm/types";
import { HaActionError } from "../types";
import type { HaStore } from "../types";
import type { ActionKinds } from "./kinds";
import { serviceRunner } from "./run";

export interface AlarmHandlers {
  /**
   * Calls `alarm_control_panel.alarm_arm_<mode>` (`home`, `away`, `night`, `vacation`, `custom_bypass`) with the code
   * when given. A mode the panel doesn't support rejects with `unsupported`, unsent.
   */
  onArm: (mode: AlarmMode, code?: string) => Promise<boolean>;
  /**
   * Calls `alarm_control_panel.alarm_disarm` with the code when given. Like arming, it is sent even while the model
   * says unavailable: the model folds Home Assistant's `unknown` into it, and a panel with no known state (an MQTT
   * panel with nothing retained) still takes a disarm, which is the call never to refuse. To a panel that is really
   * unavailable, Home Assistant skips the call and answers success, so it resolves `true` with nothing done: a caller
   * that must tell the two apart reads the raw state itself.
   */
  onDisarm: (code?: string) => Promise<boolean>;
}

/** What each handler is, for a card drawing alarm without knowing it (`ActionKind`). */
export const ALARM_ACTIONS = {
  onArm: { takes: "value" }, // a mode, and the code where it is asked for
  onDisarm: { takes: "code" },
} as const satisfies ActionKinds<AlarmHandlers>;

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
 * Create arm/disarm handlers for the existing AlarmTile contract. Resolve true when accepted, false for a wrong code
 * (the keypad shakes): Home Assistant's sanitized `invalid_code` translation key, since a bare
 * `service_validation_error` is ambiguous without the raw message and must say the call did not go through. Anything
 * else is reported through `onError` and rejects with the sanitized `HaActionError`, as does arming in a mode the
 * panel doesn't support, which is refused before transport. Nothing is refused for the alarm's state (`onDisarm`).
 */
export function createAlarmHandlers(caller: Pick<HaStore, "callService">, entity: AlarmEntity, options: AlarmHandlerOptions = {}): AlarmHandlers {
  const domain = "alarm_control_panel";
  const { attempt, report } = serviceRunner(caller, domain, entity, options.onError);
  const call = async (service: string, code?: string): Promise<boolean> => {
    const error = await attempt(service, code ? { code } : {});
    if (!error) return true;
    if (error.translationKey === "invalid_code") return false;
    report(error);
    throw error;
  };

  return {
    onArm: (mode, code) => {
      if (!entity.modes.includes(mode)) {
        const error = new HaActionError("unsupported", `${entity.entityId} does not support arming ${mode}`, { domain, entityId: entity.entityId });
        report(error);
        return Promise.reject(error);
      }
      return call(ARM_SERVICE[mode], code);
    },
    onDisarm: (code) => call("alarm_disarm", code),
  };
}
