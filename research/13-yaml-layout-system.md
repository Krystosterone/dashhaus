---
date: 2026-11-03T01:44:13Z
git_commit: 6f2dabe9268f4ddd5f7e9ba264aac909f488f0bc
branch: main
repository: dashhaus
topic: "A clean-slate Lovelace YAML layout system: beginner-simple and power-flexible"
tags: [research, lovelace, yaml, layout, orb, field, design]
status: open
last_updated: 2026-11-03
---

# Research: Clean-slate YAML layout system

> **Status: design proposal, not an implemented or fully approved contract.** The operator explicitly removed
> backward compatibility and preservation of the existing YAML grammar/names as requirements. The concrete
> `cards`/`rows` syntax below is the latest assistant proposal, recorded for review, not an operator-ratified spec.
> The original design-only stop point remains: documenting the discussion does not authorize implementation.

[Research index](README.md) · [Work backlog](../TODOS.md#clean-slate-yaml-layout) ·
[Next-session goal brief](13-yaml-layout-system-brief.md)

## Research question

“Design a layout system for the Dashhaus Lovelace YAML that a beginner can edit in Home Assistant's raw
editor and a power user can use for varied, deliberate compositions — all in the same YAML, with no
separate editor, build step or config file.”

## Operator decisions and required outcome

### Confirmed change of direction

The first proposal extended the existing `sections` grammar with local placement and row-break flags. The operator
rejected preserving that grammar and clarified:

> I'm fine with no backwards compatibility and recreating my existing cards.

The operator also said not to preserve the existing YAML grammar and names. Consequently:

- Design a replacement, not an incremental extension or cosmetic rename of `sections`.
- Existing dashboard YAML can be recreated. Do not add aliases, a legacy parser, a compatibility mode or a migration
  layer merely to keep old configurations working.
- Existing names are not constraints. Keep a word only because it is the right concept; do not invent a second word
  for a card. `entity`, `area` and `footprint` already name domain concepts, not a layout architecture.
- This permission concerns YAML compatibility. It is not permission to redesign entity models, Home Assistant hooks,
  public skin-author interfaces or unrelated deployment behavior.
- No replacement key names or layout algorithm were separately approved. The operator asked to save the research,
  extend `TODOS.md`, and prepare a to-goal brief for a new session.

### Acceptance bar retained from the original request

- **Beginner:** add, remove and reorder cards, change the column count and copy an example without learning a separate
  layout language. No layout mode or placement key is required; optional settings have safe defaults.
- **Power:** hero plus sidebar, mixed footprints, asymmetric rows, explicit placement, alignment, and normal versus
  dense flow are expressible in the same YAML document.
- **One authoring surface:** one Lovelace card and one parser path; no TS/TSX authoring, CLI layout surface, visual
  editor, `!include`, build step or second configuration file.
- **Card system:** one card, one model; fixed footprints; no state-driven height changes; Orb's unit rhythm and bundles
  on that rhythm. Existing joined-bundle reflow is width-driven composition, not permission to resize ordinary cards.
- **Field:** width-driven tracks; `columns` is a maximum, never a forced count; mix footprints by column, not by row.
- **Diagnostics:** every Dashhaus layout/configuration mistake is actionable from the card's error surface: path,
  plain-language explanation and a suggestion or corrected snippet. The raw editor supplies no custom schema.
- **Readable and local:** intended composition is apparent in YAML text; card data and placement stay together; avoid
  deep nesting and cross-references. No CSS placement strings or coordinate arithmetic.
- **Responsive:** automatic, safe phone, tablet and wall behavior; no breakpoint machinery on the beginner path.
- **Vocabulary:** `area` continues to mean the Home Assistant room override. Follow AGENTS.md and the affected skin's
  design authority rather than introducing synonyms for card concepts.
- **Agent-readable:** an agent can produce valid YAML from the documented grammar and diagnostics without a screenshot.
- **No recursive row/column trees** unless the goal demonstrably cannot be met without them.
- **Out:** implementation in this design session, freeform x/y coordinates, arbitrary pixel heights, and reopening the
  data/layout separation debate. Do not ask for the operator's withheld alternative sketch.

## Current code: evidence, not a compatibility constraint

These are observations from the design session, not descriptions of the proposed grammar. Re-read the sources before
implementation; the commit in the metadata is the repository HEAD captured while saving this note.

| Current behavior | Source |
| --- | --- |
| Orb cards use a 60 px unit and 8 px gap; ordinary card heights do not change with state or width | [Orb rules](../spec/orb.md#orb-design-rules) |
| Orb's grid has equal-width columns, auto-height rows and top alignment; it does not assign footprint-derived row spans | [Orb layout CSS](../src/skins/orb/dashboards/layout.css) |
| Orb's narrow-grid query observes the page container; side-by-side section groups do not themselves collapse | [Orb layout CSS](../src/skins/orb/dashboards/layout.css), [layout parts](../src/skins/orb/dashboards/layout.tsx) |
| Orb YAML already supports shallow side-by-side section groups, bundles, footprints and configurable gaps; it is not only a flat columns/cards/span surface | [Orb parser](../src/skins/orb/lovelace/config.ts), [renderer](../src/skins/orb/lovelace/ConfigDashboard.tsx), [format](../spec/deploy.md#the-format) |
| Orb passes a card's span directly into the grid; unlike Field, it does not clamp it to the section's declared count | [Orb renderer](../src/skins/orb/lovelace/ConfigDashboard.tsx), [layout CSS](../src/skins/orb/dashboards/layout.css) |
| Field uses width-driven auto-fill tracks, a capped column count, and width-gated spans; its page has a fixed maximum width | [Field layout CSS](../src/skins/field/dashboards/layout.css), [parser](../src/skins/field/lovelace/config.ts) |
| Field passes the dashboard-level footprint to the area's grid even when individual modules override their footprints; the gap/track policy is not selected per effective module | [Field renderer](../src/skins/field/lovelace/FieldDashboard.tsx), [layout parts](../src/skins/field/dashboards/layout.tsx) |
| Bundles force member footprints; joined bundles reflow by their own width, while lead and titled bundles are vertical stacks on Orb's rhythm | [Bundle implementation](../src/skins/orb/bundles/Bundle.tsx), [CSS](../src/skins/orb/bundles/Bundle.css), [bundle rules](../spec/orb.md#bundles) |
| Reader collects problems, checks whole numbers by default and suggests near key/value spellings; DashboardConfigError carries the list | [Shared schema](../packages/dashboard/src/schema.ts), [stable contract](../spec/contract.md#dashhausdashboardschema) |
| setConfig receives an already-parsed value and lets parse exceptions escape; its React error boundary is a separate render-error path | [Custom-element seam](../packages/dashboard/src/element.tsx), [Orb parser comment](../src/skins/orb/lovelace/config.ts) |

The shared Reader was exercised in memory with misspelt keys, a quoted column count, a fractional span and a misspelt
footprint. It reported all four problems with paths and suggestions where applicable. This did not exercise the Home
Assistant editor or the proposed layout grammar.

## Latest candidate: simple cards or explicit rows

**Key idea:** a dashboard is either a simple card list or an ordered sequence of explicit, non-recursive rows; each row
owns its composition, while every card keeps its data and placement together.

A simple list normalizes to one anonymous row. That is a proposed shorthand within one layout grammar, not a second
parser or a compatibility path. Omitting both authored bodies would retain an automatic dashboard; its exact grouping
and sizing defaults still need to be specified.

A row is a bounded horizontal composition, not one compact-height grid track. It can contain stacked cards and reflow
vertically on narrower screens. Its card list is flat. Rows cannot contain other rows or recursive column groups.

### Candidate keys and types

These spellings and defaults are proposals. In particular, the meaning of `auto`, fit thresholds and placement order
are not yet a complete algorithm.

| Key | Location and type | Proposed default / meaning |
| --- | --- | --- |
| `cards` | Dashboard/page or row: list of entity-id strings, card maps, or supported Orb bundle maps | A simple dashboard body; each row must have contents |
| `rows` | Dashboard/page: list of row maps | No explicit rows; mutually exclusive with `cards` at that level |
| `columns` | Dashboard/page or row: `auto` or a positive whole number; candidate limits Orb 12, Field 4 | `auto`; rows inherit the dashboard setting; Field's integer is always a maximum |
| `width` | Card or outer bundle: positive whole number of columns, or `full` | 1; horizontal only, never pixels or a height |
| `column` | Card or outer bundle: positive starting-column number, `start`, or `end` | Automatic placement |
| `footprint` | Card: the skin's fixed footprint choice | Standard, or Field's configured default |
| `flow` | Dashboard/page or row: `normal` or `dense` | `normal`; rows inherit the dashboard setting |
| `align` | Row: `top` or `bottom` | `top`; moves independent column stacks, never stretches cards |
| Row `title` | Optional text | A heading outside the card grid |
| `bundle` | Orb bundle: `joined`, `lead`, or `titled` | Explicit bundle kind, not detection from incidental keys |
| Bundle `cards` | List of ordinary member cards | Candidate lead form uses its first card as the lead; titled form requires its lid title |

`area` remains the room override. Existing entity-specific data/options should not be renamed merely to make the YAML
look different. The candidate uses `cards` for both skins; Field still calls its rendered surface a module in component
and UI vocabulary.

### Candidate placement and alignment

- Explicit column anchors stack from the top of that column in source order; repeated anchors do not mean overlap.
- Automatic cards use normal or dense placement. The exact interleaving of automatic and anchored cards remains open.
- A spanning card ties the columns it covers together for alignment. Bottom alignment moves a complete independent
  stack or coupled group, preserving the spacing inside it.
- Row boundaries are hard packing barriers. Dense placement never reaches into another row.
- Dense flow may put a later card into an earlier visual hole. Stable YAML/DOM/keyboard order versus visual order needs
  an explicit accessibility decision; do not claim those orders always match.
- No numerical vertical coordinates, author-supplied row spans, arbitrary heights or stretch alignment.
- Vertical centre alignment was omitted from the latest proposal: centring a compact card against a standard Orb card
  would offset it by 34 px, off the 68 px unit pitch. This omission is a proposed tradeoff, not an approved requirement.

| Footprint | Orb height | Orb occupied units | Field height |
| --- | ---: | ---: | ---: |
| compact | 60 px | 1 | 64 px |
| standard | 128 px | 2 | 160 px |
| featured | 264 px | 4 | unsupported |

In the hero example below, the sidebar is 196 px tall; bottom alignment offsets it by one 68 px unit pitch. That is an
arithmetic check of the intended alignment, not browser proof of a packing algorithm.

### Example: plain dashboard

```yaml
type: custom:dashhaus-orb
title: Home
cards:
  - light.living_room
  - climate.living_room
  - cover.living_room
```

### Example: two columns with a full-width card

```yaml
type: custom:dashhaus-orb
title: Home
columns: 2
cards:
  - entity: climate.living_room
    width: full
  - light.living_room
  - cover.living_room
```

### Example: hero and bottom-aligned sidebar, then another row

```yaml
type: custom:dashhaus-orb
title: Home
rows:
  - title: At a glance
    columns: 3
    align: bottom
    cards:
      - entity: light.living_room
        column: 1
        width: 2
        footprint: featured
      - entity: climate.living_room
        column: 3
      - entity: alarm_control_panel.house
        column: 3
        footprint: compact
  - title: Rooms
    columns: 2
    cards:
      - sensor.living_room_temperature
      - weather.home
```

### Example: mixed-footprint dense grid with a bundle in the next row

```yaml
type: custom:dashhaus-orb
title: Home
rows:
  - title: Comfort and status
    columns: 3
    flow: dense
    cards:
      - entity: climate.living_room
        width: 2
      - entity: alarm_control_panel.house
        footprint: compact
        column: 3
      - entity: weather.home
        width: 2
      - entity: light.hall
        footprint: compact
  - title: Modes
    cards:
      - bundle: joined
        cards:
          - input_boolean.guest_mode
          - input_boolean.do_not_disturb
```

### Example: Field, mixed footprints by column

```yaml
type: custom:dashhaus-field
title: Home
rows:
  - title: Living room
    columns: 2
    cards:
      - entity: light.living_room
        column: 1
      - entity: cover.living_room
        column: 1
        footprint: compact
      - entity: climate.living_room
        column: 2
      - entity: input_boolean.do_not_disturb
        column: 2
        footprint: compact
```

These five documents were parsed successfully with the installed `yaml` library. They are not accepted by the current
skin parsers, and no proposed rendering or interaction has been implemented or visually checked.

## Responsive and Field treatment proposed in the discussion

- Use available container width, including a row narrowed by its parent, not device detection or entity state.
- Orb's explicit count must yield before tracks become unusable; 160 px was proposed as a track guard, not established
  as a design-system token. The preferred width and count for `columns: auto` remain open.
- Preserve Orb's one-column behavior below 320 px of dashboard content, and protect narrow nested containers too.
- Clamp widths to available tracks rather than creating implicit columns. Release unavailable anchors into source-order
  placement on collapse. Exactly when all versus only unavailable anchors are released is unresolved.
- Keep row boundaries, every card and every footprint when collapsing; no automatic promotion to featured.
- Field derives actual tracks from width and its own track policy. Its `columns` is always a cap, and `width` cannot
  manufacture an unavailable track.
- Field uses actual module heights, not Orb unit counts. The candidate allows dense horizontal hole filling for
  uniform-footprint Field grids, not vertical packing below short modules.
- Mixed Field footprints require a single column or explicit column stacks in the candidate. Without a compatibility
  requirement, this can be validated, but the precise static rule and responsive collapse must still be designed.
- Spacing belongs to the skin, not a YAML `gap`. Field's mixed-footprint track minimum and transition gaps need a clear
  decision against the spec; do not accidentally preserve the page-level-footprint discrepancy from today's renderer.
- A wall remains a width, not a signal to set `viewing: far`. Viewing distance is still explicit.

## Validation and the error surface

Retain the useful Reader convention: collect independent problems, preserve structural paths and entity identities,
check whole numbers, and suggest likely key/value corrections. New grammar does not require throwing that mechanism
away. Do not validate a width-dependent composition as erroneous merely because it is currently narrow.

Candidate examples, not current parser output:

```text
cards: "cards" and "rows" both describe the dashboard. Keep "cards" for a simple grid, or move those cards into one entry under "rows".
```

```text
rows[0].cards[2] (alarm_control_panel.house).column: column 4 is outside this row's 3 columns. Use column: end, or increase this row's columns.
```

```text
rows[0].cards[0] (light.living_room).width: "width" is a whole number of columns or "full", not a pixel size. Use width: 2 or width: full.
```

```text
rows[1].rows: Rows cannot contain other rows. Move this row alongside rows[1], or put its cards directly in rows[1].cards.
```

The finished contract must also cover missing list dashes, quoted numbers, fractional/out-of-range counts, unknown keys,
invalid footprints, incompatible anchors and widths, empty bodies, wrong-skin options, mixed Field layouts, bundles and
misplaced layout keys. Each error needs a path, explanation and repair. Suppress dependent cascades when a prerequisite
is invalid without losing other independent problems.

### Error-surface limit

Dashhaus receives an already-parsed JavaScript value. It cannot recover malformed YAML, source line/column information,
quoting, or duplicate-key information that was never delivered or was discarded upstream. Home Assistant's raw editor
must handle syntax errors. Do not promise card-only diagnostics for errors the card cannot observe.

Current `setConfig` lets parse exceptions escape. A candidate way to satisfy the semantic-error feedback guarantee is
for the card to own a configuration-error view that shows the complete collected list, with wrapping/scrolling on a
phone and no misleading partial dashboard. This requires a later implementation decision, not merely new error text.
No claim about the live Home Assistant error-card display was verified in a browser in this session.

## What the clean cutover removes

| Earlier structure or alternative | Candidate replacement / reason |
| --- | --- |
| `sections` wrappers and side-by-side section groups | Root `cards` or explicit non-recursive `rows` with local column stacks |
| Field's separate `modules` collection spelling | The same `cards` grammar for both skins; drawing vocabulary remains skin-specific |
| `span` | Proposed `width: 2` or `width: full`; spelling still subject to review |
| Configurable grid `gap` | Skin-owned rhythm and spacing |
| Incidental bundle detection from `joined`, `lead` or `rows` | Explicit `bundle` kind with member `cards` |
| The first assistant proposal's `new_row` flags | Visible boundaries in `rows` |
| Legacy aliases, dual parsers or migration modes | None; operator will recreate existing YAML |
| Recursive row/column trees | Not demonstrated necessary; keep the candidate bounded and shallow |
| Named-area maps or placement cross-references | Split data from placement; `area` already means a room |
| CSS strings and vertical grid-line arithmetic | Not readable enough for the raw-editor audience |
| Masonry or dense packing by default | Weakens deliberate alignment and predictable reading order |
| Breakpoint-specific copies of card lists | Duplicates data and complicates the beginner path |
| Stretch-to-fill cards or arbitrary pixel heights | Violates fixed-footprint rules |
| Preset-only composition | Cannot alone meet the power path |

## Open decisions before implementation

1. **Grammar, not cosmetic novelty.** Validate root `cards` versus explicit `rows`, including whether the shallow
   shorthand and the wrapping meaning of a row are genuinely easier to edit. Reconsider `width` versus `span` on merit.
   The operator approved a clean slate, not these exact spellings.
2. **Deterministic placement.** Specify how anchored and automatic cards interleave, cursor movement in normal flow,
   dense-hole search, repeated anchors, spanning cards, row boundaries and permitted intentional holes. No hidden
   dependence on CSS incidental ordering.
3. **Alignment.** Define column-stack/coupled-group detection, interactions with dense flow and spanning cards, and
   whether omitting centre alignment meets the intended power path. Prove no overlap or off-rhythm movement.
4. **Responsive defaults.** Define `auto`, preferred/minimum widths, maximum counts, actual available width, row-local
   versus page-local thresholds, and phone/tablet/wall collapse. Do not turn Field's cap into a count.
5. **Unavailable placement.** Distinguish an authored out-of-range anchor from a valid anchor lost to responsive
   collapse; settle width clamping and anchor-release rules, including Field with no explicit count.
6. **Field composition and spacing.** Finish static mixed-footprint rules, normal versus dense capability, track sizing
   and transition gaps. Today's renderer is evidence of a discrepancy, not the authority to preserve it.
7. **Dense accessibility.** State the relation between YAML, DOM, visual and keyboard order and the cost of dense flow.
   Do not reorder controls on state changes or claim browser/screen-reader proof without exercising it.
8. **Headings, pages and navigation.** Define whether/how rows are navigation targets, stable identifiers, duplicate or
   renamed headings, untitled rows, and body settings on another page. Do not casually break unrelated navigation.
9. **Complete bundle grammar.** Cover joined, lead and titled bundles, forced member footprints, outer-only placement,
   membership limits if any, responsive height calculation, invalid overrides and wrong-skin errors. No silently ignored
   settings or nested layout trees inside bundles.
10. **Diagnostic ownership and limits.** Specify the complete error view and observe it in Home Assistant later; report
    the raw-YAML limitation rather than trying to solve it with a second parser or editor.
11. **Cutover inventory.** Find every producer, consumer, sample, generated template and checked contract affected by the
    eventual YAML change, including other registered skins. Permission to break YAML is not permission to silently break
    frozen skin-author interfaces or leave old emitters behind.

These are design work, not approved implementation tasks. Decide what the constraints settle, label recommendations,
and report what remains an operator call rather than silently finalizing it.

## Verification and continuation

### Observed in this session

- Read the requested specs, both parsers and layout helpers, Orb's renderer, Field's renderer, shared schema/error seam,
  bundle code/CSS, existing stories and relevant tests.
- Exercised the existing shared Reader's error aggregation in memory.
- Parsed all five replacement examples as YAML; this proves syntax only, not proposed schema validity.
- Checked footprint sums, the sidebar's one-unit bottom-alignment offset and width-fit arithmetic in memory.
- No proposed parser, renderer, packing algorithm or error view was implemented; no proposed UI was browser-verified.
- No live Home Assistant, iOS or screen-reader validation was performed for this design.

### Next-session finish line

Use the [goal brief](13-yaml-layout-system-brief.md). Deliver a compare-ready design contract: beginner and power examples;
keys, types, defaults and exclusions; validation and repair text; automatic responsive rules; Field treatment; explicit
breaking replacement with no compatibility layer; rejected alternatives/tradeoffs; and remaining decisions. The key idea
must fit in one sentence. Preserve the discuss-only stop point until the operator authorizes implementation.

### Future implementation gate, only after authorization

The [TODOS entry](../TODOS.md#clean-slate-yaml-layout) records the later work. Implementation would need actual parser
and layout behavior checks plus browser observation of the Lovelace surface at narrow, tablet and wall widths, including
row boundaries, dense holes, explicit anchors, alignment, width-clamped bundles, long names, unavailable states and
state-invariant geometry. Run the applicable repository commands from AGENTS.md, including `npm run check`,
`npm run test-storybook` and `npm run build:ha`; docs/template changes require the docs build, and export/package-surface
changes require release verification. Tests and arithmetic alone do not prove the rendered layout.

An implemented decision belongs in its owning code, spec, docs and templates, not permanently in this research note.

## Provenance and authority

Captured from the design conversation and inspected repository sources. The operator's explicit correction supersedes
only the original backward-compatibility requirement and the assistant's compatibility-driven route. The replacement
syntax is a proposal. No external source is needed to establish approval or current repository behavior.

For observations about current behavior, where code disagrees with this note, code wins; report the difference. That
rule does not make the current YAML grammar a design requirement. Desired card/skin behavior follows AGENTS.md,
[Orb](../spec/orb.md), [Field](../spec/field.md), [card behavior](../spec/cards.md) and the operator's constraints.
