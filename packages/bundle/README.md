# @dashhaus/bundle

The prebuilt Dashhaus Lovelace bundle: the Orb and Field dashboards, React and every stylesheet in one ES module. It
registers `custom:dashhaus-orb` and `custom:dashhaus-field` and exports the file's path, so `@dashhaus/deploy` can
upload it. Nothing is built: install it with the deploy command, write one config, run one command.

The same file is the release asset the Home Assistant Marketplace (HACS) installs. There it also registers the
`custom:dashhaus` dashboard strategy, which Home Assistant's **Add dashboard** dialog lists as **Dashhaus**: one
dashboard with a tab for each look, with no terminal. Use one way or the other: each registers its own copy.

To make a dashboard of your own design instead, start from `npm create dashhaus-skin@latest my-skin`.

**Beta.** Dashhaus is in beta: a new `0.x` version (0.2 → 0.3) may break what you use, and a caret range keeps
you on one `0.x` line until you move. Every `@dashhaus/` package shares one version; each
[release](https://github.com/Krystosterone/dashhaus/releases) says what changed and what to do, and an
[issue](https://github.com/Krystosterone/dashhaus/issues/new/choose) saying how it went on your setup helps.

## Deploy it

```sh
npm install @dashhaus/bundle @dashhaus/deploy
```

(From release tarballs: `npm install ./dashhaus-bundle-<version>.tgz ./dashhaus-deploy-<version>.tgz`.) No React,
`@dashhaus/core` or `@dashhaus/dashboard` is needed; the bundle carries its own runtime.

`.env` beside the config:

```sh
HA_URL=http://homeassistant.local:8123
HA_TOKEN=<long-lived access token>
HA_WWW=root@homeassistant.local:/config/www
```

`HA_WWW` is Home Assistant's `/config/www` over SSH, or that folder mounted on this machine.

`dashboard.config.mjs`:

```js
import { fileURLToPath } from "node:url";
import { bundlePath } from "@dashhaus/bundle";

export default {
  pageTitle: "Home",
  bundle: fileURLToPath(bundlePath),
  dashboards: [
    {
      path: "home-orb",
      title: "Home (Orb)",
      icon: "mdi:home-variant",
      async card() {
        return { card: { type: "custom:dashhaus-orb" }, made: "automatic" };
      },
    },
    {
      path: "home-field",
      title: "Home (Field)",
      icon: "mdi:knob",
      async card() {
        return { card: { type: "custom:dashhaus-field" }, made: "automatic" };
      },
    },
  ],
};
```

Keep only the skin you want if you don't need both.

```sh
npx dashhaus-deploy --skip-build
```

Every step ends in ✓, the last being `Checking that Home Assistant serves it`. Reload any Home Assistant tab that was
already open, then pick **Home (Orb)** or **Home (Field)** in the sidebar. The `.env` keys, the config's other options
and what each error means are in `@dashhaus/deploy`'s README.

## The two cards

Each card lays out the house itself when its YAML has no `cards` or `rows`: every supported entity, a row per area,
kept up to date as devices are added. Both cards read one layout: `cards` for one plain grid in your order, or `rows`
of cards, each with its own `title` and `columns`; a card sets its `width` (columns, or `full`), `column` and
`footprint`. To choose your own, edit the dashboard in Home
Assistant (⋮ → Edit dashboard → the card's ✎ → Show code editor). Problems are listed together, each at its path,
with the key it probably meant.

```yaml
type: custom:dashhaus-orb
title: Home
rows:
  - title: Living room
    columns: 2
    cards:
      - entity: climate.living_room
        width: full               # both columns
      - entity: light.floor_lamp
        footprint: compact        # compact, standard or featured
      - entity: sensor.living_room_temperature
        humidity: sensor.living_room_humidity
```

```yaml
type: custom:dashhaus-field
title: Home
cards:
  - light.ceiling
  - entity: sensor.bedroom_temperature
    humidity: sensor.bedroom_humidity
    area: Bedroom
```

Orb draws lights, climate, covers, switches and `input_boolean` modes, room sensors, weather, alarm panels, locks,
humidifiers, fans, sound machines, Owlet socks and guest Wi-Fi; Field draws the same domains as hardware-style modules.

## Exports

| Export | What it is |
| --- | --- |
| `bundlePath` | `dashhaus.js` as a file `URL`; pass it through `fileURLToPath` to the deploy config |

## License

MIT — see `LICENSE`, shipped with this package. `dashhaus.js` also opens with the MIT notice for the React and
ReactDOM it bundles; the same text ships as [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
