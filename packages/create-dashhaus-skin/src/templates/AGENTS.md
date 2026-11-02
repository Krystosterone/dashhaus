# __Section__: guide for agents

This folder is a Dashhaus skin: a whole Home Assistant dashboard drawn in React inside one Lovelace custom card,
`custom:__card_type__`. `@dashhaus/core` reads Home Assistant for you (states, services, history) and hands each card
plain facts. The look is all this folder's own: markup, CSS and tokens. Change it as much as you like within the rules
below. Everything you need is in this folder and its `node_modules`; there is no repository to read.

## The loop

```sh
npm install
npm run snapshot    # preview/snapshots/desktop.png, phone.png, desktop-dark.png: the skin on a sample house
npm test            # TypeScript, then the card and CSS rules; every finding names its file, line and fix
npm run build       # dist/dashhaus-__skin__.js, the one file Home Assistant loads
npm run deploy      # build, upload, register, create the dashboard (needs .env, see Deploy)
```

Look at your work after every change: run `npm run snapshot` and open the PNGs (an image-reading tool works).
The first run prints the two commands that install Playwright's Chromium if it's missing. `npm run preview` serves
the same page to a browser instead, at the URL it prints. Presses work there: a light toggles. Both draw the real
element from `lovelace/entry.tsx` with the same shadow root and CSS as in Home Assistant. They use the sample house
in `preview/house.ts`, which already holds the worst cases: an unavailable light, a sensor with no reading, a long
name, an entity with no area.

Done means `npm test` and `npm run build` pass, and the snapshots show what you meant at phone and desktop width.

## Making it look like a picture or a description

Work from the outside in, snapshotting after each step and comparing with the reference:

1. **Palette:** `styles/tokens.css`. Name the reference's colours by role: page, card, card when on, ink, muted ink,
   line, accent and the ink on it, warning. Then set the tokens. Add tokens freely; keep the `--__skin__-` prefix. The
   light block is Home Assistant's light mode and the two dark blocks its dark mode, so give the dark mode a version
   of the look too, even when the reference shows only one. Keep every token block on `:root`, which the bundle
   turns into the card's host. A token set again on a class inside the card would hide the dark values.
2. **Type:** set `FONT_HREF` in `lovelace/card.tsx` to a Google Fonts stylesheet URL, and name the families in
   tokens (`--__skin__-sans`; add `--__skin__-display`, `--__skin__-mono` as needed). Big numerals, letter-spacing
   and case belong in the card CSS.
3. **Page:** `draw()` in `lovelace/card.tsx` lays out the header, one section per area and the grid of cards. Their
   styles are in `shared/ui.css` (`__skin__-page`, `-head`, `-area`, `-cards`). A greeting, a date or a different
   grid goes here. `autoCards()` above it picks the cards when the YAML lists none: every light, then room air from
   `roomSensors`, which gives each temperature sensor the humidity sensor on the same Home Assistant device.
4. **Cards:** `cards/light/` and `cards/sensor/`: the markup in `<Name>Card.tsx`, the look in `<Name>Card.css`. A
   card's props extend `CardProps` and `useCardFrame` gives it its footprint flags, ids and accessible name; the same
   card drawn as `variant="sheet"` is its details, opened and closed by the frame's tile. A card can only show the
   facts its props carry (see Data). An on state can recolour the whole card.
5. **Parts:** `shared/ui.tsx` and `shared/ui.css`: the `Action` button, the card head and row, the fact rows, and the
   `Sheet` every card's details open in. Restyle them once there, not per card.

## Where things live

