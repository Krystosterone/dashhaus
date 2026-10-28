import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import { finiteNumber, stringValue } from "../util";
import type { HumidifierAction, HumidifierEntity } from "../../domains/humidifier/types";

export interface HumidifierMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
}

const ACTIONS = new Set<HumidifierAction>(["humidifying", "drying", "idle", "off"]);
/** Home Assistant's DEFAULT_MIN_HUMIDITY and DEFAULT_MAX_HUMIDITY. */
const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;

const percentage = (value: unknown) => {
  const number = finiteNumber(value);
  return number != null && number >= 0 && number <= 100 ? number : undefined;
};

function modeList(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const modes = [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))];
  return modes.length ? modes : undefined;
}

function bounds(min: number | undefined, max: number | undefined) {
  if (min != null && max != null && min <= max) return { min, max };
  if (min != null && max == null) return { min, max: DEFAULT_MAX };
  if (min == null && max != null) return { min: DEFAULT_MIN, max };
  return { min: DEFAULT_MIN, max: DEFAULT_MAX };
}

/**
 * Map one raw Home Assistant `humidifier.*` state to the card model. Only "on" and "off" are states;
 * `unknown`, `unavailable` and a missing entity are unavailable, never a safe-looking off. Readings are
 * dropped while unavailable, and a target outside the reported bounds is left out rather than clamped.
 */
export function humidifierFromHass(raw: HassEntity | undefined, entityId: string, options: HumidifierMapOptions = {}): HumidifierEntity {
  const attributes = raw?.attributes ?? {};
  const state = raw?.state === "on" ? "on" : raw?.state === "off" ? "off" : "unavailable";
  const readable = state !== "unavailable";
  const { min, max } = bounds(percentage(attributes.min_humidity), percentage(attributes.max_humidity));
  const target = percentage(attributes.humidity);
  const action = stringValue(attributes.action);

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    kind: attributes.device_class === "dehumidifier" ? "dehumidifier" : "humidifier",
    action: readable && action && ACTIONS.has(action as HumidifierAction) ? action as HumidifierAction : undefined,
    currentHumidity: readable ? percentage(attributes.current_humidity) : undefined,
    targetHumidity: readable && target != null && target >= min && target <= max ? target : undefined,
    minHumidity: min,
    maxHumidity: max,
    mode: stringValue(attributes.mode),
    modes: modeList(attributes.available_modes),
    lastChanged: formatHaTime(raw?.last_changed, options.now),
    lastSeen: state === "unavailable" ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now) : undefined,
  };
}
