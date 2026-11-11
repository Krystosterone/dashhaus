import type { HassEntity } from "../types";
import type { HourCycle } from "../../entities/clock";
import { distinctStrings, finiteNumber, stringList, stringValue, temperatureUnit } from "../util";
import { fanFromHass } from "./fan";
import { DYSON_POLLUTANTS } from "../../entities/dyson/air";
import { DYSON_LOCAL_ANGLES, DYSON_SWEEPS, sweepLabel, sweepOf } from "../../entities/dyson/labels";
import type { DysonAngles } from "../../entities/dyson/labels";
import type { DysonAirReading, DysonEntity, DysonFilter, DysonFilterKind, DysonPollutant } from "../../entities/dyson/types";

/** The entities on a Dyson's device the card reads beside its fan, by what each is. */
export type DysonCompanion =
  | DysonPollutant
  | "temperature"
  | "humidity"
  | "hepaFilter"
  | "carbonFilter"
  | "filter"
  | "filterPercentage"
  | "nightMode"
  | "heat"
  | "oscillationMode"
  | "angleCenter"
  | "angleSpan"
  | "angleLow"
  | "angleHigh";

export interface DysonMapOptions {
  /** The clock the timestamps are formatted against (the tile's minute clock). */
  now?: Date;
  /** The dashboard's hour cycle its times are said on (`useHourCycle`); the browser locale's when left out. */
  hourCycle?: HourCycle;
  name?: string;
  area?: string;
  /** Explicit last-reachable metadata; `last_changed` is not a last-seen timestamp. */
  lastSeen?: string;
  /** Its companions' raw states, by what each is; a missing one is a companion the device doesn't have. */
  companions?: Partial<Record<DysonCompanion, HassEntity>>;
}

/**
 * The entity ids each Dyson integration gives a device's companions, from its fan's, the first that exists winning:
 * both name each `<device> <what>`, so `fan.bedroom`'s fine particles are `sensor.bedroom_pm_2_5` under `dyson_local`
 * (ha-dyson) and `sensor.bedroom_pm2_5` under `hass_dyson` (hass-dyson), and its heater `climate.bedroom` under both.
 * hass-dyson's oscillation angles are `number.*` sliders: its centre, its width ("Oscillation Angle"), and its ends.
 */
export function dysonCompanionIds(entityId: string): Record<DysonCompanion, string[]> | undefined {
  const match = /^fan\.(\w+)$/.exec(entityId);
  if (!match) return undefined;
  const o = match[1];
  const sensor = (...names: string[]) => names.map((n) => `sensor.${o}_${n}`);
  return {
    pm25: sensor("pm_2_5", "pm2_5"),
    pm10: sensor("pm_10", "pm10"),
    voc: sensor("volatile_organic_compounds_index", "voc"),
    no2: sensor("nitrogen_dioxide_index", "no2"),
    hcho: sensor("hcho", "formaldehyde"),
    temperature: sensor("temperature"),
    humidity: sensor("humidity"),
    hepaFilter: sensor("hepa_filter_life"),
    carbonFilter: sensor("carbon_filter_life"),
    filter: sensor("filter_life"),
    filterPercentage: sensor("filter_life_percentage"),
    nightMode: [`switch.${o}_night_mode`],
    heat: [`climate.${o}`],
    oscillationMode: [`select.${o}_oscillation_mode`, `select.${o}_oscillation`],
    angleCenter: [`number.${o}_oscillation_center_angle`],
    angleSpan: [`number.${o}_oscillation_angle`],
    angleLow: [`number.${o}_oscillation_low_angle`],
    angleHigh: [`number.${o}_oscillation_high_angle`],
  };
}

/** Every companion, in the order the hook reads them. */
export const DYSON_COMPANIONS: readonly DysonCompanion[] = [
  ...DYSON_POLLUTANTS, "temperature", "humidity", "hepaFilter", "carbonFilter", "filter", "filterPercentage", "nightMode", "heat", "oscillationMode",
  "angleCenter", "angleSpan", "angleLow", "angleHigh",
];

