import { isLowBattery } from "../battery";
import type { Severity } from "../severity";
import type { LockEntity } from "./types";

/**
 * How much a lock's warning may claim (`../severity.ts`). Jammed is **urgent**: the bolt stopped part way, so the door
 * may not be locked. A low battery is **advisory**, about the device rather than the door. Unlocked is a state, not a
 * warning, however long it lasts: nothing here knows when a door should be locked. Nothing while unavailable.
 */
export function lockSeverity(e: LockEntity): Severity | undefined {
  if (e.state === "unavailable") return undefined;
  if (e.state === "jammed") return "urgent";
  if (isLowBattery(e.battery)) return "advisory";
  return undefined;
}
