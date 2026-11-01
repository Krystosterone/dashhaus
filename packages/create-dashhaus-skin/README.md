# create-dashhaus-skin

Scaffold a standalone Dashhaus skin: one control card, one reading card, the real `@dashhaus/core` hooks, a YAML
reader, the custom element, the conformance test, a Vite build that emits one file, and a `dashboard.config.mjs`.
No Storybook, no workspace, no repository scripts.

## Use

```sh
npm create dashhaus-skin@latest my-skin
cd my-skin
npm install
npm test
npm run build
npx dashhaus-deploy --skip-build
```

Or invoke the bin directly from a packed or installed package:

```sh
npx create-dashhaus-skin my-skin
```

The target must be a new folder or an empty one. `--dry-run` lists the files without writing them.

## What it writes

```
cards/light/__Skin__LightCard.tsx   the control card and its CSS, stories and two-letter code
cards/sensor/__Skin__SensorCard.tsx the reading card
ha/                                 the useHaLight and useHaSensor adapters
lovelace/                           the YAML reader, card registry, element and bundle entry
shared/                             the action part
styles/tokens.css                   every colour, in the skin's namespace
conformance.js                      @dashhaus/dashboard/conformance over cards/
vite.config.js                      one ES module, dist/dashhaus-<skin>.js, CSS inlined
dashboard.config.mjs                the dashboard and the bundle
```

The generated `package.json` depends on `@dashhaus/core` and `@dashhaus/dashboard` and peers on React 18.3+ or 19 and
`home-assistant-js-websocket`; the deploy CLI is a dev dependency. The build is one file, so the dashboard resource
needs no separate stylesheet.

## Docs

- [Build a skin](https://github.com/Krystosterone/dashhaus/blob/main/spec/build-a-skin.md)
- [Deploy](https://github.com/Krystosterone/dashhaus/blob/main/spec/deploy.md)
