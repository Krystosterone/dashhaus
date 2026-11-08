import { WARNING_WORD_MAX } from "../severity";
import { fmtNumeric, withUnit } from "./readings";
import type { NumericClass, NumericEntity, NumericSide } from "./types";

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

/** The words for what a reading measures; a plain reading's `label` is empty, so a line leaves it out. */
export const numericWords = (deviceClass?: NumericClass): NumericWords => (deviceClass ? NUMERIC_WORDS[deviceClass] : PLAIN);

/**
 * What today's meter says to a screen reader, by what it measures: "CO₂ by hour today.", "Reading by hour today." for a
 * plain reading.
 */
export const numericTodaySaid = (deviceClass?: NumericClass) => {
  const words = numericWords(deviceClass);
  return `${words.label || words.long} by hour today.`;
};

/**
 * What the reading is, for the details' small print: "Carbon dioxide in ppm", "Energy in kWh", "In W" with no class,
 * "Carbon dioxide" with no unit, nothing with neither.
 */
export function numericFact({ deviceClass, unit }: Pick<NumericEntity, "deviceClass" | "unit">): string {
  const what = deviceClass ? NUMERIC_WORDS[deviceClass].long : undefined;
  return what && unit ? `${what} in ${unit}` : what ?? (unit ? `In ${unit}` : "");
}

/** A label that is an ordinary word ("Power") reads lower-case after High or Low; a symbol or an acronym ("CO₂", "PM2.5", "VOC") keeps its case. */
const inLine = (label: string) => (/^[A-Z][a-z ]*$/.test(label) ? label.toLowerCase() : label);

/**
 * The word a reading past a limit the person set says, 13 characters at most (`WARNING_WORD_MAX`), the same on every
 * card and in every skin: "High CO₂", "Low voltage", "High humidity", from what it measures, never its name. A
 * temperature says "Too warm" or "Too cold"; a class whose label is too long for "High <label>" ("Power factor"),
 * and a plain reading, says "Too high" or "Too low", on both sides alike.
 */
export function numericWarningWord(deviceClass: NumericClass | undefined, side: NumericSide): string {
  if (deviceClass === "temperature") return side === "above" ? "Too warm" : "Too cold";
  const label = deviceClass ? NUMERIC_WORDS[deviceClass].label : "";
  if (!label || `High ${label}`.length > WARNING_WORD_MAX) return side === "above" ? "Too high" : "Too low";
  return `${side === "above" ? "High" : "Low"} ${inLine(label)}`;
}

/** A limit in the reading's unit: "1200 ppm", "-25°C". */
const limitText = (limit: number, unit?: string) => withUnit(fmtNumeric(limit), unit);

/**
 * What a reading past a limit says to a screen reader, after "Warning: ": "Carbon dioxide above 1200 ppm", "above
 * 1200 ppm" for a plain reading. Nothing while no limit is set on that side.
 */
export function numericWarningSaid(e: Pick<NumericEntity, "deviceClass" | "unit" | "warnAbove" | "warnBelow">, side: NumericSide): string {
  const limit = side === "above" ? e.warnAbove : e.warnBelow;
  if (limit == null) return "";
  const what = e.deviceClass ? NUMERIC_WORDS[e.deviceClass].long : "";
  return [what, side, limitText(limit, e.unit)].filter(Boolean).join(" ");
}

/**
 * The limits the person set, for the details' small print, whether or not it warns now: "Warns above 1200 ppm",
 * "Warns below -25°C", "Warns below 18°C or above 24°C"; nothing with none.
 */
export function numericLimitFact(e: Pick<NumericEntity, "unit" | "warnAbove" | "warnBelow">): string {
  const sides = [
    e.warnBelow != null ? `below ${limitText(e.warnBelow, e.unit)}` : null,
    e.warnAbove != null ? `above ${limitText(e.warnAbove, e.unit)}` : null,
  ].filter(Boolean);
  return sides.length ? `Warns ${sides.join(" or ")}` : "";
}
