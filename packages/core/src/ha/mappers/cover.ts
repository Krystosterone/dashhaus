import type { HassEntity } from "../types";
import type { CoverEntity, CoverClass } from "../../entities/cover/types";
import { formatHaTime } from "../time";
import type { HourCycle } from "../../entities/clock";
import { finiteNumber, stringValue } from "../util";

export interface CoverMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  /** The dashboard's hour cycle its times are said on (`useHourCycle`); the browser locale's when left out. */
  hourCycle?: HourCycle;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /**
   * Draws it as a garage door, a door or a gate whatever Home Assistant's `device_class` says, ahead of it: for one
   * Home Assistant gives no class (a template cover), so it asks first and warns while open (YAML `device_class`).
   */
  deviceClass?: "garage" | "door" | "gate";
}

/** Position and tilt are percentages in the wire model: finite and clamped to 0..100 only. */
const percentValue = (value: unknown) => {
  const number = finiteNumber(value);
  return number != null && number >= 0 && number <= 100 ? number : undefined;
};

const COVER_STATES = new Set<CoverEntity["state"]>(["open", "opening", "closed", "closing", "unknown"]);
const COVER_CLASSES = new Set<CoverClass>(["curtain", "blind", "shade", "shutter", "awning", "window", "garage", "door", "gate"]);

/** Home Assistant `CoverEntityFeature` bit values the card reads. */
export const COVER_FEATURES = {
  OPEN: 1, CLOSE: 2, SET_POSITION: 4, STOP: 8, OPEN_TILT: 16, CLOSE_TILT: 32, STOP_TILT: 64, SET_TILT_POSITION: 128,
} as const;

/** Map one raw Home Assistant cover state to the existing presentational model. */
export function coverFromHass(raw: HassEntity | undefined, entityId: string, options: CoverMapOptions = {}): CoverEntity {
  const attributes = raw?.attributes ?? {};
  const rawState = raw?.state;
  const state: CoverEntity["state"] = rawState != null && COVER_STATES.has(rawState as CoverEntity["state"])
    ? rawState as CoverEntity["state"]
    : "unavailable";
  // An unknown cover can still be driven, but whatever position it last held is stale.
  const readable = state !== "unavailable" && state !== "unknown";
  const rawClass = stringValue(attributes.device_class);
  const deviceClass: CoverClass = options.deviceClass ?? (rawClass != null && COVER_CLASSES.has(rawClass as CoverClass) ? rawClass as CoverClass : "shade");
  const features = finiteNumber(attributes.supported_features) ?? 0;
  const has = (bit: number) => (features & bit) !== 0;
  const supportsPosition = has(COVER_FEATURES.SET_POSITION);
  const supportsTilt = has(COVER_FEATURES.SET_TILT_POSITION);
  // A cover that only tilts (venetian slats with no lift) stops its slats.
  const onlyTilts = !has(COVER_FEATURES.OPEN) && !has(COVER_FEATURES.CLOSE) && !supportsPosition;
  const supportsStop = has(COVER_FEATURES.STOP) || (onlyTilts && has(COVER_FEATURES.STOP_TILT));
  const friendlyName = stringValue(attributes.friendly_name);

  return {
    entityId,
    name: options.name ?? friendlyName ?? entityId,
    area: options.area,
    state,
    deviceClass,
    position: readable && supportsPosition ? percentValue(attributes.current_position) : undefined,
    tilt: readable && (supportsTilt || has(COVER_FEATURES.OPEN_TILT) || has(COVER_FEATURES.CLOSE_TILT)) ? percentValue(attributes.current_tilt_position) : undefined,
    supportsPosition,
    supportsStop,
    supportsTilt,
    supportsOpen: has(COVER_FEATURES.OPEN),
    supportsClose: has(COVER_FEATURES.CLOSE),
    supportsTiltOpen: has(COVER_FEATURES.OPEN_TILT),
    supportsTiltClose: has(COVER_FEATURES.CLOSE_TILT),
    supportsTiltStop: has(COVER_FEATURES.STOP_TILT),
    ...(attributes.assumed_state === true && { assumedState: true }),
    lastChanged: formatHaTime(raw?.last_changed, options.now, options.hourCycle),
    lastSeen: state === "unavailable" ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now, options.hourCycle) : undefined,
  };
}
