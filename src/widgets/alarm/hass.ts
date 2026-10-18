import type { AlarmEntity, AlarmMode, AlarmState } from "./types";

/**
 * Home Assistant glue for the alarm widget. Structural types only, so this works with the `hass` object
 * a custom card receives (home-assistant-js-websocket) without depending on it.
 */
export interface HassAlarmState {
  entity_id: string;
  state: string;
  last_changed: string;
  attributes: {
    friendly_name?: string;
    code_format?: "number" | "text" | null;
    code_arm_required?: boolean;
    changed_by?: string | null;
    supported_features?: number;
    // Alarmo and the manual alarm add these; the core entity has none of them.
    next_state?: string;
    arm_mode?: string;
    delay?: number;
    open_sensors?: Record<string, string> | null;
    [key: string]: unknown;
  };
}
export interface HassLike {
  states: Record<string, HassAlarmState | undefined>;
  callService: (domain: string, service: string, data?: Record<string, unknown>) => Promise<unknown>;
}

/** AlarmControlPanelEntityFeature bits, in HA's order. */
const FEATURES: [number, AlarmMode][] = [[1, "home"], [2, "away"], [4, "night"], [32, "vacation"], [16, "custom_bypass"]];
const STATES = new Set<AlarmState>(["disarmed", "armed_home", "armed_away", "armed_night", "armed_vacation", "armed_custom_bypass", "arming", "pending", "disarming", "triggered", "unavailable"]);

const modeOf = (s?: string): AlarmMode | undefined => {
  const m = s?.replace(/^armed_/, "");
  return FEATURES.some(([, f]) => f === m) ? (m as AlarmMode) : undefined;
};
const clock = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? t : `${d.toLocaleDateString([], { weekday: "short" })} ${t}`;
};

export interface AlarmFromHassOptions {
  name?: string;
  area?: string;
  /** Only offer these modes (still limited to what the panel supports). */
  modes?: AlarmMode[];
  /**
   * Length of the exit and entry delays, in seconds, when the integration doesn't say (the manual alarm's
   * arming_time and delay_time). Alarmo's `delay` attribute takes precedence. Without either, no timer is shown.
   */
  exitDelay?: number;
  entryDelay?: number;
  /** Friendly names of sensors that are open, if you track them yourself. Alarmo's open_sensors is used otherwise. */
  openSensors?: string[];
  /** For "Triggered by …": the sensor that tripped it, if you know it. */
  triggeredBy?: string;
  /** Resolve entity ids (Alarmo's open_sensors) to names. */
  nameOf?: (entityId: string) => string | undefined;
}

/** Map a Home Assistant alarm_control_panel state object to the widget's entity. */
export function alarmFromHass(s: HassAlarmState | undefined, entityId: string, o: AlarmFromHassOptions = {}): AlarmEntity {
  const a = s?.attributes ?? {};
  const raw = s?.state as AlarmState | undefined;
  const state: AlarmState = raw && STATES.has(raw) ? raw : "unavailable";
  const features = a.supported_features ?? 0;
  const supported = FEATURES.filter(([bit]) => features & bit).map(([, m]) => m);
  const modes = o.modes ? supported.filter((m) => o.modes!.includes(m)) : supported;
  const changedAt = s ? Date.parse(s.last_changed) : NaN;
  const delay = typeof a.delay === "number" && a.delay > 0 ? a.delay
    : state === "arming" ? o.exitDelay
    : state === "pending" ? o.entryDelay
    : undefined;
  const open = o.openSensors ?? (a.open_sensors ? Object.keys(a.open_sensors).map((id) => o.nameOf?.(id) ?? id) : undefined);
  return {
    entityId,
    name: o.name ?? a.friendly_name ?? entityId,
    area: o.area,
    state,
    modes: modes.length ? modes : ["away"],
    codeFormat: a.code_format ?? null,
    // HA's default is true; an integration that doesn't need it says false.
    codeArmRequired: a.code_arm_required ?? true,
    armingTo: state === "arming" ? modeOf(a.next_state) ?? modeOf(a.arm_mode) : undefined,
    delay,
    changedAt: Number.isNaN(changedAt) ? undefined : changedAt,
    changedBy: a.changed_by ?? undefined,
    lastChanged: s ? clock(s.last_changed) : undefined,
    lastSeen: state === "unavailable" && s ? clock(s.last_changed) : undefined,
    openSensors: open?.length ? open : undefined,
    triggeredBy: state === "triggered" || state === "pending" ? o.triggeredBy : undefined,
  };
}

const SERVICE: Record<AlarmMode, string> = {
  home: "alarm_arm_home", away: "alarm_arm_away", night: "alarm_arm_night", vacation: "alarm_arm_vacation", custom_bypass: "alarm_arm_custom_bypass",
};

/** A rejection that means "wrong code" rather than "didn't go through". */
function isBadCode(err: unknown) {
  const e = err as { code?: string; message?: string; translation_key?: string } | undefined;
  if (!e) return false;
  if (e.translation_key === "invalid_code") return true;
  // ServiceValidationError reaches the frontend as code "service_validation_error", with HA's wording.
  const msg = e.message ?? "";
  return (e.code === "service_validation_error" && /code/i.test(msg)) || /(invalid|wrong|incorrect)\b.*\bcode/i.test(msg);
}

/**
 * Call the arm or disarm service. Resolves true when HA accepted it, false for a wrong code (the keypad
 * shakes); rejects for anything else (the keypad says it didn't go through).
 * Note: some integrations accept a wrong code silently and just don't change state.
 */
export async function callAlarm(hass: HassLike, entityId: string, action: { kind: "disarm" } | { kind: "arm"; mode: AlarmMode }, code?: string) {
  const service = action.kind === "disarm" ? "alarm_disarm" : SERVICE[action.mode];
  try {
    await hass.callService("alarm_control_panel", service, { entity_id: entityId, ...(code ? { code } : {}) });
    return true;
  } catch (err) {
    if (isBadCode(err)) return false;
    throw err;
  }
}

/** The widget's onArm and onDisarm, wired to Home Assistant. */
export function alarmHandlers(hass: HassLike, entityId: string) {
  return {
    onArm: (mode: AlarmMode, code?: string) => callAlarm(hass, entityId, { kind: "arm", mode }, code),
    onDisarm: (code?: string) => callAlarm(hass, entityId, { kind: "disarm" }, code),
  };
}
