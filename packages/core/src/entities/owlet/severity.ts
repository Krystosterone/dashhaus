import type { Severity } from "../severity";
import { rankAlerts } from "./readings";
import type { OwletAlert } from "./types";

/** Problems that stop the monitoring: the sock off or out of reach, the base without power, a battery about to die. */
export const URGENT_PROBLEMS = new Set<OwletAlert>(["sock_off", "sock_disconnected", "lost_power", "critical_battery"]);

/**
 * How much the sock's state may claim (`../severity.ts`): a vitals alert is the alarm going off; a problem that stops
 * the monitoring, or readings that stopped, is urgent; any other problem (a low battery) is advisory.
 */
export function owletSeverity(alerts: readonly OwletAlert[] = [], stale = false): Severity | undefined {
  const { vitals, problems } = rankAlerts(alerts);
  if (vitals.length) return "alarm";
  if (stale || problems.some((p) => URGENT_PROBLEMS.has(p))) return "urgent";
  return problems.length ? "advisory" : undefined;
}
