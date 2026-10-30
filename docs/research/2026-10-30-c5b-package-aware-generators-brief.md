# Brief: C5b — package-aware generators

## Outcome

`npm run new-skin` and `npm run new-card` treat the repo as a package graph, not a fixed `src/` tree: a skin created by `new-skin` is a private workspace package that `npm install` links, its public entry is a package export, and every Card the generator adds lands in that package and is registered through a stable seam — with no generator depending on incidental text in a package-owned file.

## Parameters

- Repo: `/home/operator/Projects/home-dashboard`. Verify `main` at `0950c35`. Work on a new branch and leave `main` untouched. Do not publish or merge; that is the operator's call.
- Node measured: 26.6.0. Keep the repo's existing test runner and linter; add no new one.
- C5 is merged: `@scope/deploy` is the Node CLI (`packages/deploy`), `@scope/dashboard/cli` is the dashboard-repo config surface, and `scripts/generated-skins.mjs` feeds the deploy config.
- The generators are `scripts/new-card/{index,field,generated,lib}.mjs`, `scripts/new-skin/index.mjs` and their templates. Generated skins live under `src/skins/`; the root workspaces are `packages/*`; the shared packages are `packages/core` (`@scope/core`) and `packages/dashboard` (`@scope/dashboard`).
- Follow the package map in `docs/research/2026-10-29-monorepo-readiness.md`: `@scope/dashboard/cli` is the product surface for generator code, and `verify/` holds repo-only assertions. Where the code disagrees with the map, report the difference instead of inventing a third package.

## Bar

- A generated skin is a real private workspace package: a manifest with a stable name (not `@scope/core`, `@scope/dashboard` or `@scope/deploy`), `private`, `type`, and exports for what the repo consumes. `npm install` links it, and a package-specifier import resolves it.
- The generated skin's manifest exposes the entry, token CSS, Lovelace card registration and Storybook setup the root apps consume, or a smaller documented surface that covers them. Consumers cross the package boundary by specifier; they do not reach into `src/skins/<skin>/…` by relative path.
- Generated Card code imports `@scope/core` and `@scope/dashboard` only through declared subpaths. The skin's entry imports its `tokens.css` once; Card generation does not duplicate that import.
- `new-card --skin <generated>` writes only inside that skin package plus its declared registration seams. Orb's and Field's existing generator behavior, flags and output stay unchanged unless the package format forces a documented change.
- Package locations and import specifiers are not scattered through the generator bodies. Adding a package or moving a skin is a change to one package map, not a search-and-replace; a check fails if a generator reintroduces a hard-coded package path.
- Registrations target declared seams — a marker, a small registry, or a dedicated registration file — not incidental prose or an unrelated import. An unrelated line moving in a package-owned file does not break a dry run.
- The dry run and the all-or-nothing write transaction survive, and every failure names the package and path it could not use.
- Tests cover the generator and the package boundary without a new runner: dry runs against the repo for every anchor, a real run in a temporary copy with `npm install`, typecheck, lint, both conformance tests and the generated skin's package resolution, plus the existing Orb and Field generator runs.
- No visual, CSS, story, YAML or card behavior changes.

## Standard

`codebase-design`; `AGENTS.md` → Layout, Commands, Adding a skin and Adding an existing domain to another skin; `docs/skins.md`; the C5 row and follow-up map in `docs/research/2026-10-29-monorepo-readiness.md`. When the brief and the code disagree, the code wins; report the difference.

## Evidence

- `scripts/new-card/index.mjs:23` fixes `SKIN = "src/skins/orb"`; `:99` joins `packages/core/src/demo/index.ts`; `:115-129` edits `packages/core/src/index.ts`, `ha/headless.tsx` and the fixture test; `:168-184` edits Orb's Lovelace config, renderer, `auto.ts` and `docs/deploy.md`.
- `scripts/new-card/lib.mjs:6-7` fixes `root` and `templates`; `:43` hard-codes `src/skins/orb/lovelace/config.ts` in `ORB_CONFIG`; `:49` is `orbKinds()`.
- `scripts/new-card/field.mjs:20-21` fixes Orb and Field paths; `generated.mjs:39-45` fixes `src/skins/<skin>` and its registry, and `:68-80` reads Orb's demo seeds by path.
- `scripts/new-skin/index.mjs:32-39` fixes `src/skins/<skin>`, `docs/<skin>.md`, `.storybook/preview.tsx` and `apps/lovelace/entry.ts`; `:54-75` creates the skin and edits Storybook, the Lovelace entry, `scripts/generated-skins.mjs` and `docs/deploy.md`. It creates no package manifest.
- Measured: `find src/skins -maxdepth 2 -name package.json` returns nothing. Root `package.json` has `workspaces: ["packages/*"]`. `apps/lovelace/entry.ts` imports `../../src/skins/<skin>/styles/tokens.css` and `../../src/skins/<skin>/lovelace/card`; `.storybook/preview.tsx` imports each skin's `storybook` by relative path.
- `scripts/new-card/index.test.ts` and `scripts/new-skin/index.test.ts` copy the repo and assert the current anchors; `verify/boundaries.test.ts` and `verify/dashboard-package.test.ts` hold the existing import boundaries.
- `docs/skins.md` calls a generated skin "first-class" and lists its manifest-free surface; `AGENTS.md` → Layout and Adding a skin describe the same tree.

## Scope

In scope: the generator package map, the generated skin's manifest/exports/workspace registration, the consumers that must use its package surface, the registration seams the generators edit, and the tests/docs for those.

Out of scope here:

- C5c: publishing, versioning, npm release configuration and CI.
- The monorepo rename and the move of Orb/Field from `src/skins/` to `skins/`; do not migrate the two reference skins to packages as part of this cut.
- C6: extracting the shared card contract, schema or layout into `@scope/dashboard`; a generated skin may keep what it copies today.
- Any visual, CSS, story, YAML or card behavior change; bespoke design of generated Cards.
- The deploy CLI (`@scope/deploy`), which C5 completed.
- The PII/history sweep.

## Escalation

- If making a generated skin a workspace package requires changing the root workspace layout in a way that moves Orb/Field or overlaps C5c, stop with the measured options and the diff you propose; do not invent a second layout.
- If the package map's `@scope/dashboard/cli` home conflicts with keeping the generators repo tooling, report the difference and the smallest seam that satisfies both; do not add a fourth package.
- If a generator flag or generated public name must change, stop with the options and the compatibility cost.
- If a generated skin cannot typecheck or resolve without a per-package build configuration, say exactly which and stop before adding one.

## Finish line

- On a branch from `0950c35`, in a temporary copy: `npm run new-skin -- canvas` creates a linked workspace package; `npm install` succeeds; `npm run new-card -- light --skin canvas` adds a Card; `npm run check`, `npm run build:ha` and the generator tests pass. A package-specifier import of the generated skin resolves, and its Lovelace card registers.
- `npm run new-skin -- canvas --dry-run` writes nothing and lists the package and registrations; `npm run new-card -- fan --code fn --domain fan --dry-run` still lists Orb's registrations.
- Hand back: the package/entry layout and generator surface, what moved out of path literals, any behavior or config delta (expected none), the gate output, the generated-skin smoke result, what C5c still owns, and any difference from the package map.
