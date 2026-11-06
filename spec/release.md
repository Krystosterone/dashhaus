# Releasing the public packages

`@dashhaus/core` (with the Lovelace framework under `./lovelace`), `@dashhaus/deploy`, `@dashhaus/orb` and
`@dashhaus/field` are the packages a dashboard author or user installs; `create-dashhaus-skin` scaffolds a standalone
skin. Each skin's package also ships its **resource**, the one-file Lovelace module Home Assistant loads
(`dist/<repository>.js` behind its `./resource` export, scripts/resources.js), which the skin's own Marketplace
repository mirrors (The skin repositories, below). Generated skins created inside this repository, Storybook and the
combined install's last `dashhaus.js` stay out of npm.

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

Each release has its record in `releases/<version>.md`, written in its release PR (Releasing, below). The first,
[0.2.0](releases/0.2.0.md), was written by hand and has the publish order and the tarball inspection;
[0.2.1](releases/0.2.1.md) was started by hand and is the first the Release workflow ships.

Every package ships a non-empty `README.md` and the root `LICENSE`, and declares `"license": "MIT"`; `files` keeps the README in the tarball while npm always includes the license file, and `npm run verify:packages` refuses a tarball that drops either. Orb's and Field's packages also ship `dist/THIRD_PARTY_NOTICES.md` (`config/THIRD_PARTY_NOTICES.md`), and every resource opens with that notice, because each file carries React and ReactDOM. `files` is the allowlist for every package, so packed tarballs contain no `*.test.*`, `*.stories.*`, `.agents`, or repository docs. Do not run `npm pack` directly in a package: the workspace manifest still carries the `source` condition, which points at files the tarball does not ship. `npm run release:pack` stages the package with the release manifest and packs that.

## Versioning

**Fixed version** across every public package, currently `0.2.1`. There is no independent release need yet:
core, the skins and their resources are built from the same repository and tag, and coupled releases keep
the internal ranges unambiguous.

`npm run release` applies it (Releasing, below); on its own, apply it with the command, never by editing the manifests:

```sh
npm run release:version -- 0.2.1
npm install --package-lock-only
```

The command sets the version in every public manifest and rewrites each internal `@dashhaus` dependency to `^0.2.1`,
including the scaffolder's `src/templates/standalone/package.json` so a newly scaffolded skin installs the same line.
`scripts/release/manifest.js` then refuses to pack a `0.0.0` version, an unpinned `@dashhaus` range, or a manifest
without `files`/`sideEffects`, or without `license: MIT`; `verify:packages` reads the packed template's ranges back.

If a package ever needs its own line, `publicPackages` in `scripts/release/manifest.js` is the single place to give it a separate version and range; write the release order there and in this document. Until then, independent versions are not supported.

## Change notes

A pull request that changes what a release ships carries a change note: one file in `changes/`, written with

```sh
npm run change -- <breaking|feature|fix|internal> "<what a consumer notices>"
```

in the pull request that makes the change, while its reason is fresh, and reviewed in its diff. The text is for
someone deciding whether to upgrade; `internal` is for a change no consumer notices, and is counted, never listed.
One file per pull request, so two never conflict; `changes/README.md` is the guide, and the repository's
`release-notes` skill (`.agents/skills/`) is how an agent writes one and finishes a release record.

CI's `checks` lane runs `node scripts/release/changes.js check-pr` on every pull request: a diff that touches a public
package's files (tests, stories and READMEs aside), the bundle's entry, the lockfile or the build fails unless it adds
or edits a note, and every note must parse. `shipsFrom` in `scripts/release/changes.js` is that list. A release PR
collects the notes instead.

## Releasing

A release is one pull request and one merge. Everything is decided and reviewed in the pull request; merging it is
the trigger, and the Release workflow only reproduces what the pull request recorded and ships it.

