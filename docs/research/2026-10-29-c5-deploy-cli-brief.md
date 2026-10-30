# Brief: C5 — the deploy CLI

## Outcome

A Home Assistant dashboard repo points one Node CLI at its own `dashboard.config.mjs` and gets build, upload, resource registration and dashboard reconciliation; this repo’s `npm run deploy` becomes a use of that CLI, and no deploy code reaches into a skin.

## Parameters

- Repo: `/home/operator/Projects/home-dashboard`. Verify `main` at `de206d2`; work on a new branch and leave `main` untouched.
- Follow the package map in `docs/research/2026-10-29-monorepo-readiness.md`: `@scope/deploy` is the Node CLI (config, build, upload, Home Assistant, dashboards), and `@scope/dashboard/cli` is the dashboard-repo surface. Where the code disagrees with the map, report the difference instead of inventing a third package.
- C4 is merged: the loader is `scripts/deploy/config.mjs` with tests in `scripts/deploy/config.test.ts`; the repo config is `dashboard.config.mjs`; deploy is `scripts/deploy.mjs`.
- Node measured: 26.6.0. Keep the repo’s existing test runner and linter; add no new one.
- `.env` remains settings only: URL, token, www path, SSH port, and the dashboard path/title overrides. No secret goes in the config.

## Bar

- The CLI loads a user’s config (a path outside this repo included), applies the `.env` keys each dashboard names, validates Home Assistant’s path rules, and builds/uploads/registers/reconciles with the current behavior: same dashboard paths, titles and icons, same first-run card creation, same resource URL and content-hash version, and never overwrite an existing layout.
- Config loading no longer depends on Node’s type stripping under `node_modules`: bundle the config, or ship JavaScript the CLI can import. Prove it from a clean `npm ci` and from a copied, non-symlinked `@scope/dashboard` install. Do not reintroduce a skin `.ts` import as the workaround.
- Build ownership is explicit. The CLI must not silently hardcode this repo’s `vite.lovelace.config.ts`; a repo can declare its build (a prebuilt bundle plus an optional `build` callback is the research’s recommendation), and this repo’s current Vite build stays the default for its config.
- The package boundary holds: deploy is Node-only, imports no skin, and the repo’s config stays the only importer of orb’s generated layout. The repo’s `npm run deploy` still works after the move.
- Tests cover the CLI and the loader without Home Assistant, including the config, the `.env` overrides, both path failures, generated-skin registration and the dashboard reconciliation. Add a two-run fake-Home-Assistant smoke that proves creation then never-overwrite.
- Existing tests and docs behavior stay unchanged unless the CLI format requires a documented change; document the config/CLI surface in `docs/deploy.md`, `.env.example` and `AGENTS.md`.

## Standard

`codebase-design`; `AGENTS.md` → Layout and Commands; `docs/deploy.md`; the C5 row, package map and open question 2 in `docs/research/2026-10-29-monorepo-readiness.md`; `home-assistant-integration` for the websocket side.

## Evidence

- `scripts/deploy.mjs` is the 185-line script being replaced: it hardcodes `npx vite build -c vite.lovelace.config.ts`, the bundle path, the www folder, the resource URL and the single websocket client.
- `scripts/deploy/config.mjs` owns validation and `.env` resolution; `scripts/deploy/config.test.ts` is the no-Home-Assistant seam; `dashboard.config.mjs` is the repo’s dashboard set.
- The C4 measurement at the end of the monorepo-readiness note records the exact clean-install and copied-install results.
- `scripts/generated-skins.mjs` feeds `generatedDashboards()` in the config; generated skins must keep registering.
- The previous fake-Home-Assistant run created both dashboards and their layouts, then on a second run saved no layout and reported each existed. Reproduce that behavior as a test or a repeatable smoke.

## Scope

Out of scope here:

- C5b: retiring the repo’s generator anchors, making `new-card`/`new-skin` package-aware, and scaffolding package manifests for generated skins.
- C5c: publishing, versioning, npm release configuration, and the CI workflow.
- The monorepo rename and the PII/history sweep.
- Visual, YAML, CSS, story or card behavior changes; C6.

Publishing, tagging and merging to `main` are not authorized by this brief; leave them for the operator.

## Escalation

If the package seam or build ownership cannot be settled from the research, or the config format needs a public change beyond its build/load surface, stop with the measured options and the diff you propose. If a real Home Assistant run is the only way to settle a behavior, say so and stop before guessing; the fake transport is acceptable otherwise.

## Finish line

- `npm run check`, `npm run build:ha`, and `npm run test-storybook` if any skin surface changed (otherwise say why not).
- `node <cli> --help` succeeds from a clean `npm ci` and from the copied-install test.
- A CLI/loader test proves the config drives the dashboard set; the two-run fake-Home-Assistant smoke proves creation and no-overwrite.
- Hand back: the package/entry layout and CLI/config surface, what moved out of `scripts/`, any behavior/YAML/DOM delta (expected none), the clean and copied-install measurements, the gate output, and what C5b/C5c still own.
