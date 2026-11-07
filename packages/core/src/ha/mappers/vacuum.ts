import type { HassEntity } from "../types";
import { formatHaTime, parseHaTime } from "../time";
import { finiteNumber, isRecord, stringList, stringValue } from "../util";
import { inlineBattery } from "./battery";
import { inWords } from "../../entities/vacuum/words";
import type { VacuumEntity, VacuumState } from "../../entities/vacuum/types";

export interface VacuumMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
}

/** Home Assistant's `VacuumEntityFeature` bits the card reads. */
export const VACUUM_FEATURES = { PAUSE: 4, STOP: 8, RETURN_HOME: 16, FAN_SPEED: 32, BATTERY: 64, STATUS: 128, LOCATE: 512, START: 8192 } as const;

/**
 * Home Assistant's activities, and the names integrations give the same ones: a vacuum that is charging is docked; an
 * older vacuum's `on` is cleaning and its `off` idle.
 */
const STATES: Record<string, Exclude<VacuumState, "other" | "unavailable">> = {
  cleaning: "cleaning",
  on: "cleaning",
  running: "cleaning",
  docked: "docked",
  charging: "docked",
  charged: "docked",
  charging_completed: "docked",
  returning: "returning",
  returning_home: "returning",
  return_to_base: "returning",
  returning_to_dock: "returning",
  paused: "paused",
  idle: "idle",
  off: "idle",
  stopped: "idle",
  standby: "idle",
  ready: "idle",
  sleeping: "idle",
  error: "error",
  stuck: "error",
};

const UNAVAILABLE = new Set(["unknown", "unavailable", ""]);

/** A state: Home Assistant's, an integration's name for one, a kind of cleaning, or its own words. */
export function vacuumStateOf(raw: string | undefined): Pick<VacuumEntity, "state" | "stateText"> {
  const key = raw?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key == null || UNAVAILABLE.has(key)) return { state: "unavailable" };
  const known = STATES[key];
  if (known) return { state: known };
  // A kind of cleaning, named its own way (`spot_cleaning`, `mopping`): it is cleaning, said as the integration says it.
  if (/clean|mop|vacuum/.test(key)) return { state: "cleaning", stateText: inWords(raw!) };
  return { state: "other", stateText: inWords(raw!) };
}

/**
 * Map one raw Home Assistant `vacuum.*` state to the card model. Home Assistant's activities, and the names
 * integrations give them, are states; any other name an integration reports is `other`, said in its own words, never a
 * guessed activity; `unknown`, `unavailable` and a missing entity are unavailable. The battery is the vacuum's own
 * attribute; what it can do is what `supported_features` declares.
 */
export function vacuumFromHass(raw: HassEntity | undefined, entityId: string, options: VacuumMapOptions = {}): VacuumEntity {
  const attributes = isRecord(raw?.attributes) ? raw.attributes : {};
  const { state, stateText } = raw == null ? { state: "unavailable" as const, stateText: undefined } : vacuumStateOf(typeof raw.state === "string" ? raw.state : undefined);
  const unav = state === "unavailable";
  const features = finiteNumber(attributes.supported_features) ?? 0;
  const has = (bit: number) => (features & bit) !== 0;
  const fanSpeeds = stringList(attributes.fan_speed_list);
  const status = unav ? undefined : stringValue(attributes.status)?.trim() || undefined;
  const icon = stringValue(attributes.battery_icon) ?? "";
  const battery = unav ? undefined : inlineBattery(attributes);

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    ...(stateText && { stateText }),
    ...(status && { status }),
    ...(state === "error" && stringValue(attributes.error) && { error: inWords(stringValue(attributes.error)!) }),
    battery,
    charging: unav ? undefined : battery != null && (/charging/.test(icon) || /^charging$/i.test(status ?? "") || raw?.state === "charging"),
    supportsStart: has(VACUUM_FEATURES.START),
    supportsPause: has(VACUUM_FEATURES.PAUSE),
    supportsReturn: has(VACUUM_FEATURES.RETURN_HOME),
    supportsLocate: has(VACUUM_FEATURES.LOCATE),
    supportsFanSpeed: has(VACUUM_FEATURES.FAN_SPEED) && fanSpeeds.length > 0,
    ...(fanSpeeds.length > 0 && { fanSpeeds }),
    fanSpeed: unav ? undefined : stringValue(attributes.fan_speed),
    lastChanged: formatHaTime(raw?.last_changed, options.now),
    changedAt: parseHaTime(raw?.last_changed)?.getTime(),
    lastSeen: unav ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now) : undefined,
  };
}
