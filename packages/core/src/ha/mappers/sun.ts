import type { HassEntity } from "../types";
import { formatHaTime, parseHaTime } from "../time";
import { finiteNumber, stringValue } from "../util";
import type { SunEntity } from "../../entities/sun/types";

export interface SunMapOptions {
  /** The minute the card counts from (the tile's minute clock); default the current time. */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
}

const time = (value: unknown) => parseHaTime(value)?.getTime();

/**
 * Map Home Assistant's raw `sun.*` entity to the card model. `above_horizon` is up and `below_horizon` down; `unknown`,
 * `unavailable` and a missing entity are unavailable. Its times are the integration's `next_*` attributes, and a time
 * that doesn't parse is left out, never guessed.
 */
export function sunFromHass(raw: HassEntity | undefined, entityId: string, options: SunMapOptions = {}): SunEntity {
  const attributes = raw?.attributes ?? {};
  const state = raw && raw.state !== "unavailable" && raw.state !== "unknown" ? "ok" : "unavailable";
  const ok = state === "ok";
  const now = options.now ?? new Date();

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    up: ok && raw!.state === "above_horizon" ? true : ok && raw!.state === "below_horizon" ? false : undefined,
    nextRising: ok ? time(attributes.next_rising) : undefined,
    nextSetting: ok ? time(attributes.next_setting) : undefined,
    nextDawn: ok ? time(attributes.next_dawn) : undefined,
    nextDusk: ok ? time(attributes.next_dusk) : undefined,
    nextNoon: ok ? time(attributes.next_noon) : undefined,
    elevation: ok ? finiteNumber(attributes.elevation) : undefined,
    azimuth: ok ? finiteNumber(attributes.azimuth) : undefined,
    now: now.getTime(),
    lastUpdated: ok ? formatHaTime(raw?.last_updated, now) : undefined,
    lastSeen: ok ? undefined : options.lastSeen,
  };
}
