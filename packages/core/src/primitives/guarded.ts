import { useEffect, useRef, useState } from "react";

/**
 * What a guarded action answers. `done`: it was taken (the state change follows). `wrong_code`: the code was refused,
 * or the entity turned out to want one. `failed`: it didn't go through.
 */
export type GuardedOutcome = "done" | "wrong_code" | "failed";

/**
 * A guarded action's answer, now or later; nothing (or `true`) means `done`, `false` a wrong code (an alarm's
 * handlers answer that way), and a throw is `failed`.
 */
export type GuardedResult = GuardedOutcome | boolean | void | Promise<GuardedOutcome | boolean | void>;

export interface GuardedActionOptions<A> {
  /** Run the action, with the code where one was typed. */
  run: (action: A, code?: string) => GuardedResult;
  /** Whether this action is confirmed by typing a code (a keypad) rather than by answering a question. */
  needsCode: (action: A) => boolean;
  /**
   * Whether the entity already got where this action was going, or can no longer take it (it went unavailable): the
   * question no longer stands, and it closes. Done elsewhere (another panel, the door itself) counts.
   */
  settled?: (action: A) => boolean;
  /** Ask for this action from the start: a details surface that opened on it. Changing it asks afresh. */
  initial?: A | null;
  /** View only: nothing is ever asked or run. */
  disabled?: boolean;
  /**
   * Where an action is asked when it isn't asked here: a card on the dashboard opens its details on it. Given, `ask`
   * hands the action over instead of holding it; omitted, `ask` holds it here (the details surface itself).
   */
  askElsewhere?: (action: A) => void;
}

/** An action as a key: strings as they are, anything else as JSON, so `{ kind: "arm", mode: "away" }` compares by value. */
export const actionKey = (action: unknown): string => (typeof action === "string" ? action : JSON.stringify(action));

/** The answer as an outcome, whatever the handler returned; a throw is a call that didn't go through. */
export async function guardedOutcome(result: GuardedResult | (() => GuardedResult)): Promise<GuardedOutcome> {
  try {
    const answer = await (typeof result === "function" ? result() : result);
    return answer === false ? "wrong_code" : answer == null || answer === true ? "done" : answer;
  } catch {
    return "failed";
  }
}

/**
 * A guarded action's behaviour, for any skin to draw: an action that asks first (a lock's unlock, an alarm's disarm)
 * and is confirmed by a question or by a code. It holds the action waiting on its answer, whether that answer is a
 * code (the keypad) or a yes (the question), and whether it is on its way or failed. A refused code moves the question
 * to the keypad; the question closes when the entity gets there by itself.
 *
 * - `ask(action)`: show the question for it, here or, with `askElsewhere`, where it is asked.
 * - `attempt(action)`: what a tap does for an action that needs no question: run it at once unless it takes a code,
 *   and ask for the code when the entity turns out to want one.
 * - `confirm()`: the question's yes. `submit(code)`: the keypad's enter, shaped for `useKeypad`'s `onSubmit`.
 * - `close()`: cancel, or done.
 *
 * The skin draws the question and the keypad; the press guard (`useSettled`) belongs to the question's part, since it
 * starts when the part appears.
 */
export function useGuardedAction<A>({ run, needsCode, settled, initial = null, disabled = false, askElsewhere }: GuardedActionOptions<A>) {
  const [pending, setPending] = useState<A | null>(disabled ? null : initial);
  // The entity turned out to want a code for an action thought to need none.
  const [askCode, setAskCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const initialKey = initial == null ? null : actionKey(initial);
  useEffect(() => {
    setPending(disabled ? null : initial);
    setAskCode(false);
    setFailed(false);
    // `initial` is compared by value: a new object for the same action asks nothing new.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey, disabled]);

  const done = pending != null && settled ? settled(pending) : false;
  useEffect(() => { if (done) { setPending(null); setAskCode(false); setFailed(false); } }, [done]);

  const close = () => { setPending(null); setAskCode(false); setFailed(false); };
  const hold = (action: A, code: boolean) => {
    setFailed(false);
    setAskCode(code);
    if (askElsewhere) askElsewhere(action);
    else setPending(action);
  };
  const ask = (action: A) => { if (!disabled) hold(action, false); };
  const attempt = async (action: A): Promise<GuardedOutcome | undefined> => {
    if (disabled) return undefined;
    if (needsCode(action)) { hold(action, false); return undefined; }
    const result = await guardedOutcome(() => run(action));
    if (result === "wrong_code" && alive.current) hold(action, true);
    return result;
  };
  const confirm = async () => {
    if (pending == null || busy) return;
    setBusy(true);
    setFailed(false);
    const result = await guardedOutcome(() => run(pending));
    if (!alive.current) return;
    setBusy(false);
    if (result === "done") close();
    else if (result === "wrong_code") setAskCode(true);
    else setFailed(true);
  };
  const submit = async (code: string): Promise<boolean> => {
    if (pending == null) return false;
    const result = await guardedOutcome(() => run(pending, code));
    if (result === "failed") throw new Error("not sent");
    if (result === "done" && alive.current) close();
    return result === "done";
  };

  return {
    /** The action waiting on its answer, if any. */
    pending: disabled || done ? null : pending,
    /** A key for the pending action, for remounting its question or keypad when it changes. */
    pendingKey: pending == null ? undefined : actionKey(pending),
    /** Whether the pending action is answered with a code. */
    code: pending != null && (askCode || needsCode(pending)),
    busy,
    failed,
    ask,
    attempt,
    confirm,
    submit,
    close,
  };
}
