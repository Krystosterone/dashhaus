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

Why `home-assistant-js-websocket` and React 18.3+ or 19 are required is in [contract.md](contract.md).

## What the scaffold writes

[create-dashhaus-skin's README](../packages/create-dashhaus-skin/README.md#what-it-writes) lists the files; the
scaffold's own sources are the reference for each.

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

The scaffold's `vite.config.js` emits the bundle. `lovelace/entry.tsx` imports the stylesheets with `?inline` and passes their text to `defineMySkinCard`. The emitted
`dist/dashhaus-my-skin.js` is one ES module carrying React, the card code and its CSS; Home Assistant needs one
resource and no separate stylesheet. Name it for the skin: the prebuilt `@dashhaus/bundle` already owns
`/local/dashhaus/dashhaus.js`, and a skin-specific name lets both live on one instance. No extra plugin is required
for CSS collection.

## Deploy

`.env` beside the scaffold's `dashboard.config.mjs` holds `HA_URL`, `HA_TOKEN` and `HA_WWW`, as
[Deploy a dashboard](../docs/src/content/docs/start/deploy.mdx) describes them; the config names the bundle and the dashboard.

Then `npx dashhaus-deploy --skip-build` uploads the bundle, registers the resource and creates the dashboard once.
See [deploy.md](deploy.md) for `--config`, SSH and the deploy rules.

## Prebuilt versus composed

Most people who only want Orb and Field install the prebuilt bundle instead ([Deploy a dashboard](../docs/src/content/docs/start/deploy.mdx)); nothing
is built. A skin project builds its own composition. If it wants the reference skins inside that composition, install
`@dashhaus/orb` and/or `@dashhaus/field` and import their tokens and registration, as their READMEs show
([orb](../src/skins/orb/README.md#use), [field](../src/skins/field/README.md#use)).

Their exports resolve built `dist` in an installed package, so a composition build never reaches the repository.

## Contracts

What a skin may rely on from `@dashhaus/dashboard/skin`, `./card`, `./schema` and `./conformance` is in
[contract.md](contract.md). Skins never import each other: move what two skins
share to `@dashhaus/core` or one of the dashboard subpaths above.
