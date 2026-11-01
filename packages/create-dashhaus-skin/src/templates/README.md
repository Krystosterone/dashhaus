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
npm run snapshot    # the same page saved as preview/snapshots/*.png (installs nothing; says what it needs)
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

With no `cards`, the card lays out every light and sensor by Home Assistant area. To choose:

```yaml
type: custom:__card_type__
title: Home
cards:
  - entity: light.kitchen
  - entity: sensor.office_temperature
    name: Office        # overrides the friendly name
    area: Upstairs      # overrides the area it is grouped under
```

## Layout

- `styles/tokens.css`: every colour, font and easing, light and dark.
- `cards/`: the presentational cards; they never import Home Assistant.
- `ha/`: the adapters, the only files that call `useHa<Name>`.
- `shared/`: the page and the parts every card uses.
- `lovelace/`: the custom element (page layout, fonts), its YAML reader, the card registry and the bundle entry.
- `preview/`: the local preview and its sample house; not in the bundle.
