import type { Severity } from "../severity";
import type { VacuumEntity } from "./types";
import { lowBattery } from "./words";

/**
 * How much a vacuum's warning may claim (`../severity.ts`). An error is **urgent**: it has stopped part way and won't
 * go on until someone helps it. A low battery while it is out and not charging is **advisory**, about the device; a
 * docked or charging vacuum never warns of its battery. Paused, idle and returning are states, not warnings, however
 * long they last. Nothing while unavailable.
 */
export function vacuumSeverity(e: Pick<VacuumEntity, "state" | "battery" | "charging">): Severity | undefined {
  if (e.state === "unavailable") return undefined;
  if (e.state === "error") return "urgent";
  if (lowBattery(e)) return "advisory";
  return undefined;
}
