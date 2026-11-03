---
name: test-speed
description: "Finds and fixes a slow test, check, or CI gate while keeping its coverage identical: baselines the wall clock, attributes it to a measured bottleneck, applies one change at a time, and verifies the same counts. Use when the local check or unit suite is slow, when CI takes too long or its jobs spend their time installing, when a Storybook or Playwright run spends seconds per story, when generator or integration tests reinstall dependencies or copy the repo, or when asked to speed up the gate. Don't use for machine-wide slowness or diagnostics (sysstats), writing new tests (tdd), reviewing tests (code-review), or profiling application or production-bundle performance."
---

# Test Speed

Make the gate faster without making it prove less. The gate is the command that
decides a change is good: `npm run check`, `vitest run`, a Storybook test-runner
lane, or a CI workflow. Speed is only real when a before/after measurement on
the same commit shows it and every count the gate produced still matches.

## Guardrails

These are not tradeable for seconds.

- **Identical counts.** Same test files, tests, stories, suites and axe rules
  before and after. Axe rules are the accessibility checks the runner
  executes; enumerate them from the Storybook runner config (`.storybook/test-runner.ts`
  here), where `runOnly` and `rules` live, not by counting violations. No
  skips, todos, retries, `.only`, or dropped assertions.
- **Counts are not the whole proof.** A faster mode can keep every count and
  still stop building or compiling something the gate used to prove: a test-mode
  build that skips docs pages, a lighter result set, a cache that answers instead
  of the tool. Name what the old path produced besides the counts and show that a
  *required* check still produces it. If it now lives only in an optional
  workflow, that is a coverage split.
- **Prove a detector still detects.** When a change touches how a check reports
  (result types, injection, filtering), add a throwaway probe that must fail, see
  it fail with the same message, then delete it.
- **No path filters.** Every file, story and rule runs on every push and pull
  request. A filter that hides a suite is a coverage split.
- **No coverage split.** Do not move work into a separate, optional, or
  coverage-only command. Every check stays inside the gate that requires it.
- **No new runner, framework, or linter.** Optimize the one you have. A different
  pool or mode of the same runner is fine.
- **One change at a time.** Re-measure after each change. Revert anything whose
  delta is inside run-to-run noise. In CI, land one cache, lane, or shard change
  per commit; if a workflow commit must change several lanes, attribute each
  through its own job's step times and record that they landed together.
- **Rejected stays rejected until re-measured where it lost.** Before trying an
  option, check the evidence's Rejected table. An option rejected on one machine
  may be retried only with a measurement on that same machine class; a win on a
  2-core box does not overturn a loss on an 8-core one.
- **Record what fails.** Keep rejected options with their numbers, not just the
  winner.
- **Keep required checks required.** Sharding is fine only when the aggregate
  check still requires every shard, and a test fails when a suite is in no shard.

## Workflow

1. **Freeze the comparison.** Locally, use one commit and one machine; in CI,
   use the baseline commit and the change commit. Take the repo's real gate
   command from `package.json` scripts or the CI workflow's required job.
   Record the environment: machine, core count, Node version, CI runner label,
   and whether caches were warm.
2. **Read what was already tried.** Open the evidence file's Rejected table and
   the repo's performance log. Do not re-propose a measured loss without a plan to
   re-measure it in the environment where it lost.
3. **Baseline four times.** Run once cold (caches cleared), then three times
   warm. Report the cold wall and the median of the three warm walls; your noise
   floor is the warm runs' max − min. If all three are identical, use 5% of the
   median or 1 second, whichever is larger.
4. **Attribute the wall clock.** Match the gate's own timing output to a row in
   the table below. Fix the largest measured bucket first, not the most familiar
   one. When a bucket is opaque (a test that shells out, a runner hook), time its
   phases with temporary instrumentation (§ Instrument the inside), then remove it.
5. **Change one thing.** Re-run the same command under the same conditions.
   Keep the change only if its delta is larger than the noise floor.
6. **Prove coverage.** Capture exact counts before and after: files, tests,
   stories and axe rules; add shard counts when CI shards, since a local run has
   none. List anything the old path built or compiled that the new one skips.
   A speedup with different counts is not a speedup.
