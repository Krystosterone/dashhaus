import { MODE_LABEL } from "./modes";
import type { AlarmAction, AlarmEntity } from "./types";

/** A list in words: "Back door", "Back door and Kitchen window", "Hall, Back door and Kitchen window". */
export const listOf = (xs: readonly string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** What is open, as a sentence: "Back door is open.", "Back door and Kitchen window are open." */
export const openSentence = (open: readonly string[]) => `${listOf(open)} ${open.length > 1 ? "are" : "is"} open.`;

/**
 * The alarm's warning, the same on every card and in every skin, where its state has one (`alarmSeverity`): its
 * `word` first, 13 characters at most (`WARNING_WORD_MAX`) so a row keeps it whole (Triggered, Entry delay, Open,
 * 2 open), then its `detail`, the sensor's name or names, which may clip; `said` is the whole sentence for a screen
 * reader. Undefined while there is none, or while unavailable.
 */
export function alarmWarning(e: Pick<AlarmEntity, "state" | "triggeredBy" | "openSensors">): { word: string; detail?: string; said: string } | undefined {
  const by = e.triggeredBy;
  if (e.state === "triggered") return { word: "Triggered", detail: by, said: `Triggered${by ? ` by ${by}` : ""}` };
  if (e.state === "pending") return { word: "Entry delay", detail: by, said: `Entry delay${by ? `, ${by} opened` : ""}` };
  const open = e.openSensors ?? [];
  if (e.state === "disarmed" && open.length) {
    return { word: open.length > 1 ? `${open.length} open` : "Open", detail: open.join(", "), said: openSentence(open).slice(0, -1) };
  }
  return undefined;
}

/** A warning on one line, its word first so a clipped line keeps it: "Triggered · Back door", "2 open · Back door, Hall". */
export const warningLine = (w: { word: string; detail?: string }) => (w.detail ? `${w.word} · ${w.detail}` : w.word);

/**
 * What a keypad's code is for, after the skin's own frame ("Enter the code to", "Code to"): "disarm", "cancel
 * arming" while it is arming, "arm away".
 */
export const alarmCodeFor = (action: AlarmAction, e: Pick<AlarmEntity, "state">) =>
  (action.kind === "disarm" ? (e.state === "arming" ? "cancel arming" : "disarm") : `arm ${MODE_LABEL[action.mode].toLowerCase()}`);
