import type { Severity } from "../severity";
import type { DysonAirBand, DysonAirReading, DysonEntity, DysonFilter, DysonFilterKind, DysonPollutant } from "./types";

/** Every pollutant, in the order a card lists them: particles first, as Dyson's app does. */
export const DYSON_POLLUTANTS: readonly DysonPollutant[] = ["pm25", "pm10", "voc", "no2", "hcho"];

/** What each reading measures: its short label for a line, its long name for the small print and a screen reader. */
export const POLLUTANT_WORDS: Record<DysonPollutant, { label: string; long: string }> = {
  pm25: { label: "PM2.5", long: "Fine particles" },
  pm10: { label: "PM10", long: "Coarse particles" },
  voc: { label: "VOC", long: "Volatile organic compounds" },
  no2: { label: "NO₂", long: "Nitrogen dioxide" },
  hcho: { label: "HCHO", long: "Formaldehyde" },
};

/**
 * The top of each of Dyson's bands, Good, Fair and Poor, as its app draws them; past the last is Very poor.
 * Particles in µg/m³, VOC and NO₂ on Dyson's 0-10 index, formaldehyde in mg/m³.
 */
export const AIR_BAND_TOPS: Record<DysonPollutant, readonly [good: number, fair: number, poor: number]> = {
  pm25: [35, 53, 70],
  pm10: [50, 75, 100],
  voc: [3, 6, 8],
  no2: [3, 6, 8],
  hcho: [0.099, 0.299, 0.499],
};

const BANDS: readonly DysonAirBand[] = ["good", "fair", "poor", "very_poor"];

/** A band in words, the same on every card and in every skin. */
export const AIR_BAND_WORD: Record<DysonAirBand, string> = { good: "Good", fair: "Fair", poor: "Poor", very_poor: "Very poor" };

/** The band a reading falls in. */
export function airBand(pollutant: DysonPollutant, value: number): DysonAirBand {
  const tops = AIR_BAND_TOPS[pollutant];
  const i = tops.findIndex((top) => value <= top);
  return BANDS[i === -1 ? 3 : i];
}

/** The air overall: the worst band its readings are in, and which reading put it there (the first, on a tie). */
export interface DysonAir {
  band: DysonAirBand;
  lead: DysonAirReading & { value: number };
}

/** The air overall, from the readings that have a number; none while it has no reading, or is unavailable. */
export function dysonAir(e: Pick<DysonEntity, "state" | "air">): DysonAir | undefined {
  if (e.state === "unavailable") return undefined;
  let worst: DysonAir | undefined;
  for (const reading of e.air) {
    if (reading.value == null) continue;
    const band = airBand(reading.pollutant, reading.value);
    if (!worst || BANDS.indexOf(band) > BANDS.indexOf(worst.band)) worst = { band, lead: { ...reading, value: reading.value } };
  }
  return worst;
}

/** A reading's figure: a whole number, formaldehyde to two places, an index to one where it isn't whole. */
export function airFigure(reading: Pick<DysonAirReading, "pollutant" | "value">): string {
  if (reading.value == null) return "—";
  if (reading.pollutant === "hcho") return reading.value.toFixed(2);
  return reading.pollutant === "voc" || reading.pollutant === "no2" ? String(Math.round(reading.value * 10) / 10) : String(Math.round(reading.value));
}

/** A reading with its unit: "62 µg/m³", "4" for an index. */
export const airText = (reading: DysonAirReading) => (reading.unit ? `${airFigure(reading)} ${reading.unit}` : airFigure(reading));

/** The status line's word for the air, while it is good or fair: "Air good". Poor or worse is a warning instead. */
export const airWord = (air: DysonAir | undefined) => (air ? `Air ${AIR_BAND_WORD[air.band].toLowerCase()}` : undefined);

/** A filter as a word. */
export const FILTER_LABEL: Record<DysonFilterKind, string> = { hepa: "HEPA filter", carbon: "Carbon filter", combined: "Filter" };

/** A filter's life at or under this, in percent, and the card says to change it. */
export const FILTER_CHANGE_AT = 10;

/** The filters to change: their life at or under `FILTER_CHANGE_AT`. */
export const filtersToChange = (e: Pick<DysonEntity, "state" | "filters">): DysonFilter[] =>
  e.state === "unavailable" ? [] : e.filters.filter((f) => f.percent != null && f.percent <= FILTER_CHANGE_AT);

/** Each filter's life, for the small print: "HEPA filter 64% · Carbon filter 8%". */
export const filtersFact = (filters: readonly DysonFilter[]) =>
  filters.filter((f) => f.percent != null).map((f) => `${FILTER_LABEL[f.kind]} ${Math.round(f.percent!)}%`).join(" · ") || undefined;

/** What a Dyson warns about: the air poor or worse, else a filter to change. Its word fits a row; `said` is heard. */
export interface DysonWarning {
  kind: "air" | "filter";
  word: string;
  said: string;
}

/**
 * The one warning a Dyson leads with: the air poor or very poor first, since it is the room's, then a filter at or
 * under `FILTER_CHANGE_AT`. Nothing while unavailable.
 */
export function dysonWarning(e: Pick<DysonEntity, "state" | "air" | "filters">): DysonWarning | undefined {
  const air = dysonAir(e);
  if (air && (air.band === "poor" || air.band === "very_poor")) {
    const band = AIR_BAND_WORD[air.band];
    return { kind: "air", word: `${band} air`, said: `${band} air: ${POLLUTANT_WORDS[air.lead.pollutant].long} ${airText(air.lead)}` };
  }
  const filters = filtersToChange(e);
  if (filters.length) {
    const said = filters.map((f) => `${FILTER_LABEL[f.kind]} at ${Math.round(f.percent!)}%`).join(", ");
    return { kind: "filter", word: "Change filter", said: `Change filter: ${said}` };
  }
  return undefined;
}

/**
 * How much a Dyson's warning may claim (`../severity.ts`): poor air and a worn filter are both **advisory**, look when
 * convenient. The purifier is already cleaning the air; nothing about it is a fault to act on soon.
 */
export function dysonSeverity(e: Pick<DysonEntity, "state" | "air" | "filters">): Severity | undefined {
  return dysonWarning(e) ? "advisory" : undefined;
}
