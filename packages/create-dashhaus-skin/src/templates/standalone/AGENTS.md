# __Section__: guide for agents

This folder is a Dashhaus skin: a whole Home Assistant dashboard drawn in React inside one Lovelace custom card,
`custom:__card_type__`. `@dashhaus/core` reads Home Assistant for you (states, services, history) and hands each card
one normalized model of its entity. The look is all this folder's own: markup, CSS and tokens. Change it as much as
you like within the rules below. Everything you need is in this folder and its `node_modules`; there is no repository
to read.

## The loop

```sh
npm install
npm run snapshot          # preview/snapshots/desktop.png, phone.png, desktop-dark.png: the skin on a sample house
npm test                  # TypeScript, then the card and CSS rules; every finding names its file, line and fix
npm run build             # dist/dashhaus-__skin__.js, the one file Home Assistant loads
npm run deploy            # build, upload, register, create the dashboard (needs .env, see Deploy)
npm run add -- climate    # one more domain's card, registered and on the sample house (see Adding a domain)
```

Look at your work after every change: run `npm run snapshot` and open the PNGs (an image-reading tool works).
The first run prints the two commands that install Playwright's Chromium if it's missing. `npm run preview` serves
the same page to a browser instead, at the URL it prints. Presses work there. Both draw the real element from
`lovelace/entry.tsx` with the same shadow root and CSS as in Home Assistant. Lights and sensors come from your
sample house, `preview/house.ts`, which already holds the worst cases: an unavailable light, a sensor with no
reading, a long name, an entity with no area. Every other domain comes from `@dashhaus/core`'s demo house.

Done means `npm test` and `npm run build` pass, and the snapshots show what you meant at phone and desktop width.

## Making it look like a picture or a description

The skin starts neutral on purpose: every card is a plain frame with a name, a reading and its actions. Work from
the outside in, snapshotting after each step and comparing with the reference:

1. **Palette:** `styles/tokens.css`. Name the reference's colours by role: page, card, muted card, ink, muted ink,
   line, accent and the ink on it, warning. Then set the tokens. Add tokens freely; keep the `--__skin__-` prefix. The
   light block is Home Assistant's light mode and the two dark blocks its dark mode, so give the dark mode a version
   of the look too, even when the reference shows only one. Keep every token block on `:root`, which the bundle
   turns into the card's host. A token set again on a class inside the card would hide the dark values.
2. **Type:** set `__SKIN_CONST___FONT_HREF` in `shared/surface.ts` to a Google Fonts stylesheet URL, and name the
   families in tokens (`--__skin__-sans`; add `--__skin__-display`, `--__skin__-mono` as needed). Big numerals,
   letter-spacing and case belong in the CSS.
3. **Page:** `dashboards/`: `layout.tsx` (the page, its titled rows and the card grid), `Header.tsx`, `NavBar.tsx` and
   their `dashboard.css`. A greeting, a date or a different grid goes here. `lovelace/__Skin__Dashboard.tsx` draws
   the page from the YAML (each row placed by `useRowLayout` from `@dashhaus/dashboard`: its tracks from its own
   width, each card on its grid lines), and `lovelace/auto.ts` picks the cards when the YAML lists none: every entity a
   card is registered for, a row per area, with room air from `roomSensors` (one sensor card per device).
4. **Parts:** `shared/ui.tsx` and `shared/ui.css`: `__Skin__CardFrame`, the frame every card is drawn in (its
   footprints, its name that opens its details, its details dialog), `__Skin__Action`, the button a card's
   actions are drawn with, and `__Skin__Confirm` and `__Skin__Keypad`, the question and the code keypad a guarded
   action is answered with in the details. Restyle them once there, not per card. The frame puts `data-card="<domain>"`,
   `data-state` and `data-footprint` on each card's article, so CSS can tell a light from a sensor, and on from off.
5. **Cards:** `cards/<domain>/`: the markup in `__Skin__<Name>Card.tsx`, the look in its `.css`, the glyph in
   `icons.tsx`. A card takes its domain's model as `entity` and draws whatever of it you choose (see Data). An on
   state can recolour the whole card.

