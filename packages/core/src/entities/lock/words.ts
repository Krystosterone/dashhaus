import type { LockEntity } from "./types";

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
