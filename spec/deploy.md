# Deploying to Home Assistant

Each skin ships as one Lovelace card that draws a whole page from its YAML (`custom:dashhaus-orb`,
`custom:dashhaus-field`), inside its **resource**: the one ES module Home Assistant loads from Settings → Dashboards →
Resources, which also carries the skin's stylesheet and its dashboard strategy, so Add dashboard lists the skin under its
own name. It runs inside Home Assistant's own frontend and reuses its websocket connection, so the page needs no token,
no separate server and no rebuild when you change the layout.

A skin's resource is named after the Marketplace repository that installs it, `<repository>.js`: `orb-dashboard.js` and
`field-dashboard.js` (`scripts/resources.js`). The same file ships in the skin's package (`@dashhaus/orb/resource`,
`@dashhaus/field/resource`), which the deploy CLI uploads ([Deploy from the command line](../docs/src/content/docs/start/deploy.mdx)
on the documentation site), and the skin's own repository mirrors it from npm for the Marketplace
([release.md → The skin repositories](release.md#the-skin-repositories)). Who takes which way in is
[journeys.md](journeys.md).

## First deploy

1. Copy `.env.example` to `.env` and fill in `HA_URL`, `HA_TOKEN` and `HA_WWW` (and `HA_SSH_PORT` if it isn't 22), as [Deploy from the command line](../docs/src/content/docs/start/deploy.mdx) describes them.
2. Run `npm run deploy`.
3. Reload any Home Assistant tab that was already open, then open **Home (Orb)** or **Home (Field)** in the sidebar.

`npm run deploy` builds the files `dashboard.config.mjs` names (`npm run build:ha`: `src/skins/orb/dist/orb-dashboard.js`, `src/skins/field/dist/field-dashboard.js` and one `dist/dashhaus-<skin>.js` per skin `npm run new-skin` made), copies each to `www/<name without its extension>/`, and registers it as a dashboard resource at `/local/<folder>/<name>?v=<content hash>`. The new version number makes browsers fetch the new file. It then fetches each file back from `$HA_URL/local/…` and warns, naming `HA_WWW`, when Home Assistant does not serve the bytes it uploaded: a wrong `HA_WWW` is otherwise only a "Custom element doesn't exist" on the dashboard. (The check needs the real websocket client; a caller that injects `connect` injects `fetch` too, or leaves the check out.) A repo keeps its URL by keeping its file's name. The first time, it also creates one dashboard per entry in `dashboard.config.mjs`. By default: **Home (Orb)** at `dashhaus-orb`, a panel holding a layout generated from your house, and **Home (Field)** at `dashhaus-field`, a field card with no `cards` or `rows`, so it lays out every supported entity by area each time it draws. Each dashboard may name `.env` keys that change its path and sidebar title (`HA_DASHBOARD`, `HA_FIELD_DASHBOARD` and their `_TITLE` do for Orb and Field). Run it again after every code change. It updates each resource, keeps each existing dashboard's sidebar title in line with those settings, and never touches an existing dashboard's layout, so layout edits made in Home Assistant are safe. Each file lands under a temporary name and is renamed into place, so a copy cut off halfway leaves the served file as it was; a layout save that fails deletes the dashboard that run created, so the next run creates it again rather than leaving it empty. It warns when another copy of a file is registered too (a Marketplace install's `/hacsfiles/…`): both define the same card, and only the first to load is used. Open dashboards pick up a new version on their next reload.

### The dashboard config

Which dashboards deploy creates is in `dashboard.config.mjs` at the repo root, not in the CLI. Its default export names the files to upload (`files`, a list; `bundle`, one file, is the older shorthand), optionally how to build them, and the dashboards in order. Each dashboard has a `path` (Home Assistant requires a hyphen), a sidebar `title`, an `icon`, and one of:

- `strategy`: a skin's dashboard strategy and its keys, `{ type: "custom:orb-dashboard" }`, saved as `{ strategy }` and nothing else, so the dashboard lays the house out each time it opens and follows the skin as it updates (The skins' dashboard strategies, below);
- `card`: the card's Lovelace config, saved in one panel view and then the person's to edit. Either the config itself, for a dashboard written from scratch (a skin's card with their own `cards` or `rows`), or a factory `card(ha)` that returns `{ card, made }`, the card and what deploy reports it created, for a layout generated from the house.

Each entry of `files` is resolved against the config's directory when relative. This repo names Orb's and Field's from
their packages' `./resource` export, the same files a deploy-only user installs, and its `build()` runs `build:ha`;
a user app without the repo installs `@dashhaus/orb` or `@dashhaus/field` with `@dashhaus/deploy` and skips the build
(`npx dashhaus-deploy --skip-build`). `build` is optional: without it the files must already exist, and
`--skip-build` skips it. The build is the config's declaration, not the CLI's, so another repo can build with
anything or upload a file built elsewhere. Two files with the same name are refused: they would share one URL.

`ha` is deploy's websocket client, so a factory can read the house before it builds the card. `env` names the `.env` keys allowed to override that dashboard's path and title; `.env` holds settings only, and no secret belongs in this file. `npm run new-skin` registers generated skins in `scripts/generated-skins.js`, and the config spreads them through `generatedDashboards()` from `@dashhaus/deploy/config`, the pure config surface a Node app can import without React. Before deploying, the CLI applies the overrides and refuses a path without a hyphen, two dashboards on one path, or a dashboard with both or neither of `card` and `strategy`; `--help` lists the dashboards the config declares, before any `.env` override; with no config (or one that fails to load) it says so and prints a config for Orb's package and the `.env` keys, so it is the first thing to run in an empty folder. Neither `--help` nor an error points at a file in this repository: the CLI's reader has only its package. A dashboard that already exists keeps its layout, so a changed factory affects the first creation only.

The CLI is `@dashhaus/deploy` (bin `dashhaus-deploy`, which `npm run deploy` runs). Without `--config` it looks for `dashboard.config.mjs` in the working directory, so that is the file a user app writes; it is not named `dashhaus.config.js`. It bundles the config with esbuild before importing it, so a config may be JavaScript or TypeScript and may import packages; relative imports resolve from the config's directory, and `.env` is read from beside it. `--config <file>` points the CLI at another config, `--skip-build` skips the build callback, and `node packages/deploy/bin.js --help` prints the options and dashboards. The repo's config is the only outside importer of orb's `@dashhaus/orb/lovelace/auto`; the CLI imports no skin.

## The skins' dashboard strategies

Every skin's resource defines a dashboard strategy beside its card, with `defineSkinStrategy` from
`@dashhaus/core/lovelace/skin` ([contract.md](contract.md)), so Home Assistant's own **Settings → Dashboards → Add
dashboard** lists the skin under its own name, under Community dashboards, and makes its dashboard with no YAML, token
or command. Orb's is `custom:orb-dashboard`, listed as **Orb**; Field's is `custom:field-dashboard`, listed as **Field**;
a skin `create-dashhaus-skin` or `new-skin` writes gets `custom:dashhaus-<skin>`, listed by its name. Nothing a skin's
resource defines is named Dashhaus. It follows the frontend's contract as its source has it
(`src/panels/lovelace/strategies/get-strategy.ts`, `src/data/lovelace_custom_strategies.ts`) and the developer docs'
Custom dashboard strategies page.

- **Its elements.** `ll-strategy-dashboard-<type>` and `ll-strategy-view-<type>`, each with a static
  `generate(config, hass)`; the frontend waits up to 5 seconds for a `custom:` strategy's element, which the resource
  defines as it loads. Both answer `shouldRegenerate()` with `false`: the config alone decides the view, and the card
  follows the house itself. The dashboard's static `getCreateSuggestions()` fills the dialog with the skin's name and
  icon (`mdi:home-variant` for Orb, `mdi:knob` for Field).
- **The dialog's entry.** `window.customStrategies` gets one `{ type, strategyType: "dashboard", name, description,
  documentationURL }`, once however many copies load; the documentation link is the skin's own page on the site. The
  dialog lists it from Home Assistant 2026.5 and saves the bare `{ strategy: { type: "custom:<type>" } }`, so a
  dashboard keeps nothing but the strategy and follows the skin as it updates. Before 2026.5, a dashboard given that
  config by hand works the same, and so does one the deploy CLI creates with `strategy:`.
- **What it generates.** One panel view titled with the skin's name, at `home`, holding the skin's card with no
  `cards` or `rows`, `{ type: "custom:dashhaus-<skin>", title: "Home" }`: the automatic layout (`autoDashboard` for
  orb, `autoModules` and `areaRows` for field). The view strategy answers the same panel, as one view of any dashboard.
- **Its keys**, all optional: `title`, the title the card prints in its header (`Home`), and the keys the skin hands
  its card unchanged: `viewing` (`near`, `far`) and `theme` for Orb, `viewing` and `finish` for Field, none for a
  generated or scaffolded skin. The card checks what it is handed, as it does in YAML. The strategy refuses an unknown
  key or a value that isn't text, in words the frontend shows in place of the dashboard, led by the skin's name
  (`Orb: …`).
- **Editing it.** It has no `getConfigElement`, `noEditor` or `configRequired`: the dialog asks no questions before
  creating it, and **Edit dashboard** opens the frontend's strategy editor, which, with no visual editor, shows the
  strategy's config as YAML, where the keys above are set. Its **Take control** saves the expanded config (the panel
  holding the skin's card), after which the dashboard no longer follows the strategy.

`packages/core/src/lovelace/strategy.test.ts` resolves the elements as the frontend does; each skin's own test runs the
card its strategy emits through its Lovelace card. `verify/dx/user.js` deploys Orb's and Field's strategy dashboards
from their packages and draws them, expanded as the frontend expands them; `verify/dx/author.js` picks a scaffolded skin
from the fake Home Assistant's stand-in for the Add dashboard dialog.

## Authoring

Editing a card's YAML in Home Assistant, and adding the card from the card picker, are in [Deploy from the command line → Change the layout](../docs/src/content/docs/start/deploy.mdx#change-the-layout).

### The format

Every skin's Lovelace card reads one layout (`@dashhaus/core/lovelace/schema` → `readBody`); the keys around it are the
skin's. The simplest page is a list of `cards`, drawn on one grid in that order:

```yaml
type: custom:dashhaus-orb
title: Home
columns: 2
cards:
  - light.living_room                    # the entity id alone
  - climate.living_room
  - entity: cover.living_room            # or a map with options
    footprint: compact
```

For headings, a page lists `rows` instead: one under another, each with its own `title`, `columns` and `cards`. A row
is flat: its `cards` are cards (and, in orb, bundles), never other rows. Each card says where it sits in its row, and
each row how it packs them:

```yaml
type: custom:dashhaus-orb
title: Home
show_time: true                 # a clock in the header
rows:
  - title: Security
    cards:
      - entity: alarm_control_panel.house
        footprint: compact
      - entity: binary_sensor.patio_door  # a door, a window, a leak or smoke
        footprint: compact
        battery: sensor.patio_door_battery
  - title: Outside
    cards:
      - entity: weather.home
        aqi: sensor.home_aqi
        aqi_scale: US
  - title: Living room
    columns: 2
    cards:
      - entity: sensor.living_room_temperature
        humidity: sensor.living_room_humidity
        battery: sensor.living_room_battery
      - climate.living_room
      - entity: light.living_room
        width: full                     # both columns
      - entity: cover.living_room
        footprint: compact
        width: full
  - title: Modes
    columns: 2
    cards:
      - bundle: joined                  # compact cards sharing one outer card
        label: Modes
        width: full
        cards: [input_boolean.guest_mode, input_boolean.dnd]
      - entity: switch.porch
        footprint: compact
      - entity: switch.office
        footprint: compact
  - title: Nursery
    cards:
      - entity: sensor.owlet_sock_ac000w0123_sleep_state
        name: Nova
```

**Storybook → Orb / Dashboards / Lovelace card** shows this exact config on the demo data.

A deliberate composition is the same YAML with placement: a featured hero across two columns with a sidebar set on its
foot, then a dense row where a later card fills the hole an earlier one left.

```yaml
type: custom:dashhaus-orb
title: Home
rows:
  - title: At a glance
    columns: 3
    align: bottom                       # the sidebar ends where the hero does
    cards:
      - entity: climate.living_room
        column: 1
        width: 2
        footprint: featured             # 4 units: 264 px
      - entity: alarm_control_panel.house
        column: 3                       # standard, 2 units
      - entity: light.living_room
        column: 3                       # stacks under the alarm, compact
        footprint: compact
  - title: Around the house
    columns: 3
    flow: dense
    cards:
      - entity: weather.home
        width: 2
      - entity: cover.living_room
        column: 3
        footprint: compact
      - entity: sensor.living_room_temperature
        width: 2
      - entity: switch.porch            # fills the unit under the cover
        footprint: compact
      - bundle: joined
        label: Modes
        width: full
        cards: [input_boolean.guest_mode, input_boolean.dnd, switch.office]
```

**Storybook → Orb / Dashboards / Lovelace card → Composition, phone / tablet / wall panel** draws it at 390, 820 and
1280 px.

#### The page and its rows

| Where | Key | Type and default | Meaning |
| --- | --- | --- | --- |
| page | `cards` | a list of cards | One untitled row, in this order. Excludes `rows`. |
| page | `rows` | a list of rows | Rows one under another. Excludes `cards`. Leave out both for the automatic layout (orb: generated rows; field and generated skins: a row per area). |
| page | `columns` | a whole number from 1 to the skin's most (orb 12, field 4, a generated skin 4), or `auto`; default `auto` | The default for every row; a row's own `columns` replaces it. |
| page | `flow` | `normal` or `dense`; default `normal` | The default for every row. |
| row | `title`, `note` | text | A heading over the row, its note at the heading's end. A titled row is a section of the page: the nav can jump to it. An untitled row is a plain grid. |
| row | `columns` | as the page's; default the page's | The most columns the row takes. `auto` fits as many as the row's width holds at the skin's preferred track. |
| row | `flow` | `normal` or `dense`; default the page's | How the row packs its cards (Placement, below). |
| row | `align` | `top` or `bottom`; default `top` | Where the row's shorter column stacks sit. |
| row | `cards` | a non-empty list | Its cards (and orb's bundles). |
| card or bundle | `width` | a whole number from 1 to the skin's most, or `full`; default 1 | Columns it spans. Never pixels, never a height. |
| card or bundle | `column` | a whole number from 1 to the skin's most | The column it starts in; left out, the row's flow places it. Not with `width: full`. |
| card | `footprint` | the skin's footprints | Its fixed height. Never set by width. |

A page is the card's top level (the main page, `home`) or one of its `pages`. A page is either `cards` or `rows`;
there is no third layout shape, no nested rows, no side-by-side groups and no `gap` (the skin spaces its grid). With
an explicit row `columns`, a `width` wider than the row, a `column` past it, or a `column` and `width` that run past it
is an error that names the fix.

#### Placement

A row is a grid of tracks across and, down, rows of the skin's unit: orb's 60 px with the 8 px gap, so a compact
card is one unit, a standard two and a featured four; in a skin whose rows hold one footprint (field, a generated
skin), one card. Every card is a whole block of tracks and units. Placing is pure (`@dashhaus/core/lovelace/layout` →
`placeRow`): it depends on the YAML and the row's own width, never on an entity's state, so a state change never moves
a card.

1. **Tracks.** A row measures itself (`useRowLayout`), so a row narrowed by its surroundings yields like a phone. An
   explicit `columns` holds while each track stays at least the skin's minimum (orb 156 px, so two columns hold from
   320 px of row; field 260 px, a compact row's 300 px); with less room, it takes as many as fit, down to one. `auto`
   takes as many as fit at the skin's preferred width (orb 300 px; field 260 px), at most the skin's most. In field
   and a generated skin, `columns` is only ever a most.
2. **Widths** clamp to the tracks the row has: a card never makes a track of its own. `full` is every track.
3. **Anchors** (`column`) hold only while the row has the tracks it was written for: its `columns`, or, with `auto`,
   the last column an anchor reaches. With fewer, every anchor is released and the whole row flows in YAML order, so a
   collapsed composition reads top to bottom as written. Cards anchored to one column stack down it in YAML order.
4. **Normal flow** keeps a cursor: each card takes the first free place at or after the previous card's, reading left
   to right, then down. An anchored card looks only in its column. A later card never moves into an earlier hole, so
   the visual order is the YAML's.
5. **Dense flow** starts every card from the top left: a later card fills the first hole it fits, and an anchored one
   the first free place in its column. It may draw a card above one written before it.
6. **Bottom alignment** groups the row's columns that no card spans out of (a stack, or several stacks a spanning card
   ties together), and moves each group down by whole units until its foot meets the row's. The spacing inside a group
   is kept; nothing stretches or changes height, and a row with one group (a `full` card ties every column) stays put.
   There is no centre alignment: centring a compact card beside a standard one would put it half a unit off orb's
   rhythm.
7. **Reading order** (DOM, keyboard, screen reader) is always the YAML order. It matches the visual order in a
   top-aligned `normal` row; `dense` flow and `bottom` alignment can draw a later card higher, which is their cost.

Below 320 px of dashboard content an orb row has one track, so identity wins over columns, as before; in a one-track
row a later routine glow is damped (spec/orb.md → Dashboards).

#### Footprints in a row

- **Orb** mixes footprints freely: every footprint is a whole number of units, so a compact card stacks beside a
  standard one with no hole the YAML didn't ask for.
- **Field** keeps one footprint per grid row, as its spec requires: a row whose modules share one footprint is a grid
  placed as above. A row that mixes them stacks by column: every module needs a `column` and is one track wide, each
  column's modules stack in YAML order (12 px apart, two compact rows 8 px), `align: bottom` sets each stack's foot on
  the row's, and `flow: dense` is an error there, since stacks have no holes. With fewer tracks than columns, the
  stacks wrap in column order, which is also their reading order.
- **A generated skin** takes one footprint per row; a row that mixes them is an error naming the footprint to move.

#### Bundles (orb)

A bundle is an entry of a row's `cards`, placed as one card: `width` and `column` go on the bundle, never on its
members, and it is as many units tall as its members make.

| `bundle` | Keys | Members | Height |
| --- | --- | --- | --- |
| `joined` | `label`, `cards` (2 or more), `width`, `column` | every one compact | one unit while each member gets about 170 px; stacked below that (spec/orb.md → Bundles), at the width its cell has |
| `lead` | `label`, `sheet_title`, `cards` (2 or more), `width`, `column` | the first standard, the rest compact rows | 2 + one per row |
| `titled` | `title` (required), `area`, `cards` (1 or more), `width`, `column` | every one compact | the lid's unit + one per member |

A member takes its own card's keys, but no `footprint`, `width` or `column` (the bundle sets them), and no bundle of
its own. A map with `cards` and no `bundle` is an error asking which bundle it is.

#### What it refuses, and what it can't see

Every problem is collected and listed at once, each at its path with its entity id, in plain words with the fix:

```text
The card's config has 4 problems:
• "cards" and "rows" both lay out this page: keep "cards" for one plain grid, or move those cards into a row under "rows"
• rows[0].cards[2] (alarm_control_panel.house): "column: 4" is past this row's 3 columns: use column: 3, or raise the row's columns to 4
• rows[0].cards[0] (light.living_room): "width" is how many columns the card spans: a whole number from 1 to 12, or full — not pixels
• rows[1]: rows don't nest: list this row's cards under its own "cards", and put the inner rows beside it in the page's "rows"
```

Also named, each with its repair: a quoted number (`columns: "2"`), a fractional or out-of-range count, an unknown or
misspelt key (with the key it probably meant), a card where a row belongs, `align` on the page, `width` or `column` on a
row, `span`, `gap`, `sections` and `modules` (not keys; the message says what to write), `width: full` with a `column`,
an empty `cards`, a page with neither `cards` nor `rows`, a misplaced or incomplete bundle, a footprint mix the skin
doesn't take, another skin's keys (field says why `theme`, `accent`, `show_control` and bundles are orb's), and a
card's `color`, which Orb no longer takes (a card has no colour of its own: `accent` sets the dashboard's one colour). A
problem that depends on another (a `column` checked against a row whose `columns` is wrong) is not reported twice. What depends only on the screen's width (a row that collapses on a phone) is never an error.

Home Assistant parses the YAML before the card sees it, so the card gets a value, not text: a YAML syntax error, a
tab, a duplicate key or a missing list dash that still parses into something valid never reaches it, and it has no
line numbers. Home Assistant's editor reports the syntax errors; the card reports everything about the value it was
given. `setConfig` throws a `DashboardConfigError` whose message lists every problem, and Home Assistant shows that
message in its editor and in its error card. That live display has not been observed in a browser for this layout.

The entity's domain picks the card. One card shows one normalized model, built from the named entity and, for a composed card, its companions:

- `light`: light
- `climate`: climate
- `sensor`: sensor (temperature or humidity), with its device's humidity and battery entities
- `sensor.*_sleep_state`: owlet, an Owlet sock, with its heart rate, oxygen, charging and alert sensors and its base station switch found beside it
- `weather`: weather, with its AQI and sun entities
- `cover`: cover
- `input_boolean`, `switch`: toggle
- `alarm_control_panel`: alarm
- `humidifier`: humidifier (a dehumidifier too)
- `switch` with `card: sound`: sound, a sound machine's sound with its volume `number.*` found beside it
- `lock`: lock, with the battery `sensor.*` on its device
- `fan`: fan
- `sensor.*_voucher`: guest wifi, a UniFi Hotspot Manager guest Wi-Fi code, with its join QR code `image.*` and its new-code and refresh `button.*`s found beside it; a guest Wi-Fi password in an `input_text`, a `text` or any other `sensor` with `card: guestWifi`
- `binary_sensor`: binary sensor, a door, a window, a leak or smoke (any device class), with the battery `sensor.*` on its device
- `camera`: camera, a doorbell's or a nursery's, its state and its still (Home Assistant's own `entity_picture`)
- `media_player`: media player, a speaker, a TV or a cast, with its own artwork
- `sensor` with `card: numeric`: numeric, any number a `sensor.*` measures (CO₂, power, energy), worded by its device class and unit; the `sensor` card stays the domain's default
<!-- new-card: domains -->

When a domain has more than one card, `card:` picks one: `card: owlet` for a sock whose sensor is named differently, `card: guestWifi` for a code sensor named otherwise, or `card: sensor` to override the default.

| Where | Key | Meaning |
| --- | --- | --- |
| Lovelace card | `title`, `subtitle` | The page header. `title` defaults to "Home". |
| Lovelace card | `show_time`, `hour_cycle` | A clock in the header; `h12` or `h23`. |
| Lovelace card | `viewing` | `near` (default: a phone or tablet in the hand) or `far`, for a wall panel read from across the room: larger status lines, captions and warn cues, and heavier figures. Card heights don't change. |
| Lovelace card | `theme` | `home-assistant` (default: follows Home Assistant's dark mode), `auto` (follows the device), `light`, `dark`. |
| Lovelace card | `accent` | `yellow` (default), `sage`, `coral`, `sky`, `lilac`, or `{ chroma, hue }` in OKLCH. |
| Lovelace card | `stills` | `false`: no camera still is fetched or drawn on this dashboard, for privacy or cost; a camera card shows its state and glyph, and its details' Live view still opens its stream. Default `true`. |
| Lovelace card | `quiet` | `true`: nothing on the page changes by itself. A camera's still loads when its card comes on screen and when the panel wakes, never on a timer, and the card says when it is from (`Still from 22:14`). A media player draws no progress line or clock. Default `false`. |
| Lovelace card | `nav` | The bottom nav's destinations (see [Navigation](#navigation)), or `false` for none. |
| Lovelace card | `pages` | More pages in the card, each `id`, `title` and `cards` or `rows` (see [Navigation](#navigation)). |
| Lovelace card | `cards`, `rows`, `columns`, `flow` | The main page's layout (The page and its rows, above). Leave out `cards` and `rows` and the house is laid out automatically, kept up to date as you add devices. |
| any card | `entity` | Required. |
| any card | `card` | Picks one of the domain's cards (see above). |
| any card | `footprint` | `compact` (60 px row), `standard` (default), `featured` (the one hero). |
| any card | `name`, `area` | Override the friendly name and the registry area (a weather card shows no area, so it ignores `area`). |
| any card | `width`, `column` | Its place in its row (The page and its rows, above). |
| any card | `show_control` | `false` on a compact card: the value replaces the control and a tap opens details. |
| any card | `history` | `false` skips today's history read. |
| climate, sensor | `unit` | `°C` or `°F`, when the entity doesn't say. |
| sensor | `humidity`, `battery`, `outdoor` | Companion `sensor.*` entities; `outdoor: true`. |
| weather | `aqi`, `aqi_scale`, `sun`, `forecasts` | AQI sensor plus `aqi_scale: US` to band it; `sun` defaults to `sun.sun`; `forecasts: false` skips the forecast read. |
| toggle | `icon`, `description` | `bell-off`, `moon`, `volume-off`, `guest`, `away`, `power`, `waves`; one line for the sheet. |
| alarm | `read_only`, `exit_delay`, `entry_delay`, `open_sensors` | Show without arming controls; delays in seconds; names of open sensors. |
| lock | `battery` | The battery `sensor.*` on the lock's device. The automatic layout finds it, and puts every lock under Security after the alarm. |
| sound | `volume` | The volume `number.*`, when it isn't `number.<device>_volume` beside the switch. |
| owlet | `heart_rate`, `oxygen`, `charging`, `base_station`, `alerts`, `stale_after` | The sock's `sensor.*` and `binary_sensor.*` companions and its base station's `switch.*`, when they aren't named after the sleep state sensor. `alerts` maps any of `critical_oxygen`, `low_oxygen`, `high_oxygen`, `low_heart_rate`, `high_heart_rate`, `sock_off`, `sock_disconnected`, `lost_power`, `critical_battery`, `low_battery` to its `binary_sensor.*`; an alert left out is found by name, or stays silent. `stale_after`: minutes without a new reading before the card warns (default 3). |
| guest wifi | `access`, `network`, `qr`, `new_code`, `refresh` | `access`: `code` (an open network whose page asks for a code; the default for a `sensor`) or `password` (a Wi-Fi password; the default for an `input_text` or `text`). `network`: the network's name, where the entity doesn't say it (UniFi Hotspot Manager's `wlan_name`). The join QR code's `image.*`, and what makes a new code or password and fetches it again (a `button.*`, `input_button.*` or `script.*`), when they aren't `image.<site>_qr_code`, `button.<site>_create` and `button.<site>_update` beside `sensor.<site>_voucher`; anything else has none unless named. The automatic layout puts every voucher code under Guests, after the Nursery. |
| binary sensor | `battery` | The battery `sensor.*` on the sensor's device. The automatic layout finds it, and puts every door, garage door, window, opening, leak, smoke, gas, carbon monoxide and safety sensor under Security after the locks; any other binary sensor (motion, connectivity) is added by hand. |
| camera | `still`, `refresh` | `still: false`: no still on this card, nothing fetched (as `stills: false` for the whole dashboard). `refresh`: how often its still refreshes while it is seen, in seconds, 1 to 3600 (default 10, Home Assistant's own picture cards'); never while the card is off screen, the tab hidden or the panel asleep. The still opens Home Assistant's more-info dialog, its live stream, and so does the details' Live view (Orb's pill, Field's key); the name and the reading open the details. A featured camera with `still: false` has nothing more to show under its words, so give it the standard footprint. A camera has no history, so it ignores `history`. The automatic layout puts every camera under Cameras, after Security, at its standard footprint, since a compact row draws no still. |
| numeric | `unit` | The unit, when the entity doesn't say (`unit_of_measurement`). Picked with `card: numeric`; the automatic layout picks it by device class for the room's air quality only, CO₂, then fine and coarse particles, then volatile organic compounds, one per device (`numericSensors`), after the room sensors under Rooms. Power, energy and any other reading are added by hand. |
| bundle | `joined`: `bundle: joined`, `label`, `cards`, `width`, `column` | Compact members sharing one card. |
| bundle | `lead`: `bundle: lead`, `label`, `sheet_title`, `cards`, `width`, `column` | Its first card standard, then the rest as compact rows. |
| bundle | `titled`: `bundle: titled`, `title`, `area`, `cards`, `width`, `column` | The parts of one thing under a lid naming it and its room; parts in that room drop it. Spell `area` as Home Assistant names the room. |

The Dashboards section of [spec/orb.md](orb.md) has the composition rules: frequent actions first, then household status and the room/environment glance; one hero per screen; compact rows where alignment matters.

#### The automatic layout's order

Orb's automatic layout (`autoDashboard`) lays its rows out in bands, the most pressing first, and a row added for a
new kind of card goes at the end of its band, never ahead of a row already there:

1. **Actions**, since automatic discovery can't know which ones a person uses most: `Comfort` (the thermostats),
   `Modes`, a row per area of its controls by area name, then `Other`.
2. **Safety and security**: `Security`, the alarm, then the locks, then the doors, windows, leaks and smoke.
3. **Security-adjacent**: `Cameras`, what the doors and the nursery look like, right after what guards them.
4. **Household status**: `Nursery` (an Owlet sock), then `Guests` (the guest Wi-Fi code a visitor reads); a new
   household-status row goes after both.
5. **The glance**, read-only context: `Outside` (the weather), then `Rooms` (the room sensors, then each room's air
   quality as numeric readings, one per device).

A row whose title an area already has joins that area's row, so the page never shows two rows of one name.
`src/skins/orb/lovelace/auto.test.ts` lays out a house with every band and holds it to this list.

### Navigation

A nav docks at the bottom of the screen: one pill per destination, the one you're on in the accent. Without `nav`, it lists the card's pages when it has some, or else its titled rows, so even the automatic layout gets one. A wall panel (`viewing: far`) has none unless `nav` lists it, and a nav with a single destination isn't drawn. `nav: false` turns it off.

A destination is one of three kinds, each with an optional `label`:

- `section:` a section of the main page: a titled row, by its title. A tap scrolls there; the pill stays lit while you read that row. From another page it returns to the main page first.
- `page:` one of the card's own `pages`, by `id`, or `home` for the main page (the top-level `cards` or `rows`). The page's title heads it, and the URL keeps it (`#page=living`), so back returns and a link opens it.
- `navigate:` another Home Assistant dashboard or view, by its path. It's named after that dashboard and carries a small arrow, since it leaves this one.

```yaml
type: custom:dashhaus-orb
title: Home
rows:                         # the main page, `home`
  - title: Quick actions
    cards: [...]
  - title: Home status
    cards: [...]
pages:
  - id: living
    title: Living room
    rows:
      - title: Comfort
        cards: [climate.living_room]
  - id: nursery
    title: Nursery
    cards: [sensor.owlet_sock_ac000w0123_sleep_state]
nav:
  - page: home
  - page: living
  - page: nursery
  - navigate: /baby-view/0
    label: Baby view
```

**Storybook → Orb / Dashboards / Lovelace card → Nav and pages** shows this config on the demo data. Pages take the same `cards` or `rows` (and `columns` and `flow`) as the main page, so a room, a floor or a task can each have its own. Home Assistant shows its own tabs when a dashboard has several views, and each view would need its own card and `nav`; `pages` keeps one card and one nav, and `navigate:` stays for the dashboards that really are separate.

## The field dashboard

The same bundle carries a second card, `custom:dashhaus-field`: the field skin ([field.md](field.md)), hardware-style modules after Teenage Engineering's K.O. II. It draws light, climate, humidifier, fan, cover, media player, alarm and lock entities, cameras (`camera.*`), room sensors, binary sensors (`binary_sensor.*`: a door, window, garage door, leak, smoke, gas or carbon monoxide sensor), the weather, Owlet socks (`sensor.*_sleep_state`), guest Wi-Fi codes (`sensor.*_voucher`), modes (`input_boolean` and `switch`) and a sound machine's sound (a `switch` with `card: sound`). `npm run deploy` creates the **Home (Field)** dashboard the first time, holding this card with no `cards` or `rows`, so it shows every supported entity, a row per area: every light, climate, humidifier, fan, cover, `media_player`, `alarm_control_panel`, `lock`, `camera`, `input_boolean` and `switch` entity (a lock with the battery sensor on its device), every Owlet sock by its `sensor.*_sleep_state`, every guest Wi-Fi code by its `sensor.*_voucher`, the first weather entity by name (with `sun.sun` for night, as the main card's Outside), and of sensors only room air, one per device, found the way the main card finds its Rooms (each temperature sensor with the humidity and battery sensors on its device, then humidity sensors on devices without one), and of binary sensors only the safety glance, as the main card's Security has it (`safetySensors`): every door, garage door, window, opening, leak, smoke, gas, carbon monoxide and safety `binary_sensor`, each with the battery sensor on its device, in its area's row, and the room's air quality as numeric readings (CO₂, particles or VOC, one per device). Any other number a `sensor.*` measures (power, energy) takes `card: numeric`. To put one on another dashboard: ⋮ → **Edit dashboard**, make its view a **Panel** view, and add the **Dashhaus Field** card from the card picker.

```yaml
type: custom:dashhaus-field
title: Home              # optional, printed at the top with today's date under it
subtitle: Everyone home  # optional, in place of the date on the main page
show_time: true          # a clock in the header, on a strip of screen
hour_cycle: h23          # optional: h12 or h23; the locale's when left out
viewing: near            # near (default) or far: a wall panel read from across the room
finish: home-assistant   # home-assistant (default: follows its dark mode), auto (the device's), alloy, black
footprint: standard      # standard (160 px modules, default) or compact (64 px rows)
quiet: false             # true: an alarm holds its inverted screen with no flash (a nursery's panel at night)
columns: 3              # optional: at most this many across (1 to 4); fewer where the page is narrower
cards:                   # optional; leave out (and leave out rows) for every supported entity, a row per area
  - light.ceiling        # a light or climate entity id
  - entity: light.desk_strip
    name: Desk           # overrides the friendly name
    area: Office         # overrides the area printed on its plate
    width: 2             # optional: two of its row's columns where it has them (up to 4, or full)
    history: false       # optional: skips the Today history read
  - entity: climate.living_room
    name: Thermostat
    unit: °C             # optional, on a climate entity or a sensor: °C or °F, in place of Home Assistant's
  - entity: sensor.bedroom_temperature   # a sensor: temperature, or humidity alone
    humidity: sensor.bedroom_humidity    # optional companions on the same device
    battery: sensor.bedroom_battery
    outdoor: false                       # true skips the indoor comfort words
  - entity: weather.home                 # the weather
    aqi: sensor.home_aqi                 # optional air-quality sensor
    aqi_scale: US                        # says the AQI sensor is on the US scale, so it can warn
    sun: sun.sun                         # the default; null keeps the day's pictograms
    forecasts: true                      # false skips the forecast read
  - entity: input_boolean.do_not_disturb # a mode: an input_boolean or a switch
    icon: bell-off                       # its glyph, as on the main card
    description: Silences the chimes.    # one line for its panel
  - entity: switch.nursery_music         # a sound machine's sound: a switch, so pick its card
    card: sound
    volume: number.nursery_volume        # optional; found beside the switch when left out
  - entity: alarm_control_panel.house    # an alarm panel
    exit_delay: 30                       # optional, seconds: counted down while arming
    entry_delay: 30                      # optional, seconds: counted down before it goes off
    open_sensors: [Back door]            # optional: names of doors and windows open now
    read_only: false                     # true draws it as a reading, with nothing to arm or disarm
  - entity: sensor.owlet_sock_ac000w0123_sleep_state   # an Owlet sock, by its sleep state sensor
    name: Nova
    stale_after: 3                       # optional, minutes without a new reading before it warns (default 3)
  - entity: sensor.nova                  # a sock whose sensors aren't named after the integration's
    card: owlet
    heart_rate: sensor.nova_bpm          # optional companions, found beside the sleep state when left out
    oxygen: sensor.nova_spo2
    charging: binary_sensor.nova_dock
    base_station: switch.nova_base
    alerts: { low_oxygen: binary_sensor.nova_spo2_low, sock_off: binary_sensor.nova_off }
```

| Key | Values | Default |
| --- | --- | --- |
| `title` | text | none |
| `subtitle` | text, in place of the date under the title on the main page | today's date |
| `show_time` | `true`, `false`: a clock in the header, beside the title | `false` |
| `hour_cycle` | `h12`, `h23` | the locale's |
| `viewing` | `near`, `far`: a wall panel read from across the room, its modules' print and screens a step up and no nav unless `nav` lists one | `near` |
| `finish` | `home-assistant`, `auto`, `alloy`, `black` | `home-assistant` |
| `footprint` | `standard`, `compact` | `standard` |
| `quiet` | `true`, `false`: nothing changes by itself; an alarm holds its inverted screen from the start instead of flashing for ten seconds, a camera's still loads when seen and when the panel wakes, never on a timer, its meta line saying when it is from, and a media player draws no progress rule or clock | `false` |
| `stills` | `true`, `false`: `false` fetches and draws no camera still on this dashboard, for privacy or cost | `true` |
| `cards` | a list of `light.*`, `climate.*`, `sensor.*`, `weather.*`, `input_boolean.*`, `switch.*`, `humidifier.*`, `cover.*`, `alarm_control_panel.*`, `lock.*`, `fan.*`, `binary_sensor.*`, `camera.*` or `media_player.*` entity ids, or an Owlet sock's `sensor.*_sleep_state` or a guest Wi-Fi code's `sensor.*_voucher`, or maps of `entity`, `card`, `name`, `area`, `footprint`, `width` (1 to 4, or `full`), `column` (1 to 4) and `history` (default `true`); a climate entity also takes `unit` (`°C`, `°F`); a sensor `humidity`, `battery` (`sensor.*` ids), `outdoor` and `unit`; a weather `aqi` (a `sensor.*` id), `aqi_scale` (`US`), `sun` (a `sun.*` id, default `sun.sun`) and `forecasts` (default `true`); an `input_boolean.*` or `switch.*` `icon` (`bell-off`, `moon`, `volume-off`, `guest`, `away`, `power`, `waves`) and `description`; a sound (`card: sound`) `volume` (a `number.*` id, default `number.<switch>_volume`, then `number.<device>_volume`); an alarm `read_only`, `exit_delay` and `entry_delay` (seconds) and `open_sensors` (names); an owlet `heart_rate`, `oxygen` (`sensor.*` ids), `charging` (a `binary_sensor.*` id), `base_station` (a `switch.*` id), `alerts` (alert names to `binary_sensor.*` ids, as on the main card) and `stale_after` (minutes, default 3); a lock or a binary sensor `battery` (a `sensor.*` id; the automatic layout finds the one on its device); a numeric reading (a `sensor.*` with `card: numeric`) `unit`; a guest Wi-Fi code (`sensor.*_voucher`, or an `input_text.*`, `text.*` or `sensor.*` with `card: guestWifi`) `access` (`code` or `password`), `network`, `qr` (an `image.*` id), `new_code` and `refresh` (`button.*`, `input_button.*` or `script.*` ids), the last three found beside `sensor.<site>_voucher` when left out; a camera `still` (`false` for none) and `refresh` (seconds, default 10); one plain grid, in this order | every visible supported entity, a row per area, unless `rows` lays the page out |
| `rows` | a list of rows, each `title`, `note` (printed at the legend's end), `columns` (at most this many across, 1 to 4, or `auto`), `flow`, `align` and `cards` (as in `cards`); in place of `cards` ([The format](#the-format)) | a row per area |
| `columns`, `flow` | the default for every row ([The format](#the-format)) | `auto`, `normal` |
| `pages` | more pages, each `id`, `title` and `cards` or `rows`, opened from the nav ([Navigation](#navigation)) | none |
| `nav` | the nav's destinations, each `section`, `page` or `navigate` with an optional `label` ([Navigation](#navigation)); `false` for none | the pages, else the main page's areas or titled rows |

`cards` and `rows` are the main card's layout ([The format](#the-format)), with field's rules: `columns` is a most rather
than a count (tracks come from the width, so a module never narrows below its own 260 px, or a compact row's 300 px),
the gaps come from the footprint, and a row holds one footprint unless it stacks mixed footprints by column, each
module given a `column`. Each module's plate still names its own area, from `area` or Home Assistant's registries.
Keys the main card takes and field doesn't (`theme`, `accent`, `show_control`, bundles) are refused with the
reason, for YAML copied across.

```yaml
type: custom:dashhaus-field
title: Home
rows:
  - title: Quick
    note: Pressed most
    columns: 2
    cards:
      - { entity: input_boolean.do_not_disturb, footprint: compact }
      - { entity: alarm_control_panel.house, footprint: compact }
  - title: Outside
    cards:
      - { entity: weather.home, width: 2 }
      - sensor.outside_temperature
  - title: Living room                # footprints mixed by column: each module names its column
    columns: 2
    align: bottom
    cards:
      - { entity: light.ceiling, column: 1 }
      - { entity: cover.living_room, column: 1, footprint: compact }
      - { entity: climate.living_room, column: 2 }
      - { entity: input_boolean.do_not_disturb, column: 2, footprint: compact }
pages:
  - id: nursery
    title: Nursery
    cards: [sensor.owlet_sock_ac000w0123_sleep_state]
nav:
  - page: home
  - page: nursery
  - navigate: /baby-view/0
    label: Baby view
```

A wall panel with one column per place is one row of column stacks: `columns: 4`, and each module `column: 1` to `4`.
Its columns carry no headings of their own; each plate names its area (**Wall panel, far** below).

The nav works as the main card's ([Navigation](#navigation)), drawn in field's parts: a plate of keys docked at the bottom, the key for where you are staying down. Without `nav`, it lists the pages, or else the main page's titled rows: the areas of the automatic layout, or the YAML's titled rows. A row named in `nav` is checked against `rows` when the YAML lays them out; an area's name comes from Home Assistant, so it can't be.

Under the title, the card draws an alert line whenever a module has something urgent or an alarm: a sock's vitals alert, a triggered alarm, a sock off, an entry delay ([field.md](field.md#design-rules)). Each entry opens that module's panel.

Each module's entity id picks its card. Where two field cards draw one domain, the domain's own card is the default and `card:` picks the other (a `switch` is a toggle unless `card: sound`; a `sensor.*_sleep_state` is an owlet, and `card: owlet` picks it for a sock named otherwise; a `sensor.*_voucher` is a guest Wi-Fi code, and `card: guestWifi` picks it for one named otherwise, or for a password in an `input_text` or `text`); the error lists the cards that can draw it.

Mistakes show the same way as the main card's, all at once with their paths. The card links Archivo, field's typeface, from Google Fonts into the page; without the network it falls back to the system sans. **Storybook → Field / Dashboards / Lovelace card** shows a mixed light, climate, humidifier, fan, sound, cover, alarm, owlet, sensor, weather and toggle dashboard on demo data; its Rows and nav, Nav and pages, Wall panel, far, and Composition stories show those keys.

## Measuring a deployed dashboard

`npm run perf:collect` measures the deployed dashboards: see [performance.md](performance.md).

## What has and hasn't been verified

Live, against Home Assistant 2026.10.2 (Home Assistant OS, SSH add-on on a non-default port), before the CLI move: the SSH upload, resource registration and the first-time dashboard creation (16 generated sections, before the layout became rows) worked. The served file matched the build byte for byte, and the dashboard rendered in Chrome with no error cards or console errors, at phone and desktop widths. Not yet checked live after the move: a redeploy over an existing dashboard (the two-run fake websocket covers creation and no-overwrite), and the YAML-mode resource fallback.

Live, on a scratch Home Assistant 2026.11.0 (the `homeassistant/home-assistant:stable` container, the `demo`
integration, Chromium driving its real frontend), on 2026-11-06, from the packed 0.3.0 tarballs of this change:

- **Each skin's own install.** `orb-dashboard.js` and `field-dashboard.js`, taken out of `@dashhaus/orb`'s and
  `@dashhaus/field`'s tarballs as the mirror takes them, placed in `www/community/<repository>/` as HACS places them and
  registered under `/local/community/…`. Add dashboard listed **Field** and **Orb** under Community dashboards, each with
  its own description, and nothing named Dashhaus; Create made `dashboard-orb` and `dashboard-field` (titles Orb and
  Field, icons `mdi:home-variant` and `mdi:knob`), which saved only `{ strategy: { type: custom:<repository> } }`. Both
  drew the demo house at 1440 and 390 px, in light and dark, with no error card and no console error.
- **The command line.** `@dashhaus/deploy` from the tarballs, with Orb's and Field's README configs, into the same
  instance over a mounted `HA_WWW`: each uploaded its file, registered `/local/<repository>/<repository>.js`, created the
  strategy dashboard and the one of your own, and fetched the file back. Each warned that the Marketplace's copy was
  registered too, as it should. All four dashboards drew; the README's own rows name entities the `demo` integration
  doesn't have, which drew as unavailable.

Not run live: the download itself from a skin's repository through HACS or the Marketplace, since
`Krystosterone/orb-dashboard` and `Krystosterone/field-dashboard` don't exist yet and HACS needs a person to authorize it
with GitHub; the mirror workflow, for the same reason (its checks ran against `@dashhaus/core` 0.3.0's real
attestations, `verify/skin-repositories.test.ts`); the strategy editor's YAML and Take control.
