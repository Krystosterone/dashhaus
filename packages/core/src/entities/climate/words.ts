import { NOT_REPORTED, NO_READING_YET } from "../facts";
import { fmtTarget } from "./modes";
import type { ClimateEntity, HvacMode } from "./types";

/**
 * What a target does, by its mode, the same on every card and in every skin: heat up to it, cool down to it, keep at
 * it (auto), or keep between a range's two ends (heat/cool). A mode with no target (dry, fan only, off) has none.
 */
export const TARGET_WORD: Partial<Record<HvacMode, string>> = { heat: "Heat to", cool: "Cool to", auto: "Keep at", heat_cool: "Keep" };

/**
 * What a card says where the room's temperature would be and there is none yet: `No reading yet` while it reports one
 * but hasn't sent it, `Not reported` where it reports none (`reportsCurrentTemperature: false`), where a card that can
 * draws nothing for it.
 */
export const roomTemperatureBlank = (e: Pick<ClimateEntity, "reportsCurrentTemperature">) =>
  e.reportsCurrentTemperature === false ? NOT_REPORTED : NO_READING_YET;

/** The range it can be set across, in small print: "7–30°C". */
export const rangeFact = (e: Pick<ClimateEntity, "minTemp" | "maxTemp" | "unit">) => `${fmtTarget(e.minTemp)}–${fmtTarget(e.maxTemp)}${e.unit}`;

/** What the unit is, after when, in small print: the room's humidity where it reports one, then its range. */
export const climateFacts = (e: Pick<ClimateEntity, "currentHumidity" | "minTemp" | "maxTemp" | "unit">) =>
  [e.currentHumidity != null ? `Humidity ${Math.round(e.currentHumidity)}%` : null, rangeFact(e)].filter(Boolean).join(" · ");
