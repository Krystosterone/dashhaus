# AGENTS.md

React + TypeScript widgets for a custom Home Assistant dashboard, developed and shown in Storybook. This is a component library, not a runnable app; the checks are the ones under Commands. The spec is split: `README.md` (design and composition rules) and `docs/widgets.md` (per-widget behaviour) — consult both before changing widget behaviour. The UI is a skin, `orb`, in `src/skins/orb/`; the entity models and Home Assistant logic under it are skin-free, so another skin can sit on them (Layout → Adding a skin). Research decisions and evidence live in `research/README.md` and the `research/` notes; component gaps in `research/mechanism-backlog.md`.

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
3. `npm run storybook` — open the affected widget's story, check every width and footprint, and Orb → Foundations → Worst case.

Unit tests cover pure logic and shared hooks (kelvin, track position, formatting, alarm mapping, nav resolution, `useNow`, `useLongPress`, `useTrack`, `useScrollSpy`, `useHashPage`); stories are the documentation and the visual check. New pure logic gets a `*.test.ts` beside it. `src/skins/orb/styles/rules.test.ts` encodes the CSS design rules — colour tokens, the UI language (no hatching or soft accent), compositor-only motion, `--ease-*` easing, hover under the capability media query, track `touch-action` — so changing one of those rules means updating the test. Do not add another test runner or linter.

## Layout

The code is split by responsibility, so a whole different UI, a skin, can sit on the same logic.

