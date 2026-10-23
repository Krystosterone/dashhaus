# AGENTS.md

React + TypeScript widgets for a custom Home Assistant dashboard, developed and shown in Storybook. This is a component library, not a runnable app: there is no test suite and no linter. The spec is split: `README.md` (design and composition rules) and `docs/widgets.md` (per-widget behaviour) — consult both before changing widget behaviour. Research decisions and evidence live in `research/README.md` and the `research/` notes; component gaps in `research/mechanism-backlog.md`.

## Commands

- `npm install`
- `npm run storybook` — dev server at http://localhost:6006
- `npm run build-storybook` — static build in `storybook-static/`
- `npm run build:ha` — the Lovelace card as one file, `dist/home-dashboard.js`
- `npm run deploy` — build, copy into Home Assistant, register the resource, create the dashboard the first time (settings in `.env`, see `docs/deploy.md`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — `eslint .` (flat config in `eslint.config.js`)
- `npm run test` — `vitest run`; unit tests live next to their module as `*.test.{ts,tsx}`
- `npm run test-storybook` — every story must render (smoke) and pass axe (a11y) in Chromium; failures print the rule, impact, and target elements
- `npm run check` — typecheck + lint + test, the one-shot gate. Run it before every change is finished.
- `npm run new-widget -- <name> --code <xx> --domain <ha_domain> [--kind control|reading]` — scaffold and register a new widget (see Adding a widget)

## Verifying changes

1. `npm run check` — typecheck, lint, and unit tests.
2. `npm run test-storybook` — every story renders and passes axe; failures name the rule, impact, and elements.
3. `npm run storybook` — open the affected widget's story, check every width and footprint, and the Demo / Worst case toggle under Foundations.

Unit tests cover pure logic and shared hooks (kelvin, track position, formatting, alarm mapping, `useNow`, `useLongPress`, `useTrack`); stories are the documentation and the visual check. New pure logic gets a `*.test.ts` beside it. `src/styles/rules.test.ts` encodes the CSS design rules — colour tokens, the UI language (no hatching or soft accent), compositor-only motion, `--ease-*` easing, hover under the capability media query, track `touch-action` — so changing one of those rules means updating the test. Do not add another test runner or linter.

## Layout

- `src/widgets/<name>/` — one widget per folder: component, CSS, entity type, `demo/`, and `<Name>.stories.tsx` titled `Widgets/<Name>`.
- `src/shared/` — the card system and shared hooks (`card.css`, `ui.tsx`, `useTrack`, `useLongPress`, `useNow`).
- `src/styles/tokens.css` — the only source of colour and design tokens.
- `src/bundles/` — `JoinedBundle` and `LeadBundle`.
- `src/dashboards/` — `DashboardPage`, `Section`, `Columns`, `Cell`, and the dashboard stories.
- `src/ha/` — the Home Assistant boundary (`docs/home-assistant.md`). `src/ha/lovelace/` is the deployed card: the YAML parser (`config.ts`), the generated layout (`auto.ts`, also imported by `scripts/deploy.mjs`, so it may only use `import type`), the renderer and the custom element.
- `src/index.ts` — public exports. Every new widget must be exported here.
- `scripts/new-widget/` — the widget generator. `templates/common` plus `templates/control` or `templates/reading` mirror the repo with `__Name__`, `__name__`, `__code__`, `__domain__` and `__unit__` placeholders. Change the templates when the framework changes, so new widgets start from the current rules.
- `src/stories/` — Foundations stories: colour temperature, worst-case data, compact rows.

## Hard rules

- One widget, one entity.
- One UI language (README → One UI language): a raised `--btn` is tapped, a recessed `--groove` is slid or set, a readout has no container; solid accent is on for every role; a dashed outline is unavailable and nothing else. No hatching, no second strength of accent, no default orb colour.
- Never use a colour literal in widget CSS. Colours come from tokens in `src/styles/tokens.css`; the accent is `--brand-c` / `--brand-h`.
- A card's height never changes with state or widget type. Height comes from the shared `footprint` matrix plus container width, never the viewport.
- No expanding cards: more detail opens in a sheet, from a tap on the card's name (`CardTitle`) or a press and hold. Cards carry no open button.
- Prefix each widget's CSS classes with its widget code: `hh-` header, `lw-` light, `cw-` climate, `sw-` sensor, `al-` alarm, `cv-` cover, `tw-` toggle, `wx-` weather, `ow-` owlet sock, `hb-` bundles; `hd-` is the shared card system.
- Animate only `transform`, `opacity`, `clip-path` and colour changes; never layout properties. Easing only from the `--ease-*` tokens; hover styles only under `@media (hover: hover) and (pointer: fine)`.
- Attention follows the README glow contract and the `attention-budget` skill: glow is never the only state channel, damping follows semantic urgency not card position, and urgent states get a warn marker rather than more brightness.
- Every compact row carries a domain icon, primary identity and one state/action cue; colour never defines a row.
- Controls are not selectable: no selection or tap highlight, `touch-action: manipulation`, press feedback on `:active`.

## Design review

When design or visual quality is at stake, use these authorities, all committed under `.agents/` (Claude Code sees the skills through the `.claude/skills/` symlinks):

- **Design phase:** run design decisions through the UX Researcher and UI Designer roles in `.agents/design/`.
- **After building:** run Impeccable's `critique`, `audit`, and `polish` on the widget's story (`/impeccable …`; skill at `.agents/skills/impeccable/`).
- **Motion and worst-case data:** apply Emil Kowalski's skills in `.agents/skills/` — `review-animations`, `animation-performance`, `mobile-native`, `break-ui`. They are the source of the motion rules in README.md.
- **Attention and glow:** follow the repo's own `attention-budget` skill (`.agents/skills/attention-budget/`); it carries the README glow contract and the evidence in `research/02-attention-budget.md`.
- **Row identity:** apply the repo's own `row-identity` skill when building or editing compact widgets or reviewing the Controls column; evidence in `research/03-dense-list-identity.md`.
- **Not used:** taste-skill and third-party DESIGN.md files. If a DESIGN.md is ever needed, generate it from this codebase (Impeccable `document`), never import one.
- **Updating:** `npx skills update` for Emil's skills, `npx impeccable update` for Impeccable; review the diff before committing.

## Adding a widget

```sh
npm run new-widget -- fan --code fn --domain fan                                  # a control: on/off, over fan.toggle
npm run new-widget -- co2 --code co --domain sensor --kind reading --unit ppm     # a reading: read-only number
# add --dry-run to preview
```

Pick the kind by what the card does: a **control** (default) is an orb and a pill that switch the entity; a **reading** is a bare icon and a readout that only show it, with no services. Either way it writes a working widget, Home Assistant side included, and registers it everywhere: `src/index.ts`, `src/ha/index.ts`, the fixture test, the phone dashboard, `docs/widgets.md` and the prefix list above. It passes `npm run check` and `npm run test-storybook` before you touch it. Then make it the real thing:

1. `src/widgets/<name>/types.ts`: the fields the card shows. `icons.tsx`: its domain icon.
2. `<Name>Widget.tsx`: the card. It is built from the shared card system in `src/shared/ui.tsx`: `useCard(code, …)` gives the `article` attributes, footprint flags and ids; an `hd-head` holds the `Orb`, the `CardTitle` (given `onOpen` outside the sheet) and, in the sheet only, `SheetClose`; then one `hd-slot` and the sheet blocks. Spread `paint(role, glow, own, prop)` onto the article for its colour role, glow and colour slot. `detailsSheet()` and `detailsTile()` build the sheet and the tile, so compact, standard and featured footprints plus the sheet come for free.
3. `src/ha/mappers/<name>.ts` and, for a control, `src/ha/actions/<name>.ts`: the raw attributes and the native services, through `serviceRunner()` (`home-assistant-integration` skill). Keep the fixture's `unknown` and `unavailable` entities.
4. Move it to the right section in `src/dashboards/Dashboards.stories.tsx`: the generator only puts it on screen (a control in the phone's Controls, a reading beside the room sensors).
5. Finish its section in `docs/widgets.md`, and add it to `docs/home-assistant.md`'s slice list.
6. Once it has an `Ha*Tile`, give its domain a card in `src/ha/lovelace/` (`DOMAIN_KIND` and `KIND_KEYS` in `config.ts`, `tile()` in `ConfigDashboard.tsx`, its place in `auto.ts`) and its keys in `docs/deploy.md`.

`src/widgets/conformance.test.ts` holds every widget, generated or hand-built, to the files, card system, class prefix, exports, dashboard, docs and Home Assistant connection above, and says which step is missing. Then verify per the section above.
