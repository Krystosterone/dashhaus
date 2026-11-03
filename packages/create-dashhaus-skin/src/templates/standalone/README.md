# __Section__

A Dashhaus skin: a Home Assistant dashboard drawn in React inside one Lovelace card, `custom:__card_type__`. It starts
with a control card (lights), a reading card (temperature and humidity sensors), a page that groups them by
area, a local preview and a one-file build. `@dashhaus/core` reads Home Assistant; the look is this folder's own.

Working with an agent? Point it at `AGENTS.md`. It covers where the colours, type, parts and rules live, and how to
restyle the skin from a screenshot or a description.

## Use

```sh
npm install
npm run preview     # the skin on a sample house, in the browser
npm run snapshot    # the same page saved as preview/snapshots/*.png (the first run says how to install Chromium)
npm test            # TypeScript, then the card and CSS rules
npm run build       # dist/dashhaus-__skin__.js: one ES module, its CSS included
```

## Deploy

```sh
cp .env.example .env    # HA_URL, HA_TOKEN, HA_WWW
npm run deploy
```

It builds, uploads `dist/dashhaus-__skin__.js` into Home Assistant's `/config/www`, registers it as a dashboard
resource, checks Home Assistant serves it and creates **Home (__Section__)** the first time. Reload any open tab
afterwards. Run it again after every change; the dashboard's layout is kept.

## YAML

With no `cards` or `rows`, the card lays out every light and every room's air, a row per Home Assistant area: a
temperature sensor with the humidity sensor on its device. To choose, list `cards` for one plain grid in that order,
or `rows` of them, each with its own `title` and `columns`:

```yaml
type: custom:__card_type__
title: Home
columns: 2              # at most this many across; fewer where the screen is narrower
cards:
  - entity: light.kitchen
    width: full         # every column of the row
  - entity: sensor.office_temperature
    humidity: sensor.office_humidity   # drawn under the temperature
    name: Office        # overrides the friendly name
    area: Upstairs      # overrides the area printed on it
```

A row holds one footprint; put compact cards in a row of their own. `column: 2` starts a card in that column,
`flow: dense` lets a later card fill an earlier hole, and `align: bottom` sets a row's shorter columns on its foot.

## Layout

- `styles/tokens.css`: every colour, font and easing, light and dark.
- `cards/`: the presentational cards; they never import Home Assistant.
- `ha/`: the adapters, the only files that call `useHa<Name>`.
- `shared/`: the page, the parts every card uses and the details sheet they open.
- `lovelace/`: the custom element (page layout, fonts), its YAML reader, the card registry and the bundle entry.
- `preview/`: the local preview and its sample house; not in the bundle.