## Where things live

| Path | What it is | Change it? |
| --- | --- | --- |
| `styles/tokens.css` | every colour, font stack, easing and duration, light and dark (dark keyed on the host's `data-__skin__-theme`) | yes: the palette |
| `shared/surface.ts` | the theme attribute and `__SKIN_CONST___FONT_HREF`, the web font | the font, yes |
| `shared/ui.tsx`, `shared/ui.css` | the card frame, its details dialog and the `__Skin__Action` button | yes |
| `dashboards/` | the page: its layout and grid, header and nav bar | yes |
| `cards/<domain>/` | one card per domain: component, CSS, glyph and story metadata | yes |
| `ha/` | adapters: a `useHa<Name>` hook's result → a card's props; the only files that touch Home Assistant | when a card needs an action |
| `lovelace/__Skin__Dashboard.tsx` | the page drawn from the YAML: rows, pages, nav and the rejected-command row | rarely |
| `lovelace/__Skin__ActionStatus.tsx` | the rejected-command row: what Home Assistant refused, Retry when safe, Dismiss | restyle in its `.css`; keep it on the page |
| `lovelace/card.tsx` | the custom element: theme attribute, font link, host CSS | rarely |
| `lovelace/config.ts`, `lovelace/auto.ts` | the YAML the card takes, and the automatic layout | rarely |
| `lovelace/registry.tsx` | which card draws which entity; `npm run add` adds a row | `npm run add` does it |
| `lovelace/entry.tsx` | the bundle's entry: gathers every stylesheet into the one file | no |
| `preview/` | the local preview, your sample house and the snapshot script; not part of the bundle | add sample entities |
| `conformance.js`, `tsconfig.json` | `npm test`: the rules, after `tsc` | no |
| `vite.config.js`, `dashboard.config.mjs` | the one-file build and the deploy | rarely |

## Rules

`npm test` typechecks, then checks the ones marked ✓; keep the others by hand.

- ✓ **Colours come from tokens.** No colour literal (`#…`, `rgb()`, `oklch()`, …) in any CSS but `styles/tokens.css`,
  whose blocks sit on `:root`.
- ✓ **Classes start with `__skin__-`** (the bundle shares a page with other cards); by convention a card's own start
  `__skin__-<domain>-`.
- ✓ **Hover only under `@media (hover: hover) and (pointer: fine)`**, so a tap on a phone never leaves it stuck.
- ✓ **A theme attribute of its own.** Dark mode is keyed on `data-__skin__-theme`, which `lovelace/card.tsx` sets on
  its host; no CSS reads the shared `data-theme`, which another skin on the page may set.
- ✓ **Motion only on `transform`, `opacity`, `clip-path` and colours**, never on layout. Take easing and durations
  from tokens.
- ✓ **Cards never touch Home Assistant.** A file in `cards/` imports `@dashhaus/core` entities, primitives and
  formatters (`@dashhaus/core/entities/…`, `/primitives`, `/hooks`), never `@dashhaus/core` itself or its `ha`,
  `websocket` or `demo` subpaths; `ha/` adapters do that.
- ✓ **Every card folder** has `__Skin__<Name>Card.tsx` and `__Skin__<Name>Card.stories.tsx` titled
  `__Section__/Cards/<Name>`.
- **One card, one model.** A card draws one normalized model: one entity, or that entity plus the companions its
  hook composes (the sensor's humidity beside its temperature). A card never takes a second entity.
- **A card's shape and dialog come from the frame.** A card draws inside `__Skin__CardFrame`, which takes its
  footprint, names its article after its title, and opens its details from that title. The details show what the card
  hands the frame as children, from the model it already has, never new Home Assistant data.
- **A card's height never changes with its state**: turning a light on must not move the page.
- **Unavailable reads as unavailable** without colour: a dash, a word or a dashed outline.
- **Controls feel like controls:** `touch-action: manipulation`, no text selection or tap highlight, press feedback on
  `:active`.
  `__Skin__Action` already does this; build new controls on `usePress` from `@dashhaus/core/primitives`.
- **Readable at phone width (390 px) and in dark mode.** Snapshot both.

## Data

A card takes its domain's normalized model as `entity`, today's `history` when the hook loads it, its `footprint`, and
one optional callback per action it shows (a light's `onToggle`, a cover's `onOpenCover`, `onCloseCover` and
`onStopCover`). Its adapter in `ha/` calls the domain's `useHa<Name>` hook and passes them on.

What each action is, its domain declares beside its handlers in `@dashhaus/core` (`LOCK_ACTIONS`, `ActionKind`): a
tap, a code, or a value, and whether it asks first. A tap is a button. An action that asks first (a lock's unlock) or
takes a code (an alarm's disarm) goes to the frame's `guarded` list: its button opens the details on the question, or
on the keypad when the entity wants a code, through `useGuardedAction` from `@dashhaus/core/primitives`. Never wire
one of them to a button that does it on one tap. An action that takes a value is left out by `npm run add`, which says
so.

The model has every fact the hook reads, and the neutral card shows only a few of them. The fields are typed in
`node_modules/@dashhaus/core/dist/entities/<domain>/types.d.ts` (`LightEntity` has `brightness`, `colorTempKelvin`,
`color` and more), and the hooks and their actions in `node_modules/@dashhaus/core/dist/ha/hooks/<domain>.d.ts`. To
show another fact, read it from `entity` in the card. To expose an action that takes a value (a brightness, a target
temperature), add a prop to the card and pass `result.actions.<name>` in its adapter. Formatters are in
`@dashhaus/core/entities/format`.

A composed model's companions (a sensor's humidity and battery, a sound machine's volume) reach its hook from the
YAML (`humidity: sensor.bedroom_humidity`) through `item.companions` in `lovelace/registry.tsx`. The automatic layout
fills a sensor's from the sensors on its device, so its card already has them.

## Adding a domain

```sh
npm run add -- climate                 # its default kind: a control, with its actions as buttons
npm run add -- alarm --kind reading    # or say which
npm run add -- --help                  # the domains it knows
```

`@dashhaus/core` has hooks for lights, sensors, climate, covers, weather, alarm panels, humidifiers, switches and
`input_boolean` (toggle), sound machines (sound), Owlet socks (owlet) and locks (lock). `npm run add` writes `cards/<domain>/` and
its adapter in `ha/`, and registers it in `lovelace/registry.tsx` for its Home Assistant domains, so the automatic
layout and the YAML pick it up. The preview already has entities for it. Then `npm test`, `npm run snapshot`, and give
it its own drawing.

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
  written for `:root` reach the shadow root), `autoInput`, and `useActionStatus`: the store's latest rejected command
  for `lovelace/__Skin__ActionStatus.tsx` (its words, `retry` and `dismiss`).
- `@dashhaus/dashboard/layout`: the automatic layout's helpers: `visibleEntities`, `roomSensors` (room air, one per
  device), `groupByArea`, `sortByName`, `areaName`, `areaId`, `friendlyName` and `deviceClass`. All are typed in
  `node_modules/@dashhaus/dashboard/dist/layout.d.ts`, and their signatures may still change before 1.0.
- `@dashhaus/dashboard/schema`: `Reader`, `readCard`, `readBody` (the shared layout: `cards`, or `rows` of cards,
  with `columns`, `width`, `column`, `flow` and `align`) and `DashboardConfigError`, used by `lovelace/config.ts`. A
  thrown `DashboardConfigError` shows its problems in Home Assistant's card editor.
- `@dashhaus/dashboard/card`: `CardProps`, `useCardFrame`, `detailsSheet`, `detailsTile` and `CardDialog`: the frame
  `__Skin__CardFrame` derives its shape and ids from, and the details surface it opens.
- `@dashhaus/core`: the `useHa<Name>` hooks; `@dashhaus/core/primitives`: `usePress`, `useSlider`, `useRangeSlider`,
  `useSheet`, `useKeypad` (behaviour, no markup).

Your markup, classes, tokens and stories are yours, and nothing outside this folder depends on them.
