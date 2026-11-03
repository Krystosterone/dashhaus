# AGENTS.md

React + TypeScript skins for a custom Home Assistant dashboard, developed and shown in Storybook. This is a component library, not a runnable app; the checks are the ones under Commands. The current skins are Orb (`src/skins/orb/`, `@dashhaus/orb`) and Field (`src/skins/field/`, `@dashhaus/field`), both fixed-version workspace packages; the entity models and Home Assistant logic under them are skin-free. `@dashhaus/bundle` ships the prebuilt one-file Lovelace bundle and `packages/create-dashhaus-skin` scaffolds a standalone skin outside this repository (`spec/build-a-skin.md`). The spec lives in `spec/`, written for agents and maintainers and read by tests, generators and Storybook; `docs/` is the documentation site for people, published to GitHub Pages (dated research reports stay in `docs/research/`, outside the site). The spec is split: `spec/orb.md` contains Orb's design and composition rules, `spec/field.md` contains Field's, and `spec/cards.md` contains per-card behaviour. Consult the affected skin's rules and the card behaviour before changing it. `spec/contract.md` is what a third-party skin may rely on from `@dashhaus/dashboard`. `spec/performance.md` documents the opt-in marks and the live production measurement command. Open research — an unimplemented decision or an unrun validation — lives in `research/README.md`, with the component gaps the implemented contracts still imply in `research/mechanism-backlog.md`; an implemented decision lives in the doc, skill or code that owns it, not in a note.

## Vocabulary

One word per thing, the same in code, Storybook and the docs.

- **Card** — one model drawn on a dashboard, Home Assistant's word for it. Every skin keeps its cards in `src/skins/<skin>/cards/<name>/` and files their stories under `<Skin>/Cards/<Name>`. "Widget" is the old name; don't bring it back.
- **Model** — the normalized object a card draws, from `useHa<Name>`. A **direct model** is one Home Assistant entity (a light, a thermostat, a cover); a **composed model** is a primary entity plus companions the hook composes (found beside it, or given as options): a sensor with its device's humidity and battery, a sound machine's switch and volume, the weather with air quality and sun, an Owlet sock's sensors and base station. Composition lives in the entity type and the hook, never in the card: every card still takes one `entity` prop, so a dashboard, layout or YAML treats every card alike. "Device card" describes a composed model from one device; it is not a third card type.
- **Interaction** — what a card lets you do: a **control** has a primary action, a **reading** only shows values. It is a trait of the props (an alarm can be view-only, a reading can carry a small action), never a third card type.
- **Tile** — orb's card ready for a dashboard: the card in its size container with its details sheet wired in (`<Name>Tile`, from `detailsTile()`). `<Name>Card` draws the card itself, and draws it again as `variant="sheet"` inside the sheet.
- **Module** — field's card: the plate with its key, screen and fader (a reading's glyph, screen and today), carrying its own detail panel (`<Name>Module`). It is to field what the tile is to orb; field's YAML lists them under `cards:`, as orb's does.
- **Details** — what a card opens from its name or a press and hold: orb's sheet, field's panel. Stories say Details for both.
- **Footprint** — a card's fixed height: `compact`, `standard`, `featured` in orb; `compact`, `standard` in field.
- **Card code** — the two letters that prefix a card's CSS classes (`lw-`), and the `code` `useCard` takes.
- **Bundle** — orb only: several cards drawn as one outer card (joined, lead, titled).
- **Dashboard** — a page of cards and what frames them: `DashboardPage`, `Section`, `CardGrid`, `Columns`, `Cell`, the `Header` and the `NavBar`. The header and the nav bar are page furniture, not cards.
- **Foundation** — a story about a skin's rules rather than one card: its palette, colour temperature, compact rows, worst-case data side by side.
- **Connected** — a card bound to the store: `Ha<Name>Tile` in orb, `Ha<Name>Module` in field, on the shared `useHa<Name>` hook. Its stories are under `<Skin>/Connected/<Name>`.
- **Lovelace card** — the custom element Home Assistant loads (`custom:dashhaus-orb`, `custom:dashhaus-field`); it draws a whole dashboard from its YAML. Always say Lovelace card for it, so "card" alone keeps meaning one model's card. Inside its YAML, `cards:` lists cards, `rows:` lists rows of them and `card:` picks which card draws an entity.
- **Row** — one band of a Lovelace card's page: an optional title (a titled row is a section the nav can jump to), its `columns`, and its `cards`, each placed by `width` and `column`. Rows never nest. The shared reader and placement are `readBody` (`@dashhaus/dashboard/schema`), `placeRow` (`/layout`) and `useRowLayout` (`@dashhaus/dashboard`); spec/deploy.md → The format.
- **Primitive** — a headless interaction hook in `packages/core/src/primitives/`: behaviour, no markup.
- **Part** — a skin's styled control in its `shared/`, drawn on a primitive where it has behaviour: orb's `Orb`, `TogglePill`, `Chip`, `Stepper`, `Track`; field's `Key`, `Fader`, `RangeFader`, `Screen`, `Meter`. A card is built from parts and brings only what is its own (a track's fill, a screen's figure). Each skin's **Foundations → Parts** story shows its parts across their states.
- **Seed** — demo data for one example entity, in a card's `demo/`; `<NAME>_WORST_CASE` are its worst-case seeds.

