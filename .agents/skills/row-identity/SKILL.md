---
name: row-identity
description: Give dense same-shaped compact controls their own identity — domain icon, primary and secondary text, and one explicit state/action cue, with colour as reinforcement only. Use when building or editing a card's compact footprint, reviewing the Controls column, or when rows look indistinguishable at a glance.
---

# Row Identity

A column of compact cards all in one shape is unreadable when the shell carries meaning that each row's content should. This skill is the contract for per-row identity.

The spec wording is `spec/orb.md` → Orb design rules → "Compact cards carry their own identity"; this skill is its operational form. The contract is the doc plus this skill — there is no separate research note.

## The Contract

1. **The shell is shared; the content is not.** One geometry for every row — orb with the domain icon, text grid, control slot in the same positions. Never invent a new outer shape per domain.
2. **Every row has a domain icon.** The orb carries it, at consistent size, stroke weight and perspective. The icon names the domain: thermostat, window/curtain, bulb.
3. **Every row has primary + secondary text.** Primary: the short identity (room/control name). Secondary: the area line — the room for lights and covers, the current temperature and action for climate. Both concise. Under a titled bundle's lid, which names the room once for every part, a part in that room shows its own detail there instead (since when, warmth or colour, volume): the line stays, the repetition goes.
4. **One explicit state/action cue per row.** A switch state, compact state word, active mark, or meaningful badge — never a decorative badge that repeats the row's colour.
5. **An urgent warning may take the cue.** Where the row's cue is its value (no control, or a reading's figures), an urgent warning stands in its place behind the solid warn marker, as well as leading the area line; a control stays, and an advisory warning leaves the value alone (`spec/orb.md` → One palette, Warn orange; `CardFrame` draws it from the card's `level`).
6. **Colour reinforces, never defines.** A row must stay distinguishable with colour removed: icon, text and cue carry identity and state.

## Per-domain content

| Domain | Icon | Primary | Secondary | State/action cue |
| --- | --- | --- | --- | --- |
| Climate | thermostat | room/control name | current temperature + action ("21.5° · Heating") | mode + setpoint in the stepper or range slot |
| Cover | window/curtain | room/cover name | room or cover class | position/travel in the slot; open / closed / travelling |
| Light | bulb | room/light name | room | on/off + brightness in the bar slot |

Group or order rows by domain (Climate, Covers, Lights) without changing row height.

## Rules

- Badges exist for meaningful conditions only: unavailable, active, travelling, alert. A badge that restates the row's colour is decoration — remove it.
- Row height, alignment and action placement stay stable across all rows (the 60 px `hd--compact` grid in `card.css`).
- The compact card's orb is both control and domain icon; the text carries the identity too. There is no separate icon slot.
- No source requires a unique outer shape per row or a numeric row-count threshold — do not invent one.
- These are established list patterns, not proof that a row failed: the Controls story at real widths is what decides, and the visual QA gate records which rows fail before a pass. No WCAG colour-only conformance claim is made here.

## Verify

- `npm run typecheck`.
- Storybook: affected card at the compact footprint at every width, including under 320 px; Orb → Foundations → Compact rows, control on and off.
- Visual QA gate: on the Controls story at real compact widths, every row must show a distinct icon, concise primary/secondary text, and a visible state/action cue with colour ignored. Record which rows fail before any implementation pass.
