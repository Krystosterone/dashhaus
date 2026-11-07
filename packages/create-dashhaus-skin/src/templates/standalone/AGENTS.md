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

`npm install` under npm 12 may warn that it skipped esbuild's install script (`not covered by allowScripts`); the
build doesn't need it.

Look at your work after every change: run `npm run snapshot` and open the PNGs (an image-reading tool works).
The first run prints the two commands that install Playwright's Chromium if it's missing; to use a Chromium or Chrome
already on the machine instead, set `DASHHAUS_CHROMIUM=/path/to/chrome`. `npm run preview` serves
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
   of the look too, even when the reference shows only one. Keep every token block on `:root`, which the build
   turns into the card's host. A token set again on a class inside the card would hide the dark values.
2. **Type:** set `__SKIN_CONST___FONT_HREF` in `shared/surface.ts` to a Google Fonts stylesheet URL, and name the
   families in tokens (`--__skin__-sans`; add `--__skin__-display`, `--__skin__-mono` as needed). Big numerals,
   letter-spacing and case belong in the CSS. The browser fetches the font from Google, not you: you need no web
   access to name one, and where the browser has none (a Home Assistant on a closed network) it draws the stack's next
   family, so end the stack with close fallbacks. `npm run snapshot` says when a face fails to load.
3. **Page:** `dashboards/`: `layout.tsx` (the page, its titled rows and the card grid), `Header.tsx`, `NavBar.tsx` and
   their `dashboard.css`. A greeting, a date or a different grid goes here. `lovelace/__Skin__Dashboard.tsx` draws
   the page from the YAML (each row placed by `useRowLayout` from `@dashhaus/core/lovelace`: its tracks from its own
   width, each card on its grid lines), and `lovelace/auto.ts` picks the cards when the YAML lists none: every entity a
   card is registered for, a row per area, with room air from `roomSensors` (one sensor card per device).
4. **Parts:** `shared/ui.tsx` and `shared/ui.css`: `__Skin__CardFrame`, the frame every card is drawn in (its
   footprints, its name that opens its details, its details dialog), `__Skin__Action`, the button a card's
   actions are drawn with, and `__Skin__Confirm` and `__Skin__Keypad`, the question and the code keypad a guarded
   action is answered with in the details. Restyle them once there, not per card. The frame puts `data-card="<domain>"`,
   `data-state` and `data-footprint` on each card's article, so CSS can tell a light from a sensor, and on from off.
   `npm run add` writes every new card against the frame's props as the scaffold made them (`card`, `name`, `area`,
   `state`, `summary`, `icon`, `footprint`, `actions`, `guarded`): add props of your own freely, but make each new one
   optional and keep those, even ones your look ignores, or a card added later won't typecheck.
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
| `lovelace/entry.tsx` | the resource's entry: gathers every stylesheet into the one file, and defines the card and the dashboard strategy | no |
| `preview/` | the local preview, your sample house and the snapshot script; not part of the resource | add sample entities |
| `conformance.js`, `tsconfig.json` | `npm test`: the rules, after `tsc` | no |
| `vite.config.js`, `dashboard.config.mjs` | the one-file build and the deploy | rarely |

## Rules

`npm test` typechecks, then checks the ones marked ✓; keep the others by hand.

- ✓ **Colours come from tokens.** No colour literal (`#…`, `rgb()`, `oklch()`, …) in any CSS but `styles/tokens.css`,
  whose blocks sit on `:root`. Every `var(--__skin__-…)` names a token something defines (or gives a fallback), so a
  renamed token can't leave a rule reading nothing.
- ✓ **Classes start with `__skin__-`** (the card shares a page with other cards); by convention a card's own start
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
  `__Section__/Cards/<Name>`. The stories file is metadata only: this folder has no Storybook, and nothing needs one.
  You look at a card with `npm run snapshot` or `npm run preview`; the title is what a Storybook would file it under
  if you add one, or if the skin moves into the Dashhaus repository.
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
temperature), add a prop to the card and pass `result.actions.<name>` in its adapter.

Before you write a label, a unit or a scale yourself, look for it here. A card may import every one of these, each
typed beside its types in `node_modules/@dashhaus/core/dist/entities/`:

