# Dense list identity

**Status:** complete · 2026-10-18 · **Codified:** README → "Design rules every widget follows", `row-identity` skill, AGENTS.md hard rule (commit `9849aa4`).

**Decision:** Keep the common thin-row geometry, but fix the per-row identity content. Do not rely on role-tone colour as the only distinction between climate, cover, and light rows.

## Evidence

- **Apple HIG lists.** "Keep item text succinct so row content is comfortable to read"; a row leads with "a small image in the leading end of a row, followed by a brief explanatory label." [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- **Apple HIG icons.** Icons use "familiar visual metaphors that are directly related to the actions they initiate or content they represent", with consistent size, detail, stroke weight and perspective. [Icons](https://developer.apple.com/design/human-interface-guidelines/icons)
- **Apple HIG labels.** "Within many lists, a label can describe each item, often accompanied by a symbol or an image." [Labels](https://developer.apple.com/design/human-interface-guidelines/components/layout-and-organization/labels)
- **Material 3 lists.** "A clear visual hierarchy makes lists easy to scan and read"; "Place supporting visuals and primary text in the same position in each list item"; use switches when toggling an item. [List guidelines](https://m3.material.io/components/lists/guidelines)
- **Mushroom Template Card** exposes independent channels: `icon`, `color`, `primary`, `secondary`, `badge_icon`, `badge_text`, `badge_color`, plus card- and icon-level tap/hold actions. The Climate Card keeps a shared state-item shell with domain-specific identity (formatted state, HVAC-mode icon, action badge, temperature and mode control). [Template Card](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/docs/cards/template.md), [Climate Card source](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/src/cards/climate-card/climate-card.ts)

## Design contract

1. **Stable semantic identity.** One fixed icon slot, one fixed text grid. Climate: thermostat icon, room/control name, mode + setpoint. Covers: window icon, name, position or travel. Lights: bulb, name, on/off + brightness.
2. **State and action separate from colour.** A switch state, compact state word, active mark, or meaningful badge; no decorative badges that repeat the row's colour.
3. **Shared geometry, domain-aware affordances.** Stable icon, text, state and action slots; group by domain (Climate, Covers, Lights) without changing row height or inventing a new pill shape per domain.

## Implementation boundary

1. A stable domain/state icon on every Controls row, consistent size, stroke weight and alignment.
2. A short primary identity and a secondary state/value string per row.
3. One explicit state/action cue per control type; badges reserved for meaningful conditions (unavailable, active, travelling, alert).
4. Stable row height, alignment and action placement; rows grouped or ordered by domain.

## Limits

- No source requires every row to have a unique outer shape.
- No source gives a numeric threshold for when eight same-shaped rows become too dense.
- No WCAG or colour-only conformance conclusion was made.
- Only the Mushroom Climate implementation was inspected; exact Cover and Light rendering was not.
- The sources establish available patterns, not that users fail with the current rows.

## Validation result

Run 2026-10-18 on Phone → Controls at 358 px and 278 px, including grayscale. Air conditioner and Heat pump initially failed because their orb showed mode instead of the stable thermostat domain; Garage door failed because `Open since 10:20` replaced area identity, duplicated the control, and truncated. Curtains and all four lights passed.

After correction, climate keeps the thermostat in the orb and moves mode into the control/value channel; Garage keeps area/class and adds the shared accessible warning cue. All Controls rows remain 56 px with readable non-colour state cues. Foundations → Thin rows at 280 px exposes all 28 visible narrow status lines to assistive technology.

## Sources

- [Apple Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- [Apple Icons](https://developer.apple.com/design/human-interface-guidelines/icons)
- [Apple Labels](https://developer.apple.com/design/human-interface-guidelines/components/layout-and-organization/labels)
- [Material 3 List guidelines](https://m3.material.io/components/lists/guidelines), [List overview](https://m3.material.io/components/lists/overview)
- [Mushroom README](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/README.md)
- [Mushroom Template Card](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/docs/cards/template.md)
- [Mushroom Climate Card source](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/src/cards/climate-card/climate-card.ts)

**Provenance:** 8 URLs parent-verified; reviewer: concerns, corrected.
