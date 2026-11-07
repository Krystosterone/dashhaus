import { normalizeReadings } from "../history";
import type { HourSample, Reading } from "../history";
import type { NumericClass, NumericEntity, NumericHistory, NumericStateClass } from "./types";

/**
 * What a numeric reading measures, in its device class's words, the same on every card and in every skin: `label` is
 * the short word a status line or a screen's meta line carries ("CO₂", "Power"), `long` the full name the details'
 * small print and a screen reader say ("Carbon dioxide"). `picture` is the icon each skin draws for it, so a column
 * tells air from power from a meter.
 */
export interface NumericWords {
  label: string;
  long: string;
  picture: NumericPicture;
}

/** The pictures a numeric card draws: air quality, electricity now, a meter that counts up, and any other gauge. */
export type NumericPicture = "air" | "power" | "meter" | "gauge";

const air = (label: string, long = label): NumericWords => ({ label, long, picture: "air" });
const power = (label: string, long = label): NumericWords => ({ label, long, picture: "power" });
const meter = (label: string, long = label): NumericWords => ({ label, long, picture: "meter" });
const gauge = (label: string, long = label): NumericWords => ({ label, long, picture: "gauge" });

export const NUMERIC_WORDS: Record<NumericClass, NumericWords> = {
  apparent_power: power("Power", "Apparent power"),
  aqi: air("AQI", "Air quality index"),
  atmospheric_pressure: gauge("Pressure", "Atmospheric pressure"),
  carbon_dioxide: air("CO₂", "Carbon dioxide"),
  carbon_monoxide: air("CO", "Carbon monoxide"),
  current: power("Current"),
  data_rate: gauge("Data rate"),
  data_size: gauge("Data"),
  distance: gauge("Distance"),
  energy: meter("Energy"),
  frequency: gauge("Frequency"),
  gas: meter("Gas", "Gas use"),
  humidity: gauge("Humidity"),
  illuminance: gauge("Light", "Illuminance"),
  irradiance: gauge("Sunlight", "Irradiance"),
  moisture: gauge("Moisture"),
  nitrogen_dioxide: air("NO₂", "Nitrogen dioxide"),
  ozone: air("Ozone"),
  pm1: air("PM1", "Ultrafine particles"),
  pm10: air("PM10", "Coarse particles"),
  pm25: air("PM2.5", "Fine particles"),
  power: power("Power"),
  power_factor: power("Power factor"),
  precipitation: gauge("Rain", "Precipitation"),
  precipitation_intensity: gauge("Rain rate", "Precipitation intensity"),
  pressure: gauge("Pressure"),
  reactive_power: power("Power", "Reactive power"),
  signal_strength: gauge("Signal", "Signal strength"),
  sound_pressure: gauge("Noise", "Sound pressure"),
  speed: gauge("Speed"),
  temperature: gauge("Temperature"),
  volatile_organic_compounds: air("VOC", "Volatile organic compounds"),
  volatile_organic_compounds_parts: air("VOC", "Volatile organic compounds"),
  voltage: power("Voltage"),
  volume: meter("Volume"),
  water: meter("Water", "Water use"),
  weight: gauge("Weight"),
  wind_speed: gauge("Wind", "Wind speed"),
};

/** A reading with no device class, or one the card has no words for: a plain number in its unit. */
const PLAIN: NumericWords = { label: "", long: "Reading", picture: "gauge" };

/** Whether a raw `device_class` is one the numeric card has words for. */
export const isNumericClass = (value: unknown): value is NumericClass =>
  typeof value === "string" && Object.hasOwn(NUMERIC_WORDS, value);

const STATE_CLASSES: readonly NumericStateClass[] = ["measurement", "total", "total_increasing"];

/** Whether a raw `state_class` is one Home Assistant defines. */
export const isNumericStateClass = (value: unknown): value is NumericStateClass =>
  typeof value === "string" && (STATE_CLASSES as readonly string[]).includes(value);

/** The words for what a reading measures; a plain reading's `label` is empty, so a line leaves it out. */
export const numericWords = (deviceClass?: NumericClass): NumericWords => (deviceClass ? NUMERIC_WORDS[deviceClass] : PLAIN);

/** The most places a figure takes, a sign and a point included: what a segment screen holds, and a small card. */
export const FIGURE_PLACES = 5;

/** Round to `places` decimals and drop trailing zeros, never "-0": 0.42, 7.5, 42, 1450. */
const rounded = (n: number, places: number) => {
  const r = Number(n.toFixed(places));
  return String(r === 0 ? 0 : r);
};