/**
 * A reading on Dyson's own scale. hass-dyson reports VOC in mg/m³ and NO₂ in µg/m³, but both are Dyson's raw index
 * rescaled (VOC's raw over 1000, NO₂'s raw as it is, each raw ten times the index), so they are read back as the 0-10
 * index Dyson's app shows, with no unit; ha-dyson already reports the index.
 */
function onDysonScale(pollutant: DysonPollutant, value: number | null, unit: string | undefined): { value: number | null; unit?: string } {
  if (pollutant === "voc" && unit === "mg/m³") return { value: value == null ? null : Math.round(value * 1000) / 10 };
  if (pollutant === "no2" && unit === "µg/m³") return { value: value == null ? null : value / 10 };
  return { value, ...(unit && { unit }) };
}

const readable = (raw: HassEntity | undefined) => raw != null && raw.state !== "unavailable" && raw.state !== "unknown";
/** A sensor's number, or null while it is there with none (unknown, unavailable, blank). */
const reading = (raw: HassEntity) => (readable(raw) ? finiteNumber(Number(raw.state)) ?? null : null);

/**
 * hass-dyson's angles, from its sliders: its centre and width where it has them (its ends go stale while a named sweep
 * is set, so the width it reports is the one to trust), else its two ends; their range from the sliders' own `min` and
 * `max`, ahead in the middle. `live` is false while the sliders have no numbers yet.
 */
function sliderAngles(companions: Partial<Record<DysonCompanion, HassEntity>>): { low: number; high: number; angles: DysonAngles; live: boolean } | undefined {
  const { angleCenter, angleSpan, angleLow, angleHigh } = companions;
  const any = angleCenter ?? angleLow;
  if (!any) return undefined;
  const min = finiteNumber(any.attributes?.min) ?? 0;
  const max = finiteNumber(any.attributes?.max) ?? 350;
  const angles: DysonAngles = { min, max, ahead: Math.round((min + max) / 2) };
  const value = (raw: HassEntity | undefined) => (raw && readable(raw) ? finiteNumber(Number(raw.state)) : undefined);
  const centre = value(angleCenter);
  const span = value(angleSpan);
  if (centre != null && span != null) {
    const half = Math.floor(span / 2);
    let low = Math.max(min, centre - half);
    let high = Math.min(max, centre + half);
    if (low === min) high = Math.min(max, min + span);
    else if (high === max) low = Math.max(min, max - span);
    return { low, high, angles, live: true };
  }
  const low = value(angleLow);
  const high = value(angleHigh);
  if (low != null && high != null) return { low, high, angles, live: true };
  return { low: angles.ahead, high: angles.ahead, angles, live: false };
}

/** A filter's life sensor, read only where it reports in percent (a Pure Cool Link's `filter_life` is in hours). */
function filter(kind: DysonFilterKind, raw: HassEntity | undefined): DysonFilter | undefined {
  if (!raw || stringValue(raw.attributes?.unit_of_measurement) !== "%") return undefined;
  const percent = reading(raw);
  return { kind, percent: percent == null ? null : Math.min(100, Math.max(0, percent)) };
}

/**
 * Map one Dyson: its `fan.*` through the fan's mapper, composed with the companions on its device. The fan's
 * presets are read as Auto or not; its oscillation range from a Humidify+Cool's oscillation mode select, or from a
 * Pure Cool's `angle_low` and `angle_high`; heat from its `climate.*`, whose `heat` mode is heat on and `cool` the fan
 * alone. A companion that is missing isn't drawn; one that is there without a number is a reading not yet sent.
 */
