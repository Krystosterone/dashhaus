# Build a skin

A skin is a React UI for Home Assistant drawn on the headless packages. This guide is the standalone path: a new
directory, the published packages, the scaffolder, one bundle, one deploy. It does not use this repository, Storybook
or its workspace. The repository's own generator reference is [skins.md](skins.md).

## Start

```sh
npm install @dashhaus/core @dashhaus/dashboard @dashhaus/deploy react@18 react-dom@18 home-assistant-js-websocket@9
npm create dashhaus-skin@latest my-skin
cd my-skin
npm install
npm test
npm run build
npx dashhaus-deploy --skip-build
```

`npm create` runs `create-dashhaus-skin`, which writes a complete standalone project. Its target must be new or
empty; `--dry-run` lists the files instead of writing them.

`home-assistant-js-websocket` is required in the app that builds the bundle: the Lovelace element reaches
`@dashhaus/core/websocket`, whose client is an optional peer of core. React 18.3+ or 19 is required.

## What the scaffold writes

```
cards/light/MySkinLightCard.tsx     one control card: the light and its on/off action
cards/sensor/MySkinSensorCard.tsx   one reading card: temperature and optional humidity
cards/.../*.css                     the card's classes, under the skin's namespace
cards/.../*.stories.tsx             gallery metadata and args (no Storybook dependency)
ha/HaMySkinLightCard.tsx            useHaLight above the light card
ha/HaMySkinSensorCard.tsx           useHaSensor above the sensor card
lovelace/config.ts                  the YAML reader for `custom:dashhaus-my-skin`
lovelace/registry.tsx               entity domain → connected card
lovelace/card.tsx                   the LovelaceDashboardElement
lovelace/entry.tsx                  the bundle entry
shared/ui.tsx                       the action part on usePress
styles/tokens.css                   every colour, in the skin's namespace
conformance.mjs                     @dashhaus/dashboard/conformance over cards/
vite.config.mjs                     one ES module: dist/dashhaus-<skin>.js
dashboard.config.mjs                the dashboard and the bundle
```

The two cards are real implementations, not placeholders: the light calls `useHaLight` and the sensor `useHaSensor`,
both from `@dashhaus/core`, and the page draws them from the Home Assistant store. With no `cards` list in YAML the
card lays out every visible `light.*` and `sensor.*` entity by area.

## Cards and YAML

A card receives its normalized entity facts from its `ha/` adapter; it never reaches Home Assistant itself.
Presentational cards may import `@dashhaus/core` entities, primitives and formatters and `@dashhaus/dashboard/card`,
but not the Home Assistant subpaths, the Lovelace entry or a stylesheet from another skin.

Add a domain by adding:

1. a card folder with its component, CSS and story metadata under `cards/<domain>/`;
2. an adapter in `ha/` that calls the matching `useHa<Name>` hook;
3. a row in `lovelace/registry.tsx`;
4. a kind in `lovelace/config.ts` when the YAML can select it explicitly.

`npm test` runs the conformance preset: it checks each card's component and story title, its class prefix and that
no presentational card imports the Home Assistant layer. Run it after every card change.

## Build

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    lib: { entry: "lovelace/entry.tsx", formats: ["es"], fileName: () => "dashhaus-my-skin.js" },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
```

`lovelace/entry.tsx` imports the stylesheets with `?inline` and passes their text to `defineMySkinCard`. The emitted
`dist/dashhaus-my-skin.js` is one ES module carrying React, the card code and its CSS; Home Assistant needs one
resource and no separate stylesheet. Name it for the skin: the prebuilt `@dashhaus/bundle` already owns
`/local/dashhaus/dashhaus.js`, and a skin-specific name lets both live on one instance. No extra plugin is required
for CSS collection.

## Deploy

`.env` beside `dashboard.config.mjs`:

```sh
HA_URL=http://homeassistant.local:8123
HA_TOKEN=...
HA_WWW=root@homeassistant.local:/config/www
```

`dashboard.config.mjs` names the bundle and the dashboard:

```js
export default {
  pageTitle: "Home",
  bundle: "dist/dashhaus-my-skin.js",
  dashboards: [
    {
      path: "dashhaus-my-skin",
      title: "Home (My Skin)",
      icon: "mdi:view-dashboard-outline",
      async card() {
        return { card: { type: "custom:dashhaus-my-skin" }, made: "automatic" };
      },
    },
  ],
};
```

Then `npx dashhaus-deploy --skip-build` uploads the bundle, registers the resource and creates the dashboard once.
The CLI reads `dashboard.config.mjs` by default; it does not read `dashhaus.config.mjs`. See
[deploy.md](deploy.md) for `--config`, SSH, YAML mode and the deploy rules.

## Prebuilt versus composed

Most people who only want Orb and Field install the prebuilt bundle instead:

```sh
npm install @dashhaus/bundle @dashhaus/deploy
```

and point `bundle` at `fileURLToPath(bundlePath)` from `@dashhaus/bundle`; nothing is built. A skin project builds
its own composition. If it wants the reference skins inside that composition, install `@dashhaus/orb` and/or
`@dashhaus/field` and import their tokens and registration:

```tsx
import tokens from "@dashhaus/orb/styles/tokens.css?inline";
import { defineDashhausCard } from "@dashhaus/orb/lovelace/card";

defineDashhausCard(tokens);
```

Both exports resolve built `dist` in an installed package, so a composition build never reaches the repository.

## Contracts

- `@dashhaus/dashboard/skin` is the frozen element/runtime surface.
- `@dashhaus/dashboard/card` is the shared card frame.
- `@dashhaus/dashboard/schema` is the YAML reader and kind table.
- `@dashhaus/dashboard/conformance` is the compatibility test a skin runs against its cards.

What each may be relied on for is in [contract.md](contract.md). Skins never import each other: move what two skins
share to `@dashhaus/core` or one of the dashboard subpaths above.
