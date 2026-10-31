# Plan: guarantee the two consumer DX paths before publishing

Status: proposed · 2026-10-31 · `main` at `34fa860`
Owner: operator · Implementer: agent

## Outcome

Two clean-room apps outside this repo can complete their journey using only
published packages, and both apps run in CI on every pull request. Publishing
is the last phase and stays the operator's call.

The two journeys:

1. **Skin author** — install the headless/framework packages, scaffold a skin,
   draw cards, build one Lovelace bundle, and deploy it.
2. **Skin user** — install a prebuilt bundle and the deploy CLI, write a short
   config, and use Orb and Field without cloning this repo or building
   anything.

“Guaranteed” means executable acceptance tests, not a checklist: both apps
fail before the work and pass from packed tarballs before any package is
published.

## Player-facing contracts

### A. Skin author

A fresh directory on Node 22 with React 18:

```sh
npm install @dashhaus/core @dashhaus/dashboard @dashhaus/deploy react react-dom
npm create dashhaus-skin@latest my-skin
cd my-skin
npm install
npm test                 # conformance preset + the skin's own tests
npm run build            # one browser bundle
npx dashhaus-deploy      # .env beside dashboard.config.mjs
```

The scaffold produces:

- a package with `styles/tokens.css`, `shared/` parts, `cards/`, `ha/`
  adapters, `lovelace/config.ts`, `lovelace/card.tsx`, a conformance test and
  a README;
- one control card and one reading card over real `@dashhaus/core` hooks;
- a `dashboard.config.mjs` naming the bundle, an optional build and the
  dashboards;
- a Vite config or the documented recipe that produces one JS file.

Acceptance:

- No relative import reaches this repo; no `source` export condition is used;
  no repo script is copied.
- `npm test` runs `@dashhaus/dashboard/conformance` against the skin's cards.
- `npm run build` emits one file containing `custom:dashhaus-my-skin` and the
  skin's CSS.
- `dashhaus-deploy` uploads the bundle to a local `HA_WWW`, registers the
  resource and creates the dashboard; the fake-HA harness asserts the calls.
- The scaffold runs with no Storybook dependency and no workspace install.

### B. Skin user

A fresh directory on Node 22:

```sh
npm install @dashhaus/bundle @dashhaus/deploy
# write dashhaus.config.mjs (below)
npx dashhaus-deploy --skip-build
```

```js
import { fileURLToPath } from "node:url";
import { bundlePath } from "@dashhaus/bundle";

export default {
  bundle: fileURLToPath(bundlePath),
  dashboards: [
    { path: "home-orb", title: "Home (Orb)", icon: "mdi:home-variant",
      card: async () => ({ card: { type: "custom:dashhaus-orb" }, made: "automatic" }) },
    { path: "home-field", title: "Home (Field)", icon: "mdi:knob",
      card: async () => ({ card: { type: "custom:dashhaus-field" }, made: "automatic" }) },
  ],
};
```

Acceptance:

- No clone, no build, no `@dashhaus/core`/`dashboard` install in the app.
- Deploy uploads the prebuilt bundle, registers one resource and creates both
  dashboards; the bundle registers `custom:dashhaus-orb` and
  `custom:dashhaus-field`.
- Both cards auto-layout with no YAML sections/modules; layout stays editable
  in Home Assistant.
- The same app can swap to a composition build: install `@dashhaus/orb` and/or
  `@dashhaus/field`, build a bundle with one skin, and deploy it.

## Decisions to lock before coding

1. **React 18 only for 1.0.** “Headless” means React-headless: entities, store,
   mappers, actions, hooks and primitives without markup. A non-React skin is a
   separate cut; do not claim it.
2. **Stable skin runtime:** add `@dashhaus/dashboard/skin` exporting
   `LovelaceDashboardElement`, `registerCard`, `scopeToHost`, `autoInput`,
   `LovelaceHass` and the minimal types a skin's element needs. The existing
   main entry stays, but `./skin` is the frozen skin-author surface. Do not add
   a fourth runtime package.
