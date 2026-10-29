# AGENTS.md

React + TypeScript skins for a custom Home Assistant dashboard, developed and shown in Storybook. This is a component library, not a runnable app; the checks are the ones under Commands. The current skins are Orb (`src/skins/orb/`) and Field (`src/skins/field/`); the entity models and Home Assistant logic under them are skin-free. The spec is split: `README.md` contains Orb's design and composition rules, `docs/field.md` contains Field's, and `docs/cards.md` contains per-card behaviour. Consult the affected skin's rules and the card behaviour before changing it. Research decisions and evidence live in `research/README.md` and the `research/` notes; component gaps in `research/mechanism-backlog.md`.

## Vocabulary

One word per thing, the same in code, Storybook and the docs.

- **Card** — one entity drawn on a dashboard, Home Assistant's word for it. Every skin keeps its cards in `src/skins/<skin>/cards/<name>/` and files their stories under `<Skin>/Cards/<Name>`. "Widget" is the old name; don't bring it back.
- **Tile** — orb's card ready for a dashboard: the card in its size container with its details sheet wired in (`<Name>Tile`, from `detailsTile()`). `<Name>Card` draws the card itself, and draws it again as `variant="sheet"` inside the sheet.
- **Module** — field's card: the plate with its key, screen and fader (a reading's glyph, screen and today), carrying its own detail panel (`<Name>Module`). It is to field what the tile is to orb; field's YAML lists them under `modules:`.
- **Details** — what a card opens from its name or a press and hold: orb's sheet, field's panel. Stories say Details for both.
- **Footprint** — a card's fixed height: `compact`, `standard`, `featured` in orb; `compact`, `standard` in field.
- **Card code** — the two letters that prefix a card's CSS classes (`lw-`), and the `code` `useCard` takes.
- **Bundle** — orb only: several cards drawn as one outer card (joined, lead, titled).
- **Dashboard** — a page of cards and what frames them: `DashboardPage`, `Section`, `CardGrid`, `Columns`, `Cell`, the `Header` and the `NavBar`. The header and the nav bar are page furniture, not cards.
- **Foundation** — a story about a skin's rules rather than one card: its palette, colour temperature, compact rows, worst-case data side by side.
- **Connected** — a card bound to the store: `Ha<Name>Tile` in orb, `Ha<Name>Module` in field, on the shared `useHa<Name>` hook. Its stories are under `<Skin>/Connected/<Name>`.
- **Lovelace card** — the custom element Home Assistant loads (`custom:home-dashboard`, `custom:home-dashboard-field`); it draws a whole dashboard from its YAML. Always say Lovelace card for it, so "card" alone keeps meaning one entity's card. Inside its YAML, `cards:` lists entity cards and `card:` picks which card draws an entity.
- **Primitive** — a headless interaction hook in `src/primitives/`: behaviour, no markup.
- **Part** — a skin's styled control in its `shared/`, drawn on a primitive where it has behaviour: orb's `Orb`, `TogglePill`, `Chip`, `Stepper`, `Track`; field's `Key`, `Fader`, `RangeFader`, `Screen`, `Meter`. A card is built from parts and brings only what is its own (a track's fill, a screen's figure). Each skin's **Foundations → Parts** story shows its parts across their states.
- **Seed** — demo data for one example entity, in a card's `demo/`; `<NAME>_WORST_CASE` are its worst-case seeds.

## Commands

