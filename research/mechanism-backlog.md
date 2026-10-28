# Mechanism backlog

Component-level changes that would let the shared card system enforce the
codified contracts instead of per-card discipline. Each item names its
contract, today's mechanism, the gap, the proposal, and the gate that must
pass before implementation. Append here as further research points get
codified; strike items when implemented.

## 1. Attention channel — urgency input to damping

**Contract:** attention-budget contract items 1–2; README "Glow follows urgency, not position".

- **Today:** `layout.css` damps later glowing cards to 0.5 by sibling position only (`--glow-damp`). Cards have no input.
- **Gap:** urgency cannot influence damping — the retune the research recommends has no mechanism to stand on.
- **Proposal:** cards declare an attention level (e.g. `data-attention="routine | urgent"` on the `hd` article, surfaced through `paint()` or a dedicated prop); `layout.css` damps by level instead of raw position; urgent states keep their marker (item 2) and outrank routine glow.
- **Gate:** the research's scan-task comparison (missed-urgent rate, target-finding time) before changing default damping values.
- **Validation status (2026-10-18):** blocked on participant scan metrics; no urgency-aware damping implementation or value change is authorized.

## ~~2. Card-level warn state~~ — satisfied

**Contract:** attention-budget contract items 4–5; README "Alerts first…" warn marker.

- **Outcome (2026-10-18):** urgent cards declare `data-alert="warn"` and render one shared `AlertStatus` in the existing status channel. The primitive couples warn-colour text with an accessible outlined-exclamation cue; Cover, Sensor, Home, and Alarm use it, while only a triggered alarm keeps the exceptional warn fill.
- **Gate result (2026-10-18):** UX and UI review rejected a new row or grid column because it would duplicate identity and reduce title space. Storybook checks at 360 px and 280 px confirmed one visible cue, fixed row height, no horizontal overflow, warning-first narrow copy, and a distinct accessible warning label for every migrated state.

## ~~3. Compact-row identity slots~~ — satisfied

**Contract:** research note 03, dense list identity — codified in README + `row-identity` skill.

- **Outcome (2026-10-18):** satisfied without new grid slots. The existing orb/title/control grid remains: compact climate orbs use a thermostat while mode moves to the control/value channel; open access covers keep area/class in the secondary line and declare `data-alert="warn"` with the shared non-colour cue. Narrow state lines are accessible; normalized compact height is 60 px.
- **Gate result (2026-10-18):** Visual QA at 358 px and 278 px row widths, repeated in grayscale:
  - **Fail — Air conditioner:** the snowflake communicates cooling mode, not the required stable thermostat domain icon.
  - **Fail — Heat pump:** the heat/cool arrows communicate mode, not the required stable thermostat domain icon.
  - **Fail — Garage door:** the area/class line is replaced by `Open since 10:20`, duplicates the `Open` control state, and truncates at 358 px.
  - **Pass:** Curtains, Ceiling, Reading lamp, Porch light, and Shelf strip. At 278 px, all eight rows retain a readable primary name and value/state cue without colour.

## Satisfied — do not re-add

- Density subtraction (compact never glows or takes the colour slot): enforced by `.hd--compact` in `card.css`.
- One colour slot per tile (orb only): enforced by `--o-c` / `--o-h` + `data-color` scoping.
- Non-colour-cue review: attention-budget skill Verify, a review step rather than a component mechanism.
- Colour restraint (research note 04): no component gap. Palette and slot are already enforced; accent no-recycling, subtraction-first, and contrast remain review rules. The maximum-density comparison is blocked on a defined muted fixture and participant timing data.
