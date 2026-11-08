import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import type { HourCycle } from "../../entities/clock";
import { finiteNumber, isRecord, stringValue } from "../util";
import { batteryFromHass, inlineBattery } from "./battery";
import { codeKind } from "../../entities/lock/code";
import type { LockEntity, LockState } from "../../entities/lock/types";

export interface LockMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  /** The dashboard's hour cycle its times are said on (`useHourCycle`); the browser locale's when left out. */
  hourCycle?: HourCycle;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /** A companion on the same device, `device_class: battery`. */
  batteryEntity?: HassEntity;
}

const STATES = new Set<LockState>(["locked", "unlocked", "locking", "unlocking", "jammed", "open", "opening"]);

/** Home Assistant's `LockEntityFeature.OPEN`. */
const SUPPORT_OPEN = 1;

/**
 * Map one raw Home Assistant `lock.*` state, and its device's battery, to the card model. Only Home Assistant's lock
 * states are states; `unknown`, `unavailable`, a state it doesn't define and a missing entity are unavailable, never a
 * safe-looking locked.
 */
export function lockFromHass(raw: HassEntity | undefined, entityId: string, options: LockMapOptions = {}): LockEntity {
  const attributes = isRecord(raw?.attributes) ? raw.attributes : {};
  const state: LockState = typeof raw?.state === "string" && STATES.has(raw.state as LockState) ? raw.state as LockState : "unavailable";
  const unav = state === "unavailable";
  const features = finiteNumber(attributes.supported_features) ?? 0;
  const codePattern = stringValue(attributes.code_format);

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    supportsOpen: (features & SUPPORT_OPEN) !== 0,
    codeFormat: codeKind(codePattern) ?? null,
    codePattern,
    changedBy: unav ? undefined : stringValue(attributes.changed_by),
    lastChanged: formatHaTime(raw?.last_changed, options.now, options.hourCycle),
    battery: unav ? undefined : inlineBattery(attributes) ?? batteryFromHass(options.batteryEntity),
    lastSeen: unav ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now, options.hourCycle) : undefined,
  };
}
