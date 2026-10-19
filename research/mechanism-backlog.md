# Mechanism backlog

Component-level changes that would let the shared card system enforce the
codified contracts instead of per-widget discipline. Each item names its
contract, today's mechanism, the gap, the proposal, and the gate that must
pass before implementation. Append here as further research points get
codified; strike items when implemented.

## 1. Attention channel — urgency input to damping

**Contract:** attention-budget contract items 1–2; README "Glow follows urgency, not position".

- **Today:** `layout.css` damps later glowing cards to 0.5 by sibling position only (`--glow-damp`). Widgets have no input.
- **Gap:** urgency cannot influence damping — the retune the research recommends has no mechanism to stand on.
- **Proposal:** widgets declare an attention level (e.g. `data-attention="routine | urgent"` on the `hd` article, surfaced through `paint()` or a dedicated prop); `layout.css` damps by level instead of raw position; urgent states keep their marker (item 2) and outrank routine glow.
- **Gate:** the research's scan-task comparison (missed-urgent rate, target-finding time) before changing default damping values.

## 2. Card-level warn state

**Contract:** attention-budget contract items 4–5; README "Alerts first…" warn marker.

- **Today:** `.hd-warn` colours text; each widget decides what and when to mark. No uniform urgent marker.
- **Gap:** urgent treatment is ad-hoc per widget; "warn marker, not more glow" can't be enforced centrally, and markers drift across widgets.
- **Proposal:** promote warn to a card state — `data-alert="warn"` on `.hd` plus one shared status-line slot styled by the card system (warn-colour text + a non-colour cue). Widgets declare; the system renders.
- **Gate:** design review. The status slot must not change card height (hard rule).

## ~~3. Thin-row identity slots~~ — satisfied

**Contract:** research note 03, dense list identity — codified in README + `row-identity` skill.

- **Outcome (2026-10-18):** satisfied without new grid slots. The existing orb/title/control grid remains: thin climate orbs use a thermostat while mode moves to the control/value channel; open access covers keep area/class in the secondary line and declare `data-alert="warn"` with the shared non-colour cue. Narrow state lines are accessible; row height remains 56 px.
- **Gate result (2026-10-18):** Visual QA at 358 px and 278 px row widths, repeated in grayscale:
  - **Fail — Air conditioner:** the snowflake communicates cooling mode, not the required stable thermostat domain icon.
  - **Fail — Heat pump:** the heat/cool arrows communicate mode, not the required stable thermostat domain icon.
  - **Fail — Garage door:** the area/class line is replaced by `Open since 10:20`, duplicates the `Open` control state, and truncates at 358 px.
  - **Pass:** Curtains, Ceiling, Reading lamp, Porch light, and Shelf strip. At 278 px, all eight rows retain a readable primary name and value/state cue without colour.

## 4. Conditional dashboard sections

**Contract:** research note 01, composition — the conditional alert row is our inference, "keep it testable".

- **Today:** the phone dashboard hardcodes the alarm row first; no conditional rendering.
- **Gap:** the alert-row experiment cannot be run without a mechanism.
- **Proposal:** small authoring helper (e.g. `Section when={…}`) so sections render conditionally; used by the alert-row test.
- **Gate:** the three-task-path test (tap depth + empty states) if implementation is authorized. Low priority — authoring convenience, no visual change today.
- **Gate result (2026-10-18):**
  - **Cross-room quick control — pass, 1 tap:** Reading lamp toggled directly in Phone → Controls and restored in a second tap. Unavailable controls remain explicit rather than empty.
  - **Single-room lookup — fail on phone/tablet:** neither dashboard exposes a room-inventory link; the only Living room actions open that sensor's details. The wall panel exposes Living room at depth 0. No empty-room state is represented.
  - **Actionable alert — partial, 1 tap after discovery:** the open garage can be closed directly, but the first Security row is unconditional non-alert alarm status. An alert-only placement and its zero-alert state cannot be exercised.
  - **Decision:** authorize `Section when={…}` for the alert-row experiment only. It does not solve the missing phone/tablet room path.

## Satisfied — do not re-add

- Density subtraction (thin/mini never glow, no colour slot): enforced by `.hd--thin` / `.hd--mini` in `card.css`.
- One colour slot per tile (orb only): enforced by `--o-c` / `--o-h` + `data-color` scoping.
- Non-colour-cue review: attention-budget skill Verify, a review step rather than a component mechanism.
- Colour restraint (research note 04): no component gap. Palette and slot are already enforced; the new requirements — accent no-recycling, subtraction-first, contrast check — are design and review rules, not mechanisms.
