# Mechanism backlog

Component-level changes that would let the shared card system enforce the
codified contracts instead of per-widget discipline. Each item names its
contract, today's mechanism, the gap, the proposal, and the gate that must
pass before implementation. Append here as further research points get
codified; strike items when implemented.

## 1. Attention channel — urgency input to damping

**Contract:** attention-budget rules 1–2; README "Glow follows urgency, not position".

- **Today:** `layout.css` damps later glowing cards to 0.5 by sibling position only (`--glow-damp`). Widgets have no input.
- **Gap:** urgency cannot influence damping — the retune the research recommends has no mechanism to stand on.
- **Proposal:** widgets declare an attention level (e.g. `data-attention="routine | urgent"` on the `hd` article, surfaced through `paint()` or a dedicated prop); `layout.css` damps by level instead of raw position; urgent states keep their marker (item 2) and outrank routine glow.
- **Gate:** the research's scan-task comparison (missed-urgent rate, target-finding time) before changing default damping values.

## 2. Card-level warn state

**Contract:** attention-budget rules 4–5; README "Alerts first…" warn marker.

- **Today:** `.hd-warn` colours text; each widget decides what and when to mark. No uniform urgent marker.
- **Gap:** urgent treatment is ad-hoc per widget; "warn marker, not more glow" can't be enforced centrally, and markers drift across widgets.
- **Proposal:** promote warn to a card state — `data-alert="warn"` on `.hd` plus one shared status-line slot styled by the card system (warn-colour text + a non-colour cue). Widgets declare; the system renders.
- **Gate:** design review. The status slot must not change card height (hard rule).

## 3. Thin-row identity slots

**Contract:** point 3, dense list identity — codified in README + `row-identity` skill.

- **Today:** thin rows = orb (the control), title, control slot. On-state identity is role tone only.
- **Gap:** research requires a stable domain icon, concise primary/secondary text, and one explicit state/action cue per row; colour must not define the row.
- **Proposal:** shared icon slot and secondary-text slot in the `hd--thin` grid; one state/action cue per domain. Mushroom's model: shared geometry, domain-specific content.
- **Gate:** the research's visual QA pass on the Controls story at thin widths (which rows fail) before implementing.

## 4. Conditional dashboard sections

**Contract:** point 1 composition — the conditional alert row is our inference, "keep it testable".

- **Today:** the phone dashboard hardcodes the alarm row first; no conditional rendering.
- **Gap:** the alert-row experiment cannot be run without a mechanism.
- **Proposal:** small authoring helper (e.g. `Section when={…}`) so sections render conditionally; used by the alert-row test.
- **Gate:** the three-task-path test (tap depth + empty states) if implementation is authorized. Low priority — authoring convenience, no visual change today.

## Satisfied — do not re-add

- Density subtraction (thin/mini never glow, no colour slot): enforced by `.hd--thin` / `.hd--mini` in `card.css`.
- One colour slot per tile (orb only): enforced by `--o-c` / `--o-h` + `data-color` scoping.
- Non-colour-cue review: attention-budget skill Verify, a review step rather than a component mechanism.
