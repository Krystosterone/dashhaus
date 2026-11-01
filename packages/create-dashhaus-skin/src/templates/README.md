# __Section__

A standalone Dashhaus skin: one control card (light), one reading card (sensor), the shared `@dashhaus/core` hooks
behind them, and `custom:__card_type__`, which draws the whole page from YAML. No Storybook, no workspace and no
repository script: everything here belongs to the skin.

## Install and test

```sh
npm install
npm test        # the packed conformance preset over cards/
npm run build   # dist/dashhaus-__skin__.js: one file, its CSS included
```

React 18.3+ or 19 and `home-assistant-js-websocket` are peers; npm installs them with the rest. The build is one ES module,
so Home Assistant needs one dashboard resource.

## Deploy

Copy `.env.example` from the deploy docs to `.env` beside `dashboard.config.mjs`, fill in `HA_URL`, `HA_TOKEN` and
`HA_WWW`, then:

```sh
npx dashhaus-deploy --skip-build
```

Or run `npm run deploy` after a build. The config registers `__card_type__`, uploads `dist/dashhaus-__skin__.js` and
creates the dashboard once. A card with no `cards` list lays out every light and sensor by Home Assistant area.

## Cards

| Card | Domain | What it draws |
| --- | --- | --- |
| `__Skin__LightCard` | `light.*` | its name, area, state and one on/off button, over `useHaLight` |
| `__Skin__SensorCard` | `sensor.*` | its name, area, temperature and optional humidity, over `useHaSensor` |

Every card folder has its component, its CSS, its story metadata and a two-letter code. Add a domain by giving it a
card folder, a `ha/` adapter and a row in `lovelace/registry.tsx`; the conformance test checks the class prefix and the
Home Assistant boundary.

YAML:

```yaml
type: custom:__card_type__
title: Home
cards:
  - entity: light.kitchen
  - entity: sensor.office_temperature
    name: Office
```

## Layout

- `cards/` — the presentational cards; they import `@dashhaus/core` entities, primitives and formatters, never Home Assistant.
- `ha/` — the connected adapters; the only files that call `useHa<Name>`.
- `lovelace/` — the YAML reader, the card registry, the custom element and the bundle entry.
- `shared/` — parts every card uses, such as the action button.
- `styles/tokens.css` — every colour the skin draws; classes use the `__skin__-` namespace.

The design is yours: change the tokens and the card markup, keep the domain and Home Assistant contracts.
