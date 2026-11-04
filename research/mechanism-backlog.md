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

## 2. Cards compose shared mechanism — what is still copied

**Contract:** AGENTS.md → Vocabulary, "**Part** — a skin's styled control in its `shared/` … A card is built from
parts and brings only what is its own", and → Layout, "What two skins share moves to `@dashhaus/core`".

- **Done (2026-11-03), and owned elsewhere now:** the guarded action (`useGuardedAction`, spec/core.md → Interaction
  primitives), each skin's `Confirm` and `Keypad`, details that open on an action (`ActionCardProps`, `useDetails`,
  `detailsTile`; spec/contract.md), the facts' words (`entities/facts.ts`, `unavailableSince` among them) and each
  skin's `Facts`, field's `KeyGroup`, `Temperature`, `ModuleRow`, `PanelBody` and `Notices`, orb's `SliderTrack` (the
  slider wiring under light's, sound's, cover's and fan's fills) and `LevelBar` (the level groove of light, sound and
  fan, each card keeping its words), field's `Channel` (the panel screen's second channel), every domain's demo seeds in
  `@dashhaus/core/seeds/<name>` (spec/core.md → Testing and demo helpers; not `./demo`, which cards may not import),
  the declared action kinds (`<NAME>_ACTIONS`: a tap, a code or a value, and whether it asks first; spec/core.md) and
  the generators that read them (spec/build-a-skin.md: a guarded action through `Confirm` and `Keypad`, never one tap;
  history optional; field's control from its declared actions), and the check against the next copy
  (`verify/card-copies.test.ts`, which knows no copy), and today's summary in words (`todaySummary`,
  `entities/today.ts`; spec/core.md), and the demo transports' plumbing (`createDemoTransport`, spec/core.md → Testing
  and demo helpers: a domain's transport is its seed and its service table), and a frame per skin, which the templates
  draw on too: orb's `CardFrame` (its head, slot and facts from props, the card's body in `SheetBlock` and `Today`;
  AGENTS.md → Adding a card) and field's `ModuleFrame`, which draws the panel too (its screen with the `aside` channel,
  the module's `controls` again, the card's blocks and its `facts`). The lock, the alarm and the fan are drawn on all
  of it.
- **Today:** what a grep of the card folders (2026-11-03) still finds, each a mechanism two or more cards write:

  | Mechanism | Where it is written now | Copies |
  | --- | --- | --- |
  | Orb's climate range: `useRangeSlider` into `Track` | `cards/climate/RangeBar.tsx` | 1 (a part only once a second card has a range) |

- **Gap:** `verify/card-copies.test.ts` catches a copied component or rule, not a copied shape of markup; the frames
  hold the anatomy and the module/panel split now, so the shape a new card would copy is the frame's props.
- **The generators** draw on the parts, the facts and the declared action kinds now, but:
  - **Two descriptions of one domain.** The field generator reads `useHa<Name>`'s options and handlers with regular
    expressions (`scripts/new-card/field.js`), while the scaffolder and `new-card --skin <generated>` read
    `domains.json`, written by `scripts/domains.js`; `filler` is copied word for word in `scripts/new-card/lib.js` and
    `packages/create-dashhaus-skin/src/card.js`.
  - **A value is left out.** The declaration says `takes: "value"` for a level or a choice, and the templates leave it
    out, saying so: a regenerated fan has its key and no groove or presets.
- **Proposal:** one pass per row, each its own change:
  - one generator path: orb's and field's `new-card` draw through the scaffolder's `src/card.js` and `domains.json`,
    with one `filler`, on the frames, parts and formatters;
  - the declaration grows a level (a percent or a range, the fan's `onPercentageChange`) and a list (a preset, a mode, a
    direction), drawn on the level part (`LevelBar`, `Fader`) and on chips or `KeyGroup`.
- **Gate:** per row, every affected card's interaction tests and stories pass unchanged in both skins (`npm run check`,
  `npm run test-storybook`), its stories and both skins' Foundations → Parts and Worst case look the same at every width
  and footprint in both themes and finishes, and the card folders lose the duplicated lines. For the generators,
  regenerated in a copy of the repository, `fan` draws its groove, sheet and panel from the parts, with only its words
  and icon written by hand.
- **Validation status (2026-11-03):** the guarded action, the facts, the key groups, the temperature figure, the slider
  wiring, the field row, panel body and notices, the seeds, the action kinds and today's summary are done; the rows
  above are open.