| Import from | What it has |
| --- | --- |
| `@dashhaus/core/entities/format` | `fmt1` (one decimal), `fmtDuration`, `fmtAgo` |
| `@dashhaus/core/entities/facts` | the details' standard facts: `lastChangedFact`, `updatedFact`, `unavailableSince`, `sinceFact`, `lastSeenFact` |
| `@dashhaus/core/entities/history` | `HourSample` (one per hour of today: 0–1, `"unavailable"` or `null` ahead) and `normalizeReadings`, which scales a day's readings for a bar strip |
| `@dashhaus/core/entities/today` | `todaySummary`, how long today an entity spent in its state, in words |
| `@dashhaus/core/entities/clock` | `clockFace`, the header's time and date for a locale, 12 or 24 hours and a time zone |
| `@dashhaus/core/entities/battery` | `isLowBattery`, `LOW_BATTERY` |
| `@dashhaus/core/entities/severity` | the `Severity` type a model carries |
| `@dashhaus/core/entities/alarm/modes` | an alarm's modes, their labels and hints, `needsCode` |
| `@dashhaus/core/entities/binarySensor/words` | a binary sensor's state in its device class's words (`stateWord`, `alertWord`, `wordsOf`), and the picture its class names (`pictureOf`) |
| `@dashhaus/core/entities/binarySensor/severity` | `binarySensorSeverity`, and `stateSeverity` for the state's own |
| `@dashhaus/core/entities/climate/modes` | `MODE_META` (each mode's label), `ACTION_LABEL` ("Heating"), `fmtCurrent`, `fmtTarget` |
| `@dashhaus/core/entities/cover/position` | device classes in words, `openness`, `isMoving`, `QUICK_POSITIONS` |
| `@dashhaus/core/entities/fan/labels`, `/fan/speed` | presets and directions in words, speed steps and their text |
| `@dashhaus/core/entities/guestWifi/words` | a guest Wi-Fi code's uses and length in words, `spokenCode`, `codeGroups`, `isGroupedCode`, `secretWord`, `joinWords` |
| `@dashhaus/core/entities/humidifier/labels` | what the unit is doing in words, `fmtHumidity`, `modeLabel` |
| `@dashhaus/core/entities/light/color`, `/light/kelvin` | the lamp colours, and a colour temperature as a colour and a name |
| `@dashhaus/core/entities/lock/code`, `/lock/severity` | what a code may contain, and a lock's severity |
| `@dashhaus/core/entities/numeric/readings` | what a numeric reading measures in words and its picture (`numericWords`), its figure in five places at most (`numericFigure`, `fmtNumeric`), `withUnit`, and today's low and high or a meter's rise (`numericToday`) |
| `@dashhaus/core/entities/owlet/readings`, `/owlet/sleep` | vitals and sleep states as figures and words |
| `@dashhaus/core/entities/sensor/readings` | `fmtTemp`, `comfortLabel`, `trendOf`, `toCelsius` |
| `@dashhaus/core/entities/toggle/durations` | the "for a while, until morning" choices |
| `@dashhaus/core/entities/weather/conditions` | `SKY` (each condition as a sky to draw), `CONDITION_LABEL`, `compass`, `precipitation` |
| `@dashhaus/core/entities/weather/readings` | `conditionLabel` (a condition in words, by day or night), `isNight`, `deg0`, `aqiBand`, `uvBand`, `weatherWarnings` |

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
`input_boolean` (toggle), sound machines (sound), Owlet socks (owlet), locks (lock) and fans (fan). `npm run add` writes `cards/<domain>/` and
its adapter in `ha/`, and registers it in `lovelace/registry.tsx` for its Home Assistant domains, so the automatic
layout and the YAML pick it up. The preview already has entities for it. Then `npm test`, `npm run snapshot`, and give
it its own drawing.

## Deploy

```sh
cp .env.example .env    # fill in HA_URL, HA_TOKEN and HA_WWW
npm run deploy
```

`HA_WWW` is Home Assistant's `/config/www`, the folder it serves at `/local/`: `user@host:/config/www` over SSH, or that
folder mounted here. `npm run deploy` builds, copies the file to `$HA_WWW/dashhaus-__skin__/` and registers it as a
dashboard resource. It then checks that Home Assistant serves the file, and creates **Home (__Section__)** at
`/dashhaus-__skin__` the first time. It worked when every step ends in ✓. Run it again after every change: the
dashboard's layout is kept and the resource version moves, and an open tab picks the new version up on reload.
`npx dashhaus-deploy --help` lists the options.

The deploy needs to reach Home Assistant from where you run. When you can't, because you run in the cloud and Home
Assistant is on the person's home network, or they would rather not make a token, install by hand instead.

## Install by hand

The person installs the skin with Home Assistant's own screens: no token, no SSH, no terminal. It ends where
`npm run deploy` would, at the same address, so a later `npm run deploy` finds the resource and updates it.

Run `npm test` and `npm run build`, then hand over:

1. **The file**, `dist/dashhaus-__skin__.js`, as a download.
2. **The project**, for the next change: the repository you work in, or a zip of this folder without `node_modules`,
   `dist` and `.env`. They bring it back with what they want changed.
3. **The steps below**, in plain words, one at a time, waiting for each to be done. Give the two lines to paste
   exactly as written here.

The steps:

1. **Copy the file in.** In Home Assistant, open **Settings → Add-ons → Add-on store**, install **File editor** and
   press **Start**, then **Open web UI**. With the folder icon, make a folder `www` beside `configuration.yaml` if
   there is none, a folder `dashhaus-__skin__` inside it, and upload the file into that. If `www` is new, restart Home
   Assistant (**Settings → System**, the power icon, **Restart Home Assistant**): it serves the folder only when it
   was there at startup. The Samba share add-on or Studio Code Server do the same, for someone who has one.
2. **Load it.** Open your profile (your name at the bottom of the sidebar) and turn on **Advanced mode**. Then
   **Settings → Dashboards → ⋮ → Resources → Add resource**: the URL
   `/local/dashhaus-__skin__/dashhaus-__skin__.js?v=1`, as a **JavaScript module**.
3. **Make the dashboard.** **Settings → Dashboards → Add dashboard → New dashboard from scratch**, titled
   **Home (__Section__)**, with its **URL** set to `dashhaus-__skin__` (the field shows with Advanced mode), the
   path `npm run deploy` would give it. Open it, press the pencil, then **⋮ → Raw configuration editor**, replace everything with
   the text below and save.
4. **Reload the tab**, and the skin draws every light and sensor by area.

```yaml
views:
  - title: Home
    path: home
    type: panel
    cards:
      - type: custom:__card_type__
        title: Home
```

After the next change, hand over the new file and two steps: in File editor, delete the old file in
`www/dashhaus-__skin__` and upload the new one in its place; then in **Resources**, change the end of the line to
`?v=2` (one more each time) and reload. Without the new number, browsers keep the old file. The dashboard's layout
is kept.

## The contract you build on

What you may rely on, and what not to rewrite:

- `@dashhaus/core/lovelace/skin`: `LovelaceDashboardElement` (implement `styles`, `parse`, `changed`, `draw`; optionally
  `mountClass`, `fontHref`, `paintHost`), `registerCard`, `scopeToHost` (turns `:root` into `:host`, so tokens
  written for `:root` reach the shadow root), `autoInput`, and `useActionStatus`: the store's latest rejected command
  for `lovelace/__Skin__ActionStatus.tsx` (its words, `retry` and `dismiss`).
- `@dashhaus/core/lovelace/layout`: the automatic layout's helpers: `visibleEntities`, `roomSensors` (room air, one per
  device), `safetySensors` (the doors, windows, leaks and smoke of `SAFETY_CLASSES`, each with its battery), `groupByArea`, `sortByName`, `areaName`, `areaId`, `friendlyName` and `deviceClass`. All are typed in
  `node_modules/@dashhaus/core/dist/lovelace/layout.d.ts`, and their signatures may still change before 1.0.
- `@dashhaus/core/lovelace/schema`: `Reader`, `readCard`, `readBody` (the shared layout: `cards`, or `rows` of cards,
  with `columns`, `width`, `column`, `flow` and `align`) and `DashboardConfigError`, used by `lovelace/config.ts`. A
  thrown `DashboardConfigError` shows its problems in Home Assistant's card editor.
- `@dashhaus/core/lovelace/card`: `CardProps`, `useCardFrame`, `detailsSheet`, `detailsTile` and `CardDialog`: the frame
  `__Skin__CardFrame` derives its shape and ids from, and the details surface it opens.
- `@dashhaus/core`: the `useHa<Name>` hooks; `@dashhaus/core/primitives`: `usePress`, `useSlider`, `useRangeSlider`,
  `useSheet`, `useKeypad` (behaviour, no markup).

Your markup, classes, tokens and story metadata are yours, and nothing outside this folder depends on them.
