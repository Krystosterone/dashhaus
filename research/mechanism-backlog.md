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
  visible: about 1,100 lines of production code where most should have been composition. The fan, built beside it,
  shows the same for an ordinary control: about 400 lines of drawing where its ranking note expected composition,
  `FanCard` repeating some 60 lines of `LightCard`, and a speed groove, preset chips and key groups copied from
  light, climate and humidifier. A pass over both skins with both cards in (grep of the card folders, 2026-11-03)
  finds:

  | Mechanism | Where it is written now | Copies |
  | --- | --- | --- |
  | Code keypad, drawn on `useKeypad` | orb `cards/alarm/parts.tsx`, `cards/lock/parts.tsx`; field `AlarmModule.tsx`, `LockModule.tsx` | 4 |
  | Guarded action: pending action, busy and failed, `wrong_code` to the keypad, clearing when the entity gets there, the `useSettled` guard | orb `LockCard.tsx`, `AlarmCard.tsx` (part of it); field `LockModule.tsx`, `AlarmModule.tsx` (part of it) | 4 |
  | The question: Cancel (`data-autofocus`) and the action | orb `cards/lock/parts.tsx`; field `LockModule.tsx` | 2 |
  | A tile or module that opens its details on an action | orb `AlarmTile.tsx`, `LockTile.tsx`; field `AlarmModule.tsx`, `LockModule.tsx` | 4 |
  | Field key group (a row of keys under a legend, n to a row, two on a phone) | `fd-lt-levels`, `fd-lt-colours`, `fd-cv-keys`, `fd-hu-modes`, `fd-cl-mode-keys`, `fd-cl-text-keys`, `fd-al-keys`, `fd-al-bank`, `fd-lk-keys`, `fd-fn-keys`, each with its own grid CSS | 10 |
  | Field temperature figure (`Digits` and its unit) | `SensorModule.tsx`, `WeatherModule.tsx`, `ClimateModule.tsx` | 3 |
  | Facts and today's summary in small print ("Last seen …", "Last changed … by …"; "On 2h 36m", "Not on today", "Unavailable since …") | 12 `hd-info` rows in orb, 12 `fd-info` in field, the facts' words written by hand 35 times; today's summary composed in 12 card files | 24 |
  | Orb slider wiring (`useSlider` into `Track`) | `cards/light/parts.tsx` (2), `cards/cover/parts.tsx`, `cards/sound/parts.tsx`, `cards/fan/parts.tsx`, `cards/climate/RangeBar.tsx`; light's brightness, sound's volume and fan's speed are one level groove, the end cap, lit fill, label and off-state words the same | 6 |
  | Orb card anatomy: the `hd-head` (orb or bare icon, `CardTitle` with its status line and compact value, the readout, `SheetClose`), the slot switch (bare value, `UnavailableSlot`, the control), the `TodayStrip` and the facts | every `<Name>Card.tsx` | 12 |
  | Field module/panel frame: the controls drawn once in the module and again in the panel (`controls(where)`), then a `<Name>Details` body of `Screen`, controls, blocks, `Today` and facts | `LightModule`'s split, copied into climate, cover, humidifier, fan and lock; a `<Name>Details` in every module | 6 / 12 |
  | Field screen channel (the panel screen's second channel, `fd-chan` markup) | 9 modules | 9 |
  | Field demo seeds copied from orb's (skins can't import each other); `new-card --skin field` makes the copy | every field card's `demo/` | per card |
  | Demo transport plumbing (copy the seed, subscribe, publish, route a service) | every `packages/core/src/demo/<domain>.ts` and the mixed `demo.ts` | 9 |
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
    the keypad, the guarded action and the key groups were copied, and the fan's speed groove, presets and direction
    were drawn by hand from light, climate and humidifier for the same reason. The templates also write the whole
    anatomy out (orb's control template is a 69-line card, field's a 56-line module) with its facts and Today words,
    and the field generator copies orb's seeds.
  - **Generated skins (`create-dashhaus-skin`'s `add`, `new-card --skin <generated>`):** a card is about 35 lines on the
    skin's shared parts, the intended shape. But its only vocabulary is one button per action, and `domains.js` takes
    an action from its signature alone (a handler typed `() => …`). Nothing says an action asks first. The lock is left
    out by accident (no `LockHistory`, and `onUnlock` takes a code); a dangerous action that takes no arguments would
    become a one-tap button.
  - **Two descriptions of one domain.** The field generator reads `useHa<Name>`'s options and handlers with regular
    expressions (`scripts/new-card/field.js`), while the scaffolder and `new-card --skin <generated>` read
    `domains.json`, written by `scripts/domains.js`; `filler` is copied word for word in `scripts/new-card/lib.js` and
    `packages/create-dashhaus-skin/src/card.js`. What one learns about a domain (an option, an action's kind) the other
    has to learn again.
- **Proposal:** one pass per row, each its own change, each moving the mechanism to where it belongs and redrawing every
  card on it:
  - **Skin-free behaviour to `@dashhaus/core`:** a `useGuardedAction` primitive (the guarded-action row); the facts'
    words (last seen, last changed and by whom, since when) and today's summary as pure formatters in `entities/`,
    beside `format.ts`; each domain's demo seeds in `@dashhaus/core/demo`, beside its transport, so no skin and no
    generator copies them, and one transport helper that takes a seed and a service table, so a domain's demo
    transport is its services alone.
  - **Drawing to each skin's `shared/` as parts,** each added to that skin's Foundations → Parts:
    - orb: `Keypad`, `Confirm`, `Facts`, a `LevelBar` for the one level groove (light, sound, fan), and the slider
      wiring under it and under cover's and climate's own fills, which leave the card only its fill;
    - field: `Keypad`, `Confirm`, `KeyGroup`, `Facts`, `Channel` for the screen's second channel, and the temperature
      figure.
  - **A frame for the anatomy every card retypes,** once its parts exist: orb's card frame (icon, status line, readout,
    slot, sheet blocks, Today, facts from props, a reading's bare icon and `Readout` its other mode); field's
    module/panel frame (one `controls` renderer drawn in the module and the panel, and the panel body of `Screen`,
    controls, blocks, `Today` and facts). A card then supplies its own figure, words and the controls no other card has.
  - **A details surface that opens on an action:** in `@dashhaus/dashboard/card`'s `useDetails` and `detailsTile`, so
    the alarm's and the lock's own tiles go.
  - **A check against regression:** in `verify/`, flag a component or a class block defined in two card folders of a
    skin, so the next copy fails where it is written.
  - **One generator path, on the parts.** Orb's and field's `new-card` draw through the scaffolder's `src/card.js` and
    the one domain description, as a generated skin does, with one `filler`; field's regular-expression reading goes.
    The templates (`scripts/new-card/templates/`, the scaffolder's card template) are written on the frames, parts and
    formatters, after the scaffolder's 35-line card, so a new card starts from them and writes no anatomy, facts or
    Today words of its own.
  - **The domain description knows what an action is.** Each domain declares its actions' kinds in `@dashhaus/core`,
    beside its handlers, rather than `scripts/domains.js` inferring them from signatures: plain (a tap does it), guarded
    (it asks first), whether it takes a code, and what it sets — a level (a percent or a range, such as the fan's
    `onPercentageChange`) or one of a list (a preset, a mode, a direction). `domains.js`, `domains.json` and the field
    generator read the declaration:
    - a plain action stays a button, as today;
    - a level is drawn on the skin's level part (`LevelBar`, `Fader`) and a list on its chips or `KeyGroup`, so a
      generated fan has its groove and its presets, and only its words and icon are left to write;
    - a guarded action is drawn through the skin's `Confirm` and `Keypad` parts on `useGuardedAction`, in the
      generated skin template as in orb and field;
    - a template that can't draw a kind leaves that action out, saying so, instead of making it one tap.
  - **The generators stop refusing what they could draw.** History is optional in a domain's description (a lock's day
    is its last change); the field generator draws a control from its declared actions, one key per plain action and a
    guarded one behind its panel, instead of requiring `onToggle` and an `"on"` state.
  - **Order:** the guarded-action rows first (keypad, guarded action, question, open on an action), before the next
    card with a deliberate action; then the action declaration and the generators, once those parts exist to draw
    on; then field's key group and facts, which touch the most cards; then the rest, the frames last, once the parts
    they frame exist, their shape settled on the simple controls (toggle, sound, humidifier, fan) before the readings
    (sensor, weather, owlet) and then light, cover, climate, alarm and lock, whose headers and sheets carry the most.
- **Gate:** per row, every affected card's interaction tests and stories pass unchanged in both skins (`npm run check`,
  `npm run test-storybook`), its stories and both skins' Foundations → Parts and Worst case look the same at every width
  and footprint in both themes and finishes, and the card folders lose the duplicated lines. The table is a grep, not a review: each row is confirmed against the cards before it moves, and a
  copy that differs on purpose (a card's own figure) stays in the card. For the generators:
  - `npm run new-card -- lock --skin field` and the scaffolder's `add lock` both make a lock whose unlock asks first;
  - a domain with a guarded action that takes no arguments never becomes a one-tap button;
  - `scripts/new-card/index.test.ts`, `verify/generator-packages.test.ts` and the dx author journey each cover a guarded
    action;
  - regenerated in a copy of the repository, `fan` draws its groove, sheet and panel from the parts, with only its words
    and icon written by hand.
- **Validation status (2026-11-03):** not started. The lock and the fan each shipped with the duplication rather than
  change the alarm, the light and the other cards inside a new card's scope.