/**
 * A number in full, as precise as its size needs: whole from 100 (1450 ppm, 12346 kWh), one decimal from 10 (21.4),
 * two under 10 (0.42 kW, 7.5). What the details' small print and a screen reader say.
 */
export const fmtNumeric = (n: number) => rounded(n, Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2);

const SCALES: ReadonlyArray<readonly [string, number]> = [["T", 1e12], ["G", 1e9], ["M", 1e6], ["k", 1e3]];

/**
 * The figure a card draws, at most `FIGURE_PLACES` places so it never truncates a digit: `fmtNumeric`, else scaled
 * with an SI letter (123456 is "123k", -12345 "-12k", 1234567 "1.2M"). Heard as the full value (`fmtNumeric`).
 */
export function numericFigure(n: number): string {
  const full = fmtNumeric(n);
  if (full.length <= FIGURE_PLACES) return full;
  for (const [letter, size] of SCALES) {
    if (Math.abs(n) < size) continue;
    for (const places of [1, 0]) {
      const text = `${rounded(n / size, places)}${letter}`;
      if (text.length <= FIGURE_PLACES) return text;
    }
  }
  return full;
}

/** Whether a unit sits on its figure ("42%", "21°") rather than after a space ("650 ppm", "3.2 kWh"). */
export const unitHugs = (unit?: string) => !!unit && /^[%°′″]/.test(unit);

/** A number and its unit as words: "650 ppm", "41%", or the number alone when it has none. */
export const withUnit = (text: string, unit?: string) => (unit ? `${text}${unitHugs(unit) ? "" : " "}${unit}` : text);

/**
 * What the reading is, for the details' small print: "Carbon dioxide in ppm", "Energy in kWh", "In W" with no class,
 * "Carbon dioxide" with no unit, nothing with neither.
 */
export function numericFact({ deviceClass, unit }: Pick<NumericEntity, "deviceClass" | "unit">): string {
  const what = deviceClass ? NUMERIC_WORDS[deviceClass].long : undefined;
  return what && unit ? `${what} in ${unit}` : what ?? (unit ? `In ${unit}` : "");
}

/** Today's readings scaled for a Today strip: a numeric day spans at least a hundredth of its high, so noise stays flat. */
export function normalizeNumeric(readings: Reading[]): { samples: HourSample[]; min: number | null; max: number | null } {
  const nums = readings.filter((x): x is number => typeof x === "number");
  const scale = nums.length ? Math.max(...nums.map(Math.abs)) : 0;
  return normalizeReadings(readings, Math.max(scale / 100, 1e-9));
}

/** What today's readings come to, in two lengths: `short` for a row or a metric, `long` for the strip's summary. */
export interface NumericToday {
  /**
   * "380–1450" (a measurement's low and high; "-1240 to 420" below zero; "0" for a day that never moved), "+3.2" (a
   * running total's rise today); none before a reading.
   */
  short?: string;
  /** "Low 380 ppm · High 1450 ppm", "Steady at 0 kW", "+3.2 kWh today", or "No readings yet today". */
  long: string;
  /** The day scaled for a Today strip (`normalizeNumeric`). */
  samples: HourSample[];
}

/**
 * Today's summary, the same on every card and in every skin. A measurement (CO₂, power) says its low and high; a
 * meter that only climbs (`total_increasing`: energy, water) says how far it rose since the day's first reading,
 * since its low and high would only be midnight and now. A meter that reset today falls back to its low and high.
 */
export function numericToday(entity: Pick<NumericEntity, "unit" | "stateClass">, history: NumericHistory): NumericToday {
  const day = normalizeNumeric(history.readings);
  if (day.min == null || day.max == null) return { long: "No readings yet today", samples: day.samples };
  const nums = history.readings.slice(0, history.currentHour + 1).filter((x): x is number => typeof x === "number");
  const rise = nums.length ? nums[nums.length - 1] - nums[0] : undefined;
  if (entity.stateClass === "total_increasing" && rise != null && rise >= 0) {
    const short = `+${numericFigure(rise)}`;
    return { short, long: `${withUnit(`+${fmtNumeric(rise)}`, entity.unit)} today`, samples: day.samples };
  }
  const [low, high] = [fmtNumeric(day.min), fmtNumeric(day.max)];
  if (low === high) return { short: numericFigure(day.min), long: `Steady at ${withUnit(low, entity.unit)}`, samples: day.samples };
  // A dash after a minus reads as a second minus: a range below zero says "to".
  const to = day.min < 0 ? " to " : "–";
  return {
    short: `${numericFigure(day.min)}${to}${numericFigure(day.max)}`,
    long: `Low ${withUnit(low, entity.unit)} · High ${withUnit(high, entity.unit)}`,
    samples: day.samples,
  };
}
