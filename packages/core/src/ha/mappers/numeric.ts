import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import type { HourCycle } from "../../entities/clock";
import { isRecord, stringValue } from "../util";
import { isNumericStateClass } from "../../entities/numeric/readings";
import { isNumericClass } from "../../entities/numeric/words";
import type { NumericEntity } from "../../entities/numeric/types";

export interface NumericMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  /** The dashboard's hour cycle its times are said on (`useHourCycle`); the browser locale's when left out. */
  hourCycle?: HourCycle;
  name?: string;
  area?: string;
  /** Use when the host knows the unit but the raw entity omits it. */
  unit?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /** The limits it warns past, in its own unit (YAML `warn_above`, `warn_below`): copied onto the model as given. */
  warnAbove?: number;
  warnBelow?: number;
}

/**
 * Map one raw Home Assistant `sensor.*` with a number (CO₂, power, energy) to the card model. `unknown`, `unavailable`
 * and a missing entity are unavailable; a state that isn't a finite number is no reading, never a made-up value. A
 * device class the card has no words for, and a state class Home Assistant doesn't define, are none.
 */
export function numericFromHass(raw: HassEntity | undefined, entityId: string, options: NumericMapOptions = {}): NumericEntity {
  const attributes = isRecord(raw?.attributes) ? raw.attributes : {};
  const state = raw && raw.state !== "unavailable" && raw.state !== "unknown" ? "ok" : "unavailable";
  const unav = state === "unavailable";
  const number = Number(raw?.state);
  const value = !unav && raw!.state.trim() !== "" && Number.isFinite(number) ? number : undefined;
  const deviceClass = attributes.device_class;
  const stateClass = attributes.state_class;

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    value,
    unit: options.unit ?? stringValue(attributes.unit_of_measurement),
    deviceClass: isNumericClass(deviceClass) ? deviceClass : undefined,
    stateClass: isNumericStateClass(stateClass) ? stateClass : undefined,
    lastUpdated: unav ? undefined : formatHaTime(raw?.last_updated, options.now, options.hourCycle),
    lastSeen: unav ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now, options.hourCycle) : undefined,
    warnAbove: options.warnAbove,
    warnBelow: options.warnBelow,
  };
}
