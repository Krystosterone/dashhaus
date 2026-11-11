import { batteryText, isLowBattery } from "../battery";
import { inWords } from "../format";
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

/** What a featured card says where today's cleaning would be, while it was given none to draw. */
export const NO_CLEANING_HISTORY = "No cleaning history";

/** What it is doing in words: "Cleaning", "Docked"; an integration's own state as it says it ("Mopping"). */
export function vacuumWord(e: Pick<VacuumEntity, "state" | "stateText">): string {
  if (e.state === "unavailable") return VACUUM_WORDS.unavailable;
  if (e.stateText) return e.stateText;
  return e.state === "other" ? "Unknown" : VACUUM_WORDS[e.state];
}

/** A fan speed in words: "quiet" → "Quiet", "max_plus" → "Max plus" (`inWords`, `@dashhaus/core/entities/format`). */
export const fanSpeedLabel = inWords;

/** The fan speeds' legend, and one said aloud: "Fan speed Quiet". */
export const FAN_SPEED = "Fan speed";
export const fanSpeedSaid = (speed: string) => `${FAN_SPEED} ${fanSpeedLabel(speed)}`;

/** It is moving about the house: cleaning, or on its way back to the dock. */
export const isMoving = (e: Pick<VacuumEntity, "state">) => e.state === "cleaning" || e.state === "returning";

/**
 * Its active set (spec/cards.md → One active signal), the one every skin's active signal follows: Orb's accent and
 * pressed orb, Field's LED, lit pictogram and bright figure. Cleaning and returning, the states it moves in: on its way
 * home between a clean and the dock it keeps the signal, so it never flickers off and on. Docked, idle, paused and in
 * error it stands, and rests.
 */
export const isActive = isMoving;

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
  if (press === "return") return RETURN_WORDS.long;
  return e.state === "paused" ? "Resume" : e.state === "error" ? "Start again" : "Start";
}

/** Sending it home in words: a pill's `Return to dock`, and a key's `Return` where half a row holds it. */
export const RETURN_WORDS = { long: "Return to dock", short: "Return" } as const;

/** The press in words short enough for half a key row: "Pause", "Start", "Resume", "Start again", "Return". */
export const pressKeyWord = (press: VacuumPress, e: Pick<VacuumEntity, "state">) =>
  press === "return" ? RETURN_WORDS.short : pressWord(press, e);

/** Sending it home, said aloud: "Send Robot vacuum back to its dock". */
export const returnSaid = (name: string) => `Send ${name} back to its dock`;

/** Locating it in words: it plays a sound to be found. */
export const LOCATE_WORD = "Locate";
export const locateSaid = (name: string) => `${LOCATE_WORD} ${name}: it plays a sound`;

/**
 * The press said aloud, as an orb's or a key's label: "Pause Robot vacuum", "Start Robot vacuum again" after an error,
 * "Send Robot vacuum back to its dock".
 */
export function pressSaid(press: VacuumPress, e: Pick<VacuumEntity, "name" | "state">): string {
  if (press === "return") return returnSaid(e.name);
  if (press === "start" && e.state === "error") return `Start ${e.name} again`;
  return `${pressWord(press, e)} ${e.name}`;
}

/** On its way home, where the state word says Returning: where it is going. */
export const TO_THE_DOCK = "To the dock";

/**
 * What a press does now, in a sentence, for its details: after an error, while it cleans, on its way home, or standing.
 */
export function pressHint(e: Pick<VacuumEntity, "state">): string {
  if (e.state === "error") return "It stopped part way: clear what went wrong, then start it again.";
  if (e.state === "cleaning") return "Pause stops it where it is.";
  if (e.state === "returning") return "On its way back to the dock.";
  return "Start sends it out to clean.";
}

/** Today's meter said aloud. */
export const VACUUM_TODAY_SAID = "Cleaning by hour today.";

/**
 * Its battery is low while it stands away from its dock and nothing is charging it (idle, paused, an `other` state).
 * Docked or charging, it never warns of its battery; cleaning or returning it heads home on its own, so it doesn't
 * either. An error outranks it.
 */
export const lowBattery = (e: Pick<VacuumEntity, "state" | "battery" | "charging">): boolean =>
  e.state !== "unavailable" && e.state !== "docked" && !isMoving(e) && !e.charging && isLowBattery(e.battery);

/**
 * Its warning as a row or a status line leads with it, 13 characters at most so it stays whole on a narrow row: "Error"
 * while in error, "Battery 9%" while low and not charging. Undefined while there is none.
 */
export function vacuumWarning(e: Pick<VacuumEntity, "state" | "battery" | "charging">): string | undefined {
  if (e.state === "error") return "Error";
  if (lowBattery(e)) return batteryText(e.battery!);
  return undefined;
}

/** Its warning with what went wrong, where there is room and the integration says: "Error · Brush jammed". */
export function vacuumWarningText(e: Pick<VacuumEntity, "state" | "battery" | "charging" | "error">): string | undefined {
  const word = vacuumWarning(e);
  return word && e.state === "error" && e.error ? `${word} · ${e.error}` : word;
}

/**
 * Its warning as a sentence without the name, for a skin that names the card before it (Orb's `Warning: <name>: …`):
 * "Stopped with an error: brush jammed", "Battery 9%, needs charging".
 */
export function vacuumWarningSaid(e: Pick<VacuumEntity, "state" | "battery" | "charging" | "error">): string | undefined {
  if (e.state === "error") return `Stopped with an error${e.error ? `: ${e.error.charAt(0).toLowerCase()}${e.error.slice(1)}` : ""}`;
  if (lowBattery(e)) return `${batteryText(e.battery!)}, ${VACUUM_BATTERY_ADVICE}`;
  return undefined;
}

/** What a vacuum's low battery asks for, after its level: it charges at its dock, so "needs charging", not replacing. */
export const VACUUM_BATTERY_ADVICE = "needs charging";

/** Its battery, for its details: "Battery 82%", "Battery 64%, charging", "Battery 9%, needs charging"; "" when it doesn't say. */
export function batteryFact(e: Pick<VacuumEntity, "state" | "battery" | "charging">): string {
  if (e.battery == null || e.state === "unavailable") return "";
  if (lowBattery(e)) return `${batteryText(e.battery)}, ${VACUUM_BATTERY_ADVICE}`;
  return `${batteryText(e.battery)}${e.charging ? ", charging" : ""}`;
}

/**
 * The integration's own status, where it says more than the state word: "Charging" beside Docked, "Cleaning the
 * kitchen" beside Cleaning. Nothing when it only repeats it.
 */
export function statusDetail(e: Pick<VacuumEntity, "state" | "stateText" | "status">): string | undefined {
  if (!e.status || e.state === "unavailable") return undefined;
  return e.status.trim().toLowerCase() === vacuumWord(e).toLowerCase() ? undefined : e.status.trim();
}