| Path | What it is | Change it? |
| --- | --- | --- |
| `styles/tokens.css` | every colour, font stack, easing and duration, light and dark | yes: the palette |
| `shared/ui.css`, `shared/ui.tsx` | the page, area headings, grid, the `Action` button, card parts and the details `Sheet` | yes |
| `cards/<domain>/` | one card per domain: component, CSS, stories (sample props) and its two-letter `CARD_CODE` | yes |
| `lovelace/card.tsx` | the custom element: page layout in `draw()`, `FONT_HREF`, host CSS | the layout and font, yes |
| `lovelace/config.ts` | the YAML the card takes, and which domain draws which card (`kindOf`) | when adding a domain |
| `lovelace/registry.tsx` | entity → connected card | when adding a domain |
| `lovelace/entry.tsx` | the bundle's entry: imports every stylesheet `?inline` | when adding a stylesheet |
| `ha/` | adapters: a `useHa<Name>` hook's result → a card's props; the only files that touch Home Assistant | when a card needs another fact |
| `preview/` | the local preview, its sample house and the snapshot script; not part of the bundle | add sample entities |
| `conformance.js`, `tsconfig.json` | `npm test`: the rules, after `tsc` | no |
| `vite.config.js`, `dashboard.config.mjs` | the one-file build and the deploy | rarely |

## Rules

`npm test` typechecks, then checks the ones marked ✓; keep the others by hand.

- ✓ **Colours come from tokens.** No colour literal (`#…`, `rgb()`, `oklch()`, …) in any CSS but `styles/tokens.css`,
  whose blocks sit on `:root`.
- ✓ **Classes start with `__skin__-`** (the bundle shares a page with other cards); by convention a card's own start
  `__skin__-<CARD_CODE>-`.
- ✓ **Hover only under `@media (hover: hover) and (pointer: fine)`**, so a tap on a phone never leaves it stuck.
- ✓ **Motion only on `transform`, `opacity`, `clip-path` and colours**, never on layout. Take easing and durations
  from tokens.
- ✓ **Cards never touch Home Assistant.** A file in `cards/` imports `@dashhaus/core` entities, primitives and
  formatters (`@dashhaus/core/entities/…`, `/primitives`, `/hooks`), never `@dashhaus/core` itself or its `ha`,
  `websocket` or `demo` subpaths; `ha/` adapters do that.
- ✓ **Every card folder** has `__Skin__<Name>Card.tsx` and `__Skin__<Name>Card.stories.tsx` titled
  `__Section__/Cards/<Name>`, and a `CARD_CODE` no other card uses.
