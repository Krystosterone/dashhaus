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

## 2. Cards compose shared mechanism — parts and primitives across a skin's cards

**Contract:** AGENTS.md → Vocabulary, "**Part** — a skin's styled control in its `shared/` … A card is built from
parts and brings only what is its own", and → Layout, "What two skins share moves to `@dashhaus/core`".

- **Today:** a card is meant to be composition, but each skin re-implements mechanism per card. The lock made it
  visible: about 1,100 lines of production code where most should have been composition. A first pass over both skins
  (grep of the card folders, 2026-11-02) finds:

  | Mechanism | Where it is written now | Copies |
  | --- | --- | --- |
  | Code keypad, drawn on `useKeypad` | orb `cards/alarm/parts.tsx`, `cards/lock/parts.tsx`; field `AlarmModule.tsx`, `LockModule.tsx` | 4 |
  | Guarded action: pending action, busy and failed, `wrong_code` to the keypad, clearing when the entity gets there, the `useSettled` guard | orb `LockCard.tsx`, `AlarmCard.tsx` (part of it); field `LockModule.tsx`, `AlarmModule.tsx` (part of it) | 4 |
  | The question: Cancel (`data-autofocus`) and the action | orb `cards/lock/parts.tsx`; field `LockModule.tsx` | 2 |
  | A tile or module that opens its details on an action | orb `AlarmTile.tsx`, `LockTile.tsx`; field `AlarmModule.tsx`, `LockModule.tsx` | 4 |
  | Field key group (a row of keys under a legend, n to a row, two on a phone) | `fd-lt-levels`, `fd-lt-colours`, `fd-cv-keys`, `fd-hu-modes`, `fd-cl-mode-keys`, `fd-cl-text-keys`, `fd-al-bank`, `fd-lk-keys`, each with its own grid CSS | 8 |
  | Field temperature figure (`Digits` and its unit) | `SensorModule.tsx`, `WeatherModule.tsx`, `ClimateModule.tsx` | 3 |
  | Facts in small print ("Last seen …", "Last changed … by …") | 11 `hd-info` rows in orb, 11 `fd-info` in field; the words written by hand 36 times | 22 |
  | Orb slider wiring (`useSlider` into `Track`) | `cards/light/parts.tsx` (2), `cards/cover/parts.tsx`, `cards/sound/parts.tsx`, `cards/climate/RangeBar.tsx` | 5 |
  | Field demo seeds copied from orb's (skins can't import each other); `new-card --skin field` makes the copy | every field card's `demo/` | per card |
  | Facts and Today words stamped out by the generator templates (`Last seen …`, `Unavailable since …`, `Last changed …`) | `scripts/new-card/templates/` orb control and reading, field control and reading | one more per generated card |

  Orb's `ChoiceChips`, `Track`, `TogglePill`, `TodayStrip` and field's `Key`, `Fader`, `Screen`, `Today` show the
  intended shape: one part, many cards. The rows above are what hasn't reached it yet.
- **Gap:** every new card copies the nearest card that has what it needs, so each copy drifts on its own (a keypad
  fix lands in one card), and a new card costs far more than composition. Nothing checks for it: the conformance
  tests hold a card's files, classes and registrations, not whether it re-implements a part.
- **The generators feed it.** What they make is composition, but they know only two shapes, so everything else is
  built by hand by copying the nearest card:
  - **In-repo `new-card` (orb, field):** one control shape, a single toggle over `onToggle`, and a reading. The field
    generator refuses a domain without `onToggle` or an `"on"` state, and `describeDomain` (`scripts/domains.js`) a domain
    without a `<Name>History`. The lock, the alarm and the cover were hand-built from the nearest card, which is where
    the keypad, the guarded action and the key groups were copied. The templates also write the facts and Today words
    by hand, and the field generator copies orb's seeds.
  - **Generated skins (`create-dashhaus-skin`'s `add`, `new-card --skin <generated>`):** a card is about 35 lines on the
    skin's shared parts, the intended shape. But its only vocabulary is one button per action, and `domains.js` takes
    an action from its signature alone (a handler typed `() => …`). Nothing says an action asks first. The lock is left
    out by accident (no `LockHistory`, and `onUnlock` takes a code); a dangerous action that takes no arguments would
    become a one-tap button.
- **Proposal:** one pass per row, each its own change, each moving the mechanism to where it belongs and redrawing every
  card on it:
  - **Skin-free behaviour to `@dashhaus/core`:** a `useGuardedAction` primitive (the guarded-action row); the facts'
    words (last seen, last changed and by whom, since when) as pure formatters in `entities/`, beside `format.ts`; each
    domain's demo seeds in `@dashhaus/core/demo`, beside its transport, so no skin and no generator copies them.
  - **Drawing to each skin's `shared/` as parts,** each added to that skin's Foundations → Parts:
    - orb: `Keypad`, `Confirm`, `Facts`, and a slider part that wires `useSlider` into `Track` and leaves the card its fill;
    - field: `Keypad`, `Confirm`, `KeyGroup`, `Facts`, and the temperature figure.
  - **A details surface that opens on an action:** in `@dashhaus/dashboard/card`'s `useDetails` and `detailsTile`, so
    the alarm's and the lock's own tiles go.
  - **A check against regression:** in `verify/`, flag a component or a class block defined in two card folders of a
    skin, so the next copy fails where it is written.
  - **The generator templates** (`scripts/new-card/templates/`, the scaffolder's card template) draw on the new parts and
    formatters, so a new card starts from them and writes no facts or Today words of its own.
  - **The domain description knows what an action is.** Each domain declares its actions' kinds in `@dashhaus/core`,
    beside its handlers, rather than `scripts/domains.js` inferring them from signatures: plain (a tap does it), guarded
    (it asks first), and whether it takes a code. `domains.js`, `domains.json` and the field generator read the
    declaration:
    - a plain action stays a button, as today;
    - a guarded action is drawn through the skin's `Confirm` and `Keypad` parts on `useGuardedAction`, in the
      generated skin template as in orb and field;
    - a template that can't draw a kind leaves that action out, saying so, instead of making it one tap.
  - **The generators stop refusing what they could draw.** History is optional in a domain's description (a lock's day
    is its last change); the field generator draws a control from its declared actions, one key per plain action and a
    guarded one behind its panel, instead of requiring `onToggle` and an `"on"` state.
  - **Order:** the guarded-action rows first (keypad, guarded action, question, open on an action), before the next
    card with a deliberate action; then the action declaration and the generators, once those parts exist to draw
    on; then field's key group and facts, which touch the most cards; then the rest.
- **Gate:** per row, every affected card's interaction tests and stories pass unchanged in both skins (`npm run check`,
  `npm run test-storybook`), its stories look the same at every width and footprint, and the card folders lose the
  duplicated lines. The table is a grep, not a review: each row is confirmed against the cards before it moves, and a
  copy that differs on purpose (a card's own figure) stays in the card. For the generators:
  - `npm run new-card -- lock --skin field` and the scaffolder's `add lock` both make a lock whose unlock asks first;
  - a domain with a guarded action that takes no arguments never becomes a one-tap button;
  - `scripts/new-card/index.test.ts`, `verify/generator-packages.test.ts` and the dx author journey each cover a guarded
    action.
- **Validation status (2026-11-02):** not started. The lock shipped with the duplication rather than change the alarm
  and other cards inside a new card's scope.