1. **Prepare.** On a branch from main, `npm run release` (or `npm run release -- <x.y.z>`, `--dry-run` to see the
   version first). It reads the notes, packs the current code and compares its API with the latest version on npm
   (`npm run release:api` alone; a package new since that version reads as all added), and suggests the version: before 1.0 a breaking note or API break moves the minor and
   anything else the patch, as a caret range reads it; from 1.0, semver. It applies the version and the lockfile,
   packs again, writes the files' SHA-256 to `releases/<version>.sha256` and the record to `releases/<version>.md`,
   and deletes the notes. Two runs on one commit write the same files.
2. **Finish the record**, in the pull request. Its `TODO`s are what only a person can decide: the two or three
   lines of its `## Release page` (the GitHub release's body, and with its `### Upgrading` steps the version's entry on
   the documentation site's Release notes page, which lists the notes in `changes/` until then), the live Home Assistant smoke below (run on the
   recorded files, or "unrun" and why), and, when the API comparison shows a removed or changed export that no
   `breaking` note owns, whether it breaks. An agent may draft them; a person reviews them.
3. **Merge**, with CI green: its `dx` lane runs `node scripts/release/candidate.js check`, which fails while the record
   has a `TODO:`, while `changes/` holds a note that arrived after the record (its change ships in this release, so
   it moves into this record), or while the commit doesn't pack the files it records. When main moved under the pull
   request, `npm run release:digests` refreshes the record's files; require branches to be up to date before merging,
   so the check always ran on what merges.

Merging moves `packages/core/package.json` (every public package shares its version) on main to a version with no tag, which runs
`.github/workflows/release.yml`; so does a push that changes a `releases/*.sha256`, the fix for a release whose build
refused its digests. Least reversible last:

- **plan** reads the version, refuses anything but main, and stops quietly when that version is tagged at another
  commit (nothing to release); tagged at this commit, it finishes the release. It needs the record and its digests.
- **build**, read-only and with no cache: `build:ha`, `release:pack`, `verify:packages`, checks the release's
  `dashhaus.js` and each skin's resource inside its tarball are the files `build:ha` writes, then `candidate.js check --always`: a clean build must reproduce
  every recorded file byte for byte, or nothing ships. It hands on the files and the record's Release page.
- **draft** creates the GitHub release as a draft at this commit, with that body and `dashhaus.js` attached. A draft
  has no tag and nobody sees it; an immutable release only takes its files while it is a draft.
- **publish** runs `npm publish` on each tarball in `publish.tsv`'s order, which is `publicPackages`', so every
  internal range resolves. A version already on npm is skipped when it is this very file and stops the run when it is
  any other; it asks npm's document for that one version, so it never leaves a stale index cached (below). A
  prerelease goes to the `next` dist-tag, everything else to `latest`.
- **registry**: `release:registry` with `--compare`, so npm serves byte for byte what this commit packed, then the four
  clean-room journeys from those tarballs ([journeys.md](journeys.md)). npm can list a version minutes after it took
  it, so the check waits for each one, up to ten minutes.
- **release** publishes the draft, which creates the tag `v<version>` at this commit and is what the Marketplace and
  HACS see. Last, so a release that failed anywhere earlier is never offered to them.
- **listings** starts each skin repository's mirror with this version and waits for its release (The skin
  repositories, below), so Orb and Field reach the Marketplace minutes after npm.

Every job looks before it acts, so rerunning the workflow, or dispatching it on main, finishes a release that stopped
partway and does nothing to one that shipped. It takes no inputs and runs no model; `verify/toolchain.test.ts` holds
its shape. Agents work upstream of it, in the pull request: writing notes, running `npm run release`, drafting the
record. Nothing they write reaches a consumer without passing review and the checks above.

Decided, and why:

- **The merge is the trigger, not a button after it.** The merge is the reviewed decision; a second click adds a step
  and no information. `workflow_dispatch` is only for finishing a release that stopped.
- **One note file per pull request, not a shared `CHANGELOG.md`**, which conflicts between any two open pull requests.
- **Our own commands, not Changesets, release-please or semantic-release.** One fixed version for six packages, the
  scaffolder's template ranges and the recorded digests are this repository's; each tool would duplicate
  `release:version` or need configuring around it.
