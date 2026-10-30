import type { HassEntity } from "../types";
import type { CoverEntity, CoverClass } from "../../entities/cover/types";
import { formatHaTime } from "../time";
import { finiteNumber, stringValue } from "../util";

export interface CoverMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
}

/** Position and tilt are percentages in the wire model: finite and clamped to 0..100 only. */
const percentValue = (value: unknown) => {
  const number = finiteNumber(value);
  return number != null && number >= 0 && number <= 100 ? number : undefined;
};

const COVER_STATES = new Set<CoverEntity["state"]>(["open", "opening", "closed", "closing"]);
const COVER_CLASSES = new Set<CoverClass>(["curtain", "blind", "shade", "shutter", "awning", "window", "garage", "door", "gate"]);

/** Home Assistant `CoverEntityFeature` bit values the card reads. */
const SUPPORTS_POSITION = 4;
const SUPPORTS_STOP = 8;
const SUPPORTS_TILT = 128;

/** Map one raw Home Assistant cover state to the existing presentational model. */
export function coverFromHass(raw: HassEntity | undefined, entityId: string, options: CoverMapOptions = {}): CoverEntity {
  const attributes = raw?.attributes ?? {};
  const rawState = raw?.state;
  const state: CoverEntity["state"] = rawState != null && COVER_STATES.has(rawState as CoverEntity["state"])
    ? rawState as CoverEntity["state"]
    : "unavailable";
  const readable = state !== "unavailable";
  const rawClass = stringValue(attributes.device_class);
  const deviceClass: CoverClass = rawClass != null && COVER_CLASSES.has(rawClass as CoverClass) ? rawClass as CoverClass : "shade";
  const features = finiteNumber(attributes.supported_features) ?? 0;
  const supportsPosition = (features & SUPPORTS_POSITION) !== 0;
  const supportsStop = (features & SUPPORTS_STOP) !== 0;
  const supportsTilt = (features & SUPPORTS_TILT) !== 0;
  const friendlyName = stringValue(attributes.friendly_name);

  return {
    entityId,
    name: options.name ?? friendlyName ?? entityId,
    area: options.area,
    state,
    deviceClass,
    position: readable && supportsPosition ? percentValue(attributes.current_position) : undefined,
    tilt: readable && supportsTilt ? percentValue(attributes.current_tilt_position) : undefined,
    supportsPosition,
    supportsStop,
    supportsTilt,
    lastChanged: formatHaTime(raw?.last_changed, options.now),
    lastSeen: state === "unavailable" ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now) : undefined,
  };
}
