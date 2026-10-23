import type { HassEntity } from "../types";
import { formatHaTime, parseHaTime } from "../time";
import { stringValue } from "../util";
import type { OwletEntity, SleepState } from "../../widgets/owlet/types";

export interface OwletMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /** The sock's heart rate sensor (`sensor.*_heart_rate`, bpm). */
  heartRateEntity?: HassEntity;
  /** The sock's oxygen saturation sensor (`sensor.*_o2_saturation`, %). */
  oxygenEntity?: HassEntity;
  /** Minutes without a changed reading before the sock counts as stale. Default 3. */
  staleAfterMinutes?: number;
}

/**
 * Home Assistant pushes a state only when it changes, so "live" can only mean "a reading changed recently".
 * The sock is polled every 5 s and a baby's heart rate moves between polls, so 3 minutes without any change
 * across the three sensors means readings have stopped arriving.
 */
export const OWLET_STALE_AFTER_MINUTES = 3;

const SLEEP: Record<string, SleepState> = { deep_sleep: "deep_sleep", light_sleep: "light_sleep", awake: "awake" };

/**
 * The companion sensor ids the `owlet` integration gives a sock, from its sleep state sensor's id:
 * `sensor.owlet_sock_<serial>_sleep_state` → `…_heart_rate` and `…_o2_saturation`. Undefined for an id
 * that doesn't follow that naming; pass the ids explicitly then.
 */
export function owletCompanionIds(sleepEntityId: string): { heartRate: string; oxygen: string } | undefined {
  if (!/^sensor\.\w+_sleep_state$/.test(sleepEntityId)) return undefined;
  const base = sleepEntityId.slice(0, -"_sleep_state".length);
  return { heartRate: `${base}_heart_rate`, oxygen: `${base}_o2_saturation` };
}

/**
 * A plausible reading from a raw sensor state, or undefined while it is unavailable, unknown, not a number,
 * or outside (0, max]: the sock reports 0 while it has no reading, so 0 is never shown as a measurement.
 */
function reading(raw: HassEntity | undefined, max: number): number | undefined {
  const state = raw?.state;
  if (typeof state !== "string" || state.trim() === "") return undefined;
  const value = Number(state);
  return Number.isFinite(value) && value > 0 && value <= max ? value : undefined;
}

/** The most recent `last_updated` across the sock's entities. */
function latestUpdate(entities: Array<HassEntity | undefined>): { raw: string; at: Date } | undefined {
  return entities
    .map((entity) => ({ raw: entity?.last_updated ?? "", at: parseHaTime(entity?.last_updated) }))
    .filter((x): x is { raw: string; at: Date } => x.at != null)
    .sort((a, b) => b.at.getTime() - a.at.getTime())[0];
}

/**
 * Map an Owlet sock (custom `owlet` integration) to the widget model: the sleep state sensor, composed with
 * its heart rate and oxygen companions. `unknown` (no sleep state yet), `unavailable` (charging) and a missing
 * entity are all unavailable; each reading is kept or dropped on its own.
 */
export function owletFromHass(raw: HassEntity | undefined, entityId: string, options: OwletMapOptions = {}): OwletEntity {
  const state = (raw && SLEEP[raw.state]) ?? "unavailable";
  const heartRate = reading(options.heartRateEntity, 300);
  const oxygen = reading(options.oxygenEntity, 100);
  // The integration names entities "<device> Sleep state"; the device name alone reads better.
  const friendly = stringValue(raw?.attributes?.friendly_name)?.replace(/ Sleep state$/i, "");
  const offline = state === "unavailable" && heartRate == null && oxygen == null;
  const latest = offline ? undefined : latestUpdate([raw, options.heartRateEntity, options.oxygenEntity]);
  const now = options.now ?? new Date();
  const staleAfter = (options.staleAfterMinutes ?? OWLET_STALE_AFTER_MINUTES) * 60_000;

  return {
    entityId,
    name: options.name ?? friendly ?? entityId,
    area: options.area,
    state,
    heartRate,
    oxygen,
    live: latest ? now.getTime() - latest.at.getTime() <= staleAfter : undefined,
    lastUpdated: latest ? formatHaTime(latest.raw, options.now) : undefined,
    lastSeen: offline ? options.lastSeen : undefined,
  };
}
