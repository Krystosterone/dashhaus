import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import type { HourCycle } from "../../entities/clock";
import { isRecord, stringValue } from "../util";
import { inWords } from "../../entities/format";
import type { CameraEntity, CameraState } from "../../entities/camera/types";

export interface CameraMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  /** The dashboard's hour cycle its times are said on (`useHourCycle`); the browser locale's when left out. */
  hourCycle?: HourCycle;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
}

const STATES: readonly CameraState[] = ["idle", "recording", "streaming"];

/**
 * Map one raw Home Assistant `camera.*` state to the card model: `idle`, `recording` or `streaming`; `unknown`,
 * `unavailable` and a missing entity are unavailable; any other state is `other`, in its own words. It never reads
 * `entity_picture`: the still is not normalized state, and `useHaCamera` adds it (`useHaPicture`).
 */
export function cameraFromHass(raw: HassEntity | undefined, entityId: string, options: CameraMapOptions = {}): CameraEntity {
  const attributes = isRecord(raw?.attributes) ? raw.attributes : {};
  const rawState = raw?.state?.trim() ?? "";
  const state: CameraState = !raw || rawState === "" || rawState === "unknown" || rawState === "unavailable" ? "unavailable"
    : (STATES as readonly string[]).includes(rawState) ? (rawState as CameraState)
    : "other";
  const unav = state === "unavailable";
  const motion = attributes.motion_detection;

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    stateText: state === "other" ? inWords(rawState) : undefined,
    brand: stringValue(attributes.brand),
    model: stringValue(attributes.model_name),
    motionDetection: unav || typeof motion !== "boolean" ? undefined : motion,
    lastChanged: unav ? undefined : formatHaTime(raw?.last_changed, options.now, options.hourCycle),
    lastSeen: unav ? options.lastSeen : undefined,
  };
}
