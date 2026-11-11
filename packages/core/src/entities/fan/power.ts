import type { FanEntity } from "./types";

/**
 * Whether a press can switch it from the state it is in, by what it declares (`supportsTurnOn`, `supportsTurnOff`): off
 * to on, or on to off. Never while unavailable.
 */
export const canSwitchFan = (e: Pick<FanEntity, "state" | "supportsTurnOn" | "supportsTurnOff">): boolean =>
  e.state !== "unavailable" && (e.state === "on" ? e.supportsTurnOff !== false : e.supportsTurnOn !== false);