- **The registry is read by the version, never by the package's index.** npm's CDN serves a package's index (what
  `npm view` and `npm pack <name>@<version>` read) for up to five minutes, so a version published a moment ago is
  missing from it, and asking for it before publishing keeps the old one cached. 0.3.0's registry job failed that way,
  its fixed retries spent while npm listed the version two minutes late. npm's document for one version
  (`<registry>/<name>/<version>`) is never cached and a tarball never changes, so the check reads only those, and it
  waits against a deadline, not a count of tries.
- **No staging dist-tag promoted to `latest` after the smoke.** Trusted publishing covers `npm publish`, not
  `npm dist-tag`, so promotion would bring a token back. npm versions are immutable anyway: a bad release is fixed
  forward, by the next patch.

## Determinism

The files a release PR records are the files the workflow ships because nothing in a build depends on anything but the
tree: the bundle names its build by its version (`config/vite.lovelace.config.ts`), never a ref, so tagging changes no
byte; npm packs with fixed timestamps; the lockfile pins every dependency, and the build installs it with no cache.
The 0.2.0 tarballs packed again here, on another machine, matched npm's byte for byte, the bundle aside, which then
still named its commit.

`npm run release:registry -- <x.y.z> [--out registry] [--compare release]` downloads a published version back from
npm, checks each file against the registry's `dist.shasum` and `dist.integrity` and, with `--compare`, against the
tarballs this commit packs. It reads npm's document for each version and the tarball it names, never the package's
index, and waits up to ten minutes for a version npm doesn't list yet.

## Publishing

The workflow publishes with **npm trusted publishing**: npm accepts the publish job's GitHub OIDC identity in place of
a token, so there is no npm token in the repository or its secrets, no 2FA prompt, and every version carries a
provenance attestation naming the repository, workflow and commit. The publish job runs in the `npm` environment (add
required reviewers there for a second pair of eyes before anything reaches npm); it installs nothing, runs none of the
repository's scripts and publishes with `--ignore-scripts`.

Set up once, by the owner of the `@dashhaus` scope, for each of the six packages on npmjs.com (the package's
Settings → Trusted Publisher): GitHub Actions, organization or user `Krystosterone`, repository `dashhaus`, workflow
`release.yml`, environment `npm`. Then set each package's publishing access to require two-factor authentication and
disallow tokens, so the workflow is the only way to publish. A new public package has to exist on npm before it can
have a trusted publisher: publish its first version by hand, as below.

By hand, only for a package's first version or when the workflow cannot run: be logged in with the registry's 2FA
(`npm whoami`), pack at the release commit, and publish in dependency order. Keep the `./`: npm 11.18 reads a bare
`release/x.tgz` as a GitHub repository.

```sh
npm run release:pack
while IFS=$'\t' read -r name version file; do npm publish "./release/$file"; done < release/publish.tsv
npm run release:registry -- <version> --compare release
```

Then run `node verify/dx/user.js`, `author.js`, `developer.js` and `marketplace.js` with `--tarballs registry`.

## Release commands

```sh
npm run change -- fix "<text>"      # a change note, in the pull request that makes the change
npm run release [-- <x.y.z>]        # prepare a release PR: version, lockfile, digests, record
npm run release:api                 # the API of release/ against the latest version on npm
npm run release:digests             # pack, and refresh the record's digests
npm run release:version -- 0.2.1   # only the fixed version, in every public manifest
npm run release:pack                # build dist, pack the release tarballs and publish.tsv, their order
npm run verify:packages             # clean-app install, imports, typecheck, deploy bin
npm run release:registry -- 0.2.1   # what npm serves for a version
```

### Live Home Assistant smoke

CI proves both journeys against the in-memory Home Assistant in `verify/dx/`. In the release PR, before merging, the operator runs the same two journeys once against a real instance, on the files its record names. It needs an admin token and an SSH or mounted `HA_WWW`; it is never a CI job and it is recorded as run or unrun, never inferred from the fake.

