# Goal: settle a clean-slate YAML layout contract

## Outcome

Design a replacement Dashhaus Lovelace YAML layout system that a Home Assistant beginner can edit directly and a power
user can use for deliberate compositions, in one YAML document and one Lovelace card, without another tool or file.

## Parameters

- Repository: dashhaus, current workspace. Read the current files; do not assume this brief describes today's code.
- Session record: [13 Clean-slate YAML layout system](13-yaml-layout-system.md).
- Work tracking: [TODOS.md → Clean-slate YAML layout](../TODOS.md#clean-slate-yaml-layout).
- **The operator explicitly permits no backward compatibility and recreating existing cards. Do not preserve the old
  YAML grammar or names as a design constraint.** Do not add a compatibility parser, aliases or a migration mode.
- The research note's root `cards` / non-recursive `rows`, `width`, column-stack alignment and fit thresholds are
  assistant proposals, not approved requirements. Weigh them against the outcome; do not implement them by rote.
- The earlier compatibility-driven extension of `sections` with `new_row` flags is superseded. Do not revive it merely
  because the existing parser is shaped that way.
- No replacement layout behavior is implemented. This is a design continuation; implementation has not been authorized.
- An alternative route was sketched outside the original thread and deliberately withheld. Derive the design; do not
  ask for that sketch.

## Bar

1. A person who has edited a Home Assistant card can add, remove and reorder cards, change the column count and copy a
   layout example without learning a separate layout vocabulary. No layout mode or placement setting is required;
   optional settings have safe defaults.
2. Hero plus sidebar, mixed footprints, asymmetric rows, explicit placement, alignment, and dense versus normal flow
   are expressible in the same YAML. An agent can produce a valid composition from the contract without a screenshot.
3. One YAML document, one parser path, one Lovelace card. No TS/TSX authoring surface, CLI layout surface, visual editor,
   `!include`, second config file or build-time layout step.
4. Preserve fixed footprints, state-invariant height, Orb's unit rhythm and bundles on that rhythm. Width alone must not
   promote a card to featured. Do not substitute stretch or arbitrary heights for composition.
5. Preserve Field's width-driven rules: `columns` is a maximum, never a forced count. Mix footprints by column rather
   than imposing Orb's lattice or mixed-height rows on Field.
6. Card data and placement stay local; the YAML text communicates composition without CSS strings or coordinate math.
   Avoid deep nesting and cross-references. Recursive row/column trees are out unless the goal cannot be met without
   them and the flat model's failure is demonstrated.
7. Responsive behavior is automatic and safe at phone, tablet and wall widths, including narrow parent containers.
   Explicit breakpoints must not complicate the beginner path. Entity state changes do not reshuffle the layout.
8. Every Dashhaus layout/configuration error is actionable from the card's error surface: path, plain-language message,
   suggestion or corrected snippet, with independent problems collected together. Report the upstream raw-YAML/source
   information limit rather than promising diagnostics for text Dashhaus never receives.
9. `area` remains the Home Assistant room override. Keep one word per card concept from AGENTS.md. A clean slate is not
   permission to invent synonyms for domain concepts or break unrelated entity/skin-author interfaces.
10. Specify the difficult cases, not just the happy-path pictures: anchored versus automatic placement, row boundaries,
    dense holes, spanning-card alignment, bundle reflow, unavailable tracks, width clamping, Field mixed footprints,
    headings/pages/navigation and visual versus DOM/keyboard order.

## Standard and sources

Follow AGENTS.md for vocabulary and engineering rules, `spec/orb.md` and `spec/field.md` for visual/footprint authority,
and the shared Reader's path/suggestion/aggregation conventions. Use the applicable design and interface-design skills.

Read the controlling sources:

- `spec/deploy.md` → The format; The field dashboard.
- `spec/orb.md` → footprint rules; Bundles; Dashboards.
- `spec/field.md` → footprint rules; Dashboards.
- `spec/cards.md` for any affected card behavior.
- `src/skins/orb/lovelace/config.ts` and `ConfigDashboard.tsx`.
- `src/skins/orb/dashboards/layout.tsx` and `layout.css`.
- `src/skins/orb/bundles/Bundle.tsx` and `Bundle.css`.
- `src/skins/field/lovelace/config.ts` and `FieldDashboard.tsx`.
- `src/skins/field/dashboards/layout.tsx` and `layout.css`.
- `packages/dashboard/src/schema.ts`, `element.tsx`, and `spec/contract.md` for parser/error and public-contract limits.

For observations about current behavior, **where code disagrees with the research, code wins; report the difference**.
That does not make the current YAML grammar the desired design. Report anything the goal does not settle instead of
silently deciding it. Distinguish operator decisions, your recommendations and exercised evidence.

## Evidence

The [research note](13-yaml-layout-system.md) contains the inspected code pointers, five syntax-checked candidate
examples, diagnostic-reader exercise, arithmetic checks, superseded route and unresolved decisions. Read it rather than
reconstructing those findings from a summary. Syntax and arithmetic checks did not prove a new parser or rendered layout;
no proposed UI was browser-verified.

## Scope

In: the replacement YAML shape, names and types; defaults and exclusions; deterministic layout semantics; error copy and
error-surface limits; responsive behavior; Field treatment; bundles; heading/page/navigation implications; intentional
breaking cutover; alternatives and tradeoffs; a complete design brief for the operator to compare.

Out: runtime implementation, generators, production configuration changes, commits, a separate editor or tool,
freeform x/y coordinates, arbitrary pixel heights, unrelated card/entity changes, and reopening data/layout separation.
The future implementation checklist in TODOS.md is not authorization to execute it.

## Stop point

The operator's original boundary remains:

> Discuss only. Deliver the design in this thread; do not edit files or commit.

The operator later authorized saving research, TODOs and this continuation brief. That authorized the documentation
handoff, not a parser/renderer implementation. Continue design and present the result in the new thread; do not infer
implementation permission from the presence of a backlog. If the operator explicitly changes the stop point in the new
session, follow that new instruction.

## Escalation

If a requirement conflicts with the card system or Field's rules, ask one question with the options and your
recommendation. Otherwise make a justified design recommendation and state the call. Do not ask for information the repo
or the research already supplies, and do not present unapproved recommendations as settled operator decisions.

## Finish line

Deliver a comparison-ready design brief with:

1. The key idea in one sentence.
2. Beginner and power YAML shapes, with complete plain, two-column-with-spans/widths, hero-plus-sidebar and
   mixed-footprint examples. Include a complete Field example where its treatment differs.
3. Every key's type, default, inheritance/scope and mutual exclusions; no unmentioned parser modes or layout rules.
4. Deterministic placement, packing, alignment, bundle sizing and responsive rules, including the uncertain edge cases
   in the research note. A builder must not have to invent the missing semantics.
5. Common beginner mistakes with full paths, plain-language explanations and corrections; a precise account of what the
   error surface can and cannot observe.
6. A breaking replacement with no compatibility obligation, rejected alternatives, tradeoffs and a short list of places
   the design could go another way. Do not silently turn missing requirements into decisions.
7. Explicit separation of decisions made by the operator, recommendations made by you, verification actually exercised,
   and anything unverified or still needing the operator's call.

Stop with the design. No implementation, generator run or commit unless newly authorized by the operator.
