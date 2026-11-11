import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import type { HourCycle } from "../../entities/clock";
import { distinctStrings, finiteNumber, stringValue } from "../util";
import type { FanDirection, FanEntity } from "../../entities/fan/types";
import { speedCountOf } from "../../entities/fan/speed";

export interface FanMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  /** The dashboard's hour cycle its times are said on (`useHourCycle`); the browser locale's when left out. */
  hourCycle?: HourCycle;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
}

/** Home Assistant `FanEntityFeature` bit values the card reads. */
export const FAN_FEATURES = { SET_SPEED: 1, OSCILLATE: 2, DIRECTION: 4, PRESET_MODE: 8, TURN_OFF: 16, TURN_ON: 32 } as const;

const DIRECTIONS = new Set<FanDirection>(["forward", "reverse"]);

/**
 * Map one raw Home Assistant `fan.*` state to the card model. "on", "off" and "unknown" (reachable, not yet reported)
 * are states; `unavailable` and a missing entity are unavailable, never a safe-looking off. Each control is read
 * only when `supported_features` declares it, and its value only while the fan reports one: a fan that is off
 * has no speed, preset or swing to show.
 */
export function fanFromHass(raw: HassEntity | undefined, entityId: string, options: FanMapOptions = {}): FanEntity {
  const attributes = raw?.attributes ?? {};
  // Unknown can still be switched (an RF or IR fan before its first command): it stays apart from off.
  const state = raw?.state === "on" || raw?.state === "off" || raw?.state === "unknown" ? raw.state : "unavailable";
  const on = state === "on";
  // Unknown has no reading yet: its swing and direction stay absent.
  const readable = state === "on" || state === "off";
  const features = finiteNumber(attributes.supported_features) ?? 0;
  const has = (bit: number) => (features & bit) !== 0;

  const supportsSpeed = has(FAN_FEATURES.SET_SPEED);
  const rawPercentage = finiteNumber(attributes.percentage);
  const percentage = on && supportsSpeed && rawPercentage != null && rawPercentage > 0 && rawPercentage <= 100 ? Math.round(rawPercentage) : undefined;

  const presetModes = has(FAN_FEATURES.PRESET_MODE) ? distinctStrings(attributes.preset_modes) ?? [] : [];
  const supportsPreset = presetModes.length > 0;
  const rawPreset = stringValue(attributes.preset_mode);
  const presetMode = on && rawPreset != null && presetModes.includes(rawPreset) ? rawPreset : undefined;

  const supportsOscillate = has(FAN_FEATURES.OSCILLATE);
  const oscillating = readable && supportsOscillate && typeof attributes.oscillating === "boolean" ? attributes.oscillating : undefined;

  const supportsDirection = has(FAN_FEATURES.DIRECTION);
  const rawDirection = stringValue(attributes.direction);
  const direction = readable && supportsDirection && rawDirection != null && DIRECTIONS.has(rawDirection as FanDirection) ? rawDirection as FanDirection : undefined;

  return {
    entityId,
    name: options.name ?? stringValue(attributes.friendly_name) ?? entityId,
    area: options.area,
    state,
    ...(attributes.assumed_state === true && { assumedState: true }),
    supportsTurnOn: has(FAN_FEATURES.TURN_ON),
    supportsTurnOff: has(FAN_FEATURES.TURN_OFF),
    supportsSpeed,
    percentage,
    speedCount: supportsSpeed ? speedCountOf(finiteNumber(attributes.percentage_step)) : undefined,
    supportsPreset,
    presetModes: supportsPreset ? presetModes : undefined,
    presetMode,
    supportsOscillate,
    oscillating,
    supportsDirection,
    direction,
    lastChanged: formatHaTime(raw?.last_changed, options.now, options.hourCycle),
    lastSeen: state === "unavailable" ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now, options.hourCycle) : undefined,
  };
}