3. **Config surface moves to `@dashhaus/deploy/config`** (`DeployConfig`,
   `DeployDashboard`, `DeployHa`, `DeployCard`, `generatedDashboards`). A
   deploy-only app must not install React peers. Keep `dashboard/cli` only if a
   compatibility shim is required; 0.x can break it.
4. **Skins become fixed-version packages:** `@dashhaus/orb`, `@dashhaus/field`,
   with `.`, `./lovelace/card` and `./styles/tokens.css`. They share the fixed
   version line with core/dashboard/deploy.
5. **Turnkey bundle is a package:** `@dashhaus/bundle` ships the prebuilt
   `dashhaus.js` and a resolved `bundlePath`. It is built in this repo, never
   by the consumer.
6. **Scaffolder:** `create-dashhaus-skin`, standalone, with no Storybook and no
   repo seams.
7. **Build integration:** document a Vite recipe first. Add
   `@dashhaus/dashboard/vite` only if the clean-room author app cannot stay
   under a short, stable config; the gate decides, not preference.

## Phases

### Phase 0 — Write the failing guarantee

- Add `verify/dx/` with two app drivers:
  - `author.mjs`: installs the packed tarballs, runs the scaffolder, writes one
    control and one reading card, runs conformance, builds, deploys through
    `deploy({ connect: fakeHa })`.
  - `user.mjs`: installs `@dashhaus/bundle` and `@dashhaus/deploy`, writes the
    config, deploys through the same fake, asserts the upload/resource/dashboard
    calls.
- Reuse the `deploy()` injection point and the `FakeHomeAssistant` pattern from
  `packages/deploy/src/deploy.test.ts`; no network and no live HA in CI.
- The drivers run after `npm run release:pack` and install the tarballs, never
  the workspace.
- Gate: both drivers fail for the expected missing packages; the harness itself
  is reviewed and committed.

### Phase 1 — Freeze the public surfaces

- Add `@dashhaus/dashboard/skin` and move the documented skin-author exports
  there; update the contract page to name it stable.
- Add `@dashhaus/deploy/config`; move the config types and
  `generatedDashboards`; update `dashboard.config.mjs`, docs, generators and
  tests. Keep the deploy CLI free of React.
- Add package `README.md` files for core, dashboard and deploy: install,
  one usage snippet, subpaths, and links to the root docs.
- Make the release check require a non-empty README and a clean pure-config
  import.
- Gate: `npm run check`, `npm run release:pack`, `npm run verify:packages`; a
  Node-only config imports `@dashhaus/deploy/config` without React.

### Phase 2 — Package the skins and the bundle

- Convert `src/skins/orb` and `src/skins/field` to workspace packages with the
  four exports; root Storybook, `apps/lovelace/entry.ts`, generators and tests
  import by specifier.
- Keep the source condition for the workspace; packed consumers get built
  `dist`.
- Add `@dashhaus/bundle`: depends on both skins, builds the one-file bundle,
  exports `bundlePath`, ships the file and a README.
- Update the repo deploy config to use the same bundle entry, so the repo is a
  consumer of its own product.
- Gate: `npm run build:ha`, `npm run test-storybook`, `release:pack` includes
  the new packages; the user app installs the bundle tarball and deploys with no
  build.

### Phase 3 — Author kit and docs

- Build `create-dashhaus-skin` from the neutral generated-skin template, without
  root seams or Storybook. Include one control and one reading card, tokens,
  element, reader, conformance test, Vite build and deploy config.
- Publish one consumer guide, “Build a skin”, and keep `docs/skins.md` as the
  repo generator reference. Add package READMEs for orb, field and bundle.
- Decide the Vite recipe/plugin at this gate using the author app: if the build
  is more than a short config or fails on CSS collection, add the plugin.