Prepare:

1. Pack at the release PR's commit with `npm run release:pack` and note `git rev-parse HEAD`. Its tarballs are the
   ones the record's `.sha256` names: `node scripts/release/candidate.js check` reports only the record's `TODO`s.
2. Use a scratch Home Assistant, or first delete the dashboards `home-orb`, `my-home-orb`, `home-field`, `my-home-field` and `dashhaus-my-skin` and the resources `/local/orb-dashboard/orb-dashboard.js`, `/local/field-dashboard/field-dashboard.js` and `/local/dashhaus-my-skin/dashhaus-my-skin.js` from earlier runs. Otherwise the smoke exercises updates, not first creation, and must say so.
3. Set `release` to this repository's `release/` directory and `<version>` to the packed version in the commands below. Copy `.env.example` to the app and fill `HA_URL`, `HA_TOKEN` and `HA_WWW` (see [deploy.md](deploy.md)). Never put the token in the record.

User journey, from packed tarballs with no build:

```sh
app=$(mktemp -d); cd "$app"
npm init -y && npm pkg set type=module
npm install "$release"/dashhaus-core-<version>.tgz "$release"/dashhaus-orb-<version>.tgz \
  "$release"/dashhaus-field-<version>.tgz "$release"/dashhaus-deploy-<version>.tgz
cp /path/to/dashhaus/.env.example .env        # fill the three values, keep it out of git
# write orb.config.mjs and field.config.mjs from the js block in each skin's README, as verify/dx/user.js does
npx dashhaus-deploy --config orb.config.mjs --skip-build
npx dashhaus-deploy --config field.config.mjs --skip-build
```

Author journey, from packed tarballs, scaffolding, testing and building once:

```sh
app=$(mktemp -d); cd "$app"
npm init -y && npm pkg set type=module
npm install "$release"/dashhaus-core-<version>.tgz \
  "$release"/dashhaus-deploy-<version>.tgz "$release"/create-dashhaus-skin-<version>.tgz \
  react@18.3.1 react-dom@18.3.1 home-assistant-js-websocket@9.7.1 vite@5.4.19 @vitejs/plugin-react@4.3.4 \
  typescript@5.6.3 @types/react@^19.0.0 @types/react-dom@^19.0.0   # the scaffold's own devDependencies, for npm test
npx create-dashhaus-skin my-skin
ln -s "$app/node_modules" my-skin/node_modules   # pre-publish stand-in for `npm install` in the scaffold
cd my-skin
npm test
npm run build
cp /path/to/dashhaus/.env.example .env           # same three values; the scaffold's dashboard is dashhaus-my-skin
npx dashhaus-deploy --skip-build
```

Observe, in this order:

1. The user deploys print each upload, register `/local/orb-dashboard/orb-dashboard.js` and `/local/field-dashboard/field-dashboard.js`, and create their four dashboards: each skin's on its strategy, and each "My home" with its rows. The author deploy registers a second resource at `/local/dashhaus-my-skin/dashhaus-my-skin.js` and creates its dashboard. Each uploaded file is byte-identical to its tarball or build, and the two resources coexist.
2. Reload every open Home Assistant tab: the frontend reads its resource list once, so a tab opened before the deploy shows a configuration error until reloaded.
3. The sidebar lists **Home (Orb)**, **My home (Orb)**, **Home (Field)**, **My home (Field)** and, from the author app, **Home (My Skin)**. Each opens with no "Configuration error" card and draws its auto layout from the instance's entities; open one card's details and close it.
4. Press a reversible `input_boolean` or `switch` on Orb or Field, see the state change, then restore it. The browser console shows no errors.
5. Settings → Dashboards → Resources shows `/local/orb-dashboard/orb-dashboard.js?v=<content hash>`, `/local/field-dashboard/field-dashboard.js?v=<content hash>` and `/local/dashhaus-my-skin/dashhaus-my-skin.js?v=<content hash>`; every network request is 200. Add dashboard lists **Orb**, **Field** and **My Skin** under Community dashboards. Edit a dashboard and confirm its generated layout loads in the code editor.
6. The author build emitted one `dist/dashhaus-my-skin.js`; its dashboard draws and its card opens details.

