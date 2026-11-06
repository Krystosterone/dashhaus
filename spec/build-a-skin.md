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
npm run add -- climate   # another domain's card
npm test
npm run build
npm run deploy      # after .env (from .env.example)
```

`npm create` runs `create-dashhaus-skin`, which writes a complete standalone project with its own dependencies; nothing
is installed beside it first. Its target must be new or empty; `--dry-run` lists the files instead of writing them;
`--tarballs <dir>` points its `@dashhaus` dependencies at the release tarballs in `<dir>`.

Why `home-assistant-js-websocket` and React 18.3+ or 19 are required is in [contract.md](contract.md).

## What the scaffold writes

A standalone skin starts from the same templates as one made in this repository with `new-skin`: the shared core
(`packages/create-dashhaus-skin/src/templates/skin`) and one card per domain (`templates/card`), written by the
package's `src/card.js` from the domain's description in `src/domains.json` (`npm run domains` writes it from
`@dashhaus/core`'s sources). `templates/standalone` is only what a skin outside the repository adds: its manifest,
build, preview, checks and guide. A skin-level fix lands once, in the shared templates.

[create-dashhaus-skin's README](../packages/create-dashhaus-skin/README.md#what-it-writes) lists the files; the
scaffold's own sources are the reference for each. The scaffold is agent-first: its `AGENTS.md` (with a `CLAUDE.md`
that imports it) is the one document a consumer's agent reads, so an agent given only a screenshot or a description
needs no second prompt. It must say where the tokens, fonts, page, cards and parts are, the
[rules every skin keeps](skins.md#rules-every-skin-keeps) under their titles there and which of them `npm test` checks,
how to see the result (`npm run snapshot`), what data each card gets, how to add a domain and how to deploy. A change
to the scaffold's files or scripts updates it in the same change.

## Preview

`preview/` draws the real element from `lovelace/entry.tsx` (shadow root, scoped CSS, the store on a connection)
through an in-page stand-in for Home Assistant's websocket connection; it is not part of the bundle. The domains
`preview/house.ts` lists (lights and sensors) come from it, with the worst cases a skin must survive; every other
domain comes from `@dashhaus/core/demo`'s house, whose services behave, so a card `npm run add` writes is on the page
with no edit. `npm run preview` serves it with Vite; `npm run snapshot` saves it at 1280 px light, 390 px light and
1280 px dark through Playwright, a dev dependency, so a fresh `npm install` has it; the first run prints the command
that installs its Chromium.

## Cards and YAML

A card takes its domain's normalized model as `entity` (with `history` where the domain has one, its footprint and one
callback per action it shows) from its `ha/` adapter, which calls the shared `useHa<Name>` hook; it never reaches Home Assistant itself.
Presentational cards may import `@dashhaus/core` entities, primitives and formatters and `@dashhaus/core/lovelace/card`,
but not the Home Assistant subpaths, the Lovelace entry or a stylesheet from another skin.

Each domain declares its actions' kinds beside its handlers (`<NAME>_ACTIONS: ActionKinds<Handlers>` in
`@dashhaus/core`): `takes` a press's `nothing` or a `code`, or the value it sets (a `level`, a `choice`, a `switch`, each
with the entity field it lives in, or a `value` none of them says), and `asks: true` for one that asks first. The
scaffolder's `domains.json` carries them. `npm run add` draws a tap as a `MySkinAction`; an action that asks first or
takes a code as an entry in the frame's `guarded` list, answered in the details by `MySkinConfirm` or `MySkinKeypad` on
`useGuardedAction`, so it is never one tap; and leaves an action that sets a value out for the skin's own control,
saying so.

Every card draws inside the skin's frame, `<Skin>CardFrame` in `shared/ui.tsx`: `detailsTile` and `detailsSheet` from
`@dashhaus/core/lovelace/card` own the open state, and `useCardFrame` gives the article its footprint and its accessible
name, its title. The title opens the details (`aria-haspopup="dialog"`), a `CardDialog` that closes from its button,
Escape or the backdrop. The frame puts `data-card="<domain>"` on the article.

The page around the cards follows [skins.md → The page around the cards](skins.md#the-page-around-the-cards): the
tokens key dark mode on the skin's own `data-my-skin-theme`, which `paintHost` sets on the card's host (and the preview
on its page), never the shared `data-theme`; `shared/surface.ts` names the web font; and
`lovelace/MySkinActionStatus.tsx` draws the store's latest rejected command on the page, from `useActionStatus` in the
frozen `@dashhaus/core/lovelace/skin` contract.

`npm run add -- <domain> [--kind control|reading]` adds a domain: the card folder under `cards/<domain>/` (component,
CSS, glyph and story metadata), its adapter in `ha/`, and its row in `lovelace/registry.tsx` for its Home Assistant
domains, which the YAML reader and the automatic layout read. A domain whose hook composes companions takes them as
YAML keys, the hook's `<key>EntityId` options in snake case (a sensor's `humidity` and `battery`, a sound machine's
`volume`), into `item.companions`; the automatic layout fills a sensor's from its device (`roomSensors`). It runs the skin's own copy of the scaffolder (a dev
dependency), offline.

`npm test` runs the conformance preset (each card's component and story title, its class prefix and that no
presentational card imports the Home Assistant layer) and the skin's CSS rules: no colour literal outside
`styles/tokens.css`, no selector on the shared `data-theme`, `:hover` only under the hover media query, no
transition on a layout property, and no `var(--<skin>-…)` without a fallback that nothing defines. Each finding names
its file, line and fix. Run it after every card change.

## Build

The scaffold's `vite.config.js` emits the bundle. Each component imports its own stylesheet, which the config turns
into nothing, and `lovelace/entry.tsx` gathers every stylesheet `?inline` and passes their text to `defineMySkinCard`,
so a card `npm run add` writes needs no edit there. The emitted
`dist/dashhaus-my-skin.js` is one ES module carrying React, the card code and its CSS; Home Assistant needs one
resource and no separate stylesheet. Name it for the skin: the prebuilt `@dashhaus/bundle` already owns
`/local/dashhaus/dashhaus.js`, and a skin-specific name lets both live on one instance.

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

What a skin may rely on from `@dashhaus/core/lovelace/skin`, `./card`, `./schema` and `./conformance` is in
[contract.md](contract.md). Skins never import each other: move what two skins
share to `@dashhaus/core` or one of its Lovelace subpaths above.