7. **Verify in both places.** Cold and warm local runs, per-suite timings, then
   a CI baseline/change run pair with job times and cache state. After any lane
   change, recompute the critical path (§ CI lanes).
8. **Record.** Put the numbers and rejected options in the repo's TODO or
   performance log if one exists; otherwise report them in the final message
   and the commit body, and add them to a PR description when there is one.
   State where they went.

## Decision table

| Bottleneck signature | Fix | What to measure | Measured before → after (environment) |
|---|---|---|---|
| Vitest `environment` bucket is most of the wall (jsdom or happy-dom loaded per test file) | Run DOM projects in the `vmForks` pool: each file keeps its own module graph and globals, but the worker and its environment load once. Keep spawn-heavy projects (repo copies, CLIs) on `forks`. Check the environment's import cost first: `require("jsdom")` vs `new JSDOM()` | `Duration` buckets, the environment import time, every test still passing | `test:unit` 145 → 55s, `environment` 125 → 4s, 185 files / 1500 tests intact (Node 22, 2-core x86); CI unit 2 lanes of 77–147s → 1 lane at 74s. Rejected: `--no-isolate` (183 failures), `threads` and `vmThreads` (2 cwd-dependent failures) |
| A Storybook story pays a fixed per-story cost in the runner hook (axe injection, full axe results) | Inject axe only when `window.axe` is absent (the runner renders a file's stories in one page); pass `resultTypes: ["violations"]` | Per-phase hook timings (wait, layout checks, inject, axe), runner wall, a probe story that must fail | inject 125 → 3 ms/story, axe 321 → 251 ms/story; full runner ~290 → ~234s; probe with an unnamed button and low contrast still fails with both rules (2-core x86) |
| Storybook build is a large slice of the test lane | `storybook build --test` for the test lane (skips docs/MDX entries and docs addons). Only if a required check still builds the docs pages; count stories in `storybook-static/index.json` before and after | Build wall, story and docs entry counts in `index.json`, which check still compiles MDX | 22 → 12s; 549 stories unchanged, 6 docs entries dropped (2-core x86). Not used where a build exists to prove MDX compiles (generator copies) |
| A story or test spends seconds waiting on an animation, sleep, or timer | End finite animations longer than ~1s at their final state, then await only the remaining finite animations; turn fixed sleeps into a completion condition | Per-story and per-test durations, the runner wall, count of stories/tests ≥2s, suite/test totals | Storybook runner 69.8 → 30.2s; 13 stories at ~10.3s each → 1 (orb WorstCase 3.1s); 57 suites / 406 stories intact (Node 26.6.0, 8-core arm64) |
| Each test, worker, or generated copy repeats setup, install, or a repo copy | Copy source without `node_modules`; symlink the repo's dependency tree and the copy's workspace packages, **but give each copy its own tool cache** (seed it from a snapshot of the repo's); run one lockfile-only install per copy that records the generated package as a workspace link; prepare one copy per suite and reuse it across that suite's tests; run the copy's checks serially | `beforeAll`/setup time versus test time, install count and seconds, per-subprocess time inside the copy, copy size, suite wall, test count | Local suites 55.7 → 21s for 15 tests; CI generator job 3m51 (cold install) → two jobs at 1m46 + 1m12 (warm cache) (Node 26.6.0 8-core; ubuntu-latest 2-core). Inside a copy: Storybook build 22–25s and root `tsc` 12s are the largest steps |
| Node-only work queues behind jsdom files | Split test projects by environment: pure checks and generators run in Node, keep DOM-dependent outliers in jsdom | Runner `Duration` buckets (`collect`, `tests`, `environment`, `setup`), per-project time, and the error when a DOM import is moved too far | Project split alone: `vitest run` 44–46 → 33s; `tokens.test.ts` stayed jsdom because the custom-element import throws on `HTMLElement` (Node 26.6.0, 8-core arm64) |
| Worker oversubscription starves I/O-heavy copies and jsdom files | Sweep worker counts; cap the local pool at the count with the lowest total wall (6 of 8 cores here); give a 2-core CI shard `--maxWorkers=2`; shard by file or suite across runners. Do not trust a local oversubscription win on CI | Total wall at several worker counts, the slowest file's wall, CPU utilization, CI job wall across two runs | Local sweep: default 43.6s → 34–36s at 6 workers (8-core). Three generator copies at `--maxWorkers=3` on 2 cores: local 131 → 97s, but on CI 110s then 158s, so it was split back into two runners |
| Typecheck or lint runs programs serially | Spawn independent `tsc` programs in parallel, each with its own incremental `tsbuildinfo` | Per-command cold and warm wall | Typecheck 2.4 → 1.2s warm (Node 26.6.0, 8-core arm64) |
| Typecheck or lint starts cold on every CI run | Keep `node_modules/.cache` out of the `node_modules` cache and give it its own per-commit key with a prefix `restore-keys`; one job saves, other readers restore only. ESLint needs `--cache-strategy content` to survive a fresh checkout; `tsc` incremental state is content-hashed already | Typecheck and lint step times on a warm run, cache hit/miss lines, whether lint uses type-aware rules | CI typecheck 40–53 → 17s; lint 12–14s → under 3s (ubuntu-latest 2-core). Local ESLint warm stays 1.6s with the content strategy |
| CI wall is one lane, one runner, or a cold install every job | Cache `node_modules` keyed on the lockfile, Node version and workspace manifests, with `npm ci` only on a miss and npm's download cache restored only then; one shared setup (composite action); split independent suites across jobs; shard slow suites; keep one aggregate required check | Per-job start/end, per-step install/test/build times, cache hit or miss, number of runners, workflow wall | 4m56 → 2m36–2m40; `npm ci` 45–60s per job on a miss versus ~2s restore. Setup per job 16–29s cold → 5–10s warm after the shared action (ubuntu-latest 2-core) |
| The same work runs in two lanes | Read every job's step list for repeats (a pack, a build, a verify) and keep it in the lane that needs its output | Step names and times across jobs | `release:pack` + `verify:packages` (45–55s) ran in two lanes; kept only in `dx` |
| Browser install dominates a short lane | Install only the headless shell (`playwright install --only-shell chromium`), cache it per Playwright version, skip `--with-deps` on a runner image that already has Chrome | Install step time, cache hit, a green browser lane | 13–32s per job → cached; no apt step on ubuntu-latest |

## How to measure

### Whole gate

```sh
/usr/bin/time -p npm run check        # the repo's one-shot gate
```

Run it once cold and three times warm. Use the median of the three warm runs
and treat their max − min as noise; one loaded run is not a baseline. Record the real/user/sys numbers the
shell prints, not the command's own summary alone. When the gate is a chain
(`typecheck && lint && test`), time each segment separately and keep the
segments, because the chain may print only a total.

Never call `npx <package>` for a tool that isn't installed inside a timing
script: without a terminal it waits on the install prompt and the run hangs.

### Unit suites

Read the runner's `Duration` line: `transform`, `collect`, `tests`,
`environment`, `setup`, `prepare`. A large `environment` bucket points at the
DOM environment being loaded per file (compare the environment's import time with
its construction time); a large `tests` bucket at per-test waits; `setup` is
setup-file time. Get per-file times with a JSON reporter, using the same config
the gate uses (read it from `package.json`):

```sh
npx vitest run --config <gate config> --reporter=json --outputFile /tmp/vitest.json
node -e 'let t=Date.now();const {JSDOM}=require("jsdom");console.log("import",Date.now()-t);t=Date.now();new JSDOM("");console.log("construct",Date.now()-t)'
```

The sum of per-file durations far below the wall means the time is outside the
tests: environment, prepare, or process start-up.

Try pools on the same tree with CLI flags before editing the config, and read
the failures, not only the wall:

```sh
npx vitest run --config <gate config> --maxWorkers=2 --pool=vmForks
npx vitest run --config <gate config> --maxWorkers=2 --no-isolate   # leaks mocks between files; expect failures
```

Sweep workers on the same tree and compare total wall and the slowest file.
Mirror every flag the gate passes except `--maxWorkers`, and give each run its
own output file:

```sh
npx vitest run --config <gate config> --maxWorkers=1 --reporter=json --outputFile /tmp/vitest-w1.json
npx vitest run --config <gate config> --maxWorkers=6 --reporter=json --outputFile /tmp/vitest-w6.json
npx vitest run --config <gate config> --reporter=json --outputFile /tmp/vitest-default.json
```

### Storybook / Playwright

Use the gate's own Storybook command, taken from `package.json`; it may build
the static site first. Check the runner's CLI with `--help` before relying on a
reporter flag: `@storybook/test-runner` 0.21 rejects `--outputFile`. `--verbose`
prints every story with its duration:

```sh
npm run build-storybook                        # or the gate's own build step
node <the repo's runner script> --maxWorkers=2 --verbose <paths> > /tmp/storybook.log
grep -oE '\(([0-9]+) ms\)' /tmp/storybook.log  # per-story durations
node -e 'const i=require("./storybook-static/index.json");const e=Object.values(i.entries);console.log(e.filter(x=>x.type==="story").length,"stories",e.filter(x=>x.type==="docs").length,"docs")'
```

Rank suites first, then the stories inside them. A story that repeats a fixed
wait shows up as a cluster at the same duration; a flat ~0.5–1s per story points
at the runner hook itself (§ Instrument the inside). Compare the runner wall with
the shard totals (files and tests per shard), not only the whole lane (one CI job:
build plus runner).

If the browser download is blocked in a sandbox, point the runner at an
installed Chrome through the repo's own switch (`DASHHAUS_CHROMIUM` here) rather
than changing the launch code.

### Instrument the inside

When a bucket is a hook or a subprocess chain, time its phases, aggregate, then
restore the file from a backup before committing:

- **Runner hook:** push `Date.now()` marks between phases of `postVisit` (wait,
  layout checks, inject, axe) and append them to a log; average per story.
- **Subprocesses:** wrap the test helper that spawns tools and append
  `<ms> <command>` per call; keep the calls over ~1.5s.

### Counts

The JSON reporters carry the totals: `numTotalTestSuites`, `numTotalTests`,
`numPassedTests`. Read them from the files the sweeps produced:

```sh
jq '{files:.numTotalTestSuites, tests:.numTotalTests, passed:.numPassedTests}' /tmp/vitest.json
```

For the Storybook runner read `Test Suites:` and `Tests:` from its output, and
the story and docs entry counts from `storybook-static/index.json`. Axe has no
total line; record the `runOnly` rule set and every disabled rule from the
Storybook runner config. Shard counts exist only in CI: take the files and tests
per shard from each job's output.

### Compilers and installs

Time each command separately. A cache hit means the cache directory exists
before the second run and that run's wall is lower; the first run creates it. In CI, read the per-step
timestamps: `npm ci` and cache-restore steps are usually the largest
orchestration cost.

### CI

Compare the last green run before the change with the first green run after
it, at their own commits. State both SHAs and each run's cache state. A change to
any manifest in the `node_modules` cache key makes the first run cold; push an
empty commit for the warm run and compare that one. Get the run id, then read job
and step times:

```sh
gh run list --branch <branch> --limit 1 --json databaseId,headSha,conclusion
gh run view <run-id> --json jobs --jq '.jobs[] | "\(.name) \((.completedAt|fromdateiso8601)-(.startedAt|fromdateiso8601))s"'
gh api "repos/{owner}/{repo}/actions/runs/<run-id>/jobs?per_page=100"
```

The `databaseId` is `<run-id>`, and `gh` substitutes `{owner}` and `{repo}` from
the current repository. Record whether each run hit or missed the
`node_modules` cache, and whether another run was executing at the same time. Actions caches are branch-scoped: a merge or new
branch pays a cold install even when the same files were cached on the source
branch.

If every job fails within seconds with no steps, read the annotations before
touching code; it is usually billing or a runner problem:

```sh
gh api "$(gh api repos/{owner}/{repo}/actions/runs/<run-id>/jobs --jq '.jobs[0].check_run_url')/annotations" --jq '.[].message'
```

### CI lanes

A lane's wall is its setup (5–10s warm, 16–30s cold on ubuntu-latest) plus its
work, and the workflow's wall is the slowest lane. Merging lanes saves runners
and minutes; it is only free while the merged lane stays under the slowest one.
After merging or splitting, list every job's wall and name the new critical
path. Duplicated push and `pull_request` runs double the minutes for PR
branches; report that and leave the triggers to the owner. Skipping one of them
with `if:` can leave a skipped job with a required check's name as the newest
result for a commit.

## Verification

- **Cold local:** clear the caches the gate uses. For this repo that means
  `node_modules/.cache/tsc`, `node_modules/.cache/eslint`, and the runner's
  cache under `node_modules/.cache` or `node_modules/.vite`; name the
  directories you removed. Run the gate once and record the wall.
- **Warm local:** run the same gate three times; report the median and note any
  concurrent load. A quiet 8-core machine and a loaded one are different
  environments, and so are a 2-core sandbox and the owner's laptop: do not apply
  a sandbox result to the laptop's defaults without measuring there.
- **Per-suite timings:** report the before/after wall for each suite or file
  that moved, not only the total. Keep the unchanged suites visible so the
  savings are attributable.
- **Counts:** quote the gate's exact strings, for example
  `Test Files 185 passed`, `Tests 1499 passed | 1 skipped`, `87 suites / 549 stories`.
  Axe has no total line: record the `runOnly` rule set and every disabled rule
  from the Storybook runner config. Store the before and after strings side by
  side, with anything the new path no longer builds.
- **Probe:** for a change to how a check reports, the probe's failure output
  before and after.
- **CI:** link both green runs (baseline and change). Include each workflow
  wall, job walls, cache hit or miss, and runner class. A run with a cold cache
  is not comparable to a warm one.
- **Failure is a result.** If a hypothesis does not pay, revert it and report
  the hypothesis, the measured delta, the environment, and what the timing
  showed instead. Do not keep a change because it sounds right, and do not
  report a run you did not make.

## Output

```text
Gate: <command>
Environment: <local|CI>, <cores>, <Node>, <runner/cache state>
| phase / suite | before | after | delta (seconds, before − after) |
Counts: <files/tests/stories/axe> before == after
No longer built here: <artifact> — still built by <required check>
CI before: <run URL>, <workflow wall>, <job walls>, <cache hit/miss>
CI after:  <run URL>, <workflow wall>, <job walls>, <cache hit/miss>
Critical path: <slowest lane and its wall>
Rejected: <option> — <measured result and environment>
Remaining: <largest bucket and why it was not touched>
```

## Error Handling

- Counts differ after a change: stop. Restore the previous state and treat the
  change as coverage loss, not a speedup.
- Counts match but something is no longer built (docs pages, a bundle, a type
  output): find the required check that still builds it, or treat it as a
  coverage split and revert.
- A local speedup disappears on CI, or a CI speedup disappears locally: report
  both numbers. Do not average different machines or cache states into one
  claim.
- A CI run is slower only because its branch had no cache, or because two runs
  executed at once: say so, rerun warm, and do not attribute it to the change.
- Every CI job fails in seconds with no steps: read the annotations, report the
  cause (billing, runner), and do not change code for it.
- A dependency install is the largest remaining bucket but sharing it would
  require adding a step the gate does not already run, or hiding a suite: report
  the measured cost and leave the install in place. Do not filter or split
  suites to hide it.
- No permission to edit CI: finish and verify the local gate, and report the CI
  work as not attempted rather than guessing at it.

## Evidence

The full measured record, environments and rejected options are in
[references/dashhaus-evidence.md](references/dashhaus-evidence.md). The exact
code shapes that produced the numbers — the Vitest pools, the Storybook hook,
the repo copy and link, the parallel typecheck, the shared CI setup and the CI
lanes — are in [references/dashhaus-shapes.md](references/dashhaus-shapes.md).
Read the Rejected table before proposing a change, the shapes before editing a
runner or config, and the evidence when you need the complete record.
