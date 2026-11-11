import type { SensorEntity } from "../../entities/sensor/types";
import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import type { HourCycle } from "../../entities/clock";
import { stringValue, temperatureUnit } from "../util";
import { batteryFromHass, inlineBattery } from "./battery";

export interface SensorMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  /** The dashboard's hour cycle its times are said on (`useHourCycle`); the browser locale's when left out. */
  hourCycle?: HourCycle;
  name?: string;
  area?: string;
  outdoor?: boolean;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /** Use when the host knows the temperature unit but the raw entity omits it. */
  unit?: "°C" | "°F";
  /** A companion sensor for the same device, commonly `device_class: humidity`. */
  humidityEntity?: HassEntity;
  /** A companion sensor for the same device, commonly `device_class: battery`. */
  batteryEntity?: HassEntity;
}

const attributesOf = (raw: HassEntity | undefined): Record<string, unknown> | undefined => {
  if (!raw || !raw.attributes || typeof raw.attributes !== "object" || Array.isArray(raw.attributes)) return undefined;
  return raw.attributes;
};

function stateNumber(raw: HassEntity | undefined) {
  if (!raw || typeof raw.state !== "string" || raw.state === "unknown" || raw.state === "unavailable" || raw.state.trim().length === 0) return undefined;
  const value = Number(raw.state);
  return Number.isFinite(value) ? value : undefined;
}

function rawUnit(raw: HassEntity | undefined) {
  const attributes = attributesOf(raw);
  return temperatureUnit(attributes?.unit_of_measurement)
    ?? temperatureUnit(attributes?.native_unit_of_measurement);
}

function deviceClass(raw: HassEntity | undefined) {
  return stringValue(attributesOf(raw)?.device_class);
}

function percentValue(value: number | undefined) {
  return value != null && value >= 0 && value <= 100 ? value : undefined;
}

function isAvailable(raw: HassEntity | undefined) {
  return attributesOf(raw) != null && typeof raw?.state === "string" && raw.state !== "unknown" && raw.state !== "unavailable";
}

function isHumiditySensor(raw: HassEntity | undefined) {
  const kind = deviceClass(raw);
  const attributes = attributesOf(raw);
  return kind === "humidity" || (kind == null && (attributes?.unit_of_measurement === "%" || attributes?.native_unit_of_measurement === "%"));
}

/**
 * Whether a sensor's attributes say it is a room reading, one this mapper draws: a temperature or humidity device
 * class, or no device class with a temperature unit (°C, °F) or %. It reads what the entity declares, never its state,
 * so the answer holds while the sensor is unavailable. A `sensor.*` listed on its own in a Lovelace card's YAML keeps
 * the room sensor when this holds (`sensorCard`, `@dashhaus/core/lovelace`).
 */
export function isRoomReading(attributes: Record<string, unknown> | undefined): boolean {
  const kind = stringValue(attributes?.device_class);
  if (kind != null) return kind === "temperature" || kind === "humidity";
  return [attributes?.unit_of_measurement, attributes?.native_unit_of_measurement].some((unit) => unit === "%" || temperatureUnit(unit) != null);
}

/** Map one temperature/humidity device from one primary sensor and optional companion sensors. */
export function sensorFromHass(raw: HassEntity | undefined, entityId: string, options: SensorMapOptions = {}): SensorEntity {
  const attributes = attributesOf(raw) ?? {};
  const state = isAvailable(raw) ? "ok" : "unavailable";
  const primaryValue = state === "ok" ? stateNumber(raw) : undefined;
  const primaryUnit = rawUnit(raw);
  const unit = options.unit ?? primaryUnit ?? "°C";
  const primaryClass = deviceClass(raw);
  const hasTemperatureUnit = options.unit != null || primaryUnit != null;
  const temperature = primaryValue != null && hasTemperatureUnit && (primaryClass === "temperature" || primaryClass == null)
    ? primaryValue
    : undefined;
  const primaryHumidity = primaryValue != null && (primaryClass === "humidity" || isHumiditySensor(raw))
    ? percentValue(primaryValue)
    : undefined;
  const companionHumidity = state === "ok" && isAvailable(options.humidityEntity) && isHumiditySensor(options.humidityEntity)
    ? percentValue(stateNumber(options.humidityEntity))
    : undefined;
  const primaryBattery = primaryValue != null && primaryClass === "battery" ? percentValue(primaryValue) : undefined;
  const ownBattery = state === "ok" ? inlineBattery(attributes) : undefined;
  const companionBattery = state === "ok" ? batteryFromHass(options.batteryEntity) : undefined;
  const friendlyName = stringValue(attributes.friendly_name);
  const lastSeen = state === "unavailable"
    ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now, options.hourCycle)
    : undefined;

  return {
    entityId,
    name: options.name ?? friendlyName ?? entityId,
    area: options.area,
    state,
    temperature,
    humidity: primaryHumidity ?? companionHumidity,
    unit,
    outdoor: options.outdoor,
    battery: primaryBattery ?? ownBattery ?? companionBattery,
    lastUpdated: formatHaTime(stringValue(raw?.last_updated), options.now, options.hourCycle),
    lastSeen,
  };
}