## Commands

- `npm install`
- `npm run check` — typecheck + lint + test, the one-shot gate. Run it before every change is finished.
- `npm run typecheck` — `tsc --noEmit` over the root, every public package and the docs' samples
- `npm run lint` — `eslint .` (`eslint.config.js`)
- `npm run test` — Vitest (`config/vitest.config.ts`), one project per public package plus the root app; `test:unit` (everything but the generator copies) and `test:generators` are CI's split of it
- `npm run test-storybook` — builds Storybook in test mode (no docs pages), then every story renders and passes axe in Chromium; failures name the rule, impact and elements
- `npm run storybook` — dev server at http://localhost:6006; `build-storybook` builds it to `storybook-static/`
- `npm run build:ha` — the Lovelace card as one file, `dist/dashhaus.js`, also copied to `packages/bundle/dist/`
- `npm run build:packages` — every public package's `dist`; the workspace keeps reading source (`spec/release.md`)
- `npm run docs` — the documentation site's dev server; `build:docs` builds it to `docs/dist/` with Storybook under `docs/dist/storybook/`
- `npm run release:version -- <x.y.z>` (then `npm install --package-lock-only`), `release:pack`, `verify:packages`, and `release:check` for pack then verify (`spec/release.md`)
- `npm run deploy [-- …]` — the `@dashhaus/deploy` CLI over `dashboard.config.mjs` and the `.env` beside it (`spec/deploy.md`)
- `npm run perf:collect` — measure the deployed dashboards against the live Home Assistant (`spec/performance.md`)
- `npm run new-card -- <name> --code <xx> --domain <ha_domain> [--kind control|reading]` — scaffold and register a new card (see Adding a card)
- `npm run new-card -- <name> --skin field [--kind control|reading]` — draw a domain orb already has in field (see Adding an existing domain to another skin)
- `npm run new-skin -- <lower-case-kebab-name> [--dry-run]` — create and register a neutral, working skin shell (see Adding a skin and `spec/skins.md`)
- `npm run study -- <name> (--image <path> | --describe "<text>")`, then `npm run study:keep -- <name>` — a study run: a fresh agent builds a skin from the release tarballs in a sandbox; keeping it brings it into `src/skins/<skin>/` as a study (`spec/skins.md` → Running a study)
- `npm run domains` — rewrite the scaffolder's `src/domains.json`, what its `add` command can draw, from `@dashhaus/core`'s sources; a test fails when it is stale, and the orb `new-card` refreshes it

Commands that launch a browser use the pinned Playwright's Chromium unless `DASHHAUS_CHROMIUM` names a Chromium or Chrome executable (`scripts/chromium.js`).

The toolchain is Node 22 (`.nvmrc`) and npm 11.18 (`packageManager`, enabled with `corepack enable npm`). Any other npm rewrites `package-lock.json`, so it fails before it installs; if an install already ran, `git checkout package-lock.json`.

