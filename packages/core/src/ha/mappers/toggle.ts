import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import { stringValue } from "../util";
import type { ToggleEntity, ToggleIcon } from "../../entities/toggle/types";
import type { ColorName } from "../../entities/color";

export interface ToggleMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /** Host-supplied orb icon; Home Assistant has no such attribute. */
  icon?: ToggleIcon;
  /** Host-supplied orb colour; Home Assistant has no such attribute. */
  color?: ColorName;
  /** Host-supplied one-line description; Home Assistant has no such attribute. */
  description?: string;
}

/** Map one raw Home Assistant input_boolean or switch state to the existing presentational model. */
export function toggleFromHass(raw: HassEntity | undefined, entityId: string, options: ToggleMapOptions = {}): ToggleEntity {
  const attributes = raw?.attributes ?? {};
  const state = raw?.state === "on" ? "on" : raw?.state === "off" ? "off" : "unavailable";
  const friendlyName = stringValue(attributes.friendly_name);
  const lastSeenRaw = stringValue(attributes.last_seen);

  return {
    entityId,
    name: options.name ?? friendlyName ?? entityId,
    area: options.area,
    state,
    icon: options.icon,
    color: options.color,
    description: options.description,
    lastChanged: formatHaTime(raw?.last_changed, options.now),
    lastSeen: state === "unavailable" ? options.lastSeen ?? formatHaTime(lastSeenRaw, options.now) : undefined,
  };
}
