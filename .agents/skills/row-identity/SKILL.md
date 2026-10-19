---
name: row-identity
description: Give dense same-shaped control rows their own identity — domain icon, primary and secondary text, and one explicit state/action cue, with colour as reinforcement only. Use when building or editing a widget's thin density, reviewing the Controls column, or when rows look indistinguishable at a glance. Codifies RESEARCH-3-dense-list-identity.md.
---

# Row Identity

Eight thin rows of the same shape in one column fail when they look the same: if the shell carries all the meaning, no row is scannable. This skill is the contract for per-row identity.

Evidence: `RESEARCH-3-dense-list-identity.md` (Apple HIG Lists/Icons, Material 3 Lists, Mushroom Template/Climate cards). The spec wording is README → Design rules every widget follows.

## The Contract

1. **The shell is shared; the content is not.** One geometry for every row — icon slot, text grid, state/action slot in the same positions. Never invent a new outer shape per domain.
2. **Every row has a domain icon.** One fixed icon slot, consistent size, stroke weight and perspective. The icon names the domain: thermostat, window/curtain, bulb.
3. **Every row has primary + secondary text.** Primary: the short identity (room/control name). Secondary: meaningful state or value. Both concise.
4. **One explicit state/action cue per row.** A switch state, compact state word, active mark, or meaningful badge — never a decorative badge that repeats the row's colour.
5. **Colour reinforces, never defines.** A row must stay distinguishable with colour removed: icon, text and cue carry identity and state.

## Per-domain content

| Domain | Icon | Primary | Secondary | State/action cue |
| --- | --- | --- | --- | --- |
| Climate | thermostat | room/control name | mode + setpoint | active heating/cooling mark or mode control |
| Cover | window/curtain | room/cover name | position or travel state | open / closed / travelling |
| Light | bulb | room/light name | on/off + brightness | switch on-off state |

Group or order rows by domain (Climate, Covers, Lights) without changing row height.

## Rules

- Badges exist for meaningful conditions only: unavailable, active, travelling, alert. A badge that restates the row's colour is decoration — remove it.
- Row height, alignment and action placement stay stable across all rows (the `hd--thin` grid in `card.css`).
- The thin row's orb is the control, not the identity icon; identity comes from the icon slot and the text.
- No source requires a unique outer shape per row or a numeric row-count threshold — do not invent one.

## Verify

- `npm run typecheck`.
- Storybook: affected widget at thin density at every width, including under 320 px; Foundations → Thin rows, control on and off.
- Visual QA gate: on the Controls story at real thin widths, every row must show a distinct icon, concise primary/secondary text, and a visible state/action cue with colour ignored. Record which rows fail before any implementation pass.