- `npm install`
- `npm run storybook` — dev server at http://localhost:6006
- `npm run build-storybook` — static build in `storybook-static/`
- `npm run build:ha` — the Lovelace card as one file, `dist/home-dashboard.js`
- `npm run deploy` — build, copy into Home Assistant, register the resource, create the Orb and Field dashboards the first time (settings in `.env`, see `docs/deploy.md`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — `eslint .` (flat config in `eslint.config.js`)
- `npm run test` — `vitest run`; unit tests live next to their module as `*.test.{ts,tsx}`
- `npm run test-storybook` — every story must render (smoke) and pass axe (a11y) in Chromium; failures print the rule, impact, and target elements
- `npm run check` — typecheck + lint + test, the one-shot gate. Run it before every change is finished.
- `npm run new-card -- <name> --code <xx> --domain <ha_domain> [--kind control|reading]` — scaffold and register a new card (see Adding a card)
- `npm run new-card -- <name> --skin field [--kind control|reading]` — draw a domain orb already has in field (see Adding an existing domain to another skin)

## Verifying changes

1. `npm run check` — typecheck, lint, and unit tests.
2. `npm run test-storybook` — every story renders and passes axe; failures name the rule, impact, and elements.
3. `npm run storybook` — open the affected card's All states, Sizes, Footprints, Compact, Worst case and Details stories, and check every width and footprint. For Orb-wide changes, also inspect Orb → Foundations → Worst case.

Unit tests cover pure logic, the interaction primitives and shared hooks (kelvin, track position, formatting, alarm mapping and modes, nav resolution, `usePress`, `useSlider`, `useRangeSlider`, `useSheet`, `useKeypad`, `useNow`, `useDelayLeft`, `useScrollSpy`, `useHashPage`); stories are the documentation and the visual check. New pure logic gets a `*.test.ts` beside it. `src/skins/orb/styles/rules.test.ts` encodes the CSS design rules — colour tokens, the UI language (no hatching or soft accent), compositor-only motion, `--ease-*` easing, hover under the capability media query, track `touch-action` — so changing one of those rules means updating the test. Do not add another test runner or linter.

## Layout

The code is split by responsibility, so a whole different UI, a skin, can sit on the same logic.

- `src/domains/` — what every skin shares: one folder per entity kind with its entity and history types (`types.ts`) and pure logic (`light/kelvin.ts`, `climate/modes.ts`, `weather/conditions.ts`, `weather/readings.ts`, `toggle/durations.ts`), plus `history.ts` (`HourSample`, `Reading`), `color.ts` (`ColorName`) and `format.ts` (`fmt1`). No React, no CSS, no skin imports; ESLint enforces it.
- `src/primitives/` — the headless interaction primitives every skin draws its controls on: behaviour and semantics, never markup or styles. Each is a hook whose result a skin spreads onto its own elements. `usePress` (`press.ts`) is a button: tap, optional press and hold (the click that ends a hold doesn't also press), optional latch (`aria-pressed`), and unavailable (`aria-disabled`, still focusable) or disabled; every latching or holding control goes through it, and a plain one-shot button stays a native `<button>`. `useSlider` and `useRangeSlider` (`slider.ts`) are a horizontal track: pointer input on a hit layer (mouse jumps on press, touch on a tap or the first sideways move, so a scroll never sets a value; `data-anim` only on a jump), and a hidden native range input for keyboard and screen readers, with its value text. `useSheet` (`sheet.ts`) is a native modal `<dialog>`: mount, show, scroll lock, `data-closing` exit, Escape and backdrop close, and drag down to close on phones. `useKeypad` (`keypad.ts`) is a code keypad: the code typed so far, digits, delete and enter from its keys or a physical keyboard, and the answer (busy, a wrong code cleared, a failed call kept for another try). Radix was weighed and not adopted (`research/08-interaction-primitives.md`); add a primitive only when a skin needs it. Primitives have no stories of their own (Storybook → Primitives).
- `src/hooks/` — React hooks with no UI of their own, for every skin and the Home Assistant hooks: `useNow`, `useDelayLeft` (an alarm's exit or entry delay, counting down), and for a page's nav, `useScrollSpy` (the section being read, and a jump to one) and `useHashPage` (the page on screen, kept in the URL hash).
- `src/ha/` — the Home Assistant boundary (`docs/home-assistant.md`): transport, store, provider, mappers, actions and history parsing, importing entity models from `src/domains/` and never a skin (ESLint enforces it). Any skin gets one live entity from `src/ha/hooks/<name>.ts`, `useHa<Name>(entityId, options)` returning the mapped `entity`, today's `history` and, for a control, its `actions`, or from the same hook as a headless component in `src/ha/headless.tsx` (`<HaLight entityId>{(light) => …}</HaLight>`), for a list of entities. `src/ha/testing.tsx` is for tests of connected cards: a fake transport and a render under a real store. `src/ha/demo/` holds the demo transports (`house.ts` puts them together as one house). `src/ha/lovelace/` is what every skin's Lovelace card shares: `element.tsx`, the custom-element base (shadow root, one store per frontend connection, the React root, the skin's web font linked from the page), `yaml.ts` (the YAML reader every Lovelace card's config extends: problems with their paths, "did you mean"), `actionMessage.ts` (the words for a rejected command), `nav.ts` and `useDashboardNav.ts` (a Lovelace card's bottom nav: its destinations, their labels, and what each tap does), `styles.ts` (tokens onto the shadow host), and `entry.ts`, the bundle's entry, which registers each skin's Lovelace card.
- `src/skins/<skin>/` — one whole UI. A skin owns its `styles/tokens.css` (its only source of colour), its `storybook.tsx` (its Storybook section, toolbar and decorator, listed in `.storybook/preview.tsx`), stories under its section's shared groups (Storybook below), its connected cards in `ha/` and its Lovelace card in `lovelace/`; only those two folders may import `src/ha/`. Skins never import each other (`src/skins/boundaries.test.ts`): what two skins share moves to `src/domains/`, `src/primitives/`, `src/hooks/` or `src/ha/`. The one file beside the skins, `src/skins/conformance.ts`, holds what their conformance tests read cards with, and only tests may import it.
- `src/skins/orb/` — the orb skin, the dashboard's UI:
  - `cards/<name>/` — one card per folder: component, CSS, `demo/`, and `<Name>.stories.tsx` titled `Orb/Cards/<Name>`; `cards/conformance.test.ts` holds every card to the steps in Adding a card.
  - `shared/` — the card system (`card.css`, `ui.tsx`) and its parts: the orb, title, pill, chips, stepper, readout, today strip, and `Track`, the one groove every card that slides draws (its hit layer, hidden range inputs and focus ring), the card bringing its `useSlider` or `useRangeSlider` and its own fill.
  - `bundles/` — `JoinedBundle`, `LeadBundle` and `TitledBundle`. `dashboards/` — `DashboardPage`, `Section`, `CardGrid`, `Columns`, `Cell`, the page's `Header`, the bottom `NavBar`, and their stories, with the example dashboards in `Examples.stories.tsx`. `stories/` — Foundations stories: palette, parts, colour temperature, compact rows, worst-case data.
  - `styles/` — `tokens.css`, and `rules.test.ts`, the CSS rules below as checks.
  - `ha/` — the `Ha<Name>Tile` containers: each `useHa<Name>` hook above the card's tile.
  - `lovelace/` — its card, `custom:home-dashboard`: the YAML parser (`config.ts`), the generated layout (`auto.ts`, also imported by `scripts/deploy.mjs`, so it may only use `import type`), the renderer (`ConfigDashboard.tsx`), the rejected-command row (`ActionStatus.tsx`) and the element (`card.tsx`).
- `src/index.ts` — public exports. Every new card must be exported here.
- `scripts/new-card/` — the card generator, drawing new cards in the orb skin (`index.mjs`) and, with `--skin field`, an existing domain in field (`field.mjs`); `lib.mjs` is what both share. `templates/common` plus `templates/control` or `templates/reading` mirror the repo with `__Name__`, `__name__`, `__code__`, `__domain__` and `__unit__` placeholders; `templates/field/` does the same for field: `common` holds what a control and a reading share (stories, tests, connected module, CSS, icons), and each kind only its module, its placeholders filled from the kind and from what the domain has (whether its entity has an area, its history samples, whether its demo has a hook); a placeholder that fills to nothing on a line of its own drops the line, so an optional prop stands on its own line. `lib.mjs` also holds a card's names (`names`) and orb's domain-to-card tables (`orbKinds`). Change the templates when the framework changes, so new cards start from the current rules. `index.test.ts` runs the generator: a dry run against the repo for every anchor it edits, the domains field must refuse, and a real run in a temporary copy, orb and field cards together, that must typecheck, lint and pass both conformance tests.

- `src/skins/field/` — the field skin, a second UI after Teenage Engineering's EP–133 K.O. II (`docs/field.md`): `shared/` owns its parts, the module, key, screen, fader, meter and detail panel in `ui.tsx`, `module.css` and `panel.css`, what a reading draws instead of a key and fader (`Glyph`, `Today`), the `Warn` marker, and `ModuleFrame` with `useDetails`, the frame every card is drawn in (its footprints, and the panel its name opens), so a card brings only its lead, screen, row and details; `cards/light/`, `cards/climate/`, `cards/sensor/`, `cards/weather/`, `cards/toggle/`, `cards/humidifier/`, `cards/sound/`, `cards/cover/` and `cards/alarm/` own `LightModule`, `ClimateModule`, `SensorModule`, `WeatherModule`, `ToggleModule`, `HumidifierModule`, `SoundModule`, `CoverModule` and `AlarmModule`, each with its CSS, demo, stories, tests and detail content; `ha/` connects them as `HaLightModule`, `HaClimateModule`, `HaSensorModule`, `HaWeatherModule`, `HaToggleModule`, `HaHumidifierModule`, `HaSoundModule`, `HaCoverModule` and `HaAlarmModule`; `styles/` owns `tokens.css` with every token prefixed `--fd-` and `rules.test.ts`; `lovelace/` owns `custom:home-dashboard-field` through `config.ts`, `auto.ts`, `FieldDashboard.tsx` and `card.tsx` (YAML in `docs/deploy.md` → The field dashboard). Shared classes use `fd-`; card classes add `fd-lt-` for light, `fd-cl-` for climate, `fd-sw-` for sensor, `fd-wx-` for weather, `fd-tw-` for toggle, `fd-hu-` for humidifier, `fd-sn-` for sound, `fd-cv-` for cover and `fd-al-` for alarm. A new module's domains go in `FIELD_KINDS` (`lovelace/config.ts`) and its connected module in `LIVE` (`FieldDashboard.tsx`); `npm run new-card -- <name> --skin field` does both, and a hand-built reading starts from `SensorModule`, a control from `LightModule`. `cards/conformance.test.ts` holds every field card to the steps in Adding an existing domain to another skin. `stories/` holds its Foundations stories (Palette: its parts and what each means; Parts: each part across its states).

### Adding a skin

Create `src/skins/<skin>/` with its `styles/tokens.css` (scope its tokens so they can't collide with another skin's) and a `storybook.tsx` like orb's (its section, toolbar, `surface` body class and decorator), added to `SKINS` in `.storybook/preview.tsx` and to its `storySort`, and file its stories under the shared groups (Storybook below). Draw its cards from the `useHa<Name>` hooks or headless components, and its buttons, tracks and sheets on `src/primitives/`; never import another skin. For Home Assistant, extend `LovelaceDashboardElement` (`src/ha/lovelace/element.tsx`) in its `lovelace/`, giving it the skin's `fontHref`, read its YAML with `src/ha/lovelace/yaml.ts`'s `Reader`, import its `tokens.css` and register the card in `src/ha/lovelace/entry.ts`. Write its own design rules down, and encode them in a rules test like orb's.

### Adding an existing domain to another skin

The domain and Home Assistant slice already exist; add only the new skin's drawing and adapters. For field, `npm run new-card -- <name> --skin field` does steps 2 to 5: it reads the domain's types, `useHa<Name>` and handlers, copies orb's demo seeds into the card's own `demo/`, and draws a **control** (one key over `onToggle`, the default when the domain has actions) or a **reading** (glyph and today, the default when it has none; `--kind reading` for a control domain whose keys you'll add by hand). It refuses, saying why, a domain whose hook needs an option it can't know (a required option in `Ha<Name>Options`) or whose handlers have no `onToggle` without `--kind reading`. `src/skins/field/cards/conformance.test.ts` then holds the card to these steps, hand-built or generated. Then make it the real thing: its screen, its glyph and pictogram in `icons.tsx`, its sections in `docs/field.md` and `docs/cards.md`.

1. Reuse `src/domains/<name>/` and `useHa<Name>` from `src/ha/hooks/<name>.ts`. Do not fork its entity model, mapper, actions, history parsing or demo transport for a skin.
2. Add the presentational component, skin-prefixed CSS, icons, local demo seeds, interaction tests and stories under `src/skins/<skin>/cards/<name>/`, its stories titled `<Skin>/Cards/<Name>` with the standard set (Storybook below). Presentational files never import `src/ha/`; keep worst-case data in the demo seeds rather than adding product-only debug props or URL switches.
3. Add `src/skins/<skin>/ha/Ha<Name><Surface>.tsx`, where `<Surface>` is that skin's noun such as `Tile` or `Module`. It calls the shared `useHa<Name>` hook and only adapts its result to the presentational component. Add its real-store Storybook story, titled `<Skin>/Connected/<Name>`, and focused adapter tests.
4. Extend that skin's Lovelace parser, generated layout and renderer, plus the corresponding YAML in `docs/deploy.md`. Reuse the connected container there instead of repeating hook-to-view wiring. In field: the card's domains in `FIELD_KINDS` (an `id` pattern, or `card:`, picks it on a domain another card draws) and its connected module in `LIVE`.
5. Export the presentational component, connected container and their prop types from `src/index.ts`; token CSS is imported once per skin, not by individual cards.
6. Run the skin's rules test, `npm run check`, `npm run test-storybook` and `npm run build:ha`; visually inspect the state matrix, every supported width and footprint, compact rows, details, unavailable data and the longest labels.

## Storybook

Every skin's section has the same groups, in this order, so the tree has one shape whichever skin you open; Bundles alone is orb's. `.storybook/preview.tsx`'s `storySort` lists them and `src/skins/storybook.test.ts` checks both.

1. **Cards** — `<Skin>/Cards/<Name>`, one per card. Every card has the same stories under the same names: its own states first, then **Unavailable**, **Worst case** (its `<NAME>_WORST_CASE` or worst-case seed), **All states**, **Sizes**, **Footprints**, **Compact**, **Details**, **Details, unavailable** and **Details, phone**. A card adds stories for what only it can do (a climate range, a colour lamp, a view-only alarm) beside the one they extend, and drops none.
2. **Bundles** — orb only: its joined, lead and titled bundles. A bundle is an orb idea, not a gap in other skins, so they leave the group out.
3. **Dashboards** — whole pages and their furniture: every skin's `Lovelace card`, its whole dashboard drawn from YAML on the demo transports; orb's hand-composed `Examples` (phone, tablet, wall panel), `Header` and `Nav bar`. The examples show ways to compose a dashboard, not a register of cards: a card belongs in one only when it shows something about composing.
4. **Foundations** — a skin's rules across cards, first its **Design rules**: an MDX page that draws the skin's spec (orb: `README.md`'s design sections; field: `docs/field.md`) through `.storybook/blocks/MarkdownWithStories.tsx`, with chosen stories after their sections. The markdown stays the source, so edit it, not the page; every section shows unless the page skips it by heading. Then each skin's palette and **Parts** (its parts from `shared/`, each across its states, drawn with the skin's own components and CSS); orb's colour temperature, compact rows and worst case.
5. **Connected** — one story per card under the card's name: its connected card on the demo transports, so a press goes through the `useHa<Name>` hook, mapper and actions and the state comes back through the store. These live in the skin's `ha/`, apart from `Cards`, because only `ha/` and `lovelace/` may import `src/ha/`.

Any other group a skin can't fill holds one **Not in <Skin>** story that says why, never filler. Today every skin fills every group it has.

### Primitives

`src/primitives/` has no stories, and shouldn't. A primitive is behaviour without markup, so a story would have to invent markup and styles that belong to no skin, and what it showed would be wrong in the ways that matter: a track's scroll-or-set on touch depends on the skin's `touch-action: pan-y`, a press on its `:active` feedback, the sheet's motion on its CSS. That story would pass axe and still prove nothing about either skin. The contracts are pinned by the unit tests beside each hook (`press.test.tsx`, `slider.test.tsx`, `sheet.test.tsx`, `keypad.test.tsx`), and every skin exercises them in its card stories: `usePress` on any card's orb or key, `useSlider` on Light → Sizes, `useRangeSlider` on Climate → Heat/cool range (orb) or Auto range (field), `useSheet` on any card's Details, phone, `useKeypad` on Alarm → Details, keypad. Feel a primitive there, on a phone. If a third skin ever wants to try one before it has cards, revisit this.

## Hard rules

For every skin:

- One card, one entity.
- Never use a colour literal in a skin's CSS. Colours come from the skin's `styles/tokens.css`; orb's accent is `--brand-c` / `--brand-h`.
- A card's height never changes with state. In orb it comes from the shared `footprint` matrix plus container width; never from the viewport.
- Animate only `transform`, `opacity`, `clip-path` and colour changes; never layout properties. Easing only from the `--ease-*` tokens; hover styles only under `@media (hover: hover) and (pointer: fine)`.
- Controls are not selectable: no selection or tap highlight, `touch-action: manipulation`, press feedback on `:active`.

For the orb skin:

- One UI language (README → One UI language): a raised `--btn` is tapped, a recessed `--groove` is slid or set, a readout has no container; solid accent is on for every role; a dashed outline is unavailable and nothing else. No hatching, no second strength of accent, no default orb colour.
- No expanding cards: more detail opens in a sheet, from a tap on the card's name (`CardTitle`) or a press and hold. Cards carry no open button.
- Prefix each card's CSS classes with its card code: `lw-` light, `cw-` climate, `sw-` sensor, `al-` alarm, `cv-` cover, `tw-` toggle, `wx-` weather, `ow-` owlet sock, `hu-` humidifier, `sn-` sound. Outside the cards, `hh-` is the dashboard header, `hb-` the bundles and `hd-` the shared card system.
- Attention follows the README glow contract and the `attention-budget` skill: glow is never the only state channel, damping follows semantic urgency not card position, and urgent states get a warn marker rather than more brightness.
- Every compact row carries a domain icon, primary identity and one state/action cue; colour never defines a row.

## Design review

When design or visual quality is at stake, use these authorities, all committed under `.agents/` (Claude Code sees the skills through the `.claude/skills/` symlinks):

- **Design phase:** run design decisions through the UX Researcher and UI Designer roles in `.agents/design/`.
- **After building:** run Impeccable's `critique`, `audit`, and `polish` on the card's story (`/impeccable …`; skill at `.agents/skills/impeccable/`).
- **Motion and worst-case data:** apply Emil Kowalski's skills in `.agents/skills/` — `review-animations`, `animation-performance`, `mobile-native`, `break-ui`. They are the source of the motion rules in README.md.
- **Attention and glow:** follow the repo's own `attention-budget` skill (`.agents/skills/attention-budget/`); it carries the README glow contract and the evidence in `research/02-attention-budget.md`.
- **Row identity:** apply the repo's own `row-identity` skill when building or editing compact cards or reviewing the Controls column; evidence in `research/03-dense-list-identity.md`.
- **Not used:** taste-skill and third-party DESIGN.md files. If a DESIGN.md is ever needed, generate it from this codebase (Impeccable `document`), never import one.
- **Updating:** `npx skills update` for Emil's skills, `npx impeccable update` for Impeccable; review the diff before committing.

## Adding a card

```sh
npm run new-card -- fan --code fn --domain fan                                  # a control: on/off, over fan.toggle
npm run new-card -- co2 --code co --domain sensor --kind reading --unit ppm     # a reading: read-only number
# add --dry-run to preview
```

Pick the kind by what the card does: a **control** (default) is an orb and a pill that switch the entity; a **reading** is a bare icon and a readout that only show it, with no services. Either way it writes a working card, Home Assistant side included, and registers it everywhere: `src/index.ts`, `src/ha/index.ts`, the fixture test, the headless components, `docs/cards.md`, the prefix list above, and the orb skin's Lovelace card (`src/skins/orb/lovelace/`, `docs/deploy.md`). It passes `npm run check` and `npm run test-storybook` before you touch it. Then make it the real thing:

1. `src/domains/<name>/types.ts`: the fields the card shows. `src/skins/orb/cards/<name>/icons.tsx`: its domain icon.
2. `<Name>Card.tsx`: the card. It is built from the shared card system in `src/skins/orb/shared/ui.tsx`: `useCard(code, …)` gives the `article` attributes, footprint flags and ids; an `hd-head` holds the `Orb`, the `CardTitle` (given `onOpen` outside the sheet) and, in the sheet only, `SheetClose`; then one `hd-slot` and the sheet blocks. Spread `paint(role, glow, own, prop)` onto the article for its colour role, glow and colour slot. A reading's figures go in a `Readout`, laid out with the shared `hd-bar`, `hd-metric`, `hd-label` and `hd-none` classes. `detailsSheet()` and `detailsTile()` build the sheet and the tile, so compact, standard and featured footprints plus the sheet come for free.
3. `src/ha/mappers/<name>.ts` and, for a control, `src/ha/actions/<name>.ts`: the raw attributes and the native services, through `serviceRunner()` (`home-assistant-integration` skill). Keep the fixture's `unknown` and `unavailable` entities. `src/ha/hooks/<name>.ts` (`useHa<Name>`) wires them to the store; any companion entities or options belong there, and `src/skins/orb/ha/Ha<Name>Tile.tsx` only passes them through.
4. Leave the example dashboards (`src/skins/orb/dashboards/Examples.stories.tsx`) alone unless the card shows something about composing a page they don't: they are examples, not a list of every card. Its own stories show it on its own, and the Lovelace card's dashboard shows it among the others from YAML.
5. Finish its section in `docs/cards.md`, and add it to `docs/home-assistant.md`'s slice list.
6. Finish its Lovelace card in `src/skins/orb/lovelace/`: its YAML keys (`KIND_KEYS` and the `switch` in `config.ts`, `tile()` in `ConfigDashboard.tsx`) and their rows in `docs/deploy.md`, and its place in `auto.ts`. A domain has one default card in `DOMAIN_KIND`; another card on the same domain goes in `SHARED_KINDS`, picked with `card:` or by an entity-id pattern. The generator places only a control on a new domain in `auto.ts`. A hand-built card needs all of this.

`src/skins/orb/cards/conformance.test.ts` holds every card, generated or hand-built, to the files, card system, class prefix, exports, docs and Home Assistant connection above, and says which step is missing; `src/skins/storybook.test.ts` holds its stories to the standard set. The generated stories already have it: replace the seeds, keeping `unavailable` and the worst case in `<NAME>_WORST_CASE`. Then verify per the section above.
