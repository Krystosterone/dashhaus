# Dashhaus gate speedups: measured evidence

Two passes over the same repository:

- **First pass**: `TODOS.md` lines 14–21 at commit `8eabbc1` (merge of PR #6 from
  `perf/gate-speedups`), plus the agent session transcript of that work, kept locally by the operator (its PR
  summary at the end of the branch work and the final merge summary).
- **Second pass**: PR #20 (`ci/faster-checks`, commit `f746da6`, based on
  `0058687`), measured in a Claude Code cloud session on 2026-11-02. See
  § Second pass at the end. Some first-pass statements are corrected there.

This is the complete record behind the numbers in `SKILL.md`. Do not copy
these numbers to another repository; reproduce the measurement there.

## Environments

| Label | Details |
|---|---|
| Local | Node 26.6.0, 8-core arm64 macOS (`darwin 25.6.0`), warm caches unless stated |
| Sandbox | Node 22.23.4, 2-core x86_64 Linux, 7 GB; Playwright's CDN blocked, so the runner used `DASHHAUS_CHROMIUM=/usr/bin/google-chrome` (second pass) |
| CI | `ubuntu-latest`, 2-core runner, Node 22 from `.nvmrc`, npm 11.18.0 via Corepack |

The local gate is `npm run check` = `npm run typecheck && npm run lint && npm run test`.
`npm test` is `vitest run --config config/vitest.config.ts --maxWorkers=6`
(a fixed cap; six of the eight local cores).

Two local readings exist because machine load differed: 35.1s quiet and 41.4s
loaded. Report both rather than picking one. CI baselines used a cache miss;
the final runs used a warm `node_modules` cache.

## Gate totals

| Command | Before | After |
|---|---|---|
| `npm run check` | 67.4s | 35.1s quiet / 41.4s loaded |
| `npm run typecheck` | 2.35s | 1.21s |
| `npm run lint` | not separately recorded at baseline | 0.6s warm |
| `vitest run` (all projects) | 56s | 33–42s warm; 34–41s in the PR summary |
| `npm run test:generators` | 55.7s | 21s |
| `npm run test-storybook` | 75.9s | 36.5s |
| Storybook runner alone | 69.8s | 30.2s |

Those are three different baselines, not three values for one experiment:

- 56s is the PR summary's whole-suite before/after for `vitest run`.
- 44–46s → 33s is the project-split measurement alone (§ jsdom vs Node).
- 43.6s → 34–36s is the worker sweep on one tree (§ worker oversubscription).

Later runs span 33–42s depending on load, so the honest claim is the range,
not a single number.

## Wall-clock waits: Storybook alarms

Field's alarm flash is a 1-second animation repeated ten times. The runner's
`postVisit` awaited every finite animation, so 13 smoke tests paid ~10.3s each.

Fix: finish finite animations whose computed `activeDuration` exceeds 1,000ms
at their final state, then await the remaining finite animations; skip infinite
animations because they never finish.

| Suite | Before | After |
|---|---|---|
| field owlet | 67.8s | 9.2s |
| field Alerts | 31.3s | 2.1s |
| field AlarmModule | 19.2s | 9.4s |
| field Examples | 15.0s | 3.6s |
| field FieldDashboard | 13.8s | 6.5s |

Stories taking ≥2s: 13 (about 10.3s each) → 1 (orb WorstCase 3.1s, 3.0s before).
Counts stayed 57 suites / 406 story tests (one test per story), every axe rule
still enabled.

The five suite walls above are concurrent, so their sum (147.1s before,
30.8s after) can exceed the runner wall; field owlet, at 67.8s, was the
critical path. Read the suite rows as the per-suite effect, not as addends to
the runner total.

External check: an independent Playwright probe confirmed the long animation
was the wait; a filtered story index and `--no-cache` ruled out Jest cache and
suite selection as causes before the runner edit.

## Repeated setup/install: generator suites

