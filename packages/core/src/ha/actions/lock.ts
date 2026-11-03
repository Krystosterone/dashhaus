import { codeFits } from "../../entities/lock/code";
import type { LockEntity, LockOutcome } from "../../entities/lock/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";

export interface LockHandlers {
  /** `lock.lock`. A tap does this: locking is the safe direction. */
  onLock: (code?: string) => Promise<LockOutcome>;
  /** `lock.unlock`. Only after a deliberate confirmation, with the code where the lock asks for one. */
  onUnlock: (code?: string) => Promise<LockOutcome>;
  /** `lock.open` (unlatch the door), only where the lock supports it. Same confirmation as unlock. */
  onOpen: (code?: string) => Promise<LockOutcome>;
}

export interface LockHandlerOptions {
  onError?: (error: HaActionError) => void;
}

/**
 * Home Assistant's answers that mean "that code is wrong" rather than "didn't go through": a code that doesn't match
 * the lock's `code_format` (core's `add_default_code` validation) or an integration's own `invalid_code`. Only the
 * sanitized translation key is read; a bare validation error is not wrong-code evidence.
 */
const WRONG_CODE = new Set(["add_default_code", "invalid_code"]);

/**
 * Create the lock's handlers for the LockTile contract. Each builds one native `lock.*` service call and answers
 * `done`, `wrong_code` or `failed`; none throws or rejects. What the lock can't do is reported as unsupported and
 * answered `failed` without a call: anything while it is unavailable, and opening a lock without `supportsOpen`. A
 * code that can't fit the lock's pattern is `wrong_code`, unsent. A missing code is sent without one, so a lock with
 * a default code in Home Assistant still works.
 */
export function createLockHandlers(caller: Pick<HaStore, "callService">, entity: LockEntity, options: LockHandlerOptions = {}): LockHandlers {
  const { attempt, report, actionable, unsupported } = serviceRunner(caller, "lock", entity, options.onError);
  const act = async (service: "lock" | "unlock" | "open", code?: string): Promise<LockOutcome> => {
    if (!actionable()) return "failed";
    if (code && !codeFits(entity.codePattern, code)) return "wrong_code";
    const error = await attempt(service, code ? { code } : {});
    if (!error) return "done";
    if (error.translationKey && WRONG_CODE.has(error.translationKey)) return "wrong_code";
    report(error);
    return "failed";
  };
  return {
    onLock: (code) => act("lock", code),
    onUnlock: (code) => act("unlock", code),
    onOpen: (code) => {
      if (entity.state !== "unavailable" && !entity.supportsOpen) {
        unsupported(`${entity.entityId} does not support open`);
        return Promise.resolve("failed");
      }
      return act("open", code);
    },
  };
}
