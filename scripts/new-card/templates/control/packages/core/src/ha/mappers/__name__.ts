import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import { stringValue } from "../util";
import type { __Name__Entity } from "../../entities/__name__/types";

export interface __Name__MapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
}

/**
 * Map one raw Home Assistant `__domain__.*` state to the card model. Only "on" and "off" are states;
 * `unknown`, `unavailable` and a missing entity are unavailable, never a safe-looking off.
 */
export function __name__FromHass(raw: HassEntity | undefined, entityId: string, options: __Name__MapOptions = {}): __Name__Entity {
  const attributes = raw?.attributes ?? {};
  const state = raw?.state === "on" ? "on" : raw?.state === "off" ? "off" : "unavailable";

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    lastChanged: formatHaTime(raw?.last_changed, options.now),
    lastSeen: state === "unavailable" ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now) : undefined,
  };
}