Record on the release candidate: date and operator, Home Assistant version, candidate commit, tarball version, the deploy output, pass/fail for each observation above, and where the screenshot or console excerpt lives. If credentials are not supplied, record "live smoke: unrun — no HA_URL/HA_TOKEN/HA_WWW" and do not mark it passed.

## The Marketplace

The Home Assistant Marketplace (built in from 2026.11) and HACS (before it) read one catalog and one contract, so one
release serves both. What the repository holds:

- `hacs.json` at the root names the plugin. It has no `filename`: the repository is `dashhaus` and the asset is
  `dashhaus.js`, which is the name both stores look for. `verify/dx/marketplace.js` fails if either changes alone.
  It sets `hide_default_branch`: the stores take the file from the latest release's assets first, and failing that
  from the branch's root or `dist/` (HACS's `update_filenames`), and the default branch has no built file in either,
  so offering it could only fail.
- `.github/workflows/release.yml` (Releasing, above) builds `dist/dashhaus.js` from the merged release commit,
  attaches it to the release while it is a draft, and publishes the release, whose tag `v<version>` is the version
  the Marketplace reads. The build runs read-only and restores no cache (the setup action's `cache: "false"`): any job
  that runs on main, a third-party action's included, can save an Actions cache entry a later run restores, so the
  file is installed from the lockfile alone. Only the jobs that draft and publish the release may write to the
  repository, and they run none of the repository's scripts. `dist/` stays ignored: the release asset is the
  artifact, never a committed build.
- `.github/workflows/hacs.yml` runs `hacs/action`, its wrapper pinned to a commit on its `main` while the checks come from HACS's `ghcr.io/hacs/action:main` image, so they follow HACS's current rules and the pin needs no bump, with `category: plugin` and no ignored checks on every pull request,
  push to main and weekly. It reads the repository through GitHub's public API, so it skips itself while the
  repository is private, like the Docs deploy.
- The bundle's dashboard strategy ([deploy.md → The dashboard strategy](deploy.md#the-dashboard-strategy)) makes the
  dashboard after the install, from Home Assistant's own Add dashboard dialog, and the site's [Install from the Marketplace](../docs/src/content/docs/start/install.mdx) page, with its
  My link and `llms.txt`'s copy of its steps, is the way in.

Decided, and why:

- **The Marketplace and HACS are one target.** From Home Assistant 2026.11 the Marketplace is HACS in core, with the
  same catalog, `hacs.json` and action. One `hacs_repository` My link opens HACS before 2026.11 and the Marketplace
  after, so nobody chooses.
- **A dashboard strategy, not a setup card or a companion integration.** A repository holds one item of one type, so
  an integration that creates dashboards would be a second repository in Python, on Home Assistant's internal
  Lovelace collections. A strategy needs neither: Home Assistant's own Add dashboard dialog lists it (2026.5 and
  newer), and the dashboard stores only the strategy, so it follows Dashhaus as it updates. It replaced the setup card,
  which cost a card placement, a press and a removal, and was then removed.
- **The person creates it, never an automatic run.** Nothing is created until they pick Dashhaus in Add dashboard, and
  no existing dashboard is touched.
- **No token for agents.** An agent installing Dashhaus uses the person's own session through Add dashboard, never a
  long-lived token handed to a model.
- **The command line stays**, for CI, automation, dashboards in YAML mode and dashboards written from scratch.
  Installing a skin both ways loads two copies of its resource, so each skin's page says to pick one.

### The combined install's sunset

Sharing Dashhaus as a whole didn't land, so Orb and Field became the way in: each has its own page and its own
Marketplace install (The skin repositories, below), and `Krystosterone/dashhaus` stops being one. It ends in one last
release, which keeps every combined install working and tells its people what changed:

