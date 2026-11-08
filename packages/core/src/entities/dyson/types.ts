import type { FanEntity, FanHistory } from "../fan/types";

/** What a Dyson's air sensors measure: fine and coarse particles, VOC and NO₂ on Dyson's own 0-10 index, formaldehyde. */
export type DysonPollutant = "pm25" | "pm10" | "voc" | "no2" | "hcho";

/** Dyson's own bands for its air readings, as its app says them. */
export type DysonAirBand = "good" | "fair" | "poor" | "very_poor";

/** One air reading from a sensor on the fan's device. `null` while the sensor is there but has no number yet. */
export interface DysonAirReading {
  pollutant: DysonPollutant;
  value: number | null;
  /** Its unit, as the sensor says it (`µg/m³`, `mg/m³`); none for an index. */
  unit?: string;
}

/** Which filter a life sensor reports: a HEPA and a carbon filter, or one combined filter. */
export type DysonFilterKind = "hepa" | "carbon" | "combined";

/** One filter's life, in percent. `null` while its sensor is there but has no number yet. */
export interface DysonFilter {
  kind: DysonFilterKind;
  percent: number | null;
}

/**
 * One Dyson purifier fan, as the `dyson_local` integration (ha-dyson) exposes it: its `fan.*` entity, the fan card's
 * model, composed with the companions on its device. Its preset is read as Auto or not, since Dyson's presets are
 * only Auto and Normal. Each companion is read only where its entity is there, so a model without heat, an
 * oscillation range or a formaldehyde sensor draws without it.
 */
export interface DysonEntity extends Omit<FanEntity, "supportsPreset" | "presetModes" | "presetMode"> {
  /** True when the fan takes Dyson's Auto mode (an `Auto` preset). */
  supportsAuto?: boolean;
  /** True while it runs in Auto, choosing its own speed. Home Assistant reports no speed then. */
  auto?: boolean;
  /** The preset that is Auto, as the fan names it (`Auto`). */
  autoPreset?: string;
  /** The preset that leaves Auto (`Normal`). */
  manualPreset?: string;
  /**
   * The oscillation ranges it takes, in Dyson's words: `45°`, `90°`, `180°`, `350°` from a Pure Cool's oscillation
   * angles, or a Humidify+Cool's oscillation mode select's own options (`45°`, `90°`, `Breeze`).
   */
  oscillationModes?: string[];
  /** The range it sweeps, where it is one of `oscillationModes`. */
  oscillationMode?: string;
  /** Where a Pure Cool's sweep is centred, in degrees: a new range keeps it. */
  oscillationCentre?: number;
  /** Whether a range is set by the fan's angles (`dyson_local.set_angle`) or by its select entity. */
  oscillationBy?: "angle" | "select";
  /** True when its night-mode switch is there. */
  supportsNightMode?: boolean;
  nightMode?: boolean;
  /** True for a Hot+Cool: its `climate.*` heats. */
  supportsHeat?: boolean;
  /** True while heat mode is on; off, the fan only cools. */
  heatOn?: boolean;
  /** True while the heater is heating, not idle at its target. */
  heating?: boolean;
  heatTarget?: number;
  heatMin?: number;
  heatMax?: number;
  heatStep?: number;
  heatUnit?: "°C" | "°F";
  /** The room's temperature and humidity, from the device's own sensors. */
  temperature?: number;
  temperatureUnit?: "°C" | "°F";
  humidity?: number;
  /** Its air readings, in `DYSON_POLLUTANTS` order; empty when it has none. */
  air: DysonAirReading[];
  /** Its filters' life; empty when it reports none. */
  filters: DysonFilter[];
}

export type DysonHistory = FanHistory;
