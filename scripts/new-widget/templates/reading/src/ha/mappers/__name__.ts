import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import { stringValue } from "../util";
import type { __Name__Entity } from "../../domains/__name__/types";

export interface __Name__MapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Use when the host knows the unit but the raw entity omits it. */
  unit?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
}

/**
 * Map one raw Home Assistant `__domain__.*` reading to the widget model. `unknown`, `unavailable` and a missing
 * entity are unavailable; a state that isn't a finite number is no reading, never a made-up value.
 */
export function __name__FromHass(raw: HassEntity | undefined, entityId: string, options: __Name__MapOptions = {}): __Name__Entity {
  const attributes = raw?.attributes ?? {};
  const state = raw && raw.state !== "unavailable" && raw.state !== "unknown" ? "ok" : "unavailable";
  const number = Number(raw?.state);
  const value = state === "ok" && raw!.state.trim() !== "" && Number.isFinite(number) ? number : undefined;

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    value,
    unit: options.unit ?? stringValue(attributes.unit_of_measurement),
    lastUpdated: state === "ok" ? formatHaTime(raw?.last_updated, options.now) : undefined,
    lastSeen: state === "unavailable" ? options.lastSeen : undefined,
  };
}