Before: each generator test copied the repo and ran `npm install` inside the
copy (two installs per copy for the skin tests), then typechecked and linted the
whole copy. Three suites, 55.7s local.

Fix:

- Copy the source tree without `node_modules`, `.git`, `dist`,
  `storybook-static`, `.agents`, `.claude`, or `research`.
- Link every repo dependency into the copy's `node_modules`, link the copy's
  workspace packages and generated skins under `@dashhaus`, so resolution works
  without installing the dependency tree.
- Run one `npm install --package-lock-only --ignore-scripts --no-audit
  --no-fund --prefer-offline` per copy: npm's own proof that the generated skin
  joined the workspace (`link: true` in the lock).
- Typecheck only the root and core programs inside the copy; the dashboard and
  deploy copies are byte-identical to the repo's.
- Run the copy's checks serially: the copy is a serial chain, so parallel
  checks inside it only contend.

| Measurement | Before | After |
|---|---|---|
| Three generator suites, local | 55.7s | 21s |
| Generator job, CI | 3m51s (45s `npm ci` + 186s tests, cold install) | two jobs at 1m46s + 1m12s (warm cache) |
| Tests | 15 | 15 |

An intermediate single-runner measurement after the repo-copy refactor was
157s; the lane was then split across two runners. The 1m46s and 1m12s figures
are the final job walls in run `41162790033`, with the cache warm. Compare the
3m51s baseline with those job walls only with the cold-install difference
stated.

The suites split into three files: `new-card` (canvas/card copies),
`new-skin/index` (dry run plus canvas copy), and `new-skin/field` (Field
reconstruction). CI runs the first two on one runner and the third on another.

## jsdom vs Node queueing

`verify/` was queued behind the app's jsdom files even though most of it only
reads data. Fix: a `checks` Vitest project with `environment: "node"` for
`verify/**` except `tokens.test.ts`; a `generators` project with
`environment: "node"`; the app and packages keep jsdom.

| Measurement | Before | After |
|---|---|---|
| `vitest run` | 44–46s | 33s |

`tokens.test.ts` must stay in jsdom: importing the custom-element entry throws
on `HTMLElement` in Node. This is the measured exception, not a preference.

## Worker oversubscription

Sweep on the 8-core local machine:

