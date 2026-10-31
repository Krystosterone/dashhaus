# Releasing the public packages

`@dashhaus/core`, `@dashhaus/dashboard` and `@dashhaus/deploy` are the three packages a dashboard author installs. The reference skins (orb, field), generated skins, Storybook and the Lovelace bundle stay private, so nothing here publishes them.

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
- `npm run build:packages` compiles `packages/{core,dashboard}/src` to `dist` with `tsc` (declarations included), rewrites relative imports to `.js` (Node ESM and NodeNext declarations need the extension), and copies `packages/core/src/ha/fixtures/*.json` to `dist/ha/fixtures/`.
- `@dashhaus/deploy` has no build: its `.mjs` sources and `.d.mts` declarations are the shipped files.

| Package | Public subpaths | Ships |
| --- | --- | --- |
| `@dashhaus/core` | `.`, `./entities`, `./entities/*`, `./primitives`, `./hooks`, `./perf`, `./websocket`, `./demo`, `./testing`, `./fixtures/*` | `dist/` |
| `@dashhaus/dashboard` | `.`, `./card`, `./schema`, `./layout`, `./cli`, `./conformance` | `dist/` |
| `@dashhaus/deploy` | `.`, bin `dashhaus-deploy` | `bin.mjs`, `src/*.mjs`, `src/*.d.mts` |

Fixtures, demo transports and `testing` are shipped because they are declared public subpaths; they contain only demo data, Storybook transports and the Vitest testing helper, never repository material. `./testing` needs `vitest` and `@testing-library/react`; both are optional peers, so a consumer that does not use that subpath does not install them. `home-assistant-js-websocket` stays an optional peer too; only `@dashhaus/core/websocket` reaches it.

`@dashhaus/dashboard/conformance` is Node- and test-only: it reads a skin's files with `node:fs` and `node:path`, and imports no React, DOM, CSS or test runner. A skin imports it from its own test and asserts the findings are empty. What a third-party skin may rely on from `./card` and `./schema`, what is a per-kind escape hatch, and what is not stable yet is in `docs/contract.md`.

`files` is the allowlist for every package, so packed tarballs contain no `*.test.*`, `*.stories.*`, `.agents`, `research`, or repository docs. Do not run `npm pack` directly in a package: the workspace manifest still carries the `source` condition, which points at files the tarball does not ship. `npm run release:pack` stages the package with the release manifest and packs that.

## Versioning

**Fixed version** across the three packages, currently `0.1.0`. There is no independent release need yet: `@dashhaus/dashboard` depends on `@dashhaus/core`, all three ship from one repository and one tag, and the readiness note already chose coupled releases. Fixed versions keep the internal range unambiguous and make one release command sufficient.

Apply it with the command, never by editing three manifests:

```sh
npm run release:version -- 0.2.0
npm install --package-lock-only
```

The command sets the version in all three manifests and rewrites `@dashhaus/dashboard`'s dependency on `@dashhaus/core` to `^0.2.0`. `scripts/release/manifest.mjs` then refuses to pack a `0.0.0` version, an unpinned `@dashhaus` range, or a manifest without `files`/`sideEffects`.

If a package ever needs its own line, `publicPackages` in `scripts/release/manifest.mjs` is the single place to give it a separate version and range; write the release order there and in this document. Until then, independent versions are not supported.

## Release commands

```sh
npm run release:version -- 0.2.0   # fixed version in all three manifests
npm install --package-lock-only     # record it in package-lock.json
npm run check                       # typecheck, lint, unit tests
npm run build:ha                    # the Lovelace bundle still builds from source
npm run release:pack                # build dist, pack release/dashhaus-*.tgz
npm run verify:packages             # clean-app install, imports, typecheck, deploy bin
```

`release:pack` writes `release/dashhaus-core-<version>.tgz`, `release/dashhaus-dashboard-<version>.tgz` and `release/dashhaus-deploy-<version>.tgz`. `verify:packages` installs exactly those tarballs into a fresh app under the system temp directory, with React 18, and checks:

- the tarball file list and the packed manifests (no `private`, no `source`, pinned internal range, optional peers);
- Node imports of every declared subpath, including a JSON fixture and `@dashhaus/dashboard/cli`;
- a jsdom React render of `@dashhaus/dashboard` and `@dashhaus/dashboard/card`;
- `@dashhaus/core/testing` inside Vitest;
- TypeScript consumers with `moduleResolution: Bundler` and `NodeNext`;
- `dashhaus-deploy --help` loading a config that imports `@dashhaus/dashboard/cli`.

