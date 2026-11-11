/**
 * What a domain's actions are, declared beside its handlers, so a card drawing a domain it has never seen (a
 * generated skin's, field's generated module) knows how to draw each one instead of guessing from its signature.
 *
 * - `takes`: what a press gives the handler. `nothing`: a tap does it. `code`: a code where the entity asks for one,
 *   typed on a keypad. A value, said as what it is, so a card can draw it on its own parts:
 *   - `level`: a level the entity reports in `field`, slid along a groove or a fader: a percent, 0-100, unless `min` and
 *     `max` say its range (a number, or the entity field that holds it). `wakes`: setting it turns the entity on (a
 *     light's brightness, a fan's speed). `runs`: the level moves on by itself while the entity plays, as of a time the
 *     entity reports (a position in a track); a part that holds a level still would show where it was, so a generator
 *     leaves it out, and a skin draws it on its own running clock.
 *   - `choice`: one of a list, the chosen one in `field`: the entity's own list (`options`, the field that holds it: a
 *     fan's presets) or a fixed one (a fan's directions).
 *   - `switch`: on or off, the entity's boolean `field` (a fan's oscillation).
 *   - `value`: something none of these says (a colour, a mode and its code), drawn with the card's own control or left
 *     out.
 * - `asks`: it asks first, a question or the code, before it runs: never one tap (a lock's unlock, a door's open).
 *   An action that takes a code but doesn't ask (an alarm's disarm, a lock's lock) runs at once unless the entity
 *   wants a code, and asks for it then. A level that asks is still slid or set, then asked: a tap asks at once, a drag
 *   when it is let go, and Cancel puts it back where the entity is (the domain's question, else `levelQuestion`).
 * - `either`: a press given only while the entity's state is assumed or unknown (`eitherWay`): its turn-on and turn-off,
 *   sent whatever it shows. A skin draws the pair in its details; a generator leaves it out, since the card's own
 *   press already switches it.
 * - `when`: `asks` only for an entity whose field holds one of these values, keyed by the field (a cover's open and
 *   close, `{ deviceClass: ["garage", "door", "gate"] }`); for any other entity it doesn't ask. Several fields must
 *   all match. A reader that ignores `when` asks every time, which fails safe.
 *
 * Handlers answer how they answer (`void`, a lock's outcome, an alarm's `false` for a wrong code); `useGuardedAction`
 * reads them all.
 */
export type ActionKind<F extends string = string> =
  | { takes: "nothing" | "code" | "value"; asks?: true; when?: AsksWhen<F>; either?: true }
  | { takes: "level"; field: F; min?: number | F; max?: number | F; wakes?: true; runs?: true; asks?: true; when?: AsksWhen<F> }
  | { takes: "choice"; field: F; options: F | readonly string[] }
  | { takes: "switch"; field: F };

/** Which entities an action asks first for (`ActionKind`'s `when`): each field, and the values it asks for. */
export type AsksWhen<F extends string = string> = Partial<Record<F, readonly string[]>>;

/**
 * One kind for every handler a domain has, optional ones included, so a new handler can't go undeclared. With the
 * entity, a value's `field` must be one of the entity's.
 */
export type ActionKinds<H, E = unknown> = { readonly [K in keyof Required<H>]: ActionKind<unknown extends E ? string : keyof E & string> };
