import { isLowBattery } from "../battery";
import type { Severity } from "../severity";
import type { BinarySensorClass, BinarySensorEntity } from "./types";

/**
 * How much a binary sensor's `on` may claim (`../severity.ts`). Smoke, gas and carbon monoxide are an **alarm**: act
 * now, it is about safety. A leak, heat, an unsafe or tampered device and a problem are **urgent**: act soon, before it
 * spreads. A cold sensor and a low battery class are **advisory**. Every other class (a door, a window, motion) is a
 * state, not a warning, however long it lasts: nothing here knows when a door should be closed.
 */
export const ON_SEVERITY: Partial<Record<BinarySensorClass, Severity>> = {
  smoke: "alarm",
  gas: "alarm",
  carbon_monoxide: "alarm",
  moisture: "urgent",
  heat: "urgent",
  safety: "urgent",
  tamper: "urgent",
  problem: "urgent",
  cold: "advisory",
  battery: "advisory",
};

/** What its state says needs attention: its class's `on` severity while on, else nothing. */
export const stateSeverity = (e: Pick<BinarySensorEntity, "state" | "deviceClass">): Severity | undefined =>
  e.state === "on" && e.deviceClass ? ON_SEVERITY[e.deviceClass] : undefined;

/**
 * The card's warning, the most a state or the device may claim: the state's severity first, then a low same-device
 * battery (advisory, about the device rather than what it senses). Nothing while unavailable.
 */
export function binarySensorSeverity(e: Pick<BinarySensorEntity, "state" | "deviceClass" | "battery">): Severity | undefined {
  if (e.state === "unavailable") return undefined;
  return stateSeverity(e) ?? (isLowBattery(e.battery) ? "advisory" : undefined);
}
