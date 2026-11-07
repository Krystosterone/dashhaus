import type { HassEntity } from "../types";
import { formatHaTime, parseHaTime } from "../time";
import { stringValue } from "../util";
import type { OwletAlert, OwletEntity, SleepState } from "../../entities/owlet/types";
import { VITAL_ALERTS } from "../../entities/owlet/readings";

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
  /** The base station's alert binary sensors; an alert sounds while its sensor is `on`. */
  alertEntities?: Partial<Record<OwletAlert, HassEntity>>;
  /** The sock's `binary_sensor.*_charging`. */
  chargingEntity?: HassEntity;
  /** The base station's `switch.*_base_station_on`. */
  baseEntity?: HassEntity;
  /** Minutes without a changed reading before the sock counts as stale. Default 3. */
  staleAfterMinutes?: number;
}

/** The `binary_sensor` the integration names after each alert (its English entity name, slugged). */
export const OWLET_ALERT_SUFFIX: Record<OwletAlert, string> = {
  critical_oxygen: "critical_oxygen_alert",
  low_oxygen: "low_oxygen_alert",
  high_oxygen: "high_oxygen_alert",
  low_heart_rate: "low_heart_rate_alert",
  high_heart_rate: "high_heart_rate_alert",
  sock_off: "sock_off",
  sock_disconnected: "sock_disconnected_alert",
  lost_power: "lost_power_alert",
  critical_battery: "critical_battery_alert",
  low_battery: "low_battery_alert",
};

/**
 * Home Assistant pushes a state only when it changes, so "live" can only mean "a reading changed recently".
 * The sock is polled every 5 s and a baby's heart rate moves between polls, so 3 minutes without any change
 * across the three sensors means readings have stopped arriving.
 */
export const OWLET_STALE_AFTER_MINUTES = 3;

const SLEEP: Record<string, SleepState> = { deep_sleep: "deep_sleep", light_sleep: "light_sleep", awake: "awake" };

export interface OwletCompanionIds {
  heartRate: string;
  oxygen: string;
  charging: string;
  base: string;
  alerts: Record<OwletAlert, string>;
}

/**
 * The companion entity ids the `owlet` integration gives a sock, from its sleep state sensor's id:
 * `sensor.owlet_sock_<serial>_sleep_state` → `sensor.…_heart_rate`, `sensor.…_o2_saturation`,
 * `binary_sensor.…_charging`, `switch.…_base_station_on` and one `binary_sensor.…` per alert. Undefined for an id that doesn't follow
 * that naming; pass the ids explicitly then.
 */
export function owletCompanionIds(sleepEntityId: string): OwletCompanionIds | undefined {
  if (!/^sensor\.\w+_sleep_state$/.test(sleepEntityId)) return undefined;
  const device = sleepEntityId.slice("sensor.".length, -"_sleep_state".length);
  const alerts = Object.fromEntries(Object.entries(OWLET_ALERT_SUFFIX).map(([alert, suffix]) => [alert, `binary_sensor.${device}_${suffix}`])) as Record<OwletAlert, string>;
  return { heartRate: `sensor.${device}_heart_rate`, oxygen: `sensor.${device}_o2_saturation`, charging: `binary_sensor.${device}_charging`, base: `switch.${device}_base_station_on`, alerts };
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

/** The sock's own battery alerts, which say nothing while it charges. */
const BATTERY_ALERTS = new Set<OwletAlert>(["low_battery", "critical_battery"]);

/**
 * Map an Owlet sock (custom `owlet` integration) to the card model: the sleep state sensor, composed with
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
  const charging = options.chargingEntity?.state === "on";
  // Only an `on` alert sounds: off, unknown, unavailable and a missing sensor are silent, never assumed. A sock on its
  // charger never warns of its battery (spec/cards.md → a device that is charging never warns of a low battery).
  const sounding = (Object.keys(options.alertEntities ?? {}) as OwletAlert[])
    .filter((alert) => options.alertEntities?.[alert]?.state === "on")
    .filter((alert) => !(charging && BATTERY_ALERTS.has(alert)));
  // The alarm started when the first vitals alert sounding now went on.
  const starts = sounding.filter((a) => VITAL_ALERTS.has(a)).map((a) => parseHaTime(options.alertEntities?.[a]?.last_changed)?.getTime()).filter((t): t is number => t != null);
  const vitalsSince = starts.length ? Math.min(...starts) : undefined;

  return {
    entityId,
    name: options.name ?? friendly ?? entityId,
    area: options.area,
    state,
    heartRate,
    oxygen,
    alerts: sounding,
    vitalsSince,
    charging,
    // Only a switch that says on or off: unknown, unavailable and a missing switch leave it out, never assumed.
    baseOn: options.baseEntity?.state === "on" ? true : options.baseEntity?.state === "off" ? false : undefined,
    live: latest ? now.getTime() - latest.at.getTime() <= staleAfter : undefined,
    lastUpdated: latest ? formatHaTime(latest.raw, options.now) : undefined,
    lastSeen: offline ? options.lastSeen : undefined,
  };
}
