import type { HassEntity } from "../types";
import { formatHaTime } from "../time";
import type { HourCycle } from "../../entities/clock";
import type { ClimateEntity, HvacAction, HvacMode } from "../../entities/climate/types";
import { distinctStrings, finiteNumber, stringValue, temperatureUnit } from "../util";

export interface ClimateMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  /** The dashboard's hour cycle its times are said on (`useHourCycle`); the browser locale's when left out. */
  hourCycle?: HourCycle;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  unit?: "°C" | "°F";
  /** Home Assistant's own temperature unit (`get_config`'s `unit_system.temperature`): a climate entity carries none. */
  systemUnit?: string;
}

const HVAC_MODES = new Set<HvacMode>(["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"]);
const HVAC_ACTIONS = new Set<HvacAction>(["heating", "cooling", "idle", "off", "drying", "fan"]);
const DEFAULT_MIN_TEMP = 7;
const DEFAULT_MAX_TEMP = 35;
/** Home Assistant's 7 °C, rounded to a whole degree as it reports a °F thermostat's `min_temp`. */
const DEFAULT_FAHRENHEIT_MIN_TEMP = 45;
const DEFAULT_FAHRENHEIT_MAX_TEMP = 95;
/** Home Assistant's frontend steps a whole degree in °F and half a degree in °C when the entity names no step. */
const DEFAULT_STEP = { "°C": 0.5, "°F": 1 } as const;
/** Home Assistant `ClimateEntityFeature` bit values the card reads. */
export const CLIMATE_FEATURES = { TURN_OFF: 128, TURN_ON: 256 } as const;


function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const number = finiteNumber(value);
    if (number != null) return number;
  }
  return undefined;
}

function percentage(value: number | undefined) {
  return value != null && value >= 0 && value <= 100 ? value : undefined;
}

function modeList(value: unknown): HvacMode[] {
  const values = distinctStrings(value) ?? [];
  return values.filter((mode): mode is HvacMode => HVAC_MODES.has(mode as HvacMode));
}

function actionValue(value: unknown): HvacAction | undefined {
  return typeof value === "string" && HVAC_ACTIONS.has(value as HvacAction) ? value as HvacAction : undefined;
}

function modeValue(value: string | undefined): HvacMode | "unavailable" {
  return value && HVAC_MODES.has(value as HvacMode) ? value as HvacMode : "unavailable";
}

function validBounds(min: number | undefined, max: number | undefined, unit: "°C" | "°F") {
  const defaultMin = unit === "°F" ? DEFAULT_FAHRENHEIT_MIN_TEMP : DEFAULT_MIN_TEMP;
  const defaultMax = unit === "°F" ? DEFAULT_FAHRENHEIT_MAX_TEMP : DEFAULT_MAX_TEMP;
  if (min != null && max != null && min <= max) return { min, max };
  if (min != null && max == null) return { min, max: Math.max(defaultMax, min) };
  if (min == null && max != null) return { min: Math.min(defaultMin, max), max };
  return { min: defaultMin, max: defaultMax };
}

function validTargetRange(low: number | undefined, high: number | undefined, bounds: { min: number; max: number }) {
  if (low != null && high != null && low > high) return { low: undefined, high: undefined };
  const inBounds = (value: number | undefined) => value == null || (value >= bounds.min && value <= bounds.max);
  if (!inBounds(low) || !inBounds(high)) return { low: undefined, high: undefined };
  return { low, high };
}

/**
 * Whether the entity reports the room's temperature at all: a climate entity declares no feature for it, so the
 * attribute is what tells "not yet" (present, with no number in it yet) from "never" (absent).
 */
const reportsCurrentTemperature = (attributes: HassEntity["attributes"]) =>
  "current_temperature" in attributes || "native_current_temperature" in attributes;

/** Map one raw Home Assistant climate state to the existing presentational model. */
export function climateFromHass(raw: HassEntity | undefined, entityId: string, options: ClimateMapOptions = {}): ClimateEntity {
  const attributes = raw?.attributes ?? {};
  const state = modeValue(raw?.state);
  const unit = options.unit
    ?? temperatureUnit(attributes.temperature_unit)
    ?? temperatureUnit(attributes.native_temperature_unit)
    ?? temperatureUnit(attributes.unit_of_measurement)
    ?? temperatureUnit(options.systemUnit)
    ?? "°C";
  const bounds = validBounds(
    firstNumber(attributes.min_temp, attributes.min_temperature, attributes.native_min_temp),
    firstNumber(attributes.max_temp, attributes.max_temperature, attributes.native_max_temp),
    unit,
  );
  const rawStep = firstNumber(attributes.target_temp_step, attributes.temperature_step, attributes.precision);
  const step = rawStep != null && rawStep > 0 ? rawStep : DEFAULT_STEP[unit];
  const targetRange = validTargetRange(
    firstNumber(attributes.target_temp_low, attributes.target_temperature_low, attributes.native_target_temperature_low),
    firstNumber(attributes.target_temp_high, attributes.target_temperature_high, attributes.native_target_temperature_high),
    bounds,
  );
  const targetTemperatureValue = firstNumber(attributes.temperature, attributes.target_temperature, attributes.native_target_temperature);
  const targetTemperature = targetTemperatureValue != null
    && targetTemperatureValue >= bounds.min
    && targetTemperatureValue <= bounds.max
    ? targetTemperatureValue
    : undefined;
  const friendlyName = stringValue(attributes.friendly_name);
  const changed = formatHaTime(raw?.last_changed, options.now, options.hourCycle);
  const lastSeen = state === "unavailable"
    ? options.lastSeen ?? formatHaTime(stringValue(attributes.last_seen), options.now, options.hourCycle)
    : undefined;
  const readable = state !== "unavailable";
  const features = finiteNumber(attributes.supported_features) ?? 0;

  return {
    entityId,
    name: options.name ?? friendlyName ?? entityId,
    area: options.area,
    state,
    hvacModes: modeList(attributes.hvac_modes),
    supportsTurnOn: (features & CLIMATE_FEATURES.TURN_ON) !== 0,
    supportsTurnOff: (features & CLIMATE_FEATURES.TURN_OFF) !== 0,
    hvacAction: readable ? actionValue(stringValue(attributes.hvac_action)) : undefined,
    currentTemperature: readable ? firstNumber(attributes.current_temperature, attributes.native_current_temperature) : undefined,
    ...(readable && !reportsCurrentTemperature(attributes) && { reportsCurrentTemperature: false }),
    currentHumidity: readable ? percentage(firstNumber(attributes.current_humidity)) : undefined,
    targetTemperature: readable ? targetTemperature : undefined,
    targetLow: readable ? targetRange.low : undefined,
    targetHigh: readable ? targetRange.high : undefined,
    minTemp: bounds.min,
    maxTemp: bounds.max,
    step,
    unit,
    presetMode: stringValue(attributes.preset_mode),
    presetModes: distinctStrings(attributes.preset_modes),
    fanMode: stringValue(attributes.fan_mode),
    fanModes: distinctStrings(attributes.fan_modes),
    lastChanged: changed,
    lastSeen,
  };
}
