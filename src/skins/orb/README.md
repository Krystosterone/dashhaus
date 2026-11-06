# @dashhaus/orb

Orb for Home Assistant: every supported device in a room-by-room dashboard, laid out for you and kept up to date, drawn as glowing orbs on soft cards. This package carries Orb's resource, the one file Home Assistant loads, and the React cards it is drawn with.

Most people install Orb from Home Assistant's Marketplace and never need this package: [Orb's page](https://krystosterone.github.io/dashhaus/orb/) has the button. This package is for deploying it from a script or CI, and for drawing its cards in an app of your own.

**Beta.** Dashhaus is in beta: a new `0.x` version (0.2 → 0.3) may break what you use, and a caret range keeps
you on one `0.x` line until you move. Every `@dashhaus/` package shares one version; each
[release](https://github.com/Krystosterone/dashhaus/releases) says what changed and what to do, and an
[issue](https://github.com/Krystosterone/dashhaus/issues/new/choose) saying how it went on your setup helps.

## Deploy it from the command line

```sh
npm install @dashhaus/orb @dashhaus/deploy
```

(From release tarballs: `npm install ./dashhaus-core-<version>.tgz ./dashhaus-orb-<version>.tgz ./dashhaus-deploy-<version>.tgz`.)
Nothing is built: the deploy uploads the `orb-dashboard.js` this package ships.

`.env` beside the config:

```sh
HA_URL=http://homeassistant.local:8123
HA_TOKEN=<long-lived access token>
HA_WWW=root@homeassistant.local:/config/www
```

`HA_WWW` is Home Assistant's `/config/www` over SSH, or that folder mounted on this machine.

`dashboard.config.mjs`:

```js
import { resourceFile } from "@dashhaus/orb/resource";

export default {
  pageTitle: "Home",
  files: [resourceFile],
  dashboards: [
    // Orb's own dashboard, on its strategy: it follows Orb as it updates.
    { path: "home-orb", title: "Home (Orb)", icon: "mdi:home-variant", strategy: { type: "custom:orb-dashboard" } },
    // A dashboard of your own: Orb's card with your cards and rows, created once and then yours to edit.
    {
      path: "my-home-orb",
      title: "My home (Orb)",
      icon: "mdi:floor-plan",
      card: {
        type: "custom:dashhaus-orb",
        title: "Home",
        rows: [
          { title: "Living room", columns: 2, cards: ["light.living_room_floor", "climate.living_room"] },
          { title: "Outside", cards: ["weather.home"] },
        ],
      },
    },
  ],
};
```

```sh
npx dashhaus-deploy --skip-build
```

It uploads `orb-dashboard.js` to `www/orb-dashboard/`, registers `/local/orb-dashboard/orb-dashboard.js` as a dashboard resource and
creates both dashboards; run it again after an update. The strategy takes `title`, `viewing` and `theme`; the card takes
`title`, `cards` or `rows`, `columns`, `flow`, `pages`, `nav`, `theme` and `accent`; without `cards` or `rows` it lays the house out automatically.

## In an app of your own

```sh
npm install @dashhaus/orb @dashhaus/core react@18 react-dom@18 home-assistant-js-websocket@9
```

React 18.3+ or 19 is supported. The websocket client is an optional peer: the Lovelace element reaches it through `@dashhaus/core/websocket`, so install it in the app that builds the browser bundle.

## Use

```tsx
import tokens from "@dashhaus/orb/styles/tokens.css?inline";
import { defineDashhausCard } from "@dashhaus/orb/lovelace/card";

// Registers custom:dashhaus-orb for Lovelace's card picker.
defineDashhausCard(tokens);
```

The browser bundle needs one more step: import `@dashhaus/orb/styles/tokens.css` so the stylesheet reaches the build, or pass its own bundled text to `defineDashhausCard`. Orb's own docs and the consumer guide show both recipes.

## Subpaths

| Subpath | What it is |
| --- | --- |
| `.` | The skin's cards, connected tiles, bundles and dashboard furniture. Loads the token CSS |
| `./lovelace/card` | `createDashhausCard`, `defineDashhausCard` and the `custom:dashhaus-orb` element |
| `./lovelace/auto` | `autoDashboard`, the automatic layout a config or deploy factory can call. Pure, no React |
| `./storybook` | The skin's Storybook section, toolbar and decorator (repo tooling) |
| `./resource` | `resourceFile`: the absolute path of `orb-dashboard.js`, Orb's card, stylesheet and dashboard strategy (`custom:orb-dashboard`) in one ES module with React inside. For a Node script; Node-only |
| `./styles/tokens.css` | Orb's design tokens, the only source of its colours |

## Docs

- [Orb design](https://github.com/Krystosterone/dashhaus/blob/main/spec/orb.md)
- [Card behaviour](https://github.com/Krystosterone/dashhaus/blob/main/spec/cards.md)
- [Deploy YAML](https://github.com/Krystosterone/dashhaus/blob/main/spec/deploy.md)
- [Build a skin](https://github.com/Krystosterone/dashhaus/blob/main/spec/build-a-skin.md)