Node-run ESM is `.js` under `"type": "module"`. The only first-party `.mjs` is a file named `dashboard.config.mjs`, the public deploy config; ESLint rejects any other.

## Verifying changes

1. `npm run check` — typecheck, lint, and unit tests.
2. `npm run test-storybook` — every story renders and passes axe. Where `npx playwright install chromium` can't fetch the pinned build, set `DASHHAUS_CHROMIUM=/path/to/chromium`.
3. `npm run storybook` — open the affected card's All states, Sizes, Footprints, Compact, Worst case and Details stories, and check every width and footprint. For Orb-wide changes, also inspect Orb → Foundations → Worst case.
4. `npm run build:docs` — when `docs/` or the scaffolder's templates change.
5. `npm run release:check` — when a package manifest, bin, export or module filename changes; packs the seven tarballs and installs them into a clean app.

CI (`.github/workflows/ci.yml`) runs steps 1, 2 and 5 and the `dx` clean-room journeys on every push and pull request, each lane installing through `.github/actions/setup`; the Docs workflow runs step 4. Why its lanes are shaped as they are is in `spec/release.md` → CI.

When a check or CI lane is slow, follow the repo's `test-speed` skill (`.agents/skills/test-speed/`): it measures before changing anything, keeps coverage identical, and its `references/` hold every measured speedup and rejected option in this repository. Read its Rejected tables before proposing a change.

Unit tests cover pure logic, the interaction primitives, the shared hooks and the deploy CLI; stories are the documentation and the visual check. New pure logic gets a `*.test.ts` beside it. `src/skins/orb/styles/rules.test.ts` encodes the CSS design rules — colour tokens, the UI language (no hatching or soft accent), compositor-only motion, `--ease-*` easing, hover under the capability media query, track `touch-action` — so changing one of those rules means updating the test. Do not add another test runner or linter.

Checks that execute a package's binary resolve it from that package's `package.json` (`bin`, `exports`); never hard-code a module filename, so a rename cannot leave a test pointing at a missing entry.

## Layout

The code is split by responsibility, so a whole different UI, a skin, can sit on the same logic. A package's surface is its `package.json` exports and README; how packages are built and packed is `spec/release.md`.