| Workers | Wall |
|---|---|
| Default pool | 43.6s |
| 6 (75%, repo's `--maxWorkers=6`) | 34–36s |
| 5 | 41s |

Above six workers, the generator copies and the app's jsdom files starve one
another. On a 2-core CI runner, Vitest already selects one worker for the
generator suites; forcing `--maxWorkers=1` locally cost 10s, so it was rejected.
CI unit shards and Storybook shards use `--maxWorkers=2`, one per core.

## Serial compilers

Six independent `tsc` programs (root, core, dashboard, deploy, orb, field) ran
one after another. Fix: spawn them in parallel, each with its own
`--incremental` state under `node_modules/.cache/tsc/<program>.tsbuildinfo`.

| Measurement | Before | After |
|---|---|---|
| Local typecheck, warm | 2.35s | 1.21s |
| CI typecheck step, cache restored | 10s | 7s |

Lint keeps `--cache --cache-location node_modules/.cache/eslint/.eslintcache`;
the warm local lint is 0.6s.

## CI orchestration and caching

Baseline run `41151381926`: workflow 4m56s. Jobs: `unit` 4m45s (typecheck 10s,
lint 11s, tests 160s, `npm ci` 57s), `generators` 3m51s (`npm ci` 45s, tests
186s), `storybook_one` 4m48s (`npm ci` 59s, Chromium 29s, runner 181s),
`storybook_two` 4m10s (`npm ci` 47s, Chromium 17s, runner 170s).

Changes:

- Restore `node_modules` from an Actions cache keyed on `.nvmrc`, the lockfile,
  the root manifest and every workspace/skin manifest; run `npm ci` only on a
  miss. TypeScript and ESLint caches live inside `node_modules`, so they travel
  with it. **Corrected in the second pass:** `actions/cache` saves only on a key
  miss, so the tool caches were frozen at the last manifest change, and ESLint's
  default metadata strategy invalidated every file on a fresh checkout anyway.
- Split independent work across jobs: `unit_checks` (typecheck, lint,
  `build:ha`, `release:pack`, `verify:packages`), `unit_one`/`unit_two`
  (`--shard=N/2 --maxWorkers=2`), `generators_one`/`generators_two`, `dx`
  (clean-room consumer journeys), and two Storybook shards.
- Keep `check` as the required aggregate over six lanes and `storybook` over
  both shards. No path filters.
- Do not shard the Storybook build separately: `test:storybook` builds the
  static site and then runs the runner.

| Measurement | Before | After |
|---|---|---|
| Workflow wall | 4m56s | 2m36s (`41162790033`) and 2m40s (`41163073383`) |
| `npm ci` per job | 45–60s | ~2s cache restore when hit |
| Storybook shard runner (before `41151381926`, after `41162790033`) | 181s / 170s | 119s / 78s |
| Shard job walls (same runs) | 4m48s / 4m10s | 2m28s / 1m48s |

Both after-numbers come from run `41162790033` (workflow 2m36s): shard two ran
119s inside a 2m28s job (28 suites/198 tests), shard one 78s inside a 1m48s job
(29 suites/208 tests). The after-state includes the animation fix and
`--maxWorkers=2`; on one worker the same shards took 128–160s each across the
preceding CI runs (the record does not name a single run for that range). Use the local
per-suite table for the animation effect and the local worker sweep for the
worker effect; do not read the shard numbers as a single-change experiment.

Final job walls on `41162790033`: `storybook_two` 2m28s, `storybook_one` 1m48s,
`generators_one` 1m46s, `generators_two` 1m12s, `unit_two` 1m33s, `unit_checks`
1m19s, `unit_one` 54s, aggregates 3s. On the tip push `41163073383` (2m40s):
`storybook_two` 2m31s, `storybook_one` 1m50s, `generators_two` 1m40s,
`generators_one` 1m04s, `unit_two` 1m29s, `unit_one` 1m23s, `unit_checks` 57s,
aggregates 3–4s.

The PR's own run at the same commit took 3m19s because the push run and the PR
run executed simultaneously (`41163076001`); it is not a regression. The merge
run `41215652838` took 3m53s because Actions caches are branch-scoped: `main`
had no cache, so every job paid `npm ci` (45–60s) and saved the cache the next
`main` run restores in ~2s. The merge run was green.

## Counts and coverage

| Gate | Count |
|---|---|
| Unit tests | 131 files / 1178 tests (shards: 66 files/529 tests + 65 files/649 tests) |
| Generator tests | 3 files / 15 tests |
| Combined unit + generators | 134 files / 1193 tests |
| Storybook | 57 suites / 406 tests (29/208 + 28/198) |
| Axe | every rule still runs; `runOnly` is `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`; `label-content-name-mismatch` stays disabled because axe's experimental rule demands the visible text appear verbatim in the accessible name, while the repo builds richer names from the same data and the visible information was verified present case by case |

Every story and axe rule runs on every push and pull request. `npm run check`
remains the one-shot local gate. The perf tests from `packages/core` need a
Storage shim on Node 26 because Node's built-in `localStorage` shadows jsdom's
and leaves `window.localStorage` undefined; this was a test-environment fix,
not a gate exemption.

Note: the CI workflow comment still says "130 files and 1174 tests"; the
recorded acceptance counts are the 131/1178 + 15 above. Prefer the recorded
counts and the runner's own output.

## Rejected by measurement

| Option | Result | Why |
|---|---|---|
| Merge the three generator suites into one file | 54.7s vs 43s | The copies still serialize; one file just removes parallelism |
| Top-level concurrent `check`: start typecheck and lint beside Vitest | 53s vs 41s | They contend for the same cores |
| `--maxWorkers=1` for `test:generators` locally | 10s slower | Vitest already picks one worker on a 2-core CI runner; locally it removes parallelism |
| Move all of `verify/` to Node, including `tokens.test.ts` | Import throws on `HTMLElement` | The custom-element entry needs a DOM; keep that one file in jsdom |
| Emulate reduced motion in the Storybook runner | Not adopted | It would test the reduced-motion variant and could miss contrast in the animated state; finishing the animation keeps the measured final state |

## Links

The repository was deleted and recreated on 2026-11-01, so PR #6 and
the first-pass runs below no longer resolve; their numbers stand as recorded. The second pass's PR and runs are in
the current repository.

- PR #6: `https://github.com/Krystosterone/dashhaus/pull/6`, merged as `8eabbc1`.
- Green tip push: `https://github.com/Krystosterone/dashhaus/actions/runs/41163073383` (2m40s).
- Green shard run: `https://github.com/Krystosterone/dashhaus/actions/runs/41162790033` (2m36s).
- Merge run: `https://github.com/Krystosterone/dashhaus/actions/runs/41215652838` (3m53s, cold cache).
- PR #20: `https://github.com/Krystosterone/dashhaus/pull/20`.
- Baseline runs: `https://github.com/Krystosterone/dashhaus/actions/runs/41549857937` (push, `0058687`) and
  `https://github.com/Krystosterone/dashhaus/actions/runs/41549842893` (pull request).
- Change, cold: `https://github.com/Krystosterone/dashhaus/actions/runs/41563819917`.
## Second pass (PR #20)

Baseline: `main` at `0058687`, CI runs `41549857937` (push) and `41549842893`
(pull request), workflow ~3m30s, 11 jobs. Change: `f746da6`. Green runs
`41563819917` (cold: manifests changed, so `npm ci` everywhere and no tool
cache) and the warm rerun on an empty commit. The last push was not started by
GitHub (account billing), so the final two-shard generator layout is measured
locally only.

### Vitest pools: jsdom loaded per file

Sandbox, `test:unit` (`--exclude "scripts/**"`), `--maxWorkers=2`, 185 files /
1500 tests (1499 passed, 1 skipped):

| Pool | Wall | `environment` | Result |
|---|---|---|---|
| `forks` (default, before) | 145s | 125s | pass |
| `threads` | 145s | 126s | 2 failures in `packages/deploy` (cwd-dependent) |
| `forks --no-isolate` | — | — | 183 failures: mocks and module state leak between files |
| `threads --no-isolate` | — | — | 209 failures |
| `vmThreads` | 47s | 3s | the same 2 deploy failures |
| `vmForks` (adopted) | 55s | 4s | pass |

Sum of per-file test durations was 70s against a 145s wall: the time was outside
the tests. `require("jsdom")` took 622ms and `new JSDOM()` 7ms after the first,
so the cost was loading jsdom once per file, not building a document. The
generators project stays on `forks`: it spawns the repo's tools.

CI unit lane: two shards of 77–147s → one job, 99s cold / 74s warm (64s step).

### Storybook runner hook

Instrumented `postVisit` over 47 stories (sandbox, 2 workers), mean ms per story:

| Phase | Before | After |
|---|---|---|
| Animation settle | 32 | 25 |
| Field overflow check | 9 | 8 |
| `injectAxe` | 125 | 3 (only when `window.axe` is absent) |
| `axe.run` | 321 | 251 (`resultTypes: ["violations"]`) |

Subset wall 30 → 24s. Full runner, 549 stories / 87 suites: 290s before; full
`npm run test-storybook` including the build 312s → 246s. Probe: a story with an
unnamed button and grey-on-grey text failed with `button-name` (critical) and
`color-contrast` (serious) after the change; the second story in the same page,
which reused the injected axe, passed.

`storybook build --test`: 22 → 12s; `index.json` 549 stories before and after,
docs entries 6 → 0. The MDX pages are still compiled by the Docs workflow's
`build:docs`, which is **not** a required check: under the guardrails this is an
open coverage question (see Open below).

CI shards: 164s / 119s runner (before) → 116s / 64s warm; shard jobs 198–202s /
163–173s → 132s / 76s warm.

### CI caches and setup

| Measurement | Before | After |
|---|---|---|
| Setup per job (install, caches) | 16–30s (node_modules hit) | 5–10s warm; 16–29s cold |
| Typecheck step | 43–53s | 40s cold tool cache, 17s warm |
| Lint step | 12–14s | under 3s warm |
| Chromium install | 13–32s (`--with-deps`, apt) | cached headless shell, no apt |
| `release:pack` + `verify:packages` | in two lanes (45–55s each) | once, in `dx` |
| `dx` job | 121–125s | 66s warm |
| `checks` job (was `unit_checks`) | 112–159s | 82s cold, 37s warm |

The tool cache is its own entry: `node_modules/.cache`, key per commit, prefix
restore keys, saved only by `checks`; the generator lanes use
`actions/cache/restore`. ESLint switched to `--cache-strategy content` (the repo
has no type-aware rules, so a file's lint result depends only on its content and
the config). npm's download cache is restored only on a `node_modules` miss.

### Generator lanes

| Layout | Wall |
|---|---|
| Two lanes (before): new-skin + new-card / field | 106–158s / 66–108s |
| One lane, `--maxWorkers=3` | 134s cold, 173s warm job (158s step): the slowest job |
| Two lanes (after): new-skin alone / new-card + field at `--maxWorkers=2` | 65s / 75s local sandbox |

Locally three copies on two cores were 131s serial → 97s parallel; CI did not
reproduce it. Inside a copy the largest steps were `storybook build` (22–25s),
root `tsc` (6–12s) and the copy's own Vitest run (6–9s).

The copies symlinked `node_modules/.cache` from the repo, so every copy wrote its
`root.tsbuildinfo` into the repo's cache and, when suites ran side by side, over
each other's. Fixed by skipping `.cache` when linking and copying a snapshot of
`.cache/tsc` into each copy.

### Counts (second pass)

| Gate | Count |
|---|---|
| Unit | 185 files / 1500 tests (1499 passed, 1 skipped) |
| Unit + generators | 188 files / 1515 tests |
| Storybook | 87 suites / 549 stories |
| Axe | unchanged: `runOnly` `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`; `label-content-name-mismatch` disabled |

### Rejected or reverted (second pass)

| Option | Result | Why |
|---|---|---|
| `--no-isolate` | 183–209 failures | Mocks and module state leak across files |
| `threads` / `vmThreads` | 2 deploy failures | Those tests depend on the process's cwd |
| One generator lane at `--maxWorkers=3` | 173s, the slowest CI job | Local oversubscription win did not hold on CI; split back to two lanes |
| Parallel `npm run check` (`scripts/check.js`, side by side on 4+ cores) | 8-core Mac, warm, four alternating rounds: 49–67s (mean 58s) vs 48–63s (mean 56s) sequential | No faster than sequential: warm typecheck is ~3s and lint ~1s, so the tests are the gate. Dropped before merge, as the first pass also found |
| `storybook build --test` inside generator copies | Not adopted | The copies' builds prove a generated study's MDX page compiles |
| Skip duplicate `pull_request` runs with `if:` | Not adopted | A later skipped job named like a required check can mask a failed push run |

### Settled before merge

- **Docs pages out of the Storybook lane.** With `--test`, the CI Storybook lane no
  longer compiles the six MDX pages; the Docs workflow's `build:docs` still builds
  them in full on every pull request and every push to main, with no path filter.
  The repository is private on a plan with no branch protection, so no check is
  required in GitHub's sense and neither lane outranks the other: a failed MDX page
  still turns the pull request red. `--test` stays. If checks ever become
  required, require Docs `build` alongside the CI lanes.
