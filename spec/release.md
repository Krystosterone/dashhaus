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

Every package ships a non-empty `README.md` and the root `LICENSE`, and declares `"license": "MIT"`; `files` keeps the README in the tarball while npm always includes the license file, and `npm run verify:packages` refuses a tarball that drops either. `@dashhaus/bundle` also ships `THIRD_PARTY_NOTICES.md`, and its `dashhaus.js` opens with that notice, because the file carries React and ReactDOM. `files` is the allowlist for every package, so packed tarballs contain no `*.test.*`, `*.stories.*`, `.agents`, `research`, or repository docs. Do not run `npm pack` directly in a package: the workspace manifest still carries the `source` condition, which points at files the tarball does not ship. `npm run release:pack` stages the package with the release manifest and packs that.

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
including the scaffolder's `src/templates/standalone/package.json` so a newly scaffolded skin installs the same line.
`scripts/release/manifest.js` then refuses to pack a `0.0.0` version, an unpinned `@dashhaus` range, or a manifest
without `files`/`sideEffects`, or without `license: MIT`; `verify:packages` reads the packed template's ranges back.

If a package ever needs its own line, `publicPackages` in `scripts/release/manifest.js` is the single place to give it a separate version and range; write the release order there and in this document. Until then, independent versions are not supported.

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

After publishing, rerun `node verify/dx/user.js`, `node verify/dx/author.js` and `node verify/dx/developer.js`
against the registry, not the tarballs, before announcing the release; they are the same clean-room journeys CI runs
([journeys.md](journeys.md)). The Marketplace journey's live counterpart is in The Marketplace, below.

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
# write dashboard.config.mjs as in verify/dx/user.js (USER_CONFIG): bundlePath, home-orb and home-field
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

## The Marketplace

The Home Assistant Marketplace (built in from 2026.11) and HACS (before it) read one catalog and one contract, so one
release serves both. What the repository holds:

- `hacs.json` at the root names the plugin. It has no `filename`: the repository is `dashhaus` and the asset is
  `dashhaus.js`, which is the name both stores look for. `verify/dx/marketplace.js` fails if either changes alone.
- `.github/workflows/release.yml` builds `dist/dashhaus.js` from a published release's tag, checks the tag is
  `v<version>` of the packages, and attaches the file to the release. Publishing the release stays the operator's
  step; the workflow only adds what the tag builds. `dist/` stays ignored: the release asset is the artifact, never a
  committed build.
- `.github/workflows/hacs.yml` runs `hacs/action` with `category: plugin` and no ignored checks on every pull request,
  push to main and weekly. It reads the repository through GitHub's public API, so it skips itself while the
  repository is private, like the Docs deploy.
- The bundle's setup card ([deploy.md → The setup card](deploy.md#the-setup-card)) creates the dashboards after the
  install, and the site's [Install from the Marketplace](../docs/src/content/docs/start/install.mdx) page, with its
  My link and `llms.txt`'s copy of its steps, is the way in.

What only the operator can do, in order, each once:

1. Make the repository public, with Pages set to deploy from GitHub Actions first (the Docs workflow then deploys).
2. Fill the repository's description and topics (`home-assistant`, `lovelace`, `hacs`, `dashboard`) and turn issues on;
   the HACS action checks them.
3. Publish the release `v<version>` from the tagged commit. The Release workflow attaches `dashhaus.js`; check it is
   there and the HACS workflow is green.
4. Live, on a scratch Home Assistant 2026.11 and on an older one with HACS: install from the
   [My link](https://my.home-assistant.io/redirect/hacs_repository/?owner=Krystosterone&repository=dashhaus&category=plugin)
   as a custom repository, add the setup card, press Create, open both dashboards, edit one, press again and see
   nothing overwritten, then open the card as a non-admin. Record it in `spec/releases/<version>.md`, as run or unrun.
5. Submit the repository to the catalog: a pull request to `hacs/default`, adding it to the `plugin` list in
   alphabetical order, with the release and the green HACS action. Review takes months; the My link works before it,
   so this is discovery, not the launch.

## CI

`.github/workflows/ci.yml` is the pipeline: `checks` (typecheck, lint, `build:ha`), `unit` (every suite but the generator copies), two generator shards, `dx` (`release:pack`, `verify:packages`, then the clean-room journeys over the packed tarballs) and two Storybook shards. The required `check` job gathers the checks, unit, generator and `dx` lanes, and the required `storybook` job both Storybook shards. Every lane checks out and installs through `.github/actions/setup`, and the Docs workflow does too. The reasons behind its shape:

- Each lane is one runner's install (about 15s on a cache hit) plus its work, and the Storybook shards are the longest, so a lane is split only when it would outlast them. The release proof runs once, in `dx`, whose journeys need its tarballs anyway.
- `node_modules` is cached whole, keyed on the manifests, and installed only on a miss; npm's download cache is restored only then. A cache hit still leaves the workspace links pointing at the same paths, because the checkout path is fixed.
- `node_modules/.cache` is a cache of its own, saved per commit by `checks` and restored from the newest on the branch or main: TypeScript's incremental state (it hashes file contents) and ESLint's cache (`--cache-strategy content`, so a fresh checkout's timestamps don't invalidate it). The generator shards only restore it, so each repo copy's typecheck starts warm.
- Vitest runs every project but the generators in the `vmForks` pool: a test file still gets its own module graph and globals, but jsdom loads once per worker instead of once per file, which was most of the suite's wall time. `--maxWorkers=2` gives a two-core runner both cores, for Vitest and for the Storybook runner.
- The generator suites run on two runners: the new-skin copy alone, and the new-card and Field copies side by side, since each copy is a serial chain of the repo's tools. All three on one runner took longer than a Storybook shard. `verify/projects.test.ts` holds every suite to exactly one shard.
- `test-storybook` builds Storybook in test mode (`storybook build --test`), which leaves out the docs pages it never visits; the Docs workflow's `build:docs` builds them in full. Its axe pass is injected once per page, not per story, and collects violations only. The Storybook and `dx` lanes install only Playwright's headless shell, cached per Playwright version; the runner image already has Chrome's system libraries.
- A newer commit cancels the run in progress on the same branch or pull request; main keeps every run.
- The `dx` journeys install only the packed tarballs and import nothing from this repository; a failure in either is a failure of the public surface, not a flaky integration.
- CI has no publish, tag or release step, and needs no secrets. The Release workflow is not CI: it runs only when the
  operator publishes a release, and its only write is that release's asset, with the run's own token.

The measurements behind each of these, and the options measured and rejected, are in `.agents/skills/test-speed/references/dashhaus-evidence.md`.
