---
name: attention-budget
description: Decide how much attention each widget and dashboard card may claim — who glows, who is subordinate, and how urgent states are marked. Use when building or editing a widget's glow/colour treatment, composing or reviewing a dashboard, or changing the damping rules in layout.css / card.css. Codifies research/02-attention-budget.md.
---

# Attention Budget

One dashboard screen, one attention budget. A glanceable dashboard fails when everything glows: if all states look the same, none is seen. This skill is the contract for spending that budget.

Evidence and provenance for the contract live in `research/02-attention-budget.md` (2026-10-18, parent-verified Apple HIG and NN/G sources). Read it before changing the contract. The spec wording is README → Dashboards → "Composing for a glance".

## The Contract

1. **One primary claim per screen.** The hero card owns the full glow. In a one-column section the first glowing card is the primary attention claim — not merely the first card rendered.
2. **Glow follows semantic urgency, not position.** Later active cards are subordinate by default, but how subordinate is an urgency decision, not a fixed ratio. `layout.css` damps later glowing cards to 0.5 via `--glow-damp`; that is a local heuristic, not a law and not an Apple standard.
3. **Compact stays quiet.** Compact cards never glow and never bloom; their on-state is the solid accent, never the colour slot.
4. **Urgent and problem states get a marker, not more brightness.** Low battery, a door left open, an alarm: a distinct warn treatment. Never make every active state brighter to express importance.
5. **Never glow alone.** Every important state has a non-colour cue: text, icon, position, or meaningful state motion. Colour and glow are never the only channel.

## Decision Table

| State | Treatment |
| --- | --- |
| Hero, one column | Full glow (`--hd-glow`, set by `paint()` in `src/shared/ui.tsx`), undamped |
| Later active card, routine | Damped glow (0.5 via `--glow-damp` in `layout.css`) |
| Later active card, urgent or problem | Warn marker (status line first, warn colour) — not a brighter glow |
| Compact card, any state | No glow, no bloom; the solid accent for on |
| Important state change | Non-colour cue required: text, icon, position, or state motion |

## Rules

- `paint(role, glow, own, prop)` is the only way a widget asks for glow. `--glow-damp` is set by the dashboard (`layout.css`), never by a widget.
- The damping values (100% / 50% / 0%) are a product heuristic. Change them only after a scan-task comparison shows missed urgent states or slower target finding; never justify them by citing Apple numbers.
- Apple's `relevanceScore`, "up to three" Live Activities, and the 2-second animation cap are ordering and presentation precedents — not opacity, glow, or percentage formulas. Do not cite them as such.
- Warn treatments use tokens from `src/styles/tokens.css`, never colour literals.
- An important state change must read with colour removed: text, icon, position, or state motion must carry it.

## Verify

- `npm run typecheck`.
- Storybook: affected widget's story at every width and footprint, and Foundations → Demo / Worst case.
- Dashboard stories: exactly one card reads as the primary claim per screen, urgent states read urgent, and no state is communicated by glow alone. Skim the screen with colour ignored — does every state still read?
