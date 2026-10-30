# Brief: rename the monorepo and its packages to Dashhaus

## Outcome

The repository's own identity is `Dashhaus`: the root package is `dashhaus`, the three public packages are `@dashhaus/core`, `@dashhaus/dashboard` and `@dashhaus/deploy`, and generated skins are `@dashhaus/<skin>`. Every live import, manifest, lockfile entry, generator, test, ESLint rule, script and current-facing document agrees; packed installs resolve and run under the new names. The deployed Lovelace elements and Home Assistant paths keep their `home-dashboard` names.

## Parameters

- Repo: `/home/operator/Projects/home-dashboard`.
- Base: `main` at `4fc6d25` (C5c merged and CI green). If `main` has moved, branch from current `main` and record the difference.
- Name: **Dashhaus** (selected by the operator on 2026-10-30; the earlier recommendation and availability evidence are in `docs/research/2026-10-29-monorepo-name.md`).
- Scope of the rename: root package `home-dashboard` → `dashhaus`; `@scope/core` → `@dashhaus/core`; `@scope/dashboard` → `@dashhaus/dashboard`; `@scope/deploy` → `@dashhaus/deploy`; generated-skin packages `@scope/<skin>` → `@dashhaus/<skin>`; CLI bin `home-dashboard-deploy` → `dashhaus-deploy`.
- Keep the deployed artifact identity: `custom:home-dashboard`, `custom:home-dashboard-field`, `dist/home-dashboard.js`, `www/home-dashboard/`, `/local/home-dashboard/home-dashboard.js`, dashboard paths `home-dashboard` and `home-dashboard-field`, and the HA-facing YAML in `docs/deploy.md`. Do not add `custom:dashhaus` aliases in this cut.
- Versions stay `0.1.0`; these packages have not been published. Rebuild and re-pack under the new names rather than bumping.

## Bar

- Root and package manifests carry the new names; `@scope` is gone from every live surface outside `docs/research/` (historical notes keep their dated evidence).
- `scripts/packages.mjs`'s package map, `scripts/release/manifest.mjs`'s public-package rules, ESLint's package-boundary patterns and messages, the generator bodies and templates, the conformance/package boundary tests, `dashboard.config.mjs`, the Storybook and app imports, and `package-lock.json` all use the new scope. No rename check is weakened to make the old name pass.
- A generated skin created by `new-skin` is named `@dashhaus/<skin>`, imports `@dashhaus/core` and `@dashhaus/dashboard`, and the generator temp-copy tests prove it.
- `npm run release:pack` produces `release/dashhaus-core-0.1.0.tgz`, `dashhaus-dashboard-0.1.0.tgz` and `dashhaus-deploy-0.1.0.tgz`; `npm run verify:packages` installs them into a clean app and imports the new specifiers, typechecks against the declarations, and runs `dashhaus-deploy --help`.
- The compatibility names above still exist and still work; the bundle output and deploy URLs are unchanged.
- `npm run check`, `npm run test:generators`, `npm run build:ha` and `npm run test-storybook` pass. If Storybook's Playwright gate cannot run in the session, report the exact command and failure; do not replace it with the build alone.
- The TODOS item is checked off with the applied name, and the finished brief notes anything left for the operator.

## Standard

`codebase-design`; `AGENTS.md` → Layout and Commands; `docs/research/2026-10-29-monorepo-name.md` → Rename footprint and Limits; `docs/release.md` (packed manifests and the source condition); `verify/generator-packages.test.ts` as the package-map enforcement point. Where the code disagrees with the naming note, the code wins; report the difference rather than forcing the note's route.

Before the first edit, re-check the npm scope and GitHub handle (the note's checks were run on 2026-10-29). If `@dashhaus` or the `dashhaus` GitHub handle is no longer available, stop and ask for a fallback; do not work around it.

## Evidence

Observed on `main` at `4fc6d25`:

- `package.json`: root `name` is `home-dashboard`; `packages/{core,dashboard,deploy}/package.json`: `@scope/*`, version `0.1.0`, `private: true`, source-plus-`dist` exports; deploy bin is `home-dashboard-deploy`.
- `@scope/` appears 677 times in 222 files outside `docs/research/`: imports in `src/`, `packages/`, `apps/`, `.storybook/` and `verify/`, ESLint patterns and messages, `scripts/packages.mjs`, both generator bodies and templates, `dashboard.config.mjs`, `docs/*.md`, `README.md`, `AGENTS.md`, `.agents/skills/home-assistant-integration/SKILL.md`, and `package-lock.json`.
- Five existing files under `docs/research/` record the old scope as history; the C5c brief and the C5b/C5 measurements describe `@scope` as it was then.
- `scripts/release/` already strips the `source` condition and `private` for packed installs; its `publicPackages` names and `@scope` range checks are hardcoded and must move with the rename.
- The C5c cut's local gates and CI run `41100163969` are green at this commit; the release tarballs in `release/` are still named `scope-*.tgz` and are stale after the rename.
- `TODOS.md` tracks this work under “Pick the monorepo name and rename the repo”, with the recommendation and the compatibility boundary.

## Scope

Out of scope here:

- Renaming the GitHub repository, changing `origin`, or editing the README Issues URL. The operator owns that remote, irreversible step; hand back `gh repo rename dashhaus` and the `git remote set-url` command. The local checkout folder stays `home-dashboard`.
- Publishing, tagging, merging, force-pushing, or claiming the npm scope.
- Any change to Lovelace element names, dashboard paths, deploy bundle names, CSS, visuals, card/schema/layout behavior, story content, or YAML.
- Rewriting historical research notes under `docs/research/` that record the old scope; they stay as dated evidence.
- Splitting `AGENTS.md`/`README.md`/skills, hiding tooling config, PII/history work, performance work, or adding more CI lanes.

## Stop point

Work on a new branch and commit there. Do not push, merge, tag, publish, force-push, rename the GitHub repository, or change `origin`. Ask before touching any deployed identifier or any historical research file. The name is confirmed; do not reopen the choice unless availability fails.

## Finish line

A branch from `main` where:

```sh
git grep -n '@scope/' -- ':!docs/research/**'        # no output
git grep -n 'home-dashboard-deploy' -- ':!docs/research/**'  # no output
node -p 'require("./package.json").name'              # dashhaus
node -p 'require("./packages/core/package.json").name' # @dashhaus/core
```

and `npm run check`, `npm run test:generators`, `npm run build:ha`, `npm run test-storybook`, `npm run release:pack` and `npm run verify:packages` pass.

Hand back: the branch/commit; the manifests and import count before/after; the verification output; the tarball names and sizes; every live `home-dashboard` occurrence that was intentionally kept and why; the exact operator commands for the GitHub repository rename and remote update; and any difference from `TODOS.md`, the naming note or this brief.
