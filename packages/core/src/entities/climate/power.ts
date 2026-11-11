import type { ClimateEntity, HvacMode } from "./types";

type Power = Pick<ClimateEntity, "state" | "hvacModes" | "supportsTurnOn" | "supportsTurnOff">;

/**
 * The mode a unit that has no `climate.turn_on` is turned on in: its first mode that isn't off, as Home Assistant lists
 * them. None where it lists none.
 */
export const onMode = (e: Pick<ClimateEntity, "hvacModes">): HvacMode | undefined => e.hvacModes.find((mode) => mode !== "off");

/** Whether it can be turned on: by `climate.turn_on` where it declares it, else into its first mode that isn't off. */
export const canTurnOn = (e: Power): boolean => e.supportsTurnOn !== false || onMode(e) != null;

/**
 * Whether it can be turned off: by `climate.turn_off` where it declares it, else into its `off` mode. A heat-only
 * thermostat, with neither, can't.
 */
export const canTurnOff = (e: Power): boolean => e.supportsTurnOff !== false || e.hvacModes.includes("off");

/** Whether a press can switch it from the state it is in: off to on, or on to off. Never while unavailable. */
export const canSwitch = (e: Power): boolean =>
  e.state !== "unavailable" && (e.state === "off" ? canTurnOn(e) : canTurnOff(e));
