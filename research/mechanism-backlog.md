# Mechanism backlog

Component-level gaps the implemented contracts still imply. Each item names its contract, today's mechanism, the gap,
the proposal, and the gate that must pass before implementation. An implemented item is folded into the doc, skill or
code that owns it and deleted here; satisfied constraints are recorded where they are enforced, not as a do-not-re-add
list.

## 1. Attention channel — urgency input to damping

**Contract:** the `attention-budget` skill items 1–2 and `spec/orb.md` → Dashboards → "Composing for a glance" (glow
follows urgency, not position).

- **Today:** `src/skins/orb/dashboards/layout.css` damps later glowing cards to 0.5 by sibling position only
  (`--glow-damp`). Cards have no input.
- **Gap:** urgency cannot influence damping — the retune the skill asks for has no mechanism to stand on.
- **Proposal:** cards declare an attention level (e.g. `data-attention="routine | urgent"` on the `hd` article,
  surfaced through `paint()` or a dedicated prop); `layout.css` damps by level instead of raw position; urgent states
  keep their marker and outrank routine glow.
- **Gate:** the scan-task comparison (missed-urgent rate, target-finding time) before changing default damping values.
- **Validation status (2026-10-18):** blocked on participant scan metrics; no urgency-aware damping implementation or
  value change is authorized.

## 2. Guarded actions — the confirmation and the code keypad as shared mechanism

**Contract:** AGENTS.md → Layout, "Skins never import each other. What two skins share moves to `@dashhaus/core`",
and → Vocabulary, "A card is built from parts and brings only what is its own"; `spec/cards.md` → Using the lock card
(a tap never unlocks: the sheet asks, or takes the code) and → Using the alarm card (whatever needs the code opens the
keypad).

- **Today:** the lock landed with about 1,100 lines of production code where most of a card should be composition.
  Two pieces are written per card and per skin instead of once:
  - **The code keypad.** `useKeypad` (`packages/core/src/primitives/keypad.ts`) is shared, but the keypad drawn on it
    is private to each card: orb's in `cards/alarm/parts.tsx` and `cards/lock/parts.tsx` (`al-kp-*`, `lk-kp-*`), field's
    inside `AlarmModule.tsx` and `LockModule.tsx` (`fd-al-pad`, `fd-lk-pad`). Four copies of one part, about 120 lines
    of TSX and CSS added by the lock alone.
  - **The confirmation flow.** The pending action, busy and failed, a `wrong_code` answer that moves to the keypad, the
    question clearing when the entity reaches the asked state elsewhere, and the `useSettled` double-tap guard live in
    both `LockCard.tsx` and `LockModule.tsx`, about 40–50 lines each. None of it is drawing. Each skin also draws its
    own question (`Confirm` in orb's `cards/lock/parts.tsx` and field's `LockModule.tsx`) outside `shared/`.
- **Gap:** the next guarded control repeats all of it. `binary_sensor` won't, but any card with a deliberate action
  will (an alarm's mode change, a garage door, `vacuum`'s return, a future scene or script confirmation), and a third
  skin would copy it again.
- **Proposal:**
  - A primitive in `packages/core/src/primitives/`, say `useGuardedAction`: given the handlers (answering `done`,
    `wrong_code` or `failed`, as `createLockHandlers` does), whether the entity asks for a code, and when an asked
    action counts as done, it owns the pending action, busy and failed, the move to the keypad, clearing, and the
    settle guard on its confirm. Unit tests beside it, as for the other primitives.
  - A **Keypad** part in each skin's `shared/` (orb's from `cards/alarm/parts.tsx`, field's from `AlarmModule.tsx`), and
    the alarm and the lock both drawing it. Its classes move from `al-`/`lk-` and `fd-al-`/`fd-lk-` to `hd-kp-*` and
    `fd-kp-*`.
  - A **Confirm** part in each skin's `shared/`: the question, what it means, Cancel (`data-autofocus`) and the action.
  - Both parts join each skin's Foundations → Parts story. The lock's own files then keep only what is the lock's: its
    words, glyph, screen and states.
- **Gate:** the alarm's and the lock's interaction tests and stories pass unchanged in both skins (`npm run check`,
  `npm run test-storybook`); the alarm keypad and the lock keypad look and behave as today at every width; the lock's
  orb and field production code shrinks by the duplicated lines (about 250 expected). It changes the alarm card, so it
  is its own change, not part of a new card's.
- **Validation status (2026-11-02):** not started; the lock shipped with the duplication rather than change the alarm
  inside a new card's scope.

