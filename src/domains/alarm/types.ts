import type { HourSample } from "../history";

export type AlarmMode = "home" | "away" | "night" | "vacation" | "custom_bypass";

/** Home Assistant `alarm_control_panel` states the widget shows. */
export type AlarmState =
  | "disarmed" | "armed_home" | "armed_away" | "armed_night" | "armed_vacation" | "armed_custom_bypass"
  | "arming" | "pending" | "disarming" | "triggered" | "unavailable";

/** Mirrors the parts of a Home Assistant `alarm_control_panel.*` entity the widget needs. */
export interface AlarmEntity {
  entityId: string;
  name: string;
  area?: string;
  state: AlarmState;
  /** The arm modes this panel supports, in the order to show them. */
  modes: AlarmMode[];
  /** Whether a code is asked for, and what kind (HA code_format). Null or omitted: no code. */
  codeFormat?: "number" | "text" | null;
  /** HA code_arm_required: the code is needed to arm too, not only to disarm. Home Assistant's default is true. */
  codeArmRequired?: boolean;
  /** While arming: the mode it is arming to (HA's manual alarm and Alarmo expose it as next_state). */
  armingTo?: AlarmMode;
  /**
   * Length of the current exit or entry delay, in seconds. Home Assistant's alarm entity doesn't expose it:
   * Alarmo has it as the `delay` attribute; for the manual alarm it's your arming_time / delay_time.
   * With `changedAt`, the widget counts down. Without it, the slot shows the delay with no timer.
   */
  delay?: number;
  /** When the current state started, in ms since the epoch (HA last_changed). */
  changedAt?: number;
  /** HA changed_by. */
  changedBy?: string;
  lastChanged?: string;
  /** Pending or triggered: what set it off. */
  triggeredBy?: string;
  /** Doors and windows open right now (from their binary sensors). Arming would bypass them. */
  openSensors?: string[];
  lastSeen?: string;
}

export interface AlarmHistory {
  /** 1 for hours it was armed, 0 disarmed, "unavailable", null for hours ahead. */
  samples: HourSample[];
  currentHour: number;
  /** Minutes armed today. */
  armedMinutes: number;
}

/** What the person is doing that may need the code. */
export type AlarmAction = { kind: "arm"; mode: AlarmMode } | { kind: "disarm" };
