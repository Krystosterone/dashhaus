# AGENTS.md

React + TypeScript skins for a custom Home Assistant dashboard, developed and shown in Storybook. This is a component library, not a runnable app; the checks are the ones under Commands. The current skins are Orb (`src/skins/orb/`) and Field (`src/skins/field/`); the entity models and Home Assistant logic under them are skin-free. The spec is split: `README.md` contains Orb's design and composition rules, `docs/field.md` contains Field's, and `docs/widgets.md` contains per-widget behaviour. Consult the affected skin's rules and the widget behaviour before changing it. Research decisions and evidence live in `research/README.md` and the `research/` notes; component gaps in `research/mechanism-backlog.md`.

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
3. `npm run storybook` — open the affected widget's state matrix, Sizes and Compact stories, check every width and footprint, and inspect its Worst case story when present. For Orb-wide changes, also inspect Orb → Foundations → Worst case.

Unit tests cover pure logic, the interaction primitives and shared hooks (kelvin, track position, formatting, alarm mapping, nav resolution, `usePress`, `useSlider`, `useRangeSlider`, `useSheet`, `useNow`, `useScrollSpy`, `useHashPage`); stories are the documentation and the visual check. New pure logic gets a `*.test.ts` beside it. `src/skins/orb/styles/rules.test.ts` encodes the CSS design rules — colour tokens, the UI language (no hatching or soft accent), compositor-only motion, `--ease-*` easing, hover under the capability media query, track `touch-action` — so changing one of those rules means updating the test. Do not add another test runner or linter.

## Layout

The code is split by responsibility, so a whole different UI, a skin, can sit on the same logic.

