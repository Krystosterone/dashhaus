import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import type { HourCycle } from "../../entities/clock";
import { stringValue } from "../util";
import type { ToggleEntity, ToggleIcon } from "../../entities/toggle/types";

export interface ToggleMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  /** The dashboard's hour cycle its times are said on (`useHourCycle`); the browser locale's when left out. */
  hourCycle?: HourCycle;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /** Host-supplied orb icon; Home Assistant has no such attribute. */
  icon?: ToggleIcon;
  /** Host-supplied one-line description; Home Assistant has no such attribute. */
  description?: string;
}

/** Map one raw Home Assistant input_boolean or switch state to the existing presentational model. */
export function toggleFromHass(raw: HassEntity | undefined, entityId: string, options: ToggleMapOptions = {}): ToggleEntity {
  const attributes = raw?.attributes ?? {};
  // Unknown can still be switched (an RF or template switch before its first command): it stays apart from off.
  const state = raw?.state === "on" || raw?.state === "off" || raw?.state === "unknown" ? raw.state : "unavailable";
  const friendlyName = stringValue(attributes.friendly_name);
  const lastSeenRaw = stringValue(attributes.last_seen);

  return {
    entityId,
    name: options.name ?? friendlyName ?? entityId,
    area: options.area,
    state,
    ...(attributes.assumed_state === true && { assumedState: true }),
    icon: options.icon,
    description: options.description,
    lastChanged: formatHaTime(raw?.last_changed, options.now, options.hourCycle),
    lastSeen: state === "unavailable" ? options.lastSeen ?? formatHaTime(lastSeenRaw, options.now, options.hourCycle) : undefined,
  };
}