It installs from npm for React, the test packages and esbuild. `KEEP_PACKED_APP=1` leaves the temp app in place for debugging.

## Publishing

Publishing is the operator's call; there is no publish job in CI. Before publishing:

1. Own the `@dashhaus` npm scope: create or join that organization and confirm the account can publish `@dashhaus/*`. The three `name` fields and internal ranges already use it.
2. Be logged in with the registry's required 2FA (`npm whoami`).
3. Publish in dependency order so `@dashhaus/dashboard`'s core range resolves:

```sh
npm publish release/dashhaus-core-0.2.0.tgz --access public
npm publish release/dashhaus-dashboard-0.2.0.tgz --access public
npm publish release/dashhaus-deploy-0.2.0.tgz --access public
```

The tarball's manifest is already the release manifest; publishing the tarball, not the package folder, is what keeps `source` and `private` out. Tagging, GitHub releases and npm scope claims are separate operator decisions.

## CI

`.github/workflows/ci.yml` runs on every pull request and push, with no path filters. It takes Node from `.nvmrc` (the Node 22 floor in root `engines`) and npm from the fixed `packageManager` version, which it enables with Corepack on the runner. `unit_checks`, the two unit-test shards, `generators` and the two Storybook shards run in parallel, and the `check` and `storybook` aggregate jobs back the required status checks.

`unit_checks`:

```sh
npm ci
npm run typecheck
npm run lint
npm run build:ha
npm run release:pack
npm run verify:packages
```

`unit_one` and `unit_two`, each:

```sh
npm ci
npm run test:unit -- --shard=1/2 --maxWorkers=2     # 2/2 in the second job
```

`--maxWorkers=2` gives a two-core runner both cores; Vitest otherwise leaves one idle. The generator lane needs no worker override: on a two-core runner Vitest already runs its three copy suites one at a time, and a copy is a serial chain of the repo's tools.

`generators_one` and `generators_two`, each:

```sh
npm ci
npx vitest run --config config/vitest.config.ts scripts/new-skin/index.test.ts scripts/new-card/index.test.ts
# scripts/new-skin/field.test.ts in the second job
```

`check` requires `unit_checks`, both unit shards and both generator jobs, and fails unless each is green; it is the status check `main` requires. The unit suites are split by file across two runners because one runner spent 160s on them; the two shards together run the same 130 files and 1174 tests. The generator tests keep their own runner because they copy the repo and run its tools inside each copy. `npm run check` still runs typecheck, lint and every test locally, generators included.

`storybook_one` and `storybook_two`, each:

```sh
npm ci
npx playwright install --with-deps chromium
npm run test-storybook -- --shard=1/2     # 2/2 in the second job
```

`storybook` requires both shards and fails unless each is green; it is the status check `main` requires. Each shard builds the static site from the same commit and runs its half of the suites. Every job restores `node_modules` from a cache keyed on the lockfile, the root manifests, the workspace manifests and `.nvmrc`, and runs `npm ci` only on a miss; TypeScript's incremental state and ESLint's results live inside it. A cache hit still leaves the workspace links pointing at the same paths, because the checkout path is fixed. The Storybook jobs cache `~/.cache/ms-playwright` on the installed Playwright version. `npm run test-storybook` builds the static site itself, so CI has no separate `build-storybook` step. Every story must render and pass axe in Chromium; a failing story or axe violation fails its shard with the rule, impact and target elements. CI has no publish, tag or release step, and needs no secrets.

## Differences from the readiness note

- The note's `dashboard/conformance` subpath now exists: it is the generic card preset a skin runs against its own cards, shipped Node-test-only with no Vitest peer (`docs/contract.md`). `dashboard/vite` does not exist and is not part of this cut: no consumer needs a shared build, and the deploy config keeps ownership of its `build()`. A demonstrated need starts that cut. `./cli` is the config-authoring surface, and generator tooling stays in `scripts/`.
- The note's built-output tradeoff is implemented as described: ESM JavaScript plus `.d.ts`, workspace source through an export condition, no raw TypeScript in an installed package.
- The reference skins remain folders, not packages; the monorepo rename to Dashhaus applies to the root and package names only.
- `@dashhaus/core/testing` grew optional peers (`vitest`, `@testing-library/react`) that the note did not enumerate; they are test-only and optional.