- `src/domains/` — what every skin shares: one folder per entity kind with its entity and history types (`types.ts`) and pure logic (`light/kelvin.ts`, `climate/modes.ts`, `weather/conditions.ts`), plus `history.ts` (`HourSample`, `Reading`), `color.ts` (`ColorName`) and `format.ts` (`fmt1`). No React, no CSS, no skin imports; ESLint enforces it.
- `src/primitives/` — the headless interaction primitives every skin draws its controls on: behaviour and semantics, never markup or styles. Each is a hook whose result a skin spreads onto its own elements. `usePress` (`press.ts`) is a button: tap, optional press and hold (the click that ends a hold doesn't also press), optional latch (`aria-pressed`), and unavailable (`aria-disabled`, still focusable) or disabled; every latching or holding control goes through it, and a plain one-shot button stays a native `<button>`. `useSlider` and `useRangeSlider` (`slider.ts`) are a horizontal track: pointer input on a hit layer (mouse jumps on press, touch on a tap or the first sideways move, so a scroll never sets a value; `data-anim` only on a jump), and a hidden native range input for keyboard and screen readers, with its value text. `useSheet` (`sheet.ts`) is a native modal `<dialog>`: mount, show, scroll lock, `data-closing` exit, Escape and backdrop close, and drag down to close on phones. Radix was weighed and not adopted (`research/08-interaction-primitives.md`); add a primitive only when a skin needs it.
- `src/hooks/` — React hooks with no UI of their own, for every skin and the Home Assistant hooks: `useNow`, and for a page's nav, `useScrollSpy` (the section being read, and a jump to one) and `useHashPage` (the page on screen, kept in the URL hash).
- `src/ha/` — the Home Assistant boundary (`docs/home-assistant.md`): transport, store, provider, mappers, actions and history parsing, importing entity models from `src/domains/` and never a skin (ESLint enforces it). Any skin gets one live entity from `src/ha/hooks/<name>.ts`, `useHa<Name>(entityId, options)` returning the mapped `entity`, today's `history` and, for a control, its `actions`, or from the same hook as a headless component in `src/ha/headless.tsx` (`<HaLight entityId>{(light) => …}</HaLight>`), for a list of entities. `src/ha/demo/` holds the demo transports (`house.ts` puts them together as one house). `src/ha/lovelace/` is what every skin's Lovelace card shares: `element.tsx`, the custom-element base (shadow root, one store per frontend connection, the React root, the skin's web font linked from the page), `yaml.ts` (the YAML reader every card's config extends: problems with their paths, "did you mean"), `actionMessage.ts` (the words for a rejected command), `nav.ts` and `useDashboardNav.ts` (a card's bottom nav: its destinations, their labels, and what each tap does), `styles.ts` (tokens onto the shadow host), and `entry.ts`, the bundle's entry, which registers each skin's card.
- `src/skins/<skin>/` — one whole UI. A skin owns its `styles/tokens.css` (its only source of colour), its `storybook.tsx` (its Storybook section, toolbar and decorator, listed in `.storybook/preview.tsx`), stories titled `<Skin>/…`, its connected tiles in `ha/` and its Lovelace card in `lovelace/`; only those two folders may import `src/ha/`. Skins never import each other (`src/skins/boundaries.test.ts`): what two skins share moves to `src/domains/`, `src/primitives/`, `src/hooks/` or `src/ha/`.
- `src/skins/orb/` — the orb skin, the dashboard's UI:
  - `widgets/<name>/` — one widget per folder: component, CSS, `demo/`, and `<Name>.stories.tsx` titled `Orb/Widgets/<Name>`; `widgets/conformance.test.ts` holds every widget to the steps in Adding a widget.
  - `shared/` — the card system (`card.css`, `ui.tsx`).
  - `bundles/` — `JoinedBundle`, `LeadBundle` and `TitledBundle`. `dashboards/` — `DashboardPage`, `Section`, `Columns`, `Cell`, the bottom `NavBar`, and the dashboard stories. `stories/` — Foundations stories: colour temperature, worst-case data, compact rows.
  - `styles/` — `tokens.css`, and `rules.test.ts`, the CSS rules below as checks.
  - `ha/` — the `Ha<Name>Tile` containers: each `useHa<Name>` hook above the widget's tile.
  - `lovelace/` — its card, `custom:home-dashboard`: the YAML parser (`config.ts`), the generated layout (`auto.ts`, also imported by `scripts/deploy.mjs`, so it may only use `import type`), the renderer (`ConfigDashboard.tsx`), the rejected-command row (`ActionStatus.tsx`) and the element (`card.tsx`).
- `src/index.ts` — public exports. Every new widget must be exported here.
- `scripts/new-widget/` — the widget generator, drawing new widgets in the orb skin. `templates/common` plus `templates/control` or `templates/reading` mirror the repo with `__Name__`, `__name__`, `__code__`, `__domain__` and `__unit__` placeholders. Change the templates when the framework changes, so new widgets start from the current rules. `index.test.ts` runs the generator: a dry run against the repo for every anchor it edits, and a real run in a temporary copy that must typecheck and pass the conformance test.

- `src/skins/field/` — the field skin, a second UI after Teenage Engineering's EP–133 K.O. II (`docs/field.md`): `shared/` owns the module, key, screen, fader, meter and detail panel in `ui.tsx`, `module.css` and `panel.css`; `widgets/light/` and `widgets/climate/` own `LightModule` and `ClimateModule`, each with its CSS, demo, stories, tests and detail content; `ha/` connects them as `HaLightModule` and `HaClimateModule`; `styles/` owns `tokens.css` with every token prefixed `--fd-` and `rules.test.ts`; `lovelace/` owns `custom:home-dashboard-field` through `config.ts`, `auto.ts`, `FieldDashboard.tsx` and `card.tsx` (YAML in `docs/deploy.md` → The field dashboard). Shared classes use `fd-`; widget classes add `fd-lt-` for light and `fd-cl-` for climate.

### Adding a skin

Create `src/skins/<skin>/` with its `styles/tokens.css` (scope its tokens so they can't collide with another skin's) and a `storybook.tsx` like orb's (its section, toolbar, `surface` body class and decorator), added to `SKINS` in `.storybook/preview.tsx`, and title its stories `<Skin>/…`. Draw its cards from the `useHa<Name>` hooks or headless components, and its buttons, tracks and sheets on `src/primitives/`; never import another skin. For Home Assistant, extend `LovelaceDashboardElement` (`src/ha/lovelace/element.tsx`) in its `lovelace/`, giving it the skin's `fontHref`, read its YAML with `src/ha/lovelace/yaml.ts`'s `Reader`, import its `tokens.css` and register the card in `src/ha/lovelace/entry.ts`. Write its own design rules down, and encode them in a rules test like orb's.

### Adding an existing domain to another skin

The domain and Home Assistant slice already exist; add only the new skin's drawing and adapters:

1. Reuse `src/domains/<name>/` and `useHa<Name>` from `src/ha/hooks/<name>.ts`. Do not fork its entity model, mapper, actions, history parsing or demo transport for a skin.
2. Add the presentational component, skin-prefixed CSS, icons, local demo seeds, interaction tests and stories under `src/skins/<skin>/widgets/<name>/`. Presentational files never import `src/ha/`; keep worst-case data in the demo seeds rather than adding product-only debug props or URL switches.
3. Add `src/skins/<skin>/ha/Ha<Name><Surface>.tsx`, where `<Surface>` is that skin's noun such as `Tile` or `Module`. It calls the shared `useHa<Name>` hook and only adapts its result to the presentational component. Add its real-store Storybook story and focused adapter tests.
4. Extend that skin's Lovelace parser, generated layout and renderer, plus the corresponding YAML in `docs/deploy.md`. Reuse the connected container there instead of repeating hook-to-view wiring.
5. Export the presentational component, connected container and their prop types from `src/index.ts`; token CSS is imported once per skin, not by individual widgets.
6. Run the skin's rules test, `npm run check`, `npm run test-storybook` and `npm run build:ha`; visually inspect the state matrix, every supported width and footprint, compact rows, details, unavailable data and the longest labels.

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