- **One card, one model.** A card draws one normalized model: one entity, or that entity plus the companions its
  hook composes (the sensor's humidity beside its temperature). A card never takes a second entity.
- **A card's shape and dialog come from the frame.** Its props extend `CardProps`; `useCardFrame` supplies the
  footprint flags, the ids and the article's accessible name; `detailsTile(Card, detailsSheet(Card, Sheet, …))` owns
  the open state and hands the card `onOpenDetails`. Its details show the facts its props already carry, never new
  Home Assistant data.
- **A card's height never changes with its state**: turning a light on must not move the page.
- **Unavailable reads as unavailable** without colour: a dash, a word or a dashed outline.
- **Controls feel like controls:** `touch-action: manipulation`, no text selection or tap highlight, press feedback on
  `:active`.
  `Action` already does this; build new controls on `usePress` from `@dashhaus/core/primitives`.
- **Readable at phone width (390 px) and in dark mode.** Snapshot both.

## Data

Each card gets plain props from its adapter in `ha/`:

| Card | Props |
| --- | --- |
| `__Skin__LightCard` | `name`, `area?`, `on`, `unavailable?`, `brightness?` (percent), `onToggle()` |
| `__Skin__SensorCard` | `name`, `area?`, `temperature?`, `humidity?`, `unit` (`°C`/`°F`) |

Both also take the frame's `variant`, `footprint`, `showControl`, `onOpenDetails` and `onClose` from `CardProps`; the
tile wires them, so a card never holds its own open state. In the sheet the light shows Area, State and Brightness, and
the sensor shows Area, Temperature, Humidity and Unit.

The hooks know more. `useHaLight` also has colour temperature, colour, last-changed time and actions for brightness
and colour. To show one of those facts, add a prop to the card and pass it in the adapter. The fields are typed in
`node_modules/@dashhaus/core/dist/entities/<domain>/types.d.ts`, and the hooks and their actions in
`node_modules/@dashhaus/core/dist/ha/hooks/<domain>.d.ts`. Formatters are in `@dashhaus/core/entities/format`.

## Adding a domain

`@dashhaus/core` has hooks for `light`, `sensor`, `climate`, `cover`, `weather`, `alarm_control_panel` (`useHaAlarm`),
`humidifier`, switches and `input_boolean` (`useHaToggle`), sound machines (`useHaSound`) and Owlet socks
(`useHaOwlet`). To draw one:

1. `cards/<domain>/__Skin__<Name>Card.tsx`, `.css` and `.stories.tsx`, with a new two-letter `CARD_CODE`. Extend
   `CardProps`, call `useCardFrame`, draw the sheet's facts, and export `<Name>Card`, `<Name>Sheet` and
   `<Name>Tile` as the light does.
2. `ha/Ha__Skin__<Name>Card.tsx`: call the hook and pass its facts to the card's tile, so its details open and close.
3. `lovelace/registry.tsx`: a row for the kind. `lovelace/config.ts`: the kind in `CardKind` and `KINDS`, its domain
   in `kindOf` and in the domains `entityId` accepts.
4. `lovelace/entry.tsx`: import its CSS `?inline` and add it to the list.
5. `preview/house.ts`: a sample entity or two, unavailable among them. Then `npm test` and `npm run snapshot`.

## Deploy

```sh
cp .env.example .env    # fill in HA_URL, HA_TOKEN and HA_WWW
npm run deploy
```

`HA_WWW` is Home Assistant's `/config/www`, the folder it serves at `/local/`: `user@host:/config/www` over SSH, or that
folder mounted here. `npm run deploy` builds, copies the bundle to `$HA_WWW/dashhaus-__skin__/` and registers it as a
dashboard resource. It then checks that Home Assistant serves the file, and creates **Home (__Section__)** at
`/dashhaus-__skin__` the first time. It worked when every step ends in ✓. Run it again after every change: the
dashboard's layout is kept and the resource version moves, and an open tab picks the new version up on reload.
`npx dashhaus-deploy --help` lists the options.

## The contract you build on

What you may rely on, and what not to rewrite:

- `@dashhaus/dashboard/skin`: `LovelaceDashboardElement` (implement `styles`, `parse`, `changed`, `draw`; optionally
  `mountClass`, `fontHref`, `paintHost`), `registerCard`, `scopeToHost` (turns `:root` into `:host`, so tokens
  written for `:root` reach the shadow root), `autoInput`.
- `@dashhaus/dashboard/layout`: the automatic layout's helpers: `visibleEntities`, `roomSensors` (room air, one per
  device), `groupByArea`, `sortByName`, `areaName`, `areaId`, `friendlyName` and `deviceClass`. All are typed in
  `node_modules/@dashhaus/dashboard/dist/layout.d.ts`, and their signatures may still change before 1.0.
- `@dashhaus/dashboard/schema`: `Reader` and `DashboardConfigError`, used by `lovelace/config.ts`. A thrown
  `DashboardConfigError` shows its problems in Home Assistant's card editor.
- `@dashhaus/dashboard/card`: `CardProps`, `cardShape`, `useCardFrame`, `detailsSheet`, `detailsTile` and
  `CardDialog`: the frame every card derives its shape and ids from, and the details surface the tile opens.
- `@dashhaus/core`: the `useHa<Name>` hooks; `@dashhaus/core/primitives`: `usePress`, `useSlider`, `useRangeSlider`,
  `useSheet`, `useKeypad` (behaviour, no markup).

Your markup, classes, tokens and stories are yours, and nothing outside this folder depends on them.