- Gate: `author.mjs` passes from the scaffolder tarball, including a production
  build and deploy with the fake HA.

### Phase 4 — Put both apps in CI

- Add the two drivers as a `dx` CI lane on packed tarballs, after
  `release:pack` and `verify:packages`.
- Keep `unit_checks`, unit shards, generators and Storybook shards unchanged.
- Add a live-HA smoke run for the operator (not CI): deploy both apps to the
  real Home Assistant, confirm the resources load, both dashboards appear and
  both cards draw without a configuration error.
- Gate: green CI lane and a recorded live smoke.

### Phase 5 — Release preparation (still no publish)

- Re-scope TODOS: item 1 becomes package READMEs/consumer docs; the repo
  AGENTS/skills split stays separate and does not block the DX.
- PII/history rewrite gate; owner identity and demos clean.
- Set the fixed version once; build packages; `release:pack`;
  `verify:packages`; inspect every tarball for README, exports and no
  `src/docs/tests`.
- Write release notes: package list, publish order, breaking changes from 0.1.0.
- Gate: tag candidate, all checks green, operator sign-off.

### Phase 6 — Publish (last)

Publish in dependency order:

1. `@dashhaus/core`
2. `@dashhaus/dashboard`
3. `@dashhaus/deploy`
4. `@dashhaus/orb`
5. `@dashhaus/field`
6. `@dashhaus/bundle`
7. `create-dashhaus-skin`

Then, from the registry (not tarballs), rerun both apps in fresh directories:

- the user app installs the published bundle and deploy, deploys, and loads;
- the author app scaffolds, builds and deploys.

If a published package is wrong, stop and report; do not publish the remaining
packages to “get past” the failure. Publish is the final action, not the start
of a fix cycle.

## Acceptance matrix

| Gate | Command / action | Pass condition |
| --- | --- | --- |
| Repo | `npm run check` | typecheck, lint, unit tests |
| Visual | `npm run test-storybook` | every story and axe rule |
| Bundle | `npm run build:ha` | one bundle with both cards |
| Packed surface | `npm run release:pack && npm run verify:packages` | imports, types, deploy bin, no repo files |
| Skin author | `verify/dx/author.mjs` | scaffold, test, build, deploy |
| Skin user | `verify/dx/user.mjs` | install bundle, config, deploy |
| Live HA | operator smoke | both dashboards load and draw |
| Publishing | registry smoke | both apps work from npm |

## Out of scope

- The per-package `AGENTS.md`/skills split; it is repo tooling and does not
  change either consumer journey.
- Non-React skins and a framework-agnostic entity package.
- New card designs, skins, or Home Assistant YAML features.
- The PII rewrite itself; it is a release gate.
- A publish job in CI; publishing stays manual and last.
- `dashboard/vite` before the author app demonstrates the need.

## Risks

| Risk | Mitigation |
| --- | --- |
| A frozen element base constrains the next skin | Freeze only the element/define/register/scope surface, not nav, layout or internals. |
| Converting orb/field to packages breaks Storybook or the bundle | Keep the source condition and run `test-storybook`/`build:ha` at the phase gate. |
| The bundle duplicates React or CSS | One prebuilt file; measure size; no external runtime. |
| Fake HA misses real resource behavior | Live-HA smoke before publishing; keep the fake for CI. |
| PII rewrite delays the release | Publish is last; all package work and DX tests land before it. |
| A package is wrong after publish | Publish order stops on the first failure; patch is a new release, not a silent continuation. |

## Finish line

Both clean-room apps pass from packed tarballs in CI; `npm run check`,
`npm run test-storybook`, `npm run build:ha`, `npm run release:pack` and
`npm run verify:packages` are green; the live-HA smoke is recorded; the release
tag candidate is ready. No `npm publish` has run. Hand back the two app
transcripts, the tarball inspection, the publish order and the open decisions.
