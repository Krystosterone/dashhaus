# Releasing the public packages

`@dashhaus/core`, `@dashhaus/dashboard`, `@dashhaus/deploy`, `@dashhaus/orb`, `@dashhaus/field` and
`@dashhaus/bundle` are the packages a dashboard author or user installs; `create-dashhaus-skin` scaffolds a
standalone skin. Generated skins created inside this repository, Storybook and the source of the bundle stay private.

## Build and export layout

The workspace resolves package **source**; a packed install resolves built **ESM JavaScript and `.d.ts`**. Each public manifest declares both through export conditions:

```json
".": {
  "source": "./src/index.ts",
  "types": "./dist/index.d.ts",
  "import": "./dist/index.js",
  "default": "./dist/index.js"
}
```

- `source` is the workspace-only condition. `config/tsconfig.base.json` (`customConditions`, inherited by the root and each package's `tsconfig.json`), Vite, Vitest, Storybook's `viteFinal` and the deploy config's esbuild loader all ask for it, so tests, stories and `build:ha` keep reading source.
- `types`/`import`/`default` are what an installed consumer gets. Node ignores `source`; a packed manifest drops it entirely.

Fixtures, demo transports and `testing` are shipped because they are declared public subpaths; they contain only demo data, Storybook transports and the Vitest testing helper, never repository material. `./testing` needs `vitest` and `@testing-library/react`; both are optional peers, so a consumer that does not use that subpath does not install them. `home-assistant-js-websocket` stays an optional peer too; only `@dashhaus/core/websocket` reaches it.

What a third-party skin may rely on from `./skin`, `./card` and `./schema`, what is a per-kind escape hatch, and what is not stable yet is in `spec/contract.md`.

Current candidate notes: [0.2.0](releases/0.2.0.md), including the publish order, the changes since `0.1.0` and the
tarball inspection.

Every package ships a non-empty `README.md`; `files` keeps it in the tarball and `npm run verify:packages` refuses an empty one. `files` is the allowlist for every package, so packed tarballs contain no `*.test.*`, `*.stories.*`, `.agents`, `research`, or repository docs. Do not run `npm pack` directly in a package: the workspace manifest still carries the `source` condition, which points at files the tarball does not ship. `npm run release:pack` stages the package with the release manifest and packs that.

## Versioning

**Fixed version** across every public package, currently `0.2.0`. There is no independent release need yet:
`@dashhaus/dashboard`, the skins and the bundle are built from the same repository and tag, and coupled releases keep
the internal ranges unambiguous.

Apply it with the command, never by editing the manifests:

```sh
npm run release:version -- 0.2.0
npm install --package-lock-only
```

The command sets the version in every public manifest and rewrites each internal `@dashhaus` dependency to `^0.2.0`,
including the scaffolder's `src/templates/package.json` so a newly scaffolded skin installs the same line.
`scripts/release/manifest.mjs` then refuses to pack a `0.0.0` version, an unpinned `@dashhaus` range, or a manifest
without `files`/`sideEffects`; `verify:packages` reads the packed template's ranges back.

If a package ever needs its own line, `publicPackages` in `scripts/release/manifest.mjs` is the single place to give it a separate version and range; write the release order there and in this document. Until then, independent versions are not supported.

## Release commands

```sh
npm run release:version -- 0.2.0   # fixed version in every public manifest
npm install --package-lock-only     # record it in package-lock.json
npm run check                       # typecheck, lint, unit tests
npm run build:ha                    # the Lovelace bundle still builds from source
npm run release:pack                # build dist, pack the release tarballs
npm run verify:packages             # clean-app install, imports, typecheck, deploy bin
```

## Publishing

Publishing is the operator's call; there is no publish job in CI. Before publishing:

1. Own the `@dashhaus` npm scope: create or join that organization and confirm the account can publish `@dashhaus/*`. The scoped `name` fields and internal ranges already use it; `create-dashhaus-skin` is unscoped.
2. Be logged in with the registry's required 2FA (`npm whoami`).
3. Publish in dependency order so the internal ranges resolve:

```sh
npm publish release/dashhaus-core-0.2.0.tgz --access public
npm publish release/dashhaus-dashboard-0.2.0.tgz --access public
npm publish release/dashhaus-deploy-0.2.0.tgz --access public
npm publish release/dashhaus-orb-0.2.0.tgz --access public
npm publish release/dashhaus-field-0.2.0.tgz --access public
npm publish release/dashhaus-bundle-0.2.0.tgz --access public
npm publish release/create-dashhaus-skin-0.2.0.tgz
```

After publishing, rerun `node verify/dx/user.mjs` and `node verify/dx/author.mjs` against the registry, not the
tarballs, before announcing the release; both are the same clean-room journeys the release check runs.

The tarball's manifest is already the release manifest; publishing the tarball, not the package folder, is what keeps `source` and `private` out. Tagging, GitHub releases and npm scope claims are separate operator decisions.

### Live Home Assistant smoke

CI proves both journeys against the in-memory Home Assistant in `verify/dx/`. Before publishing, the operator runs the same two journeys once against a real instance. It needs an admin token and an SSH or mounted `HA_WWW`; it is never a CI job and it is recorded as run or unrun, never inferred from the fake.

Prepare:

1. Pack at the candidate commit and note both values: `git rev-parse HEAD` and `npm run release:pack`.
2. Use a scratch Home Assistant, or first delete the dashboards `home-orb`, `home-field` and `dashhaus-my-skin` and the resources `/local/dashhaus/dashhaus.js` and `/local/dashhaus-my-skin/dashhaus-my-skin.js` from earlier runs. Otherwise the smoke exercises updates, not first creation, and must say so.
3. Set `release` to this repository's `release/` directory and `<version>` to the packed version in the commands below. Copy `.env.example` to the app and fill `HA_URL`, `HA_TOKEN` and `HA_WWW` (see [deploy.md](deploy.md)). Never put the token in the record.

User journey, from packed tarballs with no build:

```sh
app=$(mktemp -d); cd "$app"
npm init -y && npm pkg set type=module
npm install "$release"/dashhaus-bundle-<version>.tgz "$release"/dashhaus-deploy-<version>.tgz
cp /path/to/dashhaus/.env.example .env        # fill the three values, keep it out of git
# write dashboard.config.mjs as in verify/dx/user.mjs (USER_CONFIG): bundlePath, home-orb and home-field
npx dashhaus-deploy --skip-build
```

Author journey, from packed tarballs, scaffolding, testing and building once:

```sh
app=$(mktemp -d); cd "$app"
npm init -y && npm pkg set type=module
npm install "$release"/dashhaus-core-<version>.tgz "$release"/dashhaus-dashboard-<version>.tgz \
  "$release"/dashhaus-deploy-<version>.tgz "$release"/create-dashhaus-skin-<version>.tgz \
  react@18.3.1 react-dom@18.3.1 home-assistant-js-websocket@9.7.1 vite@5.4.19 @vitejs/plugin-react@4.3.4
npx create-dashhaus-skin my-skin
ln -s "$app/node_modules" my-skin/node_modules   # pre-publish stand-in for `npm install` in the scaffold
cd my-skin
npm test
npm run build
cp /path/to/dashhaus/.env.example .env           # same three values; the scaffold's dashboard is dashhaus-my-skin
npx dashhaus-deploy --skip-build
```

Observe, in this order:

1. The user deploy prints the upload, registers one resource at `/local/dashhaus/dashhaus.js` and creates its two dashboards. The author deploy registers a second resource at `/local/dashhaus-my-skin/dashhaus-my-skin.js` and creates its dashboard. Each uploaded file is byte-identical to its tarball or build, and the two resources coexist.
2. Reload every open Home Assistant tab: the frontend reads its resource list once, so a tab opened before the deploy shows a configuration error until reloaded.
3. The sidebar lists **Home (Orb)**, **Home (Field)** and, from the author app, **Home (My Skin)**. Each opens with no "Configuration error" card and draws its auto layout from the instance's entities; open one card's details and close it.
4. Press a reversible `input_boolean` or `switch` on Orb or Field, see the state change, then restore it. The browser console shows no errors.
5. Settings → Dashboards → Resources shows both `/local/dashhaus/dashhaus.js?v=<content hash>` and `/local/dashhaus-my-skin/dashhaus-my-skin.js?v=<content hash>`; both network requests are 200. Edit a dashboard and confirm its generated layout loads in the code editor.
6. The author build emitted one `dist/dashhaus-my-skin.js`; its dashboard draws and its card opens details.

Record on the release candidate: date and operator, Home Assistant version, candidate commit, tarball version, the deploy output, pass/fail for each observation above, and where the screenshot or console excerpt lives. If credentials are not supplied, record "live smoke: unrun — no HA_URL/HA_TOKEN/HA_WWW" and do not mark it passed.

## CI

`.github/workflows/ci.yml` is the pipeline, summarized in AGENTS.md → Layout. The reasons behind its shape:

- `--maxWorkers=2` gives a two-core runner both cores, for Vitest and for the Storybook runner, which otherwise leaves one idle. The generator lane needs no worker override: on a two-core runner Vitest already runs its three copy suites one at a time, and a copy is a serial chain of the repo's tools.
- The unit suites are split by file across two runners because one runner spent 160s on them. The generator tests keep their own runner because they copy the repo and run its tools inside each copy. `npm run check` still runs typecheck, lint and every test locally, generators included.
- The `dx` journeys install only the packed tarballs and import nothing from this repository; a failure in either is a failure of the public surface, not a flaky integration.
- A cache hit still leaves the workspace links pointing at the same paths, because the checkout path is fixed.
- CI has no publish, tag or release step, and needs no secrets.
