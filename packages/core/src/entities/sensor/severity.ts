import { isLowBattery } from "../battery";
import type { Severity } from "../severity";
import type { SensorEntity } from "./types";

/**
 * How much a room sensor's warning may claim (`../severity.ts`): a low same-device battery is **advisory**, about the
 * device rather than the room. A reading itself is never a warning: nothing here knows how warm a room should be.
 * Nothing while unavailable.
 */
export function sensorSeverity(e: Pick<SensorEntity, "state" | "battery">): Severity | undefined {
  if (e.state === "unavailable") return undefined;
  return isLowBattery(e.battery) ? "advisory" : undefined;
}
