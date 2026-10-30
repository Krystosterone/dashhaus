# Brief: root tooling config

## Outcome

Move the tooling configs named in `TODOS.md` out of the repository root into folders, with every command, CI job, generator temp copy, packed install, deploy build and editor workflow behaving as it does today. Any file whose tool can only discover it at the root is reported with evidence instead of being faked.

## Parameters

- Repo: `/home/operator/Projects/dashhaus`; `main` at `0e04bea`. This brief is committed on `chore/root-config`, checked out at `/home/operator/Projects/dashhaus-root-config`; implement on that branch and do not merge.
- Node 22 floor from `.nvmrc`; npm pinned by root `packageManager` (`npm@11.18.0`). The local machine runs Node 26.6.0.
- `TODOS.md` item: “Hide ugly tooling config at the repo root inside folders (`eslint.config.js`, `tsconfig.json`, `vite*.config.ts`, `vitest.config.ts`, `test-runner-jest.config.js`, `skills-lock.json`).”
- The named set is `eslint.config.js`, `tsconfig.json`, `vite.config.ts`, `vite.lovelace.config.ts`, `vitest.config.ts`, `test-runner-jest.config.js` and `skills-lock.json`. `tsconfig.base.json` and `vitest.projects.ts` exist only to serve those and move with them.
- Stay at root: `package.json`, `package-lock.json`, `dashboard.config.mjs` (the operator's deploy config, not tooling), `.nvmrc`, `.gitignore`, `.env.example`, `AGENTS.md`, `README.md` and `TODOS.md`.
- Keep the existing tools and versions. Add no runner, linter, config format or plugin.

## Bar

1. Root: none of the named configs sits at the root. No root re-export, symlink or loader shim that leaves the file there; a root-bound file is a reported blocker, never a duplicate.
2. The gate keeps its coverage and its result: `npm run check` (typecheck, lint, test), `npm run test:generators`, `npm run build:ha`, `npm run test-storybook` and `npm run release:check` pass, with identical lint problems and test/story/axe/conformance counts.
3. Every tool still finds what it needs:
   - `npm run lint` lints the same files with the same rules; ESLint 9.39.5 accepts `-c, --config <path>`.
   - `npm run typecheck` checks the root program plus the three package programs; no emit.
   - `npm run test` runs the same four Vitest projects with the same files.
   - Storybook 8.6.14's builder-vite loads the Vite config from the CWD and accepts `viteConfigPath`; point it at the moved file and keep the `source` condition.
   - `@storybook/test-runner` 0.21.3 looks for `test-runner-jest*` in `STORYBOOK_CONFIG_DIR` (set by `--config-dir`) and then the project root; pass the Storybook config dir from `scripts/test-storybook.mjs` so the custom config still applies.
   - `vite.lovelace.config.ts` is the deploy build's config, named in `dashboard.config.mjs` and `docs/deploy.md`; update both and prove `npm run build:ha` and the deploy build emit the same `dist/home-dashboard.js`. Vite resolves `root` from the CWD, not the config file, so the command must keep running from the repo root.
4. The generator temp-copy tests run `npx eslint` and `npx vitest` inside a copied repo (`scripts/new-card/index.test.ts`, `scripts/new-skin/index.test.ts`); they must find the moved configs or pass them explicitly. Do not drop or narrow their checks.
5. `skills-lock.json` is read by `skills@1.7.4`, downloaded by `npx` (not a dependency), as `join(process.cwd(), "skills-lock.json")`; it exposes no config-path flag. `npx skills update` and `npx skills experimental_install` must keep working. If the CLI cannot be pointed elsewhere, leave the lock at root and record the blocker with command evidence.
6. Editor type checking and linting work as they do today, or the required editor setting is documented and verified. Do not silently break the IDE.
7. Update the repo's own guards and prose: `verify/projects.test.ts` must still pin the root program, the shared base and the typecheck script at their new paths; update `AGENTS.md` → Commands/Layout, `docs/release.md` (the `tsconfig.base.json` sentence), `docs/deploy.md` (the build snippet) and `TODOS.md`. The speedups item's future ESLint cache key must name the new config path.
8. No product, visual, CSS, card, story, YAML, schema, package-surface or deploy-behavior change. Config locations and the commands that point at them only.

## Standard

`AGENTS.md` → Commands, Verifying changes and Hard rules; `codebase-design` (one obvious way to run each tool); the repo's one-shot gate.

## Evidence

Observed on `main` at `0e04bea`, 2026-10-30:

- Root configs: `eslint.config.js` (12.6K), `tsconfig.json` (117B, extends `./tsconfig.base.json`, includes `src`, `apps`, `verify`, `.storybook`, `scripts/*/*.test.ts`), `tsconfig.base.json`, `vite.config.ts` (Storybook's React plugin and `source` condition), `vite.lovelace.config.ts` (the `dist/home-dashboard.js` build), `vitest.config.ts` (four projects, data in `vitest.projects.ts`), `test-runner-jest.config.js`, `skills-lock.json`.
- `package.json`: `typecheck` is `tsc --noEmit && tsc --noEmit -p packages/{core,dashboard,deploy}/tsconfig.json`; `lint` is `eslint .`; `build:ha` is `vite build -c vite.lovelace.config.ts`; `test-storybook` is `storybook build && node scripts/test-storybook.mjs`.
- `verify/projects.test.ts` pins `tsconfig.json`'s `extends`, the packages' `../../tsconfig.base.json`, the typecheck script's `-p packages/...` and its `startsWith("tsc --noEmit")`, imports `../vitest.projects`, and pins the project names, includes and environments. It is the guard to update, not delete.
- `dashboard.config.mjs:23` and `docs/deploy.md:29` run `npx vite build -c vite.lovelace.config.ts` with the config's directory as cwd.
- `scripts/new-card/index.test.ts:108,110` and `scripts/new-skin/index.test.ts:129,131,173,175` run `npx vitest` / `npx eslint` inside temp copies, bypassing the package scripts.
- ESLint 9.39.5's help lists `-c, --config path` and `--no-config-lookup`.
- `@storybook/builder-vite@8.6.14` reads `viteConfigPath` and otherwise looks for the Vite config in the CWD; its types declare the option. `@storybook/test-runner@0.21.3` globs `test-runner-jest*` in `STORYBOOK_CONFIG_DIR` and then `test-runner-jest*` in the CWD, and its README documents putting the file inside the Storybook config dir with `--config-dir`.
- `skills@1.7.4`'s packed CLI defines `LOCAL_LOCK_FILE = "skills-lock.json"` and `getLocalLockPath(cwd) { return join(cwd || process.cwd(), LOCAL_LOCK_FILE); }`; the only related flag is `-p, --project` (“update project skills only”), not a directory. `npx --no-install skills --help` failed because the package is not installed; the 1.7.4 tarball was packed and read instead.

## Scope

Out of scope here:

- Changing lint rules, TypeScript options, Vitest projects/includes/environments, Storybook addons or configuration, Vite build semantics, or the deploy CLI's behavior.
- Moving `dashboard.config.mjs`, `package.json`, `package-lock.json`, `.nvmrc`, dotfiles, docs or `scripts/` themselves.
- The other `TODOS.md` items (speedups, CI enforcement, PII, release), except where they name a path this move changes.
- Publishing, tags, releases, visual or API changes.

## Escalation

- Check discovery before editing. If a tool only reads its config from the repo root (the TypeScript language service is the likely case; `skills@1.7.4` is the likely case for the lock), stop before removing that file and report the tool, version, command and options. Do not add a second copy, symlink or fake loader to claim the root is clean.
- If editor type checking or linting would break with no documented setting, report it before choosing; do not accept the regression silently.
- If `viteConfigPath` or `--config-dir` changes what Storybook builds or tests (stories, conditions, custom config), report the difference and stop before calling it a move.
- If lint problems, test counts, story counts or build output change, report the diff; a pure move is a diff-free result.
- Before merging, pushing to a shared branch, or changing any CI command, ask the operator.

## Finish line

- On `chore/root-config`, the named configs live under the chosen folders, or each blocked file has a recorded reason and evidence; `npm run check`, `npm run test:generators`, `npm run build:ha`, `npm run test-storybook` and `npm run release:check` pass; the generator temp-copy checks still lint and test.
- Hand back: the final tree (file → new path or blocker), the commands run and their counts/output, the Storybook/test-runner/editor wiring, every doc and test updated, and any operator decision left open.