export function dysonFromHass(raw: HassEntity | undefined, entityId: string, options: DysonMapOptions = {}): DysonEntity {
  const { companions = {} } = options;
  const mapped = fanFromHass(raw, entityId, options);
  const presetModes = mapped.presetModes ?? [];
  // Dyson's presets are Auto and Normal: the model says Auto or not instead.
  // A Dyson reports every state it is in, so its unknown is unavailable, as it always was.
  const fan = { ...mapped, state: mapped.state === "unknown" ? "unavailable" as const : mapped.state };
  delete fan.assumedState;
  delete fan.supportsPreset;
  delete fan.presetModes;
  delete fan.presetMode;
  const attributes = raw?.attributes ?? {};
  const live = fan.state !== "unavailable";

  const autoPreset = presetModes.find((p) => p.toLowerCase() === "auto");
  const manualPreset = presetModes.find((p) => p !== autoPreset);
  const rawPreset = stringValue(attributes.preset_mode);

  const air: DysonAirReading[] = DYSON_POLLUTANTS.flatMap((pollutant) => {
    const sensor = companions[pollutant];
    if (!sensor) return [];
    return [{ pollutant, ...onDysonScale(pollutant, reading(sensor), stringValue(sensor.attributes?.unit_of_measurement)) }];
  });
  const filters = [
    filter("hepa", companions.hepaFilter),
    filter("carbon", companions.carbonFilter),
    filter("combined", companions.filter) ?? filter("combined", companions.filterPercentage),
  ].filter((f): f is DysonFilter => f != null);

  // The range: hass-dyson's angle sliders, else a select's own options, else ha-dyson's fan angles.
  const select = companions.oscillationMode;
  const selectModes = select ? distinctStrings(select.attributes?.options) ?? [] : [];
  const numbers = sliderAngles(companions);
  const low = numbers?.low ?? finiteNumber(attributes.angle_low);
  const high = numbers?.high ?? finiteNumber(attributes.angle_high);
  const by = numbers ? "number" as const : selectModes.length ? "select" as const : low != null && high != null ? "angle" as const : undefined;
  const sweep = low != null && high != null ? sweepOf(low, high) : undefined;
  const oscillation = !fan.supportsOscillate || !by ? {}
    : by === "select" ? {
      oscillationModes: selectModes,
      oscillationMode: live && select && readable(select) && selectModes.includes(select.state) ? select.state : undefined,
      oscillationBy: by,
    }
    : {
      oscillationModes: DYSON_SWEEPS.map(sweepLabel),
      oscillationMode: live && sweep != null ? sweepLabel(sweep) : undefined,
      oscillationCentre: Math.round((low! + high!) / 2),
      ...(live && numbers?.live !== false && { oscillationLow: low, oscillationHigh: high }),
      angles: numbers?.angles ?? DYSON_LOCAL_ANGLES,
      oscillationBy: by,
    };

  const night = companions.nightMode;
  const heat = companions.heat;
  const heatModes = heat ? stringList(heat.attributes?.hvac_modes) : [];
  const supportsHeat = heatModes.includes("heat");
  // Heat off is the fan alone: ha-dyson's `cool`, hass-dyson's `fan_only`.
  const heatOffMode = heatModes.includes("cool") ? "cool" : heatModes.includes("fan_only") ? "fan_only" : undefined;
  const heatLive = supportsHeat && live && readable(heat);
  const temperature = companions.temperature && readable(companions.temperature) ? reading(companions.temperature) ?? undefined : undefined;
  const humidity = companions.humidity && readable(companions.humidity) ? reading(companions.humidity) ?? undefined : undefined;
  const unit = temperatureUnit(companions.temperature?.attributes?.unit_of_measurement);

  return {
    ...fan,
    supportsAuto: autoPreset != null,
    auto: autoPreset != null && live ? rawPreset === autoPreset : undefined,
    autoPreset,
    manualPreset,
    ...oscillation,
    supportsNightMode: night != null,
    nightMode: night && live && (night.state === "on" || night.state === "off") ? night.state === "on" : undefined,
    supportsHeat,
    ...(supportsHeat && heatOffMode && { heatOffMode }),
    ...(heatLive && {
      heatOn: heat!.state === "heat",
      heating: heat!.state === "heat" && stringValue(heat!.attributes?.hvac_action) === "heating",
      heatTarget: finiteNumber(heat!.attributes?.temperature),
    }),
    ...(supportsHeat && {
      heatMin: finiteNumber(heat!.attributes?.min_temp) ?? 1,
      heatMax: finiteNumber(heat!.attributes?.max_temp) ?? 37,
      heatStep: finiteNumber(heat!.attributes?.target_temp_step) ?? 1,
      heatUnit: unit ?? "°C",
    }),
    ...(temperature != null && { temperature, ...(unit && { temperatureUnit: unit }) }),
    ...(humidity != null && { humidity }),
    air: live ? air : [],
    filters: live ? filters : [],
  };
}
