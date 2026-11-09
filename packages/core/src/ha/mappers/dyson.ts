import type { HassEntity } from "../types";
import type { HourCycle } from "../../entities/clock";
import { finiteNumber, stringList, stringValue } from "../util";
import { fanFromHass } from "./fan";
import { DYSON_POLLUTANTS } from "../../entities/dyson/air";
import { DYSON_LOCAL_ANGLES, DYSON_SWEEPS, sweepLabel, sweepOf } from "../../entities/dyson/labels";
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
  | "oscillationMode";

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
 * The entity ids `dyson_local` (ha-dyson) gives a device's companions, from its fan's: the integration names each
 * `<device> <what>`, so `fan.bedroom`'s fine particles are `sensor.bedroom_pm_2_5` and its heater `climate.bedroom`.
 */
export function dysonCompanionIds(entityId: string): Record<DysonCompanion, string> | undefined {
  const match = /^fan\.(\w+)$/.exec(entityId);
  if (!match) return undefined;
  const o = match[1];
  return {
    pm25: `sensor.${o}_pm_2_5`,
    pm10: `sensor.${o}_pm_10`,
    voc: `sensor.${o}_volatile_organic_compounds_index`,
    no2: `sensor.${o}_nitrogen_dioxide_index`,
    hcho: `sensor.${o}_hcho`,
    temperature: `sensor.${o}_temperature`,
    humidity: `sensor.${o}_humidity`,
    hepaFilter: `sensor.${o}_hepa_filter_life`,
    carbonFilter: `sensor.${o}_carbon_filter_life`,
    filter: `sensor.${o}_filter_life`,
    filterPercentage: `sensor.${o}_filter_life_percentage`,
    nightMode: `switch.${o}_night_mode`,
    heat: `climate.${o}`,
    oscillationMode: `select.${o}_oscillation_mode`,
  };
}

/** Every companion, in the order the hook reads them. */
export const DYSON_COMPANIONS: readonly DysonCompanion[] = [
  ...DYSON_POLLUTANTS, "temperature", "humidity", "hepaFilter", "carbonFilter", "filter", "filterPercentage", "nightMode", "heat", "oscillationMode",
];

const readable = (raw: HassEntity | undefined) => raw != null && raw.state !== "unavailable" && raw.state !== "unknown";
/** A sensor's number, or null while it is there with none (unknown, unavailable, blank). */
const reading = (raw: HassEntity) => (readable(raw) ? finiteNumber(Number(raw.state)) ?? null : null);
const tempUnit = (raw: HassEntity | undefined): "°C" | "°F" | undefined => {
  const unit = stringValue(raw?.attributes?.unit_of_measurement);
  return unit === "°F" ? "°F" : unit === "°C" ? "°C" : undefined;
};

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
  const fan = { ...mapped };
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
    const unit = stringValue(sensor.attributes?.unit_of_measurement);
    return [{ pollutant, value: reading(sensor), ...(unit && { unit }) }];
  });
  const filters = [
    filter("hepa", companions.hepaFilter),
    filter("carbon", companions.carbonFilter),
    filter("combined", companions.filter) ?? filter("combined", companions.filterPercentage),
  ].filter((f): f is DysonFilter => f != null);

  // The range: a select's own options, else the fan's angles.
  const select = companions.oscillationMode;
  const selectModes = select ? [...new Set(stringList(select.attributes?.options).filter(Boolean))] : [];
  const low = finiteNumber(attributes.angle_low);
  const high = finiteNumber(attributes.angle_high);
  const byAngle = !selectModes.length && low != null && high != null;
  const sweep = byAngle ? sweepOf(low, high) : undefined;
  const oscillation = !fan.supportsOscillate ? {}
    : selectModes.length ? {
      oscillationModes: selectModes,
      oscillationMode: live && select && readable(select) && selectModes.includes(select.state) ? select.state : undefined,
      oscillationBy: "select" as const,
    }
    : byAngle ? {
      oscillationModes: DYSON_SWEEPS.map(sweepLabel),
      oscillationMode: live && sweep != null ? sweepLabel(sweep) : undefined,
      oscillationCentre: Math.round((low + high) / 2),
      ...(live && { oscillationLow: low, oscillationHigh: high }),
      angles: DYSON_LOCAL_ANGLES,
      oscillationBy: "angle" as const,
    }
    : {};

  const night = companions.nightMode;
  const heat = companions.heat;
  const heatModes = heat ? stringList(heat.attributes?.hvac_modes) : [];
  const supportsHeat = heatModes.includes("heat");
  const heatLive = supportsHeat && live && readable(heat);
  const temperature = companions.temperature && readable(companions.temperature) ? reading(companions.temperature) ?? undefined : undefined;
  const humidity = companions.humidity && readable(companions.humidity) ? reading(companions.humidity) ?? undefined : undefined;
  const temperatureUnit = tempUnit(companions.temperature);

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
    ...(heatLive && {
      heatOn: heat!.state === "heat",
      heating: heat!.state === "heat" && stringValue(heat!.attributes?.hvac_action) === "heating",
      heatTarget: finiteNumber(heat!.attributes?.temperature),
    }),
    ...(supportsHeat && {
      heatMin: finiteNumber(heat!.attributes?.min_temp) ?? 1,
      heatMax: finiteNumber(heat!.attributes?.max_temp) ?? 37,
      heatStep: finiteNumber(heat!.attributes?.target_temp_step) ?? 1,
      heatUnit: temperatureUnit ?? "°C",
    }),
    ...(temperature != null && { temperature, ...(temperatureUnit && { temperatureUnit }) }),
    ...(humidity != null && { humidity }),
    air: live ? air : [],
    filters: live ? filters : [],
  };
}
