import { isLowBattery } from "../battery";
import type { VacuumEntity, VacuumState } from "./types";

/**
 * What a robot vacuum is doing, in words, the same on every card and in every skin. A transition says where it is going
 * (`Returning`), never a guessed end state; an `other` state is said in its own words (`stateText`).
 */
export const VACUUM_WORDS: Record<Exclude<VacuumState, "other">, string> = {
  cleaning: "Cleaning",
  docked: "Docked",
  returning: "Returning",
  paused: "Paused",
  idle: "Idle",
  error: "Error",
  unavailable: "Unavailable",
};

/** Today's word, lower case, as `todaySummary` takes it: "Cleaning 42m", "Not cleaning today". */
export const VACUUM_TODAY = "cleaning";

/** A Home Assistant name in words: `zone_cleaning` → "Zone cleaning", `Max+` stays "Max+". */
export function inWords(raw: string): string {
  const spaced = raw.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase() : raw;
}

/** What it is doing in words: "Cleaning", "Docked"; an integration's own state as it says it ("Mopping"). */
export function vacuumWord(e: Pick<VacuumEntity, "state" | "stateText">): string {
  if (e.state === "unavailable") return VACUUM_WORDS.unavailable;
  if (e.stateText) return e.stateText;
  return e.state === "other" ? "Unknown" : VACUUM_WORDS[e.state];
}

/** A fan speed in words: "quiet" → "Quiet", "max_plus" → "Max plus". */
export const fanSpeedLabel = inWords;

/** It is moving about the house: cleaning, or on its way back to the dock. */
export const isMoving = (e: Pick<VacuumEntity, "state">) => e.state === "cleaning" || e.state === "returning";

/**
 * What a vacuum's one press does now, gated on what it supports: while it moves, it pauses (or, cleaning and unable to
 * pause, it goes home); while it stands (docked, idle, paused, in error, or an `other` state), it starts, or resumes.
 * Null when it can do neither, or is unavailable: the card then shows its state with nothing to press.
 */
export type VacuumPress = "start" | "pause" | "return";

export function vacuumPress(e: Pick<VacuumEntity, "state" | "supportsStart" | "supportsPause" | "supportsReturn">): VacuumPress | null {
  if (e.state === "unavailable") return null;
  if (isMoving(e)) {
    if (e.supportsPause) return "pause";
    return e.state === "cleaning" && e.supportsReturn ? "return" : null;
  }
  return e.supportsStart ? "start" : null;
}

/**
 * The press in words, as a key or a pill prints it: "Start", "Resume" (from a pause), "Start again" (after an error),
 * "Pause", "Return to dock".
 */
export function pressWord(press: VacuumPress, e: Pick<VacuumEntity, "state">): string {
  if (press === "pause") return "Pause";
  if (press === "return") return "Return to dock";
  return e.state === "paused" ? "Resume" : e.state === "error" ? "Start again" : "Start";
}

/** Its battery is low and nothing is charging it: docked, or charging, it never warns of its battery. */
export const lowBattery = (e: Pick<VacuumEntity, "state" | "battery" | "charging">): boolean =>
  e.state !== "unavailable" && e.state !== "docked" && !e.charging && isLowBattery(e.battery);

/**
 * Its warning as a row or a status line leads with it, 13 characters at most so it stays whole on a narrow row: "Error"
 * while in error, "Battery 9%" while low and not charging. Undefined while there is none.
 */
export function vacuumWarning(e: Pick<VacuumEntity, "state" | "battery" | "charging">): string | undefined {
  if (e.state === "error") return "Error";
  if (lowBattery(e)) return `Battery ${e.battery}%`;
  return undefined;
}

/** Its warning with what went wrong, where there is room and the integration says: "Error · Brush jammed". */
export function vacuumWarningText(e: Pick<VacuumEntity, "state" | "battery" | "charging" | "error">): string | undefined {
  const word = vacuumWarning(e);
  return word && e.state === "error" && e.error ? `${word} · ${e.error}` : word;
}

/** Its warning as a sentence, for a screen reader: "Robot vacuum has stopped with an error: brush jammed". */
export function vacuumWarningSentence(e: Pick<VacuumEntity, "name" | "state" | "battery" | "charging" | "error">): string | undefined {
  if (e.state === "error") return `${e.name} has stopped with an error${e.error ? `: ${e.error.charAt(0).toLowerCase()}${e.error.slice(1)}` : ""}`;
  if (lowBattery(e)) return `${e.name}: battery ${e.battery}%, needs charging`;
  return undefined;
}

/** Its battery, for its details: "Battery 82%", "Battery 64%, charging", "Battery 9%, needs charging"; "" when it doesn't say. */
export function batteryFact(e: Pick<VacuumEntity, "state" | "battery" | "charging">): string {
  if (e.battery == null || e.state === "unavailable") return "";
  if (lowBattery(e)) return `Battery ${e.battery}%, needs charging`;
  return `Battery ${e.battery}%${e.charging ? ", charging" : ""}`;
}

/**
 * The integration's own status, where it says more than the state word: "Charging" beside Docked, "Cleaning the
 * kitchen" beside Cleaning. Nothing when it only repeats it.
 */
export function statusDetail(e: Pick<VacuumEntity, "state" | "stateText" | "status">): string | undefined {
  if (!e.status || e.state === "unavailable") return undefined;
  return e.status.trim().toLowerCase() === vacuumWord(e).toLowerCase() ? undefined : e.status.trim();
}
