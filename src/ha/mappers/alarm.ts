import type { HassEntity } from "../types";
import { formatHaTime, parseHaTime } from "../time";
import type { AlarmEntity, AlarmMode, AlarmState } from "../../widgets/alarm/types";
import { finiteNumber, stringValue } from "../util";

export interface AlarmMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /** Exit/entry delay in seconds, used when the integration reports none (the manual alarm's arming_time / delay_time). */
  exitDelay?: number;
  entryDelay?: number;
  /** Friendly names of open sensors, composed by the host from binary sensors. */
  openSensors?: string[];
  /** What set off a pending/triggered state, composed by the host; Home Assistant has no such attribute. */
  triggeredBy?: string;
}

/** AlarmControlPanelEntityFeature bits, in the widget's display order. */
const FEATURES: [number, AlarmMode][] = [[1, "home"], [2, "away"], [4, "night"], [32, "vacation"], [16, "custom_bypass"]];
const STATES: Record<AlarmState, true> = {
  disarmed: true,
  armed_home: true,
  armed_away: true,
  armed_night: true,
  armed_vacation: true,
  armed_custom_bypass: true,
  arming: true,
  pending: true,
  disarming: true,
  triggered: true,
  unavailable: true,
};


/** Resolve a `next_state` / `arm_mode` value ("armed_away" or "away") to a known arm mode. */
function modeOf(value: unknown): AlarmMode | undefined {
  if (typeof value !== "string") return undefined;
  const mode = value.replace(/^armed_/, "");
  return FEATURES.some(([, feature]) => feature === mode) ? (mode as AlarmMode) : undefined;
}

/** Map one raw Home Assistant alarm_control_panel state to the widget's entity. */
export function alarmFromHass(raw: HassEntity | undefined, entityId: string, options: AlarmMapOptions = {}): AlarmEntity {
  const attributes = raw?.attributes ?? {};
  const state: AlarmState = typeof raw?.state === "string" && STATES[raw.state as AlarmState] === true
    ? (raw.state as AlarmState)
    : "unavailable";
  const features = finiteNumber(attributes.supported_features) ?? 0;
  const supported = FEATURES.filter(([bit]) => features & bit).map(([, mode]) => mode);
  const changedBy = stringValue(attributes.changed_by);
  const changed = formatHaTime(raw?.last_changed, options.now);
  const changedAt = parseHaTime(raw?.last_changed)?.getTime();
  const reportedDelay = finiteNumber(attributes.delay);
  const delay = reportedDelay != null && reportedDelay > 0 ? reportedDelay
    : state === "arming" ? options.exitDelay
    : state === "pending" ? options.entryDelay
    : undefined;
  const armingTo = state === "arming" || state === "pending"
    ? modeOf(attributes.next_state) ?? modeOf(attributes.arm_mode)
    : undefined;

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    modes: supported,
    codeFormat: attributes.code_format === "number" || attributes.code_format === "text" ? attributes.code_format : null,
    // HA's default is true; an integration that doesn't need it says false.
    codeArmRequired: typeof attributes.code_arm_required === "boolean" ? attributes.code_arm_required : true,
    armingTo,
    delay,
    changedAt,
    changedBy,
    lastChanged: changed,
    lastSeen: state === "unavailable" ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now) : undefined,
    openSensors: options.openSensors && options.openSensors.length ? options.openSensors : undefined,
    triggeredBy: options.triggeredBy,
  };
}
