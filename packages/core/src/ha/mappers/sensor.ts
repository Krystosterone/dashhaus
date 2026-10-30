import type { SensorEntity } from "../../entities/sensor/types";
import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import { finiteNumber, stringValue } from "../util";

export interface SensorMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
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

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const number = finiteNumber(value);
    if (number != null) return number;
  }
  return undefined;
}

function temperatureUnit(value: unknown): "°C" | "°F" | undefined {
  if (typeof value !== "string") return undefined;
  if (/^(?:°?f|fahrenheit)$/i.test(value.trim())) return "°F";
  if (/^(?:°?c|celsius)$/i.test(value.trim())) return "°C";
  return undefined;
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

function isBatterySensor(raw: HassEntity | undefined) {
  const kind = deviceClass(raw);
  const attributes = attributesOf(raw);
  return kind === "battery" || (kind == null && (attributes?.unit_of_measurement === "%" || attributes?.native_unit_of_measurement === "%"));
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
  const inlineBattery = state === "ok" ? percentValue(firstNumber(attributes.battery_level, attributes.battery)) : undefined;
  const companionBattery = state === "ok" && isAvailable(options.batteryEntity) && isBatterySensor(options.batteryEntity)
    ? percentValue(stateNumber(options.batteryEntity))
    : undefined;
  const friendlyName = stringValue(attributes.friendly_name);
  const lastSeen = state === "unavailable"
    ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now)
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
    battery: primaryBattery ?? inlineBattery ?? companionBattery,
    lastUpdated: formatHaTime(stringValue(raw?.last_updated), options.now),
    lastSeen,
  };
}
