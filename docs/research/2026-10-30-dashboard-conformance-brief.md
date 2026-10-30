# Brief: the public conformance preset

## Outcome

A skin outside this repo can install `@dashhaus/dashboard` and run its generic card-conformance checks from a declared `conformance` subpath against its own cards; orb and field keep their repo-only assertions in `verify/` and use the same preset for the generic ones; the `card` and `schema` surfaces the preset asserts are written down as the 1.0 third-party contract.

## Parameters

- Repo: `/home/operator/Projects/dashhaus`. Base `main` at `7523e5a`. Work on a new branch, commit there, and leave `main` untouched; do not push, merge, tag or publish.
- Read `docs/research/2026-10-29-monorepo-readiness.md` → The map, Internal boundaries carry the design, C6 and Tradeoffs accepted before designing the API. The code wins over that sketch; report a different API instead of forcing the note's route.
- Keep the repo's existing test runner and linter; add none. Node measured: 26.6.0; the deploy package's floor is 22.
- `@dashhaus/dashboard/vite` is not part of this cut. No consumer exists and deploy's build ownership stays with the config; report a demonstrated need instead of inventing one.
- Versions stay `0.1.0`; publishing and the npm scope are out.

## Bar

- `@dashhaus/dashboard` declares `./conformance` in the same source-plus-dist export shape as its other subpaths; `npm run build:packages` emits it; the packed tarball ships it with no test or story files.
- The preset is generic: it reads a skin's cards directory and declarations that skin supplies (at minimum a story title prefix and its class-prefix rule; the exact API is yours), never this repo's paths, `AGENTS.md`, `docs/*`, `.storybook/preview.tsx`, the Lovelace config or Home Assistant files.
- Orb and field both call the preset for the generic checks. Their repo-specific assertions — standard files, exports, docs, Storybook order, Design rules, Lovelace wiring, the Home Assistant slice — stay in `verify/orb-conformance.test.ts` and `verify/field-conformance.test.ts`, proving what they prove today.
- A third-party proof runs outside the workspace: a temporary skin with one conforming and one non-conforming card installs the packed dashboard tarball, imports `@dashhaus/dashboard/conformance`, and fails only the non-conforming card with a named rule. Put it in a `verify/` fixture or a temp-copy test; it runs in `npm run check` with no new runner.
- If the preset imports Vitest, declare it as an optional peer with the same pattern as `@dashhaus/core/testing`, and prove the packed install still behaves as that peer promises.
- `card` and `schema` are documented as the 1.0 third-party contract in one current-facing doc linked from `docs/release.md` and `AGENTS.md`: what a skin may rely on, what is a per-kind escape hatch, and what is not stable yet. `docs/release.md` stops calling `conformance` a future subpath; state `vite`'s disposition.
- No visual, CSS, story, YAML, card, schema or Home Assistant behavior changes; no new package, test runner, linter or CI lane.
- Gates: `npm run check`, `npm run test:generators`, `npm run build:ha`, `npm run test-storybook`, `npm run release:pack` and `npm run verify:packages` pass. `verify/*-package.test.ts` and `verify/release-packages.test.ts` stay true and gain the new subpath wherever their lists assert exports or subpaths.

## Standard

`codebase-design`; `AGENTS.md` → Layout and Commands; `docs/release.md`; the readiness note's "Internal boundaries carry the design" and "Frozen contracts"; `packages/core/src/testing.tsx` and its optional `vitest` peer as the precedent for a package's dev subpath.

## Evidence

- `verify/conformance.ts` (33 lines) exports `read`, `exists`, `object`, `cardFolders` and `strayClasses`, all resolving from `process.cwd()`; only the two conformance tests import it.
- `verify/orb-conformance.test.ts` and `verify/field-conformance.test.ts` mix generic checks (card files, class prefixes, unique codes) with repo assertions (AGENTS prefix list, docs, Storybook order, Design rules MDX, Lovelace kind tables, HA files).
- `packages/dashboard/package.json` exports `.`, `./card`, `./schema`, `./layout`, `./cli`; `files: ["dist"]`; `packages/dashboard/tsconfig.build.json` includes `src` and excludes `*.test.*`, so a new `src/conformance.ts` reaches `dist` without config changes.
- `packages/core/package.json` declares `vitest` and `@testing-library/react` as optional peers for `./testing`; that is the precedent if the preset needs Vitest.
- `docs/release.md` → Differences from the readiness note: "`dashboard/vite` and `dashboard/conformance` ... do not exist yet; they arrive with later cuts."
- Readiness → The map: "`dashboard/conformance` exports the generic checks with `{ skin, cardsDir, storyPrefix }`; the repo's AGENTS/docs/index assertions and the `src/ha` path checks stay in `verify/` or become `@scope/core` export assertions."

## Scope

Out of scope here:

- `@dashhaus/dashboard/vite` and any build integration; deploy's build ownership stays with the config.
- Publishing, tagging, claiming the npm scope, the PII/history rewrite, reference-skin packaging, per-package `tsconfig`/Vitest projects.
- Moving repo-only assertions into the package, or weakening them to fit a generic API.
- Card, schema and layout behavior; visuals, CSS, stories, YAML, the Home Assistant slice and entity models.
- A new test runner, linter, package or CI lane.

## Escalation

- If the generic and repo-specific checks cannot split without changing what orb or field prove, stop with the proposed split and the assertions you would move.
- If the preset cannot be packed or imported without a per-package build config or a mandatory Vitest dependency, say exactly which and stop before adding it.
- If `card` or `schema` has no stable surface worth freezing, or the exercise exposes a contract change, report the finding rather than freezing a wrong contract.

## Finish line

- A branch from `7523e5a` where the packed third-party proof runs, every gate above passes, and the non-conforming fixture fails only its own rule.
- Hand back: the preset API and what it reads; what stayed in `verify/`; the contract doc path and headings; the tarball size and `verify:packages` output; `vite`'s disposition; and every difference from the readiness map or `docs/release.md`.
