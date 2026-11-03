/**
 * What a domain's actions are, declared beside its handlers, so a card drawing a domain it has never seen (a
 * generated skin's, field's generated module) knows how to draw each one instead of guessing from its signature.
 *
 * - `takes`: what a press gives the handler. `nothing`: a tap does it. `code`: a code where the entity asks for one,
 *   typed on a keypad. `value`: something a press can't give (a level, a mode, a colour), drawn with the card's own
 *   control or left out.
 * - `asks`: it asks first, a question or the code, before it runs: never one tap (a lock's unlock, a door's open).
 *   An action that takes a code but doesn't ask (an alarm's disarm, a lock's lock) runs at once unless the entity
 *   wants a code, and asks for it then.
 *
 * Handlers answer how they answer (`void`, a lock's outcome, an alarm's `false` for a wrong code); `useGuardedAction`
 * reads them all.
 */
export interface ActionKind {
  takes: "nothing" | "code" | "value";
  asks?: true;
}

/** One kind for every handler a domain has, optional ones included, so a new handler can't go undeclared. */
export type ActionKinds<H> = { readonly [K in keyof Required<H>]: ActionKind };