- `src/domains/` — what every skin shares: one folder per entity kind with its entity and history types (`types.ts`) and pure logic (`light/kelvin.ts`, `climate/modes.ts`, `weather/conditions.ts`), plus `history.ts` (`HourSample`, `Reading`), `color.ts` (`ColorName`) and `format.ts` (`fmt1`). No React, no CSS, no skin imports; ESLint enforces it.
- `src/hooks/` — React hooks with no UI of their own, for every skin and the Home Assistant hooks: `useNow`; `useTrack`, a horizontal track's pointer input that each skin draws its own way; and for a page's nav, `useScrollSpy` (the section being read, and a jump to one) and `useHashPage` (the page on screen, kept in the URL hash).
- `src/ha/` — the Home Assistant boundary (`docs/home-assistant.md`): transport, store, provider, mappers, actions and history parsing, importing entity models from `src/domains/` and never a skin (ESLint enforces it). Any skin gets one live entity from `src/ha/hooks/<name>.ts`, `useHa<Name>(entityId, options)` returning the mapped `entity`, today's `history` and, for a control, its `actions`, or from the same hook as a headless component in `src/ha/headless.tsx` (`<HaLight entityId>{(light) => …}</HaLight>`), for a list of entities. `src/ha/demo/` holds the demo transports (`house.ts` puts them together as one house). `src/ha/lovelace/` is what every skin's Lovelace card shares: `element.tsx`, the custom-element base (shadow root, one store per frontend connection, the React root), `actionMessage.ts` (the words for a rejected command), `nav.ts` and `useDashboardNav.ts` (a card's bottom nav: its destinations, their labels, and what each tap does), `styles.ts` (tokens onto the shadow host), and `entry.ts`, the bundle's entry, which registers each skin's card.
- `src/skins/<skin>/` — one whole UI. A skin owns its `styles/tokens.css` (its only source of colour), its `storybook.tsx` (its Storybook section, toolbar and decorator, listed in `.storybook/preview.tsx`), stories titled `<Skin>/…`, its connected tiles in `ha/` and its Lovelace card in `lovelace/`; only those two folders may import `src/ha/`. Skins never import each other (`src/skins/boundaries.test.ts`): what two skins share moves to `src/domains/`, `src/hooks/` or `src/ha/`.
- `src/skins/orb/` — the orb skin, the dashboard's UI:
  - `widgets/<name>/` — one widget per folder: component, CSS, `demo/`, and `<Name>.stories.tsx` titled `Orb/Widgets/<Name>`; `widgets/conformance.test.ts` holds every widget to the steps in Adding a widget.
  - `shared/` — the card system and its hooks (`card.css`, `ui.tsx`, `useLongPress`).
  - `bundles/` — `JoinedBundle`, `LeadBundle` and `TitledBundle`. `dashboards/` — `DashboardPage`, `Section`, `Columns`, `Cell`, the bottom `NavBar`, and the dashboard stories. `stories/` — Foundations stories: colour temperature, worst-case data, compact rows.
  - `styles/` — `tokens.css`, and `rules.test.ts`, the CSS rules below as checks.
  - `ha/` — the `Ha<Name>Tile` containers: each `useHa<Name>` hook above the widget's tile.
  - `lovelace/` — its card, `custom:home-dashboard`: the YAML parser (`config.ts`), the generated layout (`auto.ts`, also imported by `scripts/deploy.mjs`, so it may only use `import type`), the renderer (`ConfigDashboard.tsx`), the rejected-command row (`ActionStatus.tsx`) and the element (`card.tsx`).
- `src/index.ts` — public exports. Every new widget must be exported here.
- `scripts/new-widget/` — the widget generator, drawing new widgets in the orb skin. `templates/common` plus `templates/control` or `templates/reading` mirror the repo with `__Name__`, `__name__`, `__code__`, `__domain__` and `__unit__` placeholders. Change the templates when the framework changes, so new widgets start from the current rules. `index.test.ts` runs the generator: a dry run against the repo for every anchor it edits, and a real run in a temporary copy that must typecheck and pass the conformance test.

### Adding a skin

Create `src/skins/<skin>/` with its `styles/tokens.css` (scope its tokens so they can't collide with another skin's) and a `storybook.tsx` like orb's, added to `SKINS` in `.storybook/preview.tsx`, and title its stories `<Skin>/…`. Draw its cards from the `useHa<Name>` hooks or headless components; never import another skin. For Home Assistant, extend `LovelaceDashboardElement` (`src/ha/lovelace/element.tsx`) in its `lovelace/` and register the card in `src/ha/lovelace/entry.ts`. Write its own design rules down, and encode them in a rules test like orb's.

## Hard rules

For every skin:

- One widget, one entity.
- Never use a colour literal in a skin's CSS. Colours come from the skin's `styles/tokens.css`; orb's accent is `--brand-c` / `--brand-h`.
- A card's height never changes with state. In orb it comes from the shared `footprint` matrix plus container width; never from the viewport.
- Animate only `transform`, `opacity`, `clip-path` and colour changes; never layout properties. Easing only from the `--ease-*` tokens; hover styles only under `@media (hover: hover) and (pointer: fine)`.
- Controls are not selectable: no selection or tap highlight, `touch-action: manipulation`, press feedback on `:active`.

For the orb skin:

- One UI language (README → One UI language): a raised `--btn` is tapped, a recessed `--groove` is slid or set, a readout has no container; solid accent is on for every role; a dashed outline is unavailable and nothing else. No hatching, no second strength of accent, no default orb colour.
- No expanding cards: more detail opens in a sheet, from a tap on the card's name (`CardTitle`) or a press and hold. Cards carry no open button.
- Prefix each widget's CSS classes with its widget code: `hh-` header, `lw-` light, `cw-` climate, `sw-` sensor, `al-` alarm, `cv-` cover, `tw-` toggle, `wx-` weather, `ow-` owlet sock, `hu-` humidifier, `sn-` sound, `hb-` bundles; `hd-` is the shared card system.
- Attention follows the README glow contract and the `attention-budget` skill: glow is never the only state channel, damping follows semantic urgency not card position, and urgent states get a warn marker rather than more brightness.
- Every compact row carries a domain icon, primary identity and one state/action cue; colour never defines a row.

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

Pick the kind by what the card does: a **control** (default) is an orb and a pill that switch the entity; a **reading** is a bare icon and a readout that only show it, with no services. Either way it writes a working widget, Home Assistant side included, and registers it everywhere: `src/index.ts`, `src/ha/index.ts`, the fixture test, the headless components, the phone dashboard, `docs/widgets.md`, the prefix list above, and the orb skin's Lovelace card (`src/skins/orb/lovelace/`, `docs/deploy.md`). It passes `npm run check` and `npm run test-storybook` before you touch it. Then make it the real thing:

1. `src/domains/<name>/types.ts`: the fields the card shows. `src/skins/orb/widgets/<name>/icons.tsx`: its domain icon.
2. `<Name>Widget.tsx`: the card. It is built from the shared card system in `src/skins/orb/shared/ui.tsx`: `useCard(code, …)` gives the `article` attributes, footprint flags and ids; an `hd-head` holds the `Orb`, the `CardTitle` (given `onOpen` outside the sheet) and, in the sheet only, `SheetClose`; then one `hd-slot` and the sheet blocks. Spread `paint(role, glow, own, prop)` onto the article for its colour role, glow and colour slot. A reading's figures go in a `Readout`, laid out with the shared `hd-bar`, `hd-metric`, `hd-label` and `hd-none` classes. `detailsSheet()` and `detailsTile()` build the sheet and the tile, so compact, standard and featured footprints plus the sheet come for free.
3. `src/ha/mappers/<name>.ts` and, for a control, `src/ha/actions/<name>.ts`: the raw attributes and the native services, through `serviceRunner()` (`home-assistant-integration` skill). Keep the fixture's `unknown` and `unavailable` entities. `src/ha/hooks/<name>.ts` (`useHa<Name>`) wires them to the store; any companion entities or options belong there, and `src/skins/orb/ha/Ha<Name>Tile.tsx` only passes them through.
4. Move it to the right section in `src/skins/orb/dashboards/Dashboards.stories.tsx`: the generator only puts it on screen (a control in the phone's Controls, a reading beside the room sensors).
5. Finish its section in `docs/widgets.md`, and add it to `docs/home-assistant.md`'s slice list.
6. Finish its Lovelace card in `src/skins/orb/lovelace/`: its YAML keys (`KIND_KEYS` and the `switch` in `config.ts`, `tile()` in `ConfigDashboard.tsx`) and their rows in `docs/deploy.md`, and its place in `auto.ts`. A domain has one default widget in `DOMAIN_KIND`; another widget on the same domain goes in `SHARED_KINDS`, picked with `widget:` or by an entity-id pattern. The generator places only a control on a new domain in `auto.ts`. A hand-built widget needs all of this.

`src/skins/orb/widgets/conformance.test.ts` holds every widget, generated or hand-built, to the files, card system, class prefix, exports, dashboard, docs and Home Assistant connection above, and says which step is missing. Then verify per the section above.
