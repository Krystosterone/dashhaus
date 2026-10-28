# Deploying to Home Assistant

The dashboard ships as one Lovelace card, `custom:home-dashboard`, that draws a whole page from its YAML. The same bundle also carries the field skin's card (The field dashboard, below). It runs inside Home Assistant's own frontend and reuses its websocket connection, so the page needs no token, no separate server and no rebuild when you change the layout.

## First deploy

1. Copy `.env.example` to `.env` and fill in three values:
   - `HA_URL`: the address you open Home Assistant at.
   - `HA_TOKEN`: a long-lived access token from an admin user (Profile → Security → Long-lived access tokens). Only the deploy script uses it; it never goes into the bundle.
   - `HA_WWW`: where Home Assistant's `/config/www` folder is. Over SSH, `root@homeassistant.local:/config/www` (Terminal & SSH add-on, with your public key in its `authorized_keys`), with `HA_SSH_PORT` if it isn't 22. A folder on this machine also works: the Samba add-on's share mounted at `/Volumes/config/www`, or a Docker volume.
2. Run `npm run deploy`.
3. Reload any Home Assistant tab that was already open, then open the **Home** dashboard in the sidebar. The frontend reads its resource list once, when the tab opens: the new dashboard appears in an open tab's sidebar straight away, but its card isn't loaded until a reload, so Home Assistant shows a bare "Configuration error" until then.

`npm run deploy` builds `dist/home-dashboard.js`, copies it to `www/home-dashboard/`, and registers it as a dashboard resource at `/local/home-dashboard/home-dashboard.js?v=<content hash>`. The new version number makes browsers fetch the new file. The first time, it also creates the `home-dashboard` dashboard with one panel view and a layout generated from your house. Run it again after every code change. It updates the resource and never touches a dashboard that already exists, so layout edits made in Home Assistant are safe. Open dashboards pick up a new version on their next reload.

If your dashboards are in YAML mode, the script can't manage resources and prints the lines to add to `configuration.yaml` instead.

## Authoring

Edit the layout in Home Assistant: open the dashboard → ⋮ → **Edit dashboard** → the card's pencil → **Show code editor**. The preview redraws as you type. Every mistake is listed at once, with its path and the probable fix:

```text
Home Dashboard config has 2 problems:
• sections[1].cards[0] (sensor.bedroom_temperature): unknown key "humdity" — did you mean "humidity"?
• sections[2].cards[3]: media_player.tv: media_player.* entities have no card yet
```

To start a new dashboard somewhere else, add the **Home Dashboard** card from the card picker. It pre-fills the generated layout for your house, ready to edit. Put it in a **Panel** view so it gets the full width.

### The format

```yaml
type: custom:home-dashboard
title: Home
show_time: true                 # a clock in the header
sections:
  - title: Quick actions
    columns: 2
    cards:
      - entity: climate.living_room           # no options: the entity id alone
        span: 2
      - entity: light.living_room
        footprint: compact
      - entity: cover.living_room
        footprint: compact
      - entity: switch.porch
        footprint: compact
  - title: Home status
    cards:
      - entity: alarm_control_panel.house
        footprint: compact
      - joined: [input_boolean.guest_mode, input_boolean.dnd]
        label: Modes
  - title: Outside
    cards:
      - entity: weather.home
        aqi: sensor.home_aqi
        aqi_scale: US
  - title: Rooms
    columns: 2
    cards:
      - entity: sensor.living_room_temperature
        humidity: sensor.living_room_humidity
        battery: sensor.living_room_battery
        span: 2
  - title: Nursery
    cards:
      - entity: sensor.owlet_sock_ac000w0123_sleep_state
        name: Nova
```

**Storybook → Orb / Dashboards / Lovelace card** shows this exact config on the demo data.

The entity's domain picks the card. One card shows one entity, though some cards also read the device's other entities:

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

When a domain has more than one card, `card:` picks one: `card: owlet` for a sock whose sensor is named differently, or `card: sensor` to override the default.

