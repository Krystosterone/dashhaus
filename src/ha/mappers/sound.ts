import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import { finiteNumber, stringValue } from "../util";
import type { SoundEntity } from "../../domains/sound/types";

export interface SoundMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /** The machine's volume, a `number.*` (the Tuya integration's `number.<device>_volume`). */
  volumeEntity?: HassEntity;
}

/** A volume `number.*`'s native range and reading. Its value is absent while it reports none. */
export interface SoundVolumeRange {
  entityId: string;
  min: number;
  max: number;
  step: number;
  value?: number;
}

/**
 * The volume `number.*` beside a sound switch: `switch.<device>_music` → `number.<device>_music_volume`,
 * then `number.<device>_volume` (Tuya names the volume after the device, not after the sound switch).
 */
export function soundVolumeCandidates(entityId: string): string[] {
  const object = entityId.slice(entityId.indexOf(".") + 1);
  const device = object.includes("_") ? object.slice(0, object.lastIndexOf("_")) : undefined;
  return [`number.${object}_volume`, ...(device ? [`number.${device}_volume`] : [])];
}

/** Read a volume `number.*`; undefined unless its range is usable. */
export function soundVolumeFromHass(raw: HassEntity | undefined): SoundVolumeRange | undefined {
  if (!raw) return undefined;
  const min = finiteNumber(raw.attributes.min) ?? 0;
  const max = finiteNumber(raw.attributes.max) ?? 100;
  const step = finiteNumber(raw.attributes.step) ?? 1;
  if (!(max > min) || !(step > 0)) return undefined;
  const reported = raw.state === "unknown" || raw.state === "unavailable" || raw.state.trim().length === 0 ? NaN : Number(raw.state);
  const value = Number.isFinite(reported) && reported >= min && reported <= max ? reported : undefined;
  return { entityId: raw.entity_id, min, max, step, value };
}

/**
 * Map one raw Home Assistant `switch.*` state, and its volume `number.*`, to the widget model. Only "on" and
 * "off" are states; `unknown`, `unavailable` and a missing entity are unavailable, never a safe-looking off.
 */
export function soundFromHass(raw: HassEntity | undefined, entityId: string, options: SoundMapOptions = {}): SoundEntity {
  const attributes = raw?.attributes ?? {};
  const state = raw?.state === "on" ? "on" : raw?.state === "off" ? "off" : "unavailable";
  const range = soundVolumeFromHass(options.volumeEntity);

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    volume: state !== "unavailable" && range?.value != null ? Math.round(((range.value - range.min) / (range.max - range.min)) * 100) : undefined,
    lastChanged: formatHaTime(raw?.last_changed, options.now),
    lastSeen: state === "unavailable" ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now) : undefined,
  };
}
