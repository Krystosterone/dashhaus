# Dense list identity research

**Status:** Complete
**Research date:** 2026-10-18
**Decision:** Keep the common thin-row geometry, but fix the per-row identity content. Do not rely on role-tone color as the only distinction between climate, cover, and light rows.

## Bottom line

The eight rows can share one shell. The shell should not be asked to carry all of the meaning. Each row needs a stable semantic icon, concise primary identity, meaningful secondary state/value text, and an explicit state or action cue. Role-tone color can reinforce the state, but it should not be the only way to tell rows or states apart.

The prompt describes the current on-state as reduced to role tone. On that description, accepting the Controls column as-is is the wrong decision. The source evidence supports a bounded identity pass, not a visual-system rewrite or a different outer shape for every domain.

## Scope

- **Target:** the Controls section's eight thin climate, cover, and light rows.
- **Question:** how Apple HIG lists and Home Assistant Mushroom practice keep dense, same-shaped controls distinguishable at a glance.
- **Examined:** icon language, labels and typography, state/action feedback, color as a supporting channel, stable alignment, and grouping/domain structure.
- **Not examined:** implementation, visual QA, live usability testing, WCAG conformance, or exact Cover/Light source rendering.

## Evidence

### Apple HIG

Apple's list guidance says:

> “Keep item text succinct so row content is comfortable to read.”

It also describes a row with:

> “a small image in the leading end of a row, followed by a brief explanatory label.”

Apple's icon guidance says icons should use:

> “familiar visual metaphors that are directly related to the actions they initiate or content they represent.”

It also requires consistent icon size, detail, stroke weight, and perspective, and recommends matching icon and adjacent-text weights. The Labels guidance says:

> “Within many lists, a label can describe each item, often accompanied by a symbol or an image.”

Sources:

- [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- [Icons](https://developer.apple.com/design/human-interface-guidelines/icons)
- [Labels](https://developer.apple.com/design/human-interface-guidelines/components/layout-and-organization/labels)

### Material Design 3

Material's list guidance says:

> “A clear visual hierarchy makes lists easy to scan and read”

and:

> “Place supporting visuals and primary text in the same position in each list item.”

It also says not to vary element positions within a list, to keep labels brief, and to use switches when toggling an item on or off. This supports a predictable row grid with explicit state/action semantics rather than identity through layout drift.

Sources:

- [List guidelines](https://m3.material.io/components/lists/guidelines)
- [List overview](https://m3.material.io/components/lists/overview)

### Home Assistant Mushroom

Mushroom's maintained README separates cards by entity/domain, including Climate, Cover, Light, and Template cards. Its Template Card documentation exposes independent channels for:

- `icon`
- `color`
- `primary` — main label
- `secondary` — subtitle or status
- `badge_icon`, `badge_text`, and `badge_color`
- card features and their placement
- card-level and icon-level tap/hold actions

Its example combines a light-bulb icon, friendly-name primary text, area secondary text, state-dependent color, icon toggle, and card more-info action.

The Climate Card source keeps a shared state-item shell while adding domain-specific identity and affordances: formatted state plus temperature/humidity, a state icon, HVAC-mode-derived icon/shape color, an HVAC-action badge, temperature control, and HVAC-mode control.

Sources:

- [Mushroom README](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/README.md)
- [Mushroom Template Card](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/docs/cards/template.md)
- [Mushroom Climate Card source](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/src/cards/climate-card/climate-card.ts)

## Patterns to apply

### 1. Stable semantic identity

Keep one fixed icon slot and one fixed text grid. Use domain-specific semantic cues:

- Climate: thermostat or thermometer icon, room/control name, mode and setpoint
- Covers: window or curtain icon, room/cover name, position or travel state
- Lights: bulb icon, room/light name, on/off and brightness

The icon and text should carry identity. Color reinforces state; it does not define the row.

### 2. Separate state and action from color

Give each row a visible state/action cue appropriate to its entity:

- Climate: current mode, setpoint, active heating/cooling, or a domain control
- Covers: open/closed/travelling and position
- Lights: on/off and brightness

Use a switch/toggle state, compact state word, active mark, or meaningful badge. Avoid decorative badges that merely repeat the row's color.

### 3. Shared geometry with domain-aware affordances

Keep icon, text, state, and action slots in stable positions. Group or order the rows by domain—Climate, Covers, Lights—without changing row height or inventing a different pill shape for each type.

Mushroom's model is the useful precedent: shared card/state-item geometry with domain-specific content and controls inside it.

## Recommended implementation boundary

If implementation is authorized later, make one bounded identity pass:

1. Add a stable domain/state icon to every Controls row; keep icon size, stroke weight, and slot alignment consistent.
2. Give every row a short primary identity and a secondary state/value string.
3. Add one explicit state/action cue per control type; reserve badges for meaningful conditions such as unavailable, active, travelling, or alert.
4. Keep row height, alignment, and action placement stable; group or order rows by domain.

This recommendation is an inference from the cited design guidance and maintained source behavior. It is not a measured usability result or a direct Apple/Mushroom verdict about this dashboard.

## Limits and open questions

- No source requires every row to have a unique outer shape.
- No source supplies a numeric threshold for when eight same-shaped rows become too dense.
- No WCAG or color-only conformance conclusion was made.
- Only the Mushroom Climate implementation was inspected; exact current Cover and Light rendering remains open.
- The sources establish available patterns and channels, not that users will definitely fail with the current rows.

## Provenance and verification

- Apple primary stream: 0 discovery calls, 3 page reads; complete/delivered packet.
- Mushroom primary stream: 0 discovery calls, 6 page reads; complete/delivered packet. Incomplete initial raw extraction was corrected by direct HTTPS raw reads within the declared budget.
- Independent Material stream: 0 discovery calls, 2 page reads; complete/delivered packet.
- Parent verification: all 8 cited URLs re-read and recorded in the parent-owned citation ledger; two raw-source pages used the bounded fetch fallback with HTTP 200, UTF-8, and `decode_errors=false`.
- Fresh evidence review: **concerns**, corrected before final verification. The unsupported Material color-example sentence was removed, and a synthesized evidence claim was relabeled as an inference.
- Final evidence state: **verified with limits**.
- No widget code, Storybook story, Home Assistant configuration, or runtime behavior was changed by this research.

## Next action

Run one visual QA pass on the existing Controls story at its actual thin-row widths. Check only whether each row has a distinct icon, concise primary/secondary text, and a visible state/action cue without relying on color; stop after that pass and record which rows fail.
