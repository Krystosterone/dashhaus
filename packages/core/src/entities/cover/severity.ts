import type { Severity } from "../severity";
import { isAccess, isMoving } from "./position";
import type { CoverEntity } from "./types";
import { isOpen } from "./words";

/**
 * How much a cover's state may claim (`../severity.ts`). A cover that lets a person in (a garage door, a door, a gate)
 * left open is **advisory**, look when convenient, as a garage door's `binary_sensor` is. A curtain or a blind open is
 * a choice, no severity. Nothing while it travels, while where it is isn't known, or while unavailable.
 */
export function coverSeverity(e: Pick<CoverEntity, "state" | "position" | "deviceClass">): Severity | undefined {
  if (e.state === "unavailable" || e.state === "unknown" || isMoving(e as CoverEntity)) return undefined;
  return isAccess(e.deviceClass) && isOpen(e) ? "advisory" : undefined;
}
