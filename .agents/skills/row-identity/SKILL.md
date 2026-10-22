---
name: row-identity
description: Give dense same-shaped compact controls their own identity — domain icon, primary and secondary text, and one explicit state/action cue, with colour as reinforcement only. Use when building or editing a widget's compact footprint, reviewing the Controls column, or when rows look indistinguishable at a glance. Codifies research/03-dense-list-identity.md.
---

# Row Identity

A column of compact cards all in one shape is unreadable when the shell carries meaning that each row's content should. This skill is the contract for per-row identity.

Evidence: `research/03-dense-list-identity.md` (Apple HIG Lists/Icons, Material 3 Lists, Mushroom Template/Climate cards). The spec wording is README → Design rules every widget follows.

## The Contract

1. **The shell is shared; the content is not.** One geometry for every row — orb with the domain icon, text grid, control slot in the same positions. Never invent a new outer shape per domain.
2. **Every row has a domain icon.** The orb carries it, at consistent size, stroke weight and perspective. The icon names the domain: thermostat, window/curtain, bulb.
3. **Every row has primary + secondary text.** Primary: the short identity (room/control name). Secondary: the area line — the room for lights and covers, the current temperature and action for climate. Both concise.
4. **One explicit state/action cue per row.** A switch state, compact state word, active mark, or meaningful badge — never a decorative badge that repeats the row's colour.
5. **Colour reinforces, never defines.** A row must stay distinguishable with colour removed: icon, text and cue carry identity and state.

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

## Verify

- `npm run typecheck`.
- Storybook: affected widget at the compact footprint at every width, including under 320 px; Foundations → Compact rows, control on and off.
- Visual QA gate: on the Controls story at real compact widths, every row must show a distinct icon, concise primary/secondary text, and a visible state/action cue with colour ignored. Record which rows fail before any implementation pass.
