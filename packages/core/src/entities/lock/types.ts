/**
 * Home Assistant `lock` states the card shows. `open` and `opening` are Home Assistant's own (a lock that unlatches
 * the door, after `lock.open`); `unknown`, `unavailable` and a missing entity are all `unavailable`, never a
 * safe-looking locked.
 */
export type LockState = "locked" | "unlocked" | "locking" | "unlocking" | "jammed" | "open" | "opening" | "unavailable";

/** Mirrors the parts of one Home Assistant `lock.*` entity, and its device's battery, that the card needs. */
export interface LockEntity {
  entityId: string;
  name: string;
  /** Where it is: "Front door". */
  area?: string;
  state: LockState;
  /** It can unlatch the door too (`lock.open`, `LockEntityFeature.OPEN`). */
  supportsOpen: boolean;
  /**
   * Whether a code is asked for, and what kind. Home Assistant's lock `code_format` is a pattern: one that only
   * matches digits is "number" (a keypad), any other "text". Null or omitted: no code.
   */
  codeFormat?: "number" | "text" | null;
  /** Home Assistant's `code_format` pattern, so a code that can't fit is answered before it is sent. */
  codePattern?: string;
  /** HA `changed_by`: who or what last locked or unlocked it, where the integration says. */
  changedBy?: string;
  /** When it last changed state (HA `last_changed`), formatted. */
  lastChanged?: string;
  /** The same device's battery, 0–100, where it has one. */
  battery?: number;
  lastSeen?: string;
}

/** What a lock action is: the two that need a deliberate confirmation, and the one a tap does. */
export type LockAction = "lock" | "unlock" | "open";

/**
 * What a lock action answers. `done`: Home Assistant took it (the state change follows). `wrong_code`: the code was
 * refused, or can't fit the lock's pattern. `failed`: it didn't go through. A handler never rejects.
 */
export type LockOutcome = "done" | "wrong_code" | "failed";

/** A lock action's answer, now or later; nothing means `done`. */
export type LockResult = LockOutcome | void | Promise<LockOutcome | void>;
