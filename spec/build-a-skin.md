# Build a skin

A skin is a React UI for Home Assistant drawn on the headless packages. This guide is the standalone path: a new
directory, the published packages, the scaffolder, one bundle, one deploy. It does not use this repository, Storybook
or its workspace. The repository's own generator reference is [skins.md](skins.md).

## Start

```sh
npm create dashhaus-skin@latest my-skin    # or, from release tarballs: create-dashhaus-skin my-skin --tarballs <dir>
cd my-skin
npm install
npm run snapshot    # preview/snapshots/*.png; npm run preview serves the same page
npm test
npm run build
npm run deploy      # after .env (from .env.example)
```

`npm create` runs `create-dashhaus-skin`, which writes a complete standalone project with its own dependencies; nothing
is installed beside it first. Its target must be new or empty; `--dry-run` lists the files instead of writing them;
`--tarballs <dir>` points its `@dashhaus` dependencies at the release tarballs in `<dir>`.

Why `home-assistant-js-websocket` and React 18.3+ or 19 are required is in [contract.md](contract.md).

## What the scaffold writes

[create-dashhaus-skin's README](../packages/create-dashhaus-skin/README.md#what-it-writes) lists the files; the
scaffold's own sources are the reference for each. The scaffold is agent-first: its `AGENTS.md` (with a `CLAUDE.md`
that imports it) is the one document a consumer's agent reads, so an agent given only a screenshot or a description
needs no second prompt. It must say where the tokens, fonts, page, cards and parts are, the
[rules every skin keeps](skins.md#rules-every-skin-keeps) under their titles there and which of them `npm test` checks,
how to see the result (`npm run snapshot`), what data each card gets, how to add a domain and how to deploy. A change
to the scaffold's files or scripts updates it in the same change.

## Preview

`preview/` draws the real element from `lovelace/entry.tsx` (shadow root, scoped CSS, the store on a connection) on a
sample house in `preview/house.ts`, through an in-page stand-in for Home Assistant's websocket connection; it is not
part of the bundle. The house holds the worst cases a skin must survive. `npm run preview` serves it with Vite;
`npm run snapshot` saves it at 1280 px light, 390 px light and 1280 px dark through Playwright, which the skin does
not depend on: the script prints the two commands that install it.

## Cards and YAML

A card receives its normalized entity facts from its `ha/` adapter; it never reaches Home Assistant itself.
Presentational cards may import `@dashhaus/core` entities, primitives and formatters and `@dashhaus/dashboard/card`,
but not the Home Assistant subpaths, the Lovelace entry or a stylesheet from another skin.

Every card extends `CardProps` from `@dashhaus/dashboard/card`. `useCardFrame` gives it the footprint flags, the ids
and the article's accessible name; `detailsTile(Card, detailsSheet(Card, Sheet, label))` owns the open state, so the
card's name (or a bare compact row) opens its details and the dialog closes from its button, Escape or the backdrop.
The card drawn as `variant="sheet"` is that details view, showing only the facts its props already carry; the `Sheet`
is a `CardDialog` in `shared/ui.tsx`, and the adapter renders the tile rather than the bare card.

Add a domain by adding:

1. a card folder under `cards/<domain>/` with its component (extending `CardProps`, exporting its card, sheet and
   tile), its CSS and its story metadata;
2. an adapter in `ha/` that calls the matching `useHa<Name>` hook and passes the facts to the tile;
3. a row in `lovelace/registry.tsx`;
4. a kind in `lovelace/config.ts` when the YAML can select it explicitly.

`npm test` runs the conformance preset (each card's component and story title, its class prefix, a unique code and that
no presentational card imports the Home Assistant layer) and the skin's CSS rules: no colour literal outside
`styles/tokens.css`, `:hover` only under the hover media query, and no transition on a layout property. Each finding
names its file, line and fix. Run it after every card change.

## Build

The scaffold's `vite.config.js` emits the bundle. `lovelace/entry.tsx` imports the stylesheets with `?inline` and passes their text to `defineMySkinCard`. The emitted
`dist/dashhaus-my-skin.js` is one ES module carrying React, the card code and its CSS; Home Assistant needs one
resource and no separate stylesheet. Name it for the skin: the prebuilt `@dashhaus/bundle` already owns
`/local/dashhaus/dashhaus.js`, and a skin-specific name lets both live on one instance. No extra plugin is required
for CSS collection.

## Deploy

`.env` beside the scaffold's `dashboard.config.mjs` holds `HA_URL`, `HA_TOKEN` and `HA_WWW`; the scaffold writes
`.env.example` with each one explained. The config names the bundle, its `build()` (`npm run build`) and the
dashboard.

Then `npm run deploy` builds, uploads the bundle, registers the resource, checks that Home Assistant serves it and
creates the dashboard once. See [deploy.md](deploy.md) for `--config`, SSH and the deploy rules.

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