- That release is the first to ship Orb's and Field's resources in their packages, so their repositories can mirror
  it the same day. Its `dashhaus.js` still holds both skins and `custom:dashhaus`, built from `apps/lovelace/` by
  `build:ha`, written beside the tarballs by `release:pack`, recorded in its digests and attached to its GitHub
  release, which HACS shows on update.
- Its strategy says Orb and Field now install on their own: in Add dashboard's entry, and above each view in a
  Markdown card linking to the look's page and to the site's page for the move (spec/deploy.md → The combined
  install's `custom:dashhaus`). Nothing else changes: its dashboards and cards draw as before.
- `@dashhaus/bundle` and `@dashhaus/dashboard` are not published again; their last versions stay on npm, deprecated
  by the operator with a pointer to the skins' packages and to core.

After it, this repository ships no `dashhaus.js`: `apps/lovelace/`, the root `hacs.json`, the HACS workflow and
`verify/dx/marketplace.js` go, and the Release workflow tags `v<version>` without a GitHub release, so HACS, which
reads only releases (`custom_components/hacs/repositories/base.py`), keeps offering a combined install its last one and
never an update with no file in it.

What only the operator can do, in order, each once. Steps 1 to 3 are done: the repository went public (#29) and
`v0.2.0` and `v0.2.1` shipped (#30). Step 4 is partly done: the HACS install and a first Create passed live with
`v0.3.0` ([0.3.0 → Live Marketplace install](releases/0.3.0.md#live-marketplace-install)), and its other checks stay
open as #31. Step 5 is open as #32, and step 6 waits on it, in #31:

1. Make the repository public, with Pages set to deploy from GitHub Actions first (the Docs workflow then deploys).
2. Fill the repository's description and topics (`home-assistant`, `lovelace`, `hacs`, `dashboard`) and turn issues on;
   the HACS action checks them.
3. Merge the release PR (Releasing, above). The Release workflow tags `v<version>`, attaches `dashhaus.js` and
   publishes the packages and the release; check its six jobs and the HACS workflow are green.
4. Live, on a scratch Home Assistant older than 2026.11, with HACS: install from the
   [My link](https://my.home-assistant.io/redirect/hacs_repository/?owner=Krystosterone&repository=dashhaus&category=plugin)
   as a custom repository, reload, then **Settings → Dashboards → Add dashboard** and pick **Dashhaus** under
   Community dashboards (Home Assistant 2026.5 or newer), open its Orb and Field tabs at a phone and a desktop width,
   in light and dark mode, and check **Edit dashboard** opens on the bare strategy in YAML. Record it in
   `spec/releases/<version>.md`, as run or unrun.
5. Submit the repository to the catalog: a pull request to `hacs/default`, adding it to the `plugin` list in
   alphabetical order, with the release and the green HACS action. Review takes months; the My link works before it,
   so this is discovery, not the launch.
6. Once the catalog lists Dashhaus, repeat step 4 on a scratch Home Assistant 2026.11 or newer, through its built-in
   Marketplace, which doesn't offer Dashhaus before then, and record it the same way.

## The skin repositories

Orb and Field are each a product of their own in the Marketplace: a repository per skin, holding one plugin, whose
release carries that skin's resource. A person finds, downloads and picks **Orb** or **Field**; Dashhaus is the
foundation under them, not what they install ([journeys.md → The user](journeys.md#the-user)). The list is
`scripts/skin-repositories.js`, on `scripts/resources.js`:

| Skin | Repository | Asset, mirrored from | Strategy | Landing page |
| --- | --- | --- | --- | --- |
| Orb | `Krystosterone/orb-dashboard` | `orb-dashboard.js`, `@dashhaus/orb`'s `dist/` | `custom:orb-dashboard`, listed as **Orb** | `/dashhaus/orb/` |
| Field | `Krystosterone/field-dashboard` | `field-dashboard.js`, `@dashhaus/field`'s `dist/` | `custom:field-dashboard`, listed as **Field** | `/dashhaus/field/` |

What each repository carries is kept here, in `hacs/<repository>/`, and copied there: its `hacs.json` (the skin's
name, no `filename`, the default branch hidden), its README, which is the page HACS and the Marketplace show for it,
the mirror script `.github/mirror.js` and two workflows, `release.yml` and `validate.yml` (the HACS action).
`verify/skin-repositories.test.ts` holds the copies to the list, to each other (the mirror script is the same file in
every repository: it reads the skin from the repository's name) and to the action pins this repository uses, and runs
the mirror's checks on a real version's attestations.

- **What it ships.** The file inside the skin's npm package, byte for byte: the release workflow here publishes the
  package with npm's provenance, and the skin repository releases what npm serves. Nothing builds it twice, and this
  repository's GitHub release doesn't attach it: HACS downloads every asset of a plugin's release, so it would land in
  every combined install.
- **How it releases.** This repository's Release workflow ends with a `listings` job: once npm serves the version, it
  starts each skin repository's `release.yml` with that version (`gh workflow run … -f version=<version>`) and waits
  until each has released it, so one green run means npm and both Marketplace listings are done, minutes apart. Run by
  hand with no version, the skin repository's workflow mirrors npm's `latest`. When the version isn't released there
  yet, `mirror.js` reads that version's document from npm
  (never the package's index), downloads its tarball and refuses unless the tarball's sha512 is the document's
  integrity and npm's SLSA provenance for it names this tarball, built from `Krystosterone/dashhaus` by
  `.github/workflows/release.yml` on `refs/heads/main`. `npm audit signatures`, on that version installed with
  `--ignore-scripts` in an empty folder, then checks npm's signatures and the attestations' Sigstore signatures. Only
  then does it take `package/dist/<repository>.js` out, bring its README and `hacs.json` from the commit the
  provenance names (committing them when they changed), and publish `v<version>`, titled with the skin's name, the
  file its one asset, as latest (a prerelease stays one). It needs no secret of its own: npm and this repository are
  public, and its own token writes its own repository. The skin's version is the packages'.
- **What stays here.** Code, issues, the spec and the site. A skin repository is its release and its README, nothing
  to develop in: its README sends issues and source here. Its workflows and script change here and are copied by
  hand, since its own token can't change its workflows.

Decided, and why:

- **A repository per skin, not one repository with two plugins.** HACS and the Marketplace take one item per
  repository and name it after `hacs.json`; a skin can only be found, listed and updated under its own name from a
  repository of its own.
- **Mirrored from npm, not rebuilt.** The package is what the release PR recorded and the Release workflow published
  with provenance; mirroring it means one build for every way in (the Marketplace, the command line, an app), and the
  provenance check means the mirror takes only a file this repository's release workflow built. A rebuild from the tag
  would need the whole toolchain in the skin repository and a second reproduction of every byte.
- **Started from here, not polled.** A schedule needs no token, but it puts hours between npm and the Marketplace,
  and GitHub turns off a public repository's scheduled workflows after 60 days without activity, which a quiet skin
  repository reaches. So the Release workflow starts the mirrors, with one secret, `SKIN_REPOSITORIES_TOKEN`: a
  fine-grained token for the skin repositories alone, with Actions read and write and nothing else. It can only start
  their workflows; it can't write their contents or this repository's, and what they release is still only a file
  whose npm provenance names this repository's release workflow. It is the Release workflow's only secret, held by its
  last job, which has no permissions here (`verify/toolchain.test.ts`).
- **Named `<skin>-dashboard`.** The repository name is the asset's and the strategy's type, so it must be unique among
  community dashboards; the name a person sees is the skin's, from `hacs.json` and the strategy's entry.

What only the operator can do, each once, in order, for each skin:

1. Create the repository, public, with its description and topics (`home-assistant`, `lovelace`, `hacs`,
   `dashboard`), issues on (the HACS action checks them; the README sends them here), and the contents of
   `hacs/<repository>/` plus `LICENSE` on its default branch. Allow Actions to create releases (Settings → Actions →
   Workflow permissions: read and write).
2. Once both repositories exist: create a fine-grained personal access token (Settings → Developer settings →
   Fine-grained tokens) with access to only `Krystosterone/orb-dashboard` and `Krystosterone/field-dashboard` and the
   one permission **Actions: read and write**, and save it in this repository as the Actions secret
   `SKIN_REPOSITORIES_TOKEN`. Note its expiry; a release after it fails at its last job, which a new token and a rerun
   finish.
3. Let the first release happen: the next release of this repository (the combined install's sunset release, above, is
   the first to ship the skins' resources) starts both mirrors as its last job; check it, the mirrors and their HACS
   workflows are green.
4. Live, on a scratch Home Assistant 2026.5 or newer with HACS: install from the skin's My link as a custom repository,
   reload, **Settings → Dashboards → Add dashboard** and pick the skin under Community dashboards; open it at a phone
   and a desktop width, in light and dark mode. Record it in `spec/releases/<version>.md`.
5. Submit the repository to the catalog: a pull request to `hacs/default`, adding it to the `plugin` list in
   alphabetical order, with the release and the green HACS action. The My link works before it. The combined
   install's own submission (#32) is then closed in their favour.

## CI

`.github/workflows/ci.yml` is the pipeline: `checks` (a pull request's change note, typecheck, lint, `build:ha`), `unit` (every suite but the generator copies), two generator shards, `dx` (`release:pack`, `verify:packages`, an untagged release candidate's digests and record, then the clean-room journeys over the packed tarballs) and two Storybook shards. The required `check` job gathers the checks, unit, generator and `dx` lanes, and the required `storybook` job both Storybook shards. Every lane checks out and installs through `.github/actions/setup`, and the Docs workflow does too. The reasons behind its shape:

- Each lane is one runner's install (about 15s on a cache hit) plus its work, and the Storybook shards are the longest, so a lane is split only when it would outlast them. The release proof runs once, in `dx`, whose journeys need its tarballs anyway.
- `node_modules` is cached whole, keyed on the manifests, and installed only on a miss; npm's download cache is restored only then. A cache hit still leaves the workspace links pointing at the same paths, because the checkout path is fixed.
- `node_modules/.cache` is a cache of its own, saved per commit by `checks` and restored from the newest on the branch or main: TypeScript's incremental state (it hashes file contents) and ESLint's cache (`--cache-strategy content`, so a fresh checkout's timestamps don't invalidate it). The generator shards only restore it, so each repo copy's typecheck starts warm.
- Vitest runs every project but the generators in the `vmForks` pool: a test file still gets its own module graph and globals, but jsdom loads once per worker instead of once per file, which was most of the suite's wall time. `--maxWorkers=2` gives a two-core runner both cores, for Vitest and for the Storybook runner.
- The generator suites run on two runners: the new-skin copy alone, and the new-card and Field copies side by side, since each copy is a serial chain of the repo's tools. All three on one runner took longer than a Storybook shard. `verify/projects.test.ts` holds every suite to exactly one shard.
- `test-storybook` builds Storybook in test mode (`storybook build --test`), which leaves out the docs pages it never visits; the Docs workflow's `build:docs` builds them in full. Its axe pass is injected once per page, not per story, and collects violations only. The Storybook and `dx` lanes install only Playwright's headless shell, cached per Playwright version; the runner image already has Chrome's system libraries.
- A newer commit cancels the run in progress on the same branch or pull request; main keeps every run.
- The `dx` journeys install only the packed tarballs and import nothing from this repository; a failure in either is a failure of the public surface, not a flaky integration.
- CI has no publish, tag or release step, and needs no secrets. The Release workflow is not CI: it runs only when a
  release PR's version reaches main, and its only writes are the GitHub release and its asset, with the run's own
  token, and the npm publish, with the publish job's OIDC identity (Publishing, above). Its one secret starts the skin
  repositories' mirrors (The skin repositories, above).

The measurements behind each of these, and the options measured and rejected, are in `.agents/skills/test-speed/references/dashhaus-evidence.md`.