- `packages/core/` — `@dashhaus/core`, the headless foundation (`spec/core.md`): `src/entities/` (pure models and logic, one folder per kind), `src/primitives/` (interaction hooks), `src/hooks/` (React hooks with no UI), `src/ha/` (the Home Assistant boundary, `spec/home-assistant.md`: store, mappers, actions, `useHa<Name>` in `ha/hooks/`, headless components), `src/perf.ts` (opt-in marks), `src/demo/` and `src/testing.tsx`.
- `packages/dashboard/` — `@dashhaus/dashboard`, the Lovelace framework every skin draws on: `.` (custom-element base, nav, tokens), `./skin` (the frozen skin-author runtime), `./card` (the card frame), `./schema` and `./layout` (pure, so a Node config imports them) and `./conformance` (the Node-only card preset). What a third-party skin may rely on is `spec/contract.md`.
- `packages/deploy/` — `@dashhaus/deploy`, the Node-only deploy CLI (`spec/deploy.md`); `./config` is the pure surface `dashboard.config.mjs` imports.
- `packages/bundle/` — `@dashhaus/bundle`, the prebuilt one-file Lovelace bundle `build:ha` writes.
- `packages/create-dashhaus-skin/` — the standalone skin scaffolder (`spec/build-a-skin.md`), and the owner of the templates every skin starts from: `src/templates/skin/` (the shared core) and `src/templates/card/` (one domain's card), which `new-skin` and `new-card` also lay out, adding their in-repo stories and tests; `src/templates/standalone/` is what a skin outside the repository adds. `src/card.js` turns a domain's description (`src/domains.json`) into its card, for its `add <domain>` command and for `new-card --skin`. Its standalone `AGENTS.md` is the one document a consumer's agent reads, so it changes with the templates.
- `packages/fake-home-assistant/` — a private, Node-only fake Home Assistant that `verify/dx/` and tests deploy into; not released.
- `src/skins/<skin>/` — one whole UI, a private workspace package `@dashhaus/<skin>`: `cards/<name>/`, `shared/` (its parts and card system), `dashboards/`, `stories/` (Foundations), `styles/tokens.css` (its only source of colour), `ha/` (connected cards), `lovelace/` (its Lovelace card: `config.ts`, `auto.ts`, renderer, `card.tsx`), `storybook.tsx` and `index.ts`, its public entry, which imports its tokens once and exports every card. Orb adds `bundles/` (`spec/orb.md`). Field (`spec/field.md`) lists a module's domains in `FIELD_KINDS` (`lovelace/config.ts`) and its connected module in `LIVE` (`lovelace/FieldDashboard.tsx`); a hand-built reading starts from `SensorModule`, a control from `LightModule`.
- `apps/lovelace/entry.ts` — the bundle's entry, the one file outside `src/` that ties the skins together.
- `dashboard.config.mjs` — the dashboards `npm run deploy` creates; the only file outside orb that imports `@dashhaus/orb/lovelace/auto`.
- `verify/` — the cross-skin checks (boundaries, conformance, the Storybook tree, the packages, the docs, the toolchain, studies), each saying in its header what it holds, and `dx/`, the clean-room consumer journeys over the packed tarballs.
- `scripts/` — the builds, `release/` (its rules in `manifest.js`), the perf collector and the generators, `new-card/` and `new-skin/`. Generators name packages through `scripts/packages.js`, never a path or a bare `@dashhaus/` literal, and register after `// new-card: …` or `// new-skin: …` marker comments. Change their templates when the framework changes, so new cards start from the current rules.
- `config/` — the tool configs the commands pass explicitly; `eslint.config.js`, `tsconfig.json` and `skills-lock.json` stay at the root because their tools only read them there.
- `docs/` — the documentation site for people (Astro Starlight): no repository paths and no rules for agents, except the **Develop in the monorepo** section. Every code sample is a file in `docs/examples/` shown with `Example.astro`, never a fence, and API lists come from the packages' types (`verify/docs.test.ts`). A change a person deploying or choosing a skin would notice (a deploy step, a new card, a skin's look) updates the site too; rerun `npm run screenshots -w docs` when a skin's phone example or a kind's first card story changes. The author guide is one page, `src/content/docs/start/build-a-skin.mdx`; extend it rather than adding a second.

Boundaries, enforced by ESLint and `verify/`:

- Skins never import each other. What two skins share moves to `@dashhaus/core` or `@dashhaus/dashboard/card`.
- Only a skin's `ha/`, `lovelace/` and `index.ts` import `@dashhaus/core`'s Home Assistant subpaths. Its `lovelace/` may import `@dashhaus/dashboard/skin`, `/schema` and `/layout`, its `shared/` `@dashhaus/dashboard/card`; `lovelace/auto.ts` imports only pure modules.
- `packages/core/src/entities/` has no React, CSS or skin imports; `@dashhaus/core` and `@dashhaus/dashboard` never import a skin; `@dashhaus/deploy` imports neither of them.
- The root consumes packages by specifier, reading source through the `source` export condition; importing a file inside a package is a lint error.

### Adding a skin

Run `npm run new-skin -- <lower-case-kebab-name>`; for example, `npm run new-skin -- canvas`. It validates every registration and the package name (`@dashhaus/<skin>`, reserved names refused) before it creates a private workspace package at `src/skins/<skin>`, linked by `npm install` through the `src/skins/*` glob; add domains with `npm run new-card -- light --skin canvas`. Existing Orb and mature Field keep their specialized generator adapters. A **study** starts as a study run, a fresh agent building a standalone skin the way someone outside the repository would, from the release tarballs; `npm run study:keep` brings it in as a skin marked a study, via `new-skin <skin> --study` (`npm run study -- <name> --image <path>`, then `npm run study:keep -- <name>`; spec/skins.md → Studies). The workflow, namespaces and rules are [spec/skins.md](spec/skins.md); a standalone skin in its own directory, from the published packages with no Storybook or workspace, is `npm create dashhaus-skin@latest my-skin` ([spec/build-a-skin.md](spec/build-a-skin.md)).

