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
  the declared action kinds (`<NAME>_ACTIONS`: a tap, a code, a level, a choice, a switch or another value, and whether
  it asks first; spec/core.md) and the generators that read them (spec/build-a-skin.md: a guarded action through
  `Confirm` and `Keypad`, never one tap; history optional; field's control from its declared actions; a level on
  `LevelBar` or `Fader`, a choice or a switch on `ChoiceChips` or a `KeyGroup`), and the check against the next copy
  (`verify/card-copies.test.ts`, which knows no copy), and today's summary in words (`todaySummary`,
  `entities/today.ts`; spec/core.md), and the demo transports' plumbing (`createDemoTransport`, spec/core.md → Testing
  and demo helpers: a domain's transport is its seed and its service table), and a frame per skin, which the templates
  draw on too: orb's `CardFrame` (its head, slot and facts from props, the card's body in `SheetBlock` and `Today`;
  AGENTS.md → Adding a card) and field's `ModuleFrame`, which draws the panel too (its screen with the `aside` channel,
  the module's `controls` again, the card's blocks and its `facts`), and one generator path: orb's, field's and a
  generated skin's `new-card` read a domain from `describeDomain` (`scripts/domains.js`, which writes the scaffolder's
  `domains.json`) and fill with the scaffolder's one `filler`; orb draws a domain core already has from it
  (`new-card <name> --code <xx>`), its guarded actions as pills answered in the sheet on `Confirm` or `Keypad`, and
  `scripts/new-card/regenerate.test.ts` draws the fan again in both skins and the lock again in orb. A brand-new
  domain still starts from orb's on/off or reading templates, its core files with it. The lock, the alarm and the fan are
  drawn on all of it.
- **Today:** what a grep of the card folders (2026-11-03) still finds, each a mechanism two or more cards write:

  | Mechanism | Where it is written now | Copies |
  | --- | --- | --- |
  | Orb's climate range: `useRangeSlider` into `Track` | `cards/climate/RangeBar.tsx` | 1 (a part only once a second card has a range) |

- **Gap:** `verify/card-copies.test.ts` catches a copied component or rule, not a copied shape of markup; the frames
  hold the anatomy and the module/panel split now, so the shape a new card would copy is the frame's props.
- **Gate:** per row, every affected card's interaction tests and stories pass unchanged in both skins (`npm run check`,
  `npm run test-storybook`), its stories and both skins' Foundations → Parts and Worst case look the same at every width
  and footprint in both themes and finishes, and the card folders lose the duplicated lines. For the generators,
  regenerated in a copy of the repository, `fan` draws its groove, sheet and panel from the parts, with only its words
  and icon written by hand.
- **Validation status (2026-11-03):** every row above is done, its gate met (parts, demo transports, a frame per skin, one
  generator path, the declaration's levels and lists); the climate range stays a single copy until a second card has a
  range.
