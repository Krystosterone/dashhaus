/**
 * A numeric reading's figures, the same on every card and in every skin: how its number is written in the places a card
 * has, its unit beside it, and today's readings in two lengths. What it measures, in words, is `./words`.
 */
import { normalizeReadings } from "../history";
import type { HourSample, Reading } from "../history";
import { NO_READINGS_TODAY } from "../today";
import type { NumericEntity, NumericHistory, NumericStateClass } from "./types";

const STATE_CLASSES: readonly NumericStateClass[] = ["measurement", "total", "total_increasing"];

/** Whether a raw `state_class` is one Home Assistant defines. */
export const isNumericStateClass = (value: unknown): value is NumericStateClass =>
  typeof value === "string" && (STATE_CLASSES as readonly string[]).includes(value);

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

/** Today's readings scaled for a Today strip: a numeric day spans at least a hundredth of its high, so noise stays flat. */
export function normalizeNumeric(readings: Reading[]): { samples: HourSample[]; min: number | null; max: number | null } {
  const nums = readings.filter((x): x is number => typeof x === "number");
  const scale = nums.length ? Math.max(...nums.map(Math.abs)) : 0;
  return normalizeReadings(readings, Math.max(scale / 100, 1e-9));
}

/**
 * The most characters today's `short` takes where it sits beside the figure as a second metric (a card's second
 * track): beyond ("-1240 to 420"), the metric is left out rather than cut, and the strip and the details say it in full.
 */
export const TODAY_SHORT_PLACES = 9;

/** What today's readings come to, in two lengths: `short` for a row or a metric, `long` for the strip's summary. */
export interface NumericToday {
  /**
   * "380–1450" (a measurement's low and high; "-1240 to 420" below zero; "0" for a day that never moved), "+3.2" (a
   * running total's rise today); none before a reading.
   */
  short?: string;
  /** "Low 380 ppm · High 1450 ppm", "Steady at 0 kW", "+3.2 kWh today", or `NO_READINGS_TODAY` ("No readings yet"). */
  long: string;
  /** The day scaled for a Today strip (`normalizeNumeric`). */
  samples: HourSample[];
}

/**
 * How far a meter that only climbs rose over `values`, in order: the sum of its rises, where a drop of more than a
 * tenth is a reset and the meter starts again from 0, and a smaller dip is netted, as Home Assistant's statistics read a
 * `total_increasing` sensor. None without a value.
 */
export function meterRise(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  let rise = 0;
  for (let i = 1; i < values.length; i++) {
    const [before, now] = [values[i - 1], values[i]];
    rise += now < 0.9 * before ? now : now - before;
  }
  return rise;
}

/**
 * Today's summary, the same on every card and in every skin. A measurement (CO₂, power) says its low and high; a
 * meter that only climbs (`total_increasing`: energy, water) says how far it rose since midnight (`meterRise`: from its
 * reading then, else the day's first, a reset counted from 0), since its low and high would only be midnight and now.
 * The history's `rise` where it read one, else the hourly readings'. A meter that only dipped falls back to its low
 * and high.
 */
export function numericToday(entity: Pick<NumericEntity, "unit" | "stateClass">, history: NumericHistory): NumericToday {
  const day = normalizeNumeric(history.readings);
  if (day.min == null || day.max == null) return { long: NO_READINGS_TODAY, samples: day.samples };
  const nums = history.readings.slice(0, history.currentHour + 1).filter((x): x is number => typeof x === "number");
  const rise = history.rise ?? meterRise(nums);
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
