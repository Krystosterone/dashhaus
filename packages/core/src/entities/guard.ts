/**
 * What a guarded action says, the same on every card and in every skin (spec/cards.md → What every card says): an
 * action that asks first (a lock's unlock, a garage door's close) or takes a code, answered on a skin's question or
 * keypad (`useGuardedAction`, `useKeypad`). A domain adds what is its own (`coverQuestion`, `lockAsksHint`); these are
 * the words every guard shares.
 *
 * Each is said without its end punctuation, which is the skin's, by one rule its spec writes: Orb ends an in-progress
 * word in `…` and a sentence in `.` ("Waiting for the lock…", "Didn’t go through. Try again."); Field prints both bare
 * ("Waiting for the lock", "Didn’t go through. Try again"). A hint line is a whole sentence, so it carries its own.
 */

/** The yes is on its way, with nothing to name. */
export const WAITING = "Waiting";

/** The yes is on its way, naming what answers: "Waiting for the lock". */
export const waitingFor = (thing: string) => `Waiting for the ${thing}`;

/** The last try didn't reach Home Assistant, or it refused: said in the detail's place, behind the warn marker. */
export const ACTION_FAILED = "Didn’t go through. Try again";

/** A keypad's code was refused. */
export const WRONG_CODE = "Wrong code. Try again";

/** A keypad's code is on its way. */
export const CHECKING_CODE = "Checking";

/**
 * A keypad's code is for what an action's words say, where the domain has no word of its own (a generated card):
 * `codeFor("Open door")` is "open door". A domain with a word of its own says it there (`lockCodeFor`, `alarmCodeFor`).
 */
export const codeFor = (label: string) => label.toLowerCase();

/** What a question says it means when its card has nothing more to say: a generated card's, until its words are written. */
export const ASKS_DETAIL = "It asks first, so a stray press never does it.";

/**
 * The details' line for a card whose actions ask first, said while no question stands, so the rule can be learnt
 * there: "Unlocking asks first.", "Opening and closing ask first." Nothing to say for none.
 */
export function asksFirst(actions: readonly (string | false | null | undefined)[]): string | undefined {
  const said = actions.filter((a): a is string => !!a).map((a) => a.toLowerCase());
  if (!said.length) return undefined;
  const list = said.length === 1 ? said[0] : `${said.slice(0, -1).join(", ")} and ${said.at(-1)}`;
  return `${list[0].toUpperCase()}${list.slice(1)} ${said.length === 1 ? "asks" : "ask"} first.`;
}