### Adding an existing domain to another skin

The domain and Home Assistant slice already exist; add only the new skin's drawing and adapters. For field, `npm run new-card -- <name> --skin field` does steps 2 to 5: it reads the domain's types, `useHa<Name>` and handlers, copies orb's demo seeds into the card's own `demo/`, and draws a **control** (one key over `onToggle`, the default when the domain has actions) or a **reading** (glyph and today, the default when it has none; `--kind reading` for a control domain whose keys you'll add by hand). It refuses, saying why, a domain whose hook needs an option it can't know (a required option in `Ha<Name>Options`) or whose handlers have no `onToggle` without `--kind reading`. `verify/field-conformance.test.ts` then holds the card to these steps, hand-built or generated. Then make it the real thing: its screen, its glyph and pictogram in `icons.tsx`, its sections in `spec/field.md` and `spec/cards.md`.

1. Reuse `packages/core/src/entities/<name>/` and `useHa<Name>` from `packages/core/src/ha/hooks/<name>.ts`. Do not fork its entity model, mapper, actions, history parsing or demo transport for a skin.
2. Add the presentational component, skin-prefixed CSS, icons, local demo seeds, interaction tests and stories under `src/skins/<skin>/cards/<name>/`, its stories titled `<Skin>/Cards/<Name>` with the standard set (Storybook below). Presentational files never import `@dashhaus/core`'s Home Assistant subpaths; keep worst-case data in the demo seeds rather than adding product-only debug props or URL switches.
3. Add `src/skins/<skin>/ha/Ha<Name><Surface>.tsx`, where `<Surface>` is that skin's noun such as `Tile` or `Module`. It calls the shared `useHa<Name>` hook and only adapts its result to the presentational component. Add its real-store Storybook story, titled `<Skin>/Connected/<Name>`, and focused adapter tests.
4. Extend that skin's Lovelace parser, generated layout and renderer, plus the corresponding YAML in `spec/deploy.md`. Reuse the connected container there instead of repeating hook-to-view wiring. In field: the card's domains in `FIELD_KINDS` (an `id` pattern, or `card:`, picks it on a domain another card draws) and its connected module in `LIVE`.
5. Export the presentational component, connected container and their prop types from the skin's entry (`src/skins/<skin>/index.ts`); token CSS is imported once per skin, by that entry and not by individual cards.
6. Run the skin's rules test, `npm run check`, `npm run test-storybook` and `npm run build:ha`; visually inspect the state matrix, every supported width and footprint, compact rows, details, unavailable data and the longest labels.

## Storybook

Every skin's section has the same groups, in this order, so the tree has one shape whichever skin you open; Bundles alone is orb's. `.storybook/preview.tsx`'s `storySort` lists them and `verify/storybook.test.ts` checks both. A study (spec/skins.md → Studies) sits under a last top-level **Studies** section as `Studies/<Name>`, and opens on a **Read me first** page drawn from its README before the same groups; its Foundations → Design rules draws its own `design.md`.

1. **Cards** — `<Skin>/Cards/<Name>`, one per card. Every card has the same stories under the same names: its own states first, then **Unavailable**, **Worst case** (its `<NAME>_WORST_CASE` or worst-case seed), **All states**, **Sizes**, **Footprints**, **Compact**, **Details**, **Details, unavailable** and **Details, phone**. A card adds stories for what only it can do (a climate range, a colour lamp, a view-only alarm) beside the one they extend, and drops none.
2. **Bundles** — orb only: its joined, lead and titled bundles. A bundle is an orb idea, not a gap in other skins, so they leave the group out.
3. **Dashboards** — whole pages and their furniture: every skin's hand-composed `Examples` (phone, tablet, wall panel), its `Lovelace card`, its whole dashboard drawn from YAML on the demo transports, its `Header` and its `Nav bar`. The examples show ways to compose a dashboard, not a register of cards: a card belongs in one only when it shows something about composing.
4. **Foundations** — a skin's rules across cards, first its **Design rules**: an MDX page that draws the skin's spec (orb: `spec/orb.md`; field: `spec/field.md`) through `.storybook/blocks/MarkdownWithStories.tsx`, with chosen stories after their sections. The markdown stays the source, so edit it, not the page; every section shows unless the page skips it by heading. Then each skin's palette and **Parts** (its parts from `shared/`, each across its states, drawn with the skin's own components and CSS); orb's colour temperature, compact rows and worst case.
5. **Connected** — one story per card under the card's name: its connected card on the demo transports, so a press goes through the `useHa<Name>` hook, mapper and actions and the state comes back through the store. These live in the skin's `ha/`, apart from `Cards`, because only `ha/` and `lovelace/` may import `@dashhaus/core`'s Home Assistant subpaths.

