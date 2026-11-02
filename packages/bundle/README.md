# @dashhaus/bundle

The prebuilt Dashhaus Lovelace bundle: the Orb and Field dashboards, React and every stylesheet in one ES module. It
registers `custom:dashhaus-orb` and `custom:dashhaus-field` and exports the file's path, so `@dashhaus/deploy` can
upload it. Nothing is built: install it with the deploy command, write one config, run one command.

To make a dashboard of your own design instead, start from `npm create dashhaus-skin@latest my-skin`.

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

Each card lays out the house itself when its YAML has no `sections` (Orb) or `modules` (Field): every supported
entity, grouped by area, kept up to date as devices are added. To choose your own, edit the dashboard in Home
Assistant (⋮ → Edit dashboard → the card's ✎ → Show code editor). Problems are listed together, each at its path,
with the key it probably meant.

```yaml
type: custom:dashhaus-orb
title: Home
sections:
  - title: Living room
    columns: 2
    cards:
      - climate.living_room
      - entity: light.floor_lamp
        footprint: compact        # compact, standard or featured
      - entity: sensor.living_room_temperature
        humidity: sensor.living_room_humidity
```

```yaml
type: custom:dashhaus-field
title: Home
modules:
  - light.ceiling
  - entity: sensor.bedroom_temperature
    humidity: sensor.bedroom_humidity
    area: Bedroom
```

Orb draws lights, climate, covers, switches and `input_boolean` modes, room sensors, weather, alarm panels,
humidifiers, sound machines and Owlet socks; Field draws the same domains as hardware-style modules.

## Exports

| Export | What it is |
| --- | --- |
| `bundlePath` | `dashhaus.js` as a file `URL`; pass it through `fileURLToPath` to the deploy config |
