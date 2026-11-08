# @dashhaus/field

Field for Home Assistant: hardware-style modules for every supported device, a row per room, laid out for you and kept up to date. This package carries Field's resource, the one file Home Assistant loads, and the React modules it is drawn with.

Most people install Field from Home Assistant's Marketplace and never need this package: [Field's page](https://krystosterone.github.io/dashhaus/field/) has the button. This package is for deploying it from a script or CI, and for drawing its cards in an app of your own.

**Beta.** Dashhaus is in beta: a new `0.x` version (0.2 → 0.3) may break what you use, and a caret range keeps
you on one `0.x` line until you move. Every `@dashhaus/` package shares one version; each
[release](https://github.com/Krystosterone/dashhaus/releases) says what changed and what to do, and an
[issue](https://github.com/Krystosterone/dashhaus/issues/new/choose) saying how it went on your setup helps.

## Deploy it from the command line

```sh
npm install @dashhaus/field @dashhaus/deploy
```

(From release tarballs: `npm install ./dashhaus-core-<version>.tgz ./dashhaus-field-<version>.tgz ./dashhaus-deploy-<version>.tgz`.)
Nothing is built: the deploy uploads the `field-dashboard.js` this package ships.

`.env` beside the config:

```sh
HA_URL=http://homeassistant.local:8123
HA_TOKEN=<long-lived access token>
HA_WWW=root@homeassistant.local:/config/www
```

`HA_WWW` is Home Assistant's `/config/www` over SSH, or that folder mounted on this machine.

`dashboard.config.mjs`:

```js
import { resourceFile } from "@dashhaus/field/resource";

export default {
  pageTitle: "Home",
  files: [resourceFile],
  dashboards: [
    // Field's own dashboard, on its strategy: it follows Field as it updates.
    { path: "home-field", title: "Home (Field)", icon: "mdi:knob", strategy: { type: "custom:field-dashboard" } },
    // A dashboard of your own: Field's card with your modules and rows, created once and then yours to edit.
    {
      path: "my-home-field",
      title: "My home (Field)",
      icon: "mdi:floor-plan",
      card: {
        type: "custom:dashhaus-field",
        title: "Home",
        rows: [
          { title: "Kitchen", columns: 2, cards: ["light.kitchen_ceiling", "sensor.kitchen_temperature"] },
          { title: "Office", cards: ["light.office_desk", "switch.office_fan"] },
        ],
      },
    },
  ],
};
```

```sh
npx dashhaus-deploy --skip-build
```

It uploads `field-dashboard.js` to `www/field-dashboard/`, registers `/local/field-dashboard/field-dashboard.js` as a dashboard resource and
creates both dashboards; run it again after an update. The strategy takes `title`, `viewing`, `finish` and `layout`; the card takes
`title`, `cards` or `rows`, `columns`, `flow`, `pages`, `nav` and `finish`; without `cards` or `rows` it draws every supported entity, a row per Home Assistant area,
or a column per area with `layout: wall`, for a panel on a wall.

## In an app of your own

```sh
npm install @dashhaus/field @dashhaus/core react@18 react-dom@18 home-assistant-js-websocket@9
```

React 18.3+ or 19 is supported. The websocket client is an optional peer: the Lovelace element reaches it through `@dashhaus/core/websocket`, so install it in the app that builds the browser bundle.

## Use

```tsx
import tokens from "@dashhaus/field/styles/tokens.css?inline";
import { defineFieldCard } from "@dashhaus/field/lovelace/card";

// Registers custom:dashhaus-field for Lovelace's card picker.
defineFieldCard(tokens);
```

Import `@dashhaus/field/styles/tokens.css` in the browser bundle so its stylesheet reaches the build, or pass the bundled text to `defineFieldCard`.

## Subpaths

| Subpath | What it is |
| --- | --- |
| `.` | The skin's modules, connected modules and page furniture. Loads the token CSS |
| `./lovelace/card` | `createFieldCard`, `defineFieldCard` and the `custom:dashhaus-field` element |
| `./storybook` | The skin's Storybook section, toolbar and decorator (repo tooling) |
| `./resource` | `resourceFile`: the absolute path of `field-dashboard.js`, Field's card, stylesheet and dashboard strategy (`custom:field-dashboard`) in one ES module with React inside. For a Node script; Node-only |
| `./styles/tokens.css` | Field's design tokens, the only source of its colours, every one prefixed `--fd-` |

## Docs

- [Field design](https://github.com/Krystosterone/dashhaus/blob/main/spec/field.md)
- [Card behaviour](https://github.com/Krystosterone/dashhaus/blob/main/spec/cards.md)
- [Deploy YAML](https://github.com/Krystosterone/dashhaus/blob/main/spec/deploy.md)
- [Build a skin](https://github.com/Krystosterone/dashhaus/blob/main/spec/build-a-skin.md)