Any other group a skin can't fill holds one **Not in <Skin>** story that says why, never filler. Today every skin fills every group it has.

Primitives (`packages/core/src/primitives/`) have no stories: they are behaviour without markup, pinned by the unit tests beside each hook and felt in the skins' card stories (`spec/core.md` → Interaction primitives).

## Hard rules

For every skin, the rules in spec/skins.md → Rules every skin keeps: one card, one model (a direct one Home Assistant entity, or a composed one with the companions its hook composes); colours come from tokens (no colour literal in a skin's CSS); a card's height never changes with its state; motion only on `transform`, `opacity`, `clip-path` and colours, with easing from tokens; hover only under `@media (hover: hover) and (pointer: fine)`; a theme attribute of its own (never the shared `data-theme`); controls feel like controls (no selection or tap highlight, `touch-action: manipulation`, press feedback on `:active`). That section is their one home; the scaffold's `AGENTS.md` repeats them for consumers, and `verify/skin-rules.test.ts` keeps the two in step.

For the orb skin:

- The accent is `--brand-c` / `--brand-h`; easing comes from the `--ease-*` tokens; a card's height comes from the shared `footprint` matrix plus container width.
- One UI language (spec/orb.md → One UI language): a raised `--btn` is tapped, a recessed `--groove` is slid or set, a readout has no container; solid accent is on for every role; a dashed outline is unavailable and nothing else. No hatching, no second strength of accent, no default orb colour.
- No expanding cards: more detail opens in a sheet, from a tap on the card's name (`CardTitle`) or a press and hold. Cards carry no open button.
- Prefix each card's CSS classes with its card code: `lw-` light, `cw-` climate, `sw-` sensor, `al-` alarm, `cv-` cover, `tw-` toggle, `wx-` weather, `ow-` owlet sock, `hu-` humidifier, `sn-` sound, `lk-` lock<!-- new-card: orb codes -->. Outside the cards, `hh-` is the dashboard header, `hb-` the bundles and `hd-` the shared card system.
- Attention follows the spec/orb.md glow contract and the `attention-budget` skill: glow is never the only state channel, damping follows semantic urgency not card position, and urgent states get a warn marker rather than more brightness.
- Every compact row carries a domain icon, primary identity and one state/action cue; colour never defines a row.

For the field skin:

- Shared classes use `fd-`; card classes add `fd-lt-` for light, `fd-cl-` for climate, `fd-sw-` for sensor, `fd-wx-` for weather, `fd-tw-` for toggle, `fd-hu-` for humidifier, `fd-sn-` for sound, `fd-cv-` for cover, `fd-al-` for alarm and `fd-ow-` for owlet, `fd-lk-` for lock<!-- new-card: field codes -->.

## Design review

When design or visual quality is at stake, use these authorities, all committed under `.agents/` (Claude Code sees the skills through the `.claude/skills/` symlinks):

- **Design phase:** run design decisions through the UX Researcher and UI Designer roles in `.agents/design/`.
- **After building:** run Impeccable's `critique`, `audit`, and `polish` on the card's story (`/impeccable …`; skill at `.agents/skills/impeccable/`).
- **Motion and worst-case data:** apply Emil Kowalski's skills in `.agents/skills/` — `review-animations`, `animation-performance`, `mobile-native`, `break-ui`. They are the source of the motion rules in spec/orb.md.
- **Attention and glow:** follow the repo's own `attention-budget` skill (`.agents/skills/attention-budget/`); it carries the spec/orb.md glow contract.
- **Row identity:** apply the repo's own `row-identity` skill when building or editing compact cards or reviewing the Controls column; it carries the spec/orb.md compact-row identity rule.
- **Not used:** taste-skill and third-party DESIGN.md files. If a DESIGN.md is ever needed, generate it from this codebase (Impeccable `document`), never import one.
- **Updating:** `npx skills update` for Emil's skills, `npx impeccable update` for Impeccable; review the diff before committing.

## Adding a card

```sh
npm run new-card -- fan --code fn --domain fan                                  # a control: on/off, over fan.toggle
npm run new-card -- co2 --code co --domain sensor --kind reading --unit ppm     # a reading: read-only number
# add --dry-run to preview
```

Pick the kind by what the card does: a **control** (default) is an orb and a pill that switch the entity; a **reading** is a bare icon and a readout that only show it, with no services. Either way it writes a working card, Home Assistant side included, and registers it everywhere: `src/skins/orb/index.ts`, `packages/core/src/index.ts`, the fixture test, the headless components, `spec/cards.md`, the prefix list above, and the orb skin's Lovelace card (`src/skins/orb/lovelace/`, `spec/deploy.md`). It passes `npm run check` and `npm run test-storybook` before you touch it. Then make it the real thing:

1. `packages/core/src/entities/<name>/types.ts`: the fields the card shows. `src/skins/orb/cards/<name>/icons.tsx`: its domain icon.
2. `<Name>Card.tsx`: the card. It is built from the shared card system in `src/skins/orb/shared/ui.tsx`: `useCard(code, …)` gives the `article` attributes, footprint flags and ids; an `hd-head` holds the `Orb`, the `CardTitle` (given `onOpen` outside the sheet) and, in the sheet only, `SheetClose`; then one `hd-slot` and the sheet blocks. Spread `paint(role, glow, own, prop)` onto the article for its colour role, glow and colour slot. A reading's figures go in a `Readout`, laid out with the shared `hd-bar`, `hd-metric`, `hd-label` and `hd-none` classes. `detailsSheet()` and `detailsTile()` build the sheet and the tile, so compact, standard and featured footprints plus the sheet come for free.
3. `packages/core/src/ha/mappers/<name>.ts` and, for a control, `packages/core/src/ha/actions/<name>.ts`: the raw attributes and the native services, through `serviceRunner()` (`home-assistant-integration` skill). Keep the fixture's `unknown` and `unavailable` entities. `packages/core/src/ha/hooks/<name>.ts` (`useHa<Name>`) wires them to the store; any companion entities or options belong there, and `src/skins/orb/ha/Ha<Name>Tile.tsx` only passes them through.
4. Leave the example dashboards (`src/skins/orb/dashboards/Examples.stories.tsx`) alone unless the card shows something about composing a page they don't: they are examples, not a list of every card. Its own stories show it on its own, and the Lovelace card's dashboard shows it among the others from YAML.
5. Finish its section in `spec/cards.md`, and add it to `spec/home-assistant.md`'s slice list.
6. Finish its Lovelace card in `src/skins/orb/lovelace/`: its YAML keys (its `KIND_SPECS` entry in `config.ts`, its `TILES` row in `ConfigDashboard.tsx`) and their rows in `spec/deploy.md`, and its place in `auto.ts`. A domain has one default card in `DOMAIN_KIND`; another card on the same domain goes in `SHARED_KINDS`, picked with `card:` or by an entity-id pattern. The generator places only a control on a new domain in `auto.ts`. A hand-built card needs all of this.

`verify/orb-conformance.test.ts` holds every card, generated or hand-built, to the files, card system, exports, docs and Home Assistant connection above, and to the generic preset for its story section, class codes and imports, and says which step is missing; `verify/storybook.test.ts` holds its stories to the standard set. The generated stories already have it: replace the seeds, keeping `unavailable` and the worst case in `<NAME>_WORST_CASE`. Then verify per the section above.
