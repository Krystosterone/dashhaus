import type { Severity } from "../severity";
import type { NumericEntity, NumericSide } from "./types";
import { numericWarningSaid, numericWarningWord } from "./words";

/** A reading past a limit the person set: which side, its word ("High CO₂") and what it says after "Warning: ". */
export interface NumericWarning {
  side: NumericSide;
  word: string;
  said: string;
}

type Warns = Pick<NumericEntity, "state" | "value" | "deviceClass" | "unit" | "warnAbove" | "warnBelow">;

/**
 * Whether a reading is past a limit the person set (`warnAbove`, `warnBelow`), and which: strictly over `warnAbove`,
 * or strictly under `warnBelow` (a reading at its limit does not warn), the limit above checked first. Nothing with
 * no limit, while unavailable, or before a first reading: a card never invents a threshold.
 */
export function numericWarning(e: Warns): NumericWarning | undefined {
  if (e.state === "unavailable" || e.value == null) return undefined;
  const side: NumericSide | undefined = e.warnAbove != null && e.value > e.warnAbove ? "above"
    : e.warnBelow != null && e.value < e.warnBelow ? "below"
    : undefined;
  return side && { side, word: numericWarningWord(e.deviceClass, side), said: numericWarningSaid(e, side) };
}

/**
 * How much a numeric reading's warning may claim (`../severity.ts`): a reading past a limit the person set is
 * **advisory**, look when convenient. A number has no meaning core knows, so it never ranks higher: a warning that
 * must reach someone is Home Assistant's to send (its Threshold helper, and an automation). Nothing while unavailable,
 * before a first reading, or with no limit set.
 */
export function numericSeverity(e: Warns): Severity | undefined {
  return numericWarning(e) ? "advisory" : undefined;
}
