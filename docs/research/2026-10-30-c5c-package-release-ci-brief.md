# Brief: C5c — publishable packages and release CI

## Outcome

Make `@scope/core`, `@scope/dashboard` and `@scope/deploy` release-ready: a packed install outside the workspace resolves, typechecks and runs; versions and internal ranges agree; CI proves it on every change. The cut stops at the publish gate; publishing is the operator's call.

## Parameters

- Repo: `/home/operator/Projects/home-dashboard`. Verify `main` at `ba709ac` (C5b merged). Work on a new branch and leave `main` untouched; do not merge, tag or publish. Those are the operator's calls.
- Node measured: 26.6.0. `@scope/deploy` declares `engines.node >= 22`; hold the release to that floor. Keep the repo's existing test runner and linter; add no new one.
- The public packages are `@scope/core`, `@scope/dashboard` and `@scope/deploy`. The reference skins (orb, field) and every skin created by `new-skin` stay private; do not publish them in this cut.
- The remote is GitHub; there is no CI configuration today (`.github/` absent).
- C5b landed `scripts/packages.mjs` and made generated skins private workspace packages. The workspace consumes package source through specifiers today; tests, Storybook, the generator temp-copy tests and `build:ha` depend on that.
- The readiness map's three-package shape is the authority. Where the code disagrees, the code wins; report the difference.

## Bar

- `npm pack` in each public package, installed into a clean app outside the workspace, must resolve and run:
  - `@scope/core` and its declared subpaths (`.`, `./entities`, `./entities/*`, `./primitives`, `./hooks`, `./demo`, `./testing`, `./fixtures/*`), with the optional websocket peer left optional;
  - `@scope/dashboard`'s `.`, `./card`, `./schema`, `./layout` and `./cli`, including a Node import of the pure entries and a React/DOM consumer for the entry and `./card`;
  - `@scope/deploy`'s import and its `home-dashboard-deploy` bin.
- Installed consumers resolve built ESM JavaScript and `.d.ts`, never a `.ts` export target. The workspace keeps resolving source for its own tests, Storybook and Vite build through a documented condition or mapping; a workspace-only source path must not leak into the packed manifest.
- Packed tarballs ship only intended files: no `*.test.*`, no `*.stories.*`, no `.agents`/`research`/repo docs, and a documented choice for fixtures, demo transports and `testing` (they are declared public subpaths today). Add `files`/`.npmignore` rather than shipping the whole package by accident.
- Packed manifests are internally consistent: a real version (not `0.0.0`), no `*` dependency range, internal `@scope/*` ranges matching the released versions, optional peers still optional, and `bin`/`engines`/`sideEffects` correct.
- Versioning has one documented policy for the three packages, fixed or independent. If independent, the release order and the internal ranges are written down. The policy must be applied by the release command or CI, not by hand in three manifests.
- CI is a GitHub Actions workflow that runs on pull requests and pushes: `npm ci`, `npm run check`, `npm run build:ha`, the generator tests, and a pack-and-install smoke over the tarballs (including the Node import of `@scope/dashboard/cli` and the deploy bin). It runs on the declared engine floor and caches npm. No publish job, no tag, no release.
- `npm run check`, `npm run build:ha` and the generator tests keep passing. The package-boundary checks (`verify/*-package.test.ts`, `verify/generator-packages.test.ts`) stay true; add assertions for packed exports or tarball contents where a text check cannot catch a regression.
- No visual, CSS, card, story, YAML or deploy behavior changes. This cut changes packaging, build output, version metadata and CI only.

## Standard

`codebase-design`; `AGENTS.md` → Layout and Commands; `docs/research/2026-10-29-monorepo-readiness.md` → Packaging work that is not a cut, the Built output tradeoff, version coupling and the publishing open questions; npm's `exports`, `files`, `pack`, `publishConfig` and workspace documentation. Keep the generator package map and the repo's boundary tests as the enforcement points.

## Evidence

- `packages/core/package.json`, `packages/dashboard/package.json`, `packages/deploy/package.json`: all `private: true`, all `version: "0.0.0"`. Core and dashboard export `.ts` files directly and have no `files` field; deploy exports `.mjs`, has `files` and `engines.node >= 22`. Dashboard depends on `"@scope/core": "*"`.
- No `.github/` directory exists, so no workflow has ever run in CI.
- Measured on 2026-10-30, Node 26.6.0, with `npm pack --pack-destination` from each package and `npm install` of the three tarballs into a clean app:
  - tarballs: core 122K, dashboard 23K, deploy 12K;
  - core and dashboard tarballs include `src/**/*.test.ts` and have no built output;
  - `node -e 'import("@scope/core")'` and `import("@scope/dashboard/cli")` both fail with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` for `node_modules/@scope/.../src/index.ts` / `src/cli.ts`;
  - `import("@scope/deploy")` succeeds, and its bin runs (the probe fails only because the temp app has no `dashboard.config.mjs`).
- C4/C5 recorded the same type-stripping limit for installed packages and why the deploy config is bundled. The readiness note's Built output tradeoff says public packages ship ESM JS and `.d.ts`, not raw TS.
- C5b's smoke proves package resolution through workspace symlinks only; it does not prove a packed install.

## Scope

Out of scope here:

- C6: extracting the shared card contract, schema or layout into `@scope/dashboard`; generated skins keep their copies.
- The monorepo rename and moving orb/field to `skins/`; do not migrate or publish the reference skins.
- Publishing generated skins, reference skins, or any package to npm; claiming the npm scope; tags, GitHub releases and announcement material.
- Card/schema/layout behavior, the deploy CLI's behavior, visual design, CSS, stories and YAML.
- PII/history sweep and the `@hd/tools` home decision, unless the release layout forces a documented seam.

## Escalation

- If the workspace source condition and the packed built output cannot both satisfy TypeScript, Vitest, Storybook and Vite, report the consumer matrix and the smallest seam that works; do not fork package layouts or add a second build system before reporting.
- If a per-package build configuration is needed, say exactly which packages and why, and stop before adding it if one root build covers them.
- If the `@scope` npm scope is not owned, 2FA/registry access is missing, or a package name is taken, stop before any publish and report what the operator must arrange.
- If the generator temp-copy tests make CI impractical, report the measured timings and the options; do not delete coverage to make CI green.
- If no concrete independent release need appears, a fixed version across the three packages is acceptable; report the choice and how a future independent line would be added.
- Before `npm publish`, a git tag/release, changing repository visibility, or claiming the npm scope, ask the operator.

## Finish line

- On a branch from `ba709ac`, a clean app outside the workspace installs the three `npm pack` tarballs; `@scope/core` and the declared dashboard subpaths import, a small TypeScript consumer typechecks against the `.d.ts`, the deploy bin runs, and the tarballs contain no test/story files.
- The CI workflow is committed and its commands pass locally (or the remote run is green if the branch is pushed); `npm run check`, `npm run build:ha` and the generator tests pass. If a check cannot run, say which and why, with the exact command and output.
- Hand back: the build/export layout, the versioning policy, the tarball contents and sizes, the CI workflow and measured runtime, the exact publish command, any operator-only steps, and every difference from the three-package map or the readiness note.
