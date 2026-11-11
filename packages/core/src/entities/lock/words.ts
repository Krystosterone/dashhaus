import { asksFirst, waitingFor } from "../guard";
import type { LockAction, LockEntity } from "./types";

/**
 * Each state in words, the same on every card and in every skin: the verb while it moves (Locking, Unlocking,
 * Opening), and Home Assistant's own word for an unlatched door, Open. Field's screen says `OPEN` for Unlocked and Open
 * alike, its meta line the word.
 */
export const LOCK_WORD: Record<LockEntity["state"], string> = {
  locked: "Locked",
  unlocked: "Unlocked",
  locking: "Locking",
  unlocking: "Unlocking",
  jammed: "Jammed",
  open: "Open",
  opening: "Opening",
  unavailable: "Unavailable",
};

/** What a jam means for the door, after its word: the bolt stopped part way. */
export const JAMMED_MEANING = "May not be locked";

/** The question a lock asks before it unlocks or unlatches the door: "Unlock Front door?", "Open Front door?". */
export const lockQuestion = (action: LockAction, name: string) => `${action === "lock" ? "Lock" : action === "unlock" ? "Unlock" : "Open"} ${name}?`;

/** What answering yes means, under the question. */
export const lockAskDetail = (action: LockAction, name: string) =>
  (action === "open" ? `${name} unlatches, and the door can be pushed open.` : action === "unlock" ? "Anyone at the door can open it." : "It locks now.");

/** The yes, as its button says it: "Unlock", "Open door". */
export const lockAskAction = (action: LockAction) => (action === "lock" ? "Lock" : action === "unlock" ? "Unlock" : "Open door");

/**
 * What a keypad's code is for, after the skin's own frame ("Enter the code to", "Code to"): "unlock", "lock",
 * "open the door".
 */
export const lockCodeFor = (action: LockAction) => (action === "open" ? "open the door" : action);

/** What the details say while the yes is on its way. A skin adds its end punctuation. */
export const LOCK_WAITING = waitingFor("lock");

/**
 * The details' line while no question stands, for what asks first here: unlocking a locked lock, opening a door that
 * can be unlatched (spec/cards.md → What every card says).
 */
export const lockAsksHint = (unlock: boolean, open: boolean) => asksFirst([unlock && "Unlocking", open && "opening the door"]);