| Where | Key | Meaning |
| --- | --- | --- |
| Lovelace card | `title`, `subtitle` | The page header. `title` defaults to "Home". |
| Lovelace card | `show_time`, `hour_cycle` | A clock in the header; `h12` or `h23`. |
| Lovelace card | `viewing` | `near` (default: a phone or tablet in the hand) or `far`, for a wall panel read from across the room: larger status lines, captions and warn cues, and heavier figures. Card heights don't change. |
| Lovelace card | `theme` | `home-assistant` (default: follows Home Assistant's dark mode), `auto` (follows the device), `light`, `dark`. |
| Lovelace card | `accent` | `yellow` (default), `sage`, `coral`, `sky`, `lilac`, or `{ chroma, hue }` in OKLCH. |
| Lovelace card | `nav` | The bottom nav's destinations (see [Navigation](#navigation)), or `false` for none. |
| Lovelace card | `pages` | More pages in the card, each `id`, `title` and `sections` (see [Navigation](#navigation)). |
| Lovelace card | `sections` | The layout, top to bottom. Leave it out and the house is laid out automatically, kept up to date as you add devices. |
| section | `title`, `note` | A heading. Without a title, the cards form a plain grid. |
| section | `columns`, `gap` | Grid columns (default 1) and gap in px. |
| section | `cards` | Cards, bundles, or entity ids. |
| side by side | `sections`, `columns`, `gap` | A list item with its own `sections` puts them in columns: a tablet or wall-panel layout. |
| any card | `entity` | Required. |
| any card | `card` | Picks one of the domain's cards (see above). |
| any card | `footprint` | `compact` (60 px row), `standard` (default), `featured` (the one hero). |
| any card | `name`, `area` | Override the friendly name and the registry area. |
| any card | `span` | Grid columns the card spans. |
| any card | `show_control` | `false` on a compact card: the value replaces the control and a tap opens details. |
| any card | `history` | `false` skips today's history read. |
| light, climate, sensor, cover, toggle, owlet, humidifier, sound | `color` | The orb's or icon's own colour: `yellow`, `apricot`, `rose`, `lavender`, `blue`, `teal`, `sage`, or `none` (not on toggles). |
| climate, sensor | `unit` | `°C` or `°F`, when the entity doesn't say. |
| sensor | `humidity`, `battery`, `outdoor` | Companion `sensor.*` entities; `outdoor: true`. |
| weather | `aqi`, `aqi_scale`, `sun`, `forecasts` | AQI sensor plus `aqi_scale: US` to band it; `sun` defaults to `sun.sun`; `forecasts: false` skips the forecast read. |
| toggle | `icon`, `description` | `bell-off`, `moon`, `volume-off`, `guest`, `away`, `power`, `waves`; one line for the sheet. |
| alarm | `read_only`, `exit_delay`, `entry_delay`, `open_sensors` | Show without arming controls; delays in seconds; names of open sensors. |
| sound | `volume` | The volume `number.*`, when it isn't `number.<device>_volume` beside the switch. |
| owlet | `heart_rate`, `oxygen`, `charging`, `base_station`, `alerts`, `stale_after` | The sock's `sensor.*` and `binary_sensor.*` companions and its base station's `switch.*`, when they aren't named after the sleep state sensor. `alerts` maps any of `critical_oxygen`, `low_oxygen`, `high_oxygen`, `low_heart_rate`, `high_heart_rate`, `sock_off`, `sock_disconnected`, `lost_power`, `critical_battery`, `low_battery` to its `binary_sensor.*`; an alert left out is found by name, or stays silent. `stale_after`: minutes without a new reading before the card warns (default 3). |
| bundle | `joined: [...]`, `label`, `span` | Compact members sharing one card. |
| bundle | `lead: ...`, `rows: [...]`, `label`, `sheet_title`, `span` | One standard card followed by compact rows. |
| bundle | `title`, `area`, `rows: [...]`, `span` | The parts of one thing under a lid naming it and its room; parts in that room drop it. Spell `area` as Home Assistant names the room. |

README.md's Dashboards section has the composition rules: frequent actions first, then household status and the room/environment glance; one hero per screen; compact rows where alignment matters.

### Navigation

A nav docks at the bottom of the screen: one pill per destination, the one you're on in the accent. Without `nav`, it lists the card's pages when it has some, or else its sections, so even the automatic layout gets one. A wall panel (`viewing: far`) has none unless `nav` lists it, and a nav with a single destination isn't drawn. `nav: false` turns it off.

A destination is one of three kinds, each with an optional `label`:

- `section:` a section of the main page, by its title. A tap scrolls there; the pill stays lit while you read that section. From another page it returns to the main page first.
- `page:` one of the card's own `pages`, by `id`, or `home` for the main page (the top-level `sections`). The page's title heads it, and the URL keeps it (`#page=living`), so back returns and a link opens it.
- `navigate:` another Home Assistant dashboard or view, by its path. It's named after that dashboard and carries a small arrow, since it leaves this one.

```yaml
type: custom:home-dashboard
title: Home
sections:                     # the main page, `home`
  - title: Quick actions
    cards: [...]
  - title: Home status
    cards: [...]
pages:
  - id: living
    title: Living room
    sections:
      - title: Comfort
        cards: [climate.living_room]
  - id: nursery
    title: Nursery
    sections:
      - title: Baby
        cards: [sensor.owlet_sock_ac000w0123_sleep_state]
nav:
  - page: home
  - page: living
  - page: nursery
  - navigate: /baby-view/0
    label: Baby view
```

**Storybook → Orb / Dashboards / Lovelace card → Nav and pages** shows this config on the demo data. Pages take the same `sections` as the main page, so a room, a floor or a task can each have its own. Home Assistant shows its own tabs when a dashboard has several views, and each view would need its own card and `nav`; `pages` keeps one card and one nav, and `navigate:` stays for the dashboards that really are separate.

## The field dashboard

The same bundle carries a second card, `custom:home-dashboard-field`: the field skin ([field.md](field.md)), hardware-style modules after Teenage Engineering's K.O. II. It draws light and climate entities. `npm run deploy` registers the bundle, so the card is available once you have deployed, but the script doesn't create a dashboard for it. To add one: Settings → Dashboards → **Add dashboard**, open it, ⋮ → **Edit dashboard**, make its view a **Panel** view, and add the **Home Dashboard Field** card from the card picker. With no `modules` it shows every supported light and climate entity, grouped by area.

```yaml
type: custom:home-dashboard-field
title: Home              # optional, printed at the top
finish: home-assistant   # home-assistant (default: follows its dark mode), auto (the device's), alloy, black
footprint: standard      # standard (160 px modules, default) or compact (64 px rows)
modules:                 # optional; leave out for every supported entity by area
  - light.ceiling        # a light or climate entity id
  - entity: light.desk_strip
    name: Desk           # overrides the friendly name
    area: Office         # overrides the area; modules are grouped under it
    footprint: compact   # overrides the card's footprint for this module
  - entity: climate.living_room
    name: Thermostat
```

| Key | Values | Default |
| --- | --- | --- |
| `title` | text | none |
| `finish` | `home-assistant`, `auto`, `alloy`, `black` | `home-assistant` |
| `footprint` | `standard`, `compact` | `standard` |
| `modules` | a list of `light.*` or `climate.*` entity ids or maps of `entity`, `name`, `area`, `footprint` | every visible supported entity |

Mistakes show the same way as the main card's, all at once with their paths. The card links Archivo, field's typeface, from Google Fonts into the page; without the network it falls back to the system sans. **Storybook → Field / Dashboards / Lovelace card** shows a mixed light and climate dashboard on demo data.

## What has and hasn't been verified

Unit tests cover the config parser, the generated layout and the card element. Storybook renders the config on the demo transports. The built bundle has been loaded in Chromium against a fake frontend connection: styles in the shadow root, dark mode, sheets and service calls. `scripts/deploy.mjs` has been run against a fake Home Assistant websocket API.

The field card: unit tests cover its config parser, automatic mixed-domain layout and element (areas, finish, font link, one store per connection), and the built bundle carries it and its font. It has not been loaded in a live Home Assistant yet.

Live, against Home Assistant 2026.10.2 (Home Assistant OS, SSH add-on on a non-default port): the SSH upload, resource registration and the first-time dashboard creation (16 generated sections) worked. The served file matched the build byte for byte, and the dashboard rendered in Chrome with no error cards or console errors, at phone and desktop widths. Not yet checked live: service calls from the cards, the YAML-mode resource fallback, and a redeploy over an existing dashboard.
