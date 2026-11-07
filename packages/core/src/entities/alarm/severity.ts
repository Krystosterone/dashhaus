import type { Severity } from "../severity";
import type { AlarmEntity } from "./types";

/**
 * How much the alarm's state may claim (`../severity.ts`): triggered is the alarm going off; the entry delay is urgent,
 * a minute or less to disarm; disarmed with doors or windows open is advisory. Nothing while unavailable.
 */
export function alarmSeverity(e: Pick<AlarmEntity, "state" | "openSensors">): Severity | undefined {
  if (e.state === "triggered") return "alarm";
  if (e.state === "pending") return "urgent";
  return e.state === "disarmed" && e.openSensors?.length ? "advisory" : undefined;
}
