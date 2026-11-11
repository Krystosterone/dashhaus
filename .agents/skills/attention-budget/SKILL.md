---
name: attention-budget
description: Decide how much attention each card on a dashboard may claim — who glows, who is subordinate, and how urgent states are marked. Use when building or editing a card's glow/colour treatment, composing or reviewing a dashboard, or changing the damping rules in layout.css / card.css.
---

# Attention Budget

One dashboard screen, one attention budget. A glanceable dashboard fails when everything glows: if all states look the same, none is seen. This skill is the contract for spending that budget.

The spec wording is `spec/orb.md` → Dashboards → "Composing for a glance"; this skill is its operational form, and the glow hard rule in `AGENTS.md` points here. The contract is the doc plus this skill — there is no separate research note.

## The Contract

1. **One primary claim per screen.** The hero card owns the full glow. In a one-column section the first glowing card is the primary attention claim — not merely the first card rendered.
2. **Glow follows semantic urgency, not position.** Later active cards are subordinate by default, but how subordinate is an urgency decision, not a fixed ratio. In a one-column grid, a one-track Lovelace row or a wall's column (each a one-track stack), `layout.css` sets `--glow-damp` as two factors multiplied: position (`--glow-later`, a later glowing cell at `--glow-damp-later`, 0.5) and urgency (`--glow-yield`, every glow in a container that holds an urgent or alarm card anywhere at `--glow-damp-under-alert`, 1). Both are local heuristics, not a law and not an Apple standard; urgency's 1 is a no-op until the scan-task comparison sets it.
3. **Compact stays quiet.** Compact cards never glow and never bloom; their on-state is the solid accent, the same fill as every other on. `.hd--compact` in `card.css` enforces it; do not re-add density subtraction as a card-by-card rule.
4. **Urgent and problem states get a marker, not more brightness.** Low battery, a door left open, an alarm: a distinct warn treatment. Never make every active state brighter to express importance.
5. **Never glow alone.** Every important state has a non-colour cue: text, icon, position, or meaningful state motion. Colour and glow are never the only channel.

## Decision Table

| State | Treatment |
| --- | --- |
| Hero, one column | Full glow (`--hd-glow`, set by `paint()` in `src/skins/orb/shared/ui.tsx`), undamped |
| Later active card, routine | Damped glow (`--glow-later`, 0.5, in `layout.css`) |
| Any glowing card in a container with an urgent or alarm card | `--glow-yield` (`--glow-damp-under-alert`, 1 today: no change until the scan-task comparison) |
| Card with a level (advisory, urgent, alarm), anywhere | Warn marker (status line first, warn colour), or the alarm's fill — never a glow; `data-level` on its article |
| Urgent against advisory | By shape, never a second ink: the advisory marker outlined, the urgent marker solid; in a compact row whose cue is its value, the urgent warning takes that cue |
| Compact card, any state | No glow, no bloom; the solid accent for on |
| Important state change | Non-colour cue required: text, icon, position, or state motion |

## Rules

- `paint(role, glow)` (`src/skins/orb/shared/ui.tsx`) is the only way a card asks for glow, and it is colour only. A card's level comes through `CardFrame`'s `level`: core's `Severity`, ranked once in `packages/core/src/entities/<name>/severity.ts`, written on the article as `data-level` (the attribute Field's module writes). A card never ranks its own. A selector reads `data-level` by its value (`[data-level="urgent"]`, `[data-level="alarm"]`), never by its presence, since Orb writes advisory too (`styles/rules.test.ts`). `--glow-damp` and its factors are set by the dashboard (`layout.css`), never by a card.
- A card with a level never glows: it paints 0. `CardFrame` does not strip a glow to make that so; `src/skins/orb/cards/alerts.test.tsx` fails any seed whose article has both `data-glow` and `data-level`.
- Urgent and alarm outrank; advisory never does. It is the same set that reaches Field's alert line (`spec/field.md` → Severity), so the two skins agree on what is pressing.
- The damping values (100% / 50% / 0%, and urgency's 1) are a product heuristic. Change them only after a scan-task comparison shows missed urgent states or slower target finding; never justify them by citing Apple numbers. That comparison has not been run, so the current values stand. When it runs: household members who didn't set the dashboard up, within subjects, on a phone and a wall panel, on Orb → Foundations → Attention's layouts (the hero above and below the problem), the urgency factor at 1 against 0.5; measure time to find the urgent card, misses, and false alarms on advisory, and run the same task on Field. It also decides whether urgency should reach the whole `.dash` rather than its container.
- Only a glow that shows leads: a compact glowing card (its glow hidden) never claims the first place, and an open sheet is a modal outside the page's budget, never damped by where its tile sits (`.hd--sheet` is left out of both factors).
- No source fixes a maximum for simultaneous glow, colour or motion signals; one primary claim is the repo's rule, not an external ceiling.
- Apple's `relevanceScore`, "up to three" Live Activities, and the 2-second animation cap are ordering and presentation precedents — not opacity, glow, or percentage formulas. Do not cite them as such.
- Warn treatments use tokens from `src/skins/orb/styles/tokens.css`, never colour literals.
- An important state change must read with colour removed: text, icon, position, or state motion must carry it.

## Verify

- `npm run typecheck`; `src/skins/orb/styles/rules.test.ts` pins `layout.css`'s selectors and values.
- `npm run test-storybook`: its glow census (`.storybook/glow-census.ts`) reads every glowing card's evaluated `--glow-damp` on stories with a one-column grid or a one-track row and holds it to the budget. jsdom can't evaluate the `:has` cascade, so a green unit run alone proves nothing about damping. Change `GLOW_BUDGET` there with `layout.css`.
- Storybook: affected card's story at every width and footprint, Orb → Foundations → Attention (every case, and its greyscale twin), Orb → Dashboards → Lovelace card → One-track row (the Lovelace row), and Orb → Foundations → Worst case.
- Dashboard stories: exactly one card reads as the primary claim per screen, urgent states read urgent, and no state is communicated by glow alone. Skim the screen with colour ignored — does every state still read?
