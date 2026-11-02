# The skin contract

A skin is one whole UI on the headless foundation. It gets entities from `@dashhaus/core` and draws them itself; the parts it may not rewrite are `@dashhaus/dashboard/skin`, the element runtime every skin's Lovelace card extends, `@dashhaus/dashboard/card`, the behaviour every card shares, and `@dashhaus/dashboard/schema`, the reader its Lovelace YAML is written against. Those three subpaths are the frozen 1.0 contract. `@dashhaus/dashboard/conformance` is its compatibility test: a skin runs it against its own cards.

A skin author installs React 18.3+ or 19 and the packages it needs ([build-a-skin.md](build-a-skin.md#start)).

`home-assistant-js-websocket` is not optional for the app that builds a skin's browser bundle: the element base reaches `@dashhaus/core/websocket`, whose runtime import of the client makes it an optional peer of core, so Vite cannot bundle the card without it. It is not needed by an app that only deploys a prebuilt bundle.

The public packages share one version, currently `0.2.0`, and move together (`spec/release.md`). A standalone
project starts with `npm create dashhaus-skin@latest my-skin`; [build-a-skin.md](build-a-skin.md) walks the whole
journey from install to deploy. Until 1.0, a breaking change to this page is allowed, but it has to be a change to this page: the conformance preset and the package tests are what say the contract still holds. What a skin draws — its markup, classes, tokens, stories and docs — is the skin's own and is never part of this contract.

## `@dashhaus/dashboard/skin`

The frozen skin-author runtime: the custom-element base, the card-picker registration, the token scoping and the automatic layout's `hass` input. A skin's Lovelace card imports this subpath and nothing else from the framework for its element.

A skin may rely on:

- **`LovelaceDashboardElement<C>`** — the base class. A skin implements `styles` (the bundle's CSS, already scoped), `parse(raw)` (validate and normalize the YAML), `changed(previous, next)` (whether a new `hass` changes what the page draws), `draw(config, hass)` (the React node) and, optionally, `mountClass`, `fontHref` and `paintHost(config, hass)`. The base owns the shadow root, one store per frontend connection, the React root and its survival across Lovelace moving the card, and the error boundary. `setConfig`, `hass`, `connectedCallback`, `disconnectedCallback`, `getCardSize` and `getGridOptions` are the standard custom-element entry points and keep their meaning.
- **`registerCard(type, element, name, description)`** — define the element and list it in the card picker. Safe to call twice.
- **`scopeToHost(css)`** — move a skin's `:root` selectors onto the shadow host, including the theme attribute forms.
- **`autoInput(hass)`** — the `states`, `entities`, `devices` and `areas` an automatic layout reads, in the shape `@dashhaus/dashboard/layout` takes.
- **`LovelaceHass`** and **`AutoEntityEntry`** — the part of the frontend's `hass` object, and the registry facts per entity, that the element and its layout read.

Not stable: the DOM and focus treatment inside the element, the ids it creates, and the order in which it connects the store relative to a render. Nav, `useDashboardNav`, room sensors, the main `@dashhaus/dashboard` entry and any internal module are outside this subpath.

## `@dashhaus/dashboard/card`

The frame a card is drawn in: footprint flags, ids and the article's accessible name, the details state, and the tile/sheet composition. It knows no entity, no store and no Home Assistant; a skin brings the entity and its own markup and CSS.

A skin may rely on:

- **`CardProps`** — `variant?: "card" | "sheet"`, `footprint?: "compact" | "standard" | "featured"`, `showControl?: boolean` (compact only; `false` makes the row the details trigger), `onOpenDetails?` and `onClose?`. A card's own props extend this and keep these meanings. `CardFrameOptions` is the subset the frame reads.
- **`cardShape(options)`** — the flags derived from the props: `sheet` (the full view), `compact`, `featured`, `bare` (compact with no inline control) and the normalized `footprint`. The sheet ignores the footprint and the control. These names and their truth table are stable.
- **`useCardFrame(options)`** — `cardShape` plus `uid` (stable for the render, for composing other ids), `nameId` and `article` (`aria-labelledby` pointing at the card's title). A skin spreads `article` onto its `<article>` and puts `nameId` on the element that names the card. The ids' *shape* is not stable; the relationship is.
- **`useDetails(defaultOpen?)`** — `open`, `openDetails` and `closeDetails`, the state a tile owns and a sheet receives.
- **`CardDialog`** — the native modal dialog a skin's sheet draws inside. Its props are `CardSheetProps` (`open`, `onClose`, `label`, `children`) plus `className`, `handle`, `snapBack`, `closeMs` and `phone`. It mounts its content while open, keeps the scroll lock, closes on Escape and backdrop, and drags down to close on phones. A skin may style it and pass a drag handle; it may not rely on the DOM inside it.
- **`detailsSheet(Card, Sheet, label)`** — the card again as `variant="sheet"` inside the skin's `Sheet`, labelled from the card's own props. Returns a component taking `SheetProps<P>`: the card's props without the card-only ones, plus `open` and `onClose`.
- **`detailsTile(Card, DetailsSheet, className?)`** — a dashboard-ready tile: the card in its size container, owning the details state. Returns a component taking `TileProps<P>`: the card's props without `variant`, `onOpenDetails` or `onClose`, plus `defaultOpen?` for stories.

Not stable: the class names, markup and CSS of any skin; the exact ids `uid` and `nameId` produce; the focus treatment and internal DOM of `CardDialog`; and the number of elements between the tile and the card.

## `@dashhaus/dashboard/schema`

The shared YAML reader and the kind table that turns an entity id and a `card:` key into the skin's own normalized card. Pure: no React, no DOM, no skin and no Node builtin, so a config and a generated skin can import it.

A skin may rely on:

- **`Reader`** — the reader a skin extends: `problem(path, message)`, `keys`, `string`, `boolean`, `number`, `choice`, `entityId`, `optionalEntity`, `navEntry` and `nav`. Every problem is collected on `problems`, with the path it belongs to; a skin reports them through `DashboardConfigError`, whose `problems` array is the stable part.
- **`readCard(read, schema, value, path)`** and **`readCards(…)`** — read one card or a non-empty list, fill the entity and kind, read the common keys and the selected kind's keys, and apply the kind's options. The result has `entity`, `kind`, whatever `schema.base` returns and whatever the kind's `options` returns.
- **`cardKinds(table)`**, **`cardKindOrder(domainKind, shared)`** and **`renderCard(renderers, card, …args)`** — the two tables a skin keeps (a domain's own card, then the cards sharing a domain) and the dispatch from a normalized card to its renderer. `CardKindSpec` gives a kind its `domains`, an optional `id` pattern and its `keys`; the order an entity tries its kinds is stable.
- **The option readers** — `readColor`, `readUnit`, `readSensorOptions`, `readWeatherOptions`, `readAlarmOptions` and `readOwletOptions`. They are the per-kind escape hatch: a kind's `options` calls the ones its card takes, in the order its YAML reads them, so its defaults and error order stay its own.

The escape hatches, in one place:
- `CardKindSpec.id` picks a kind on a domain another kind also draws; `CardKindSpec.keys` adds the YAML keys that kind accepts; `CardKindSpec.options(read, raw, at)` reads that kind's settings and returns the fields merged into the card.
- `CardReadSchema.before` rejects a value before reading it; `checkKeys` replaces the unknown-key check with a skin's own reasons; `noKind` and `missing` replace the two default messages; `stopOnInvalidCard` chooses between stopping at a bad `card:` and falling back to the domain's default.

Not stable: the wording of a problem (the path and the fact that it was collected are stable); the order in which checks run when a skin supplies its own `base` or hooks; and the shape of a skin's per-kind options, which belongs to that skin.

## `@dashhaus/dashboard/conformance`

The generic card checks, for a skin outside this repo. It reads a skin's files from disk, so it is Node- and test-only: no React, no DOM, no CSS, and no test runner of its own. Import it in a test and assert the findings are empty.

```ts
import { checkCards } from "@dashhaus/dashboard/conformance";

expect(checkCards({
  skin: "skin",
  storyPrefix: "MySkin/Cards",
  component: (Name) => `${Name}Card.tsx`,
  stories: (Name) => `${Name}.stories.tsx`,
  code: (source) => source.match(/useCard\("([a-z]+)"/)?.[1],
  allowedClass: (cls, { code }) => cls === code || cls.startsWith(`${code}-`),
})).toEqual([]);
```

What it reads, and the rule each failure names:

| Rule | What it proves |
| --- | --- |
| `component` | Every folder in `<skin>/cards/` has the component the skin declares. |
| `stories` | It has the story file the skin declares. |
| `story-title` | The stories are titled `<storyPrefix>/<Name>`. |
| `code` | The component source yields a code, when the skin declares how to read one. |
| `class-prefix` | Every class the folder's CSS defines or its TSX sets is allowed by the skin's rule. |
| `import` | The component imports no specifier the skin's `forbiddenImport` refuses. |
| `unique-code` | No two cards share a code. |

`checkCards(check, { root })` resolves from `root` (default `process.cwd()`). `cardFolders(skin, { root })` and `strayClasses(dir, allowed, { root })` are the file helpers underneath. The repo's own conformance tests keep their assertions about exports, docs, Storybook order, Design rules, the Lovelace wiring and the Home Assistant slice beside the preset; those are repo rules, not a skin contract. A generated skin inside this repo runs the same preset from its card test, and keeps its repo-specific readers on `verify/conformance.ts`.

Not stable: the wording of a finding's `message`; the `card` and `rule` fields are the contract. The preset does not check a skin's exports, docs, Storybook order or Lovelace wiring, and it is not a substitute for a skin's own tests.

## What is not stable yet

- **The main `@dashhaus/dashboard` entry** — the nav, `useDashboardNav`, room sensors, the token scoping, and `actionMessage` with `useActionStatus` (the store's latest rejected command, as a recovery row reads it; the scaffold's `lovelace/ActionStatus.tsx` uses it). A skin's Lovelace card imports the element from `./skin` instead; the main entry's surface is not frozen for a third-party skin.
- **`@dashhaus/dashboard/layout`** — the automatic layout, published for dashboard configs. Its signature may change with the layout work.
- **`@dashhaus/dashboard/vite`** — does not exist. There is no build integration to depend on; the deploy config owns its `build()`, and no consumer has needed a shared one yet. A demonstrated need starts that cut.
- **Storybook and generator templates** — the story set and the generated skin are this repo's conventions, not a package contract.
- **CSS and DOM** — a skin's class names, tokens, data attributes and the DOM it draws are its own; another skin or a consumer may not depend on them.
