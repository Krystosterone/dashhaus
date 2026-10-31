# Brief: improve the deployed dashboards' production performance

## Outcome

The deployed Orb and Field dashboards load measurably faster than the recorded baseline, with the gain proven by
the repo's production collector and without changing their visual design, card behavior or off-mode visibility.

## Parameters

- Repo: `/home/operator/Projects/dashhaus`.
- Base: `main` at `e1d500c` (the merge of `perf/production-instrumentation`). If `main` has moved, branch from
  current `main` and record the difference.
- Baseline code: `2e1a6ed`; baseline reports:
  `perf/reports/run-2026-10-31T01-43-19-208Z.json` and
  `perf/reports/run-2026-10-31T01-43-33-819Z.json`. The methodology and report fields are in
  `docs/performance.md`.
- Live settings: the ignored `.env` beside `dashboard.config.mjs` (`HA_URL`, `HA_TOKEN`, and any dashboard path
  overrides); never print or commit them. The measured dashboards are `/dashhaus-orb` and `/dashhaus-field`.
- Build/deploy/measure with the existing tools: `npm run deploy`, then `npm run perf:collect`. The collector's
  default reversible control is `input_boolean.do_not_disturb`; it must restore the state it found.
- One desktop viewport (`1440 × 1000`, dark), headless Chromium, cache disabled for the cold load. Keep that
  methodology to compare against the baseline.
- Work on a new branch and commit there. If the collector needs a new measurement, extend it and test it rather
  than adding another runner or linter.

## Bar

- **Measure before editing.** Start with at least 5 cold runs per skin and report the median and range. The two
  recorded runs already differ by 670.2 ms on Orb's data-ready time (3378.0 ms vs 2707.8 ms), so a single before/after
  pair is not evidence.
- **Attribute the wait.** Use the report's clocks separately: navigation and the HA shell, the bundle resource and
  `bundle:entry`, the bundle-to-data-ready render (`entryToReadyMs`), the store-to-paint window, and the HA service
  round trip versus the client paint on toggle. Do not call the whole 2.3–3.4 s "dashhaus" without showing which
  part changed.
- **Make one measured improvement.** Reduce the median `entryToReadyMs` by at least 15 % on at least one skin, or
  reduce the initial bundle's transferred bytes by at least 20 % (baseline 653,816 B), and show the corresponding
  report field. The other skin and the details/toggle medians must not regress beyond the baseline's 5-run range.
  If the multi-run data shows no dashboard-controlled cost can meet that without a product change, hand back that
  evidence and ask; do not remove cards or change behavior to win the number.
- **Keep the opt-in invisible when off.** The off check must still find no `window.__dashhausPerf`, no
  `dashhaus:*` mark, no pointer listener, no extra fetch or console line, and the same card count. Strengthen that
  check if the change moves loading or rendering.
- **Keep the interaction safe.** Only `input_boolean.*`/`switch.*`; never a lock, cover or alarm. Restore the entity
  and verify the restored state through Home Assistant.
- **Prove the whole path.** Deploy the candidate to the live instance, run the collector against both dashboards,
  commit the before/after reports, update `docs/performance.md` (and any layout/entry docs the change affects), and
  pass `npm run check` and `npm run test-storybook`. Keep the token out of the bundle, reports, logs and commits.

## Standard

`AGENTS.md` → Commands, Layout and Hard rules; `docs/performance.md` for the marks, report fields and the
collector's limits; `docs/deploy.md` for the live path; `docs/contract.md` for the card contract; `codebase-design`
for entry/bundle boundaries; `animation-performance` for paint and frame work; `home-assistant-integration` before
changing the store or action seam. The repo's Playwright toolchain and the existing collector are the measurement
authority. Do not add another test runner or linter.

## Evidence

Observed on `main` at `e1d500c`, from the two committed reports (HA 2026.10.4, Chromium 156.0.8078.4, 1440 × 1000,
headless, cache disabled):

| Field | Orb | Field |
| --- | ---: | ---: |
| Navigation → data-ready (`navigationToReadyMs`) | 3378.0 / 2707.8 ms | 2446.7 / 2350.5 ms |
| Bundle entry → data-ready (`entryToReadyMs`) | 167.8 / 120.1 ms | 157.5 / 129.1 ms |
| Store connected → data-ready (`storeToReadyMs`) | 90.0 / 51.3 ms | 70.8 / 61.1 ms |
| Details request → visible | 44.6 / 34.5 ms | 40.1 / 34.7 ms |
| Toggle input → settled | 110.1 / 139.8 ms | 76.6 / 77.3 ms |
| Toggle start → HA ack | 43.2 / 94.5 ms | 49.0 / 44.0 ms |
| Toggle state → settled paint | 65.7 / 44.5 ms | 24.0 / 28.3 ms |
| Bundle transferred | 653,816 B | 653,816 B |
| Bundle resource duration | 995.6 / 390.9 ms | 384.8 / 490.1 ms |
| Document FCP/LCP | 212 / 396 ms | 244 / 276 ms |
| Longest task | 74 / 65 ms | 72 / 65 ms |

The reports' `bundle:entry` arrives at 2.2–3.2 s, after the HA frontend; the dashboard's own work after that is
120–168 ms to data-ready. The bundle is one file that imports both skins (`apps/lovelace/entry.ts`), and its
transferred size has no encoded-body evidence in the report. The report records the bundle URL, duration and
transfer size, but not its resource start time or encoded body size, and it slices resources to 30, so it cannot
yet say whether the 653,816 B was compressed or when the fetch began. The LCP is HA's shell, not the dashboard.

The interaction split suggests two different costs: the HA service round trip (`startToAckMs`) and the client
wait for the state update plus paint (`stateToSettledMs`). The collector's `details:visible` and `action:settled`
marks are two `requestAnimationFrame`s after the handler/effect, so they include a frame-scheduling floor of about
33 ms. Treat sub-frame differences as measurement noise until the collector is tightened.

Pointers: `perf/reports/`, `docs/performance.md`, `apps/lovelace/entry.ts`, `packages/core/src/perf.ts`,
`scripts/perf/collect.mjs`, `packages/dashboard/src/element.tsx`, `packages/core/src/ha/store.ts`,
`src/skins/orb/lovelace/card.tsx`, `src/skins/field/lovelace/card.tsx`.

## Scope

Out of scope here:

- Visual redesign, card/schema/layout behavior changes, or breaking `docs/contract.md`.
- Home Assistant server/backend metrics, CI performance thresholds or gating, continuous telemetry, off-box upload,
  or a device/browser matrix.
- Changing the measured dashboards' YAML layouts, the default control, or the deployed paths.
- Actuating locks, covers, alarms or anything with a physical consequence.
- Pushing, opening a PR, merging, or changing the Home Assistant dashboards' layouts. The operator owns those.
- PII work and any change to `.env` or the token.

## Stop point

Work on a branch and commit there. Deploying the candidate bundle to the live instance for measurement is approved;
changing a dashboard's layout, the default control, or a product behavior is not. Do not push, open a PR, merge or
change deployed dashboard layouts; hand back the branch. Ask before any change whose only justification is a
lower number but which changes what a card does.

## Finish line

A branch from `main` where:

- the branch and the live run use the same commit;
- at least 5 cold runs per skin exist before and after, with median and range, committed under `perf/reports/`;
- the before/after table shows the chosen field(s) meeting the bar, with the other skin and interactions inside the
  no-regression bound, or the multi-run evidence says the dominant cost is outside dashhaus control and no product
  change was made;
- the opt-in off check still shows no global, no mark, same cards, no console errors, and no extra loading;
- the entity is restored and verified through Home Assistant;
- `npm run check` and `npm run test-storybook` pass;
- `docs/performance.md` and any affected layout/entry docs are updated, and the finished brief records the route
  chosen, the routes rejected and why.

Hand back: the branch/commit; the two before and two after report paths; a compact delta table with medians and
ranges; the exact commands; the gates; the restored entity state; and anything the operator must decide.

## Escalation

If the live instance is unreachable or lacks a safe reversible control, say so and stop before making a production
claim; do not substitute Storybook or demo data. If the effective dashboard paths differ, or the only improvement
needs a product behavior change, ask once with the options. Otherwise decide and proceed.

## Result (2026-10-31)

**Branch:** `perf/production-followup`, code commit `980c960`; base `5a63d53` (current `main`, two docs commits past
the brief's `e1d500c`). The live resource is built from `980c960`. The evidence commit after it only adds reports and
this section.

**Chosen route:** seed the shared store from the frontend snapshot. `LovelaceDashboardElement` passes `hass.states`
to `createHaStore(transport, initialEntities)` and connects it immediately before `createRoot`, so the first frame
carries the house. The live subscription then replaces the seed; a reconnect still waits for the live snapshot.
`store:connected` and `store:painted` carry `seeded: true` for this path.

**Why:** the phase split put 57-59 ms of the 119-126 ms entry-to-ready in `element:connected → store:connected`, the
bundle's own subscription round trip, after a cheaper placeholder frame had already painted. Removing that wait puts
the data in the first render; it is not a mark moved earlier over the same work.

**Rejected routes:**

- Bundle-byte work (per-skin chunks, Preact, or a compressed loader): deploy uploads one file and registers one
  resource, so chunks need an upload-directory and resource change; the byte bar was not needed once the wait was
  attributed to the store snapshot.
- A mark-only change: moving `store:painted` earlier without data would win the number and prove nothing. The seed
  changes what the first render draws.
- YAML, card, control or layout changes: out of scope and unnecessary.

**Measurements** (5 cold runs per skin; 1440 × 1000, dark, headless Chromium 156.0.8078.4, cache disabled; medians
with the 5-run range):

| Field | Orb before | Orb after | Field before | Field after |
| --- | ---: | ---: | ---: | ---: |
| **`entryToReadyMs`** | **125.9** [113.9-145.2] | **76.3** [54.2-89.4] | **119.0** [109.0-146.0] | **47.9** [36.2-50.9] |
| `navigationToReadyMs` | 2671 [2261-5010] | 2528 [2138.7-2940.2] | 2906.3 [2541.9-3697.5] | 2475.4 [2368.2-2867.8] |
| `element:connected → store:connected` | 57.3 [54.5-62.5] | 2.0 [1.9-2.4] | 58.8 [57.1-71.9] | 1.9 [1.5-2.1] |
| `store:connected → store:painted` | 64.3 [50.0-75.3] | 72.7 [50.5-84.9] | 53.8 [44.7-67.3] | 42.4 [25.3-47.5] |
| details request → visible | 38.3 [35.2-44.6] | 40.0 [35.9-40.1] | 31.7 [31.1-43.9] | 31.1 [29.6-31.7] |
| toggle input → settled | 94.3 [89.7-123.9] | 94.1 [70.4-207.3] | 77.3 [75.7-209.3] | 77.1 [60.1-93.5] |
| toggle start → HA ack | 53.3 [40.9-76.6] | 51.9 [39.7-156.4] | 45.7 [42.2-184.0] | 46.0 [38.7-62.1] |
| toggle state → settled paint | 41.6 [35.8-54.4] | 39.5 [30.3-52.9] | 27.4 [20.7-29.7] | 26.9 [17.6-31.8] |
| bundle transferred | 653,816 B | 654,213 B | 653,816 B | 654,213 B |

Orb's entry-to-ready fell 39.4 % and Field's 59.7 % (bar: 15 % on one skin). The other skin and the details/toggle
medians stay inside the baseline 5-run ranges. Orb's `entryToPainted` rose (56.4 → 76.4 ms) because that first paint
is now the full data render rather than a cheaper placeholder frame; data-ready still fell. `store:connected →
store:painted` is the two-frame paint window after the seeded connect, not a wait for data. Bundle fetch duration and
TTFB varied with the host and network and are not attributed to the change.

**Off check:** every after report has one `instrumentation.offCheck` per skin: no `window.__dashhausPerf`, zero
`dashhaus:*` marks, zero measures, zero bundle `pointerdown` listeners, zero bundle fetches, no `perf`/`__dashhaus`
console line, no console or page error, 85 cards and 1 host — the same as the opt-in page. The opt-in cold load's
`probe` saw the one listener and zero fetches in every run, so the absence check is not vacuous. The five before
reports used the old single-skin off check (no probe).

**Restored entity:** `input_boolean.do_not_disturb` was `on` after every run, and a direct Home Assistant read after
the last run returned `on` (`last_updated` 2026-10-31T03:06:10Z). The token appears in no report or bundle.

**Commands:** `npm run check`; `npm run test-storybook`; `npm run deploy`; `npm run perf:collect` five times.

**Gates:** `npm run check` passed (133 files, 1,197 tests); `npm run test-storybook` passed (57 suites, 406 tests).

**Reports:** before `perf/reports/run-2026-10-31T02-52-45-672Z.json`, `…02-53-00-027Z.json`,
`…02-53-12-258Z.json`, `…02-53-27-759Z.json`, `…02-53-40-189Z.json`; after
`perf/reports/run-2026-10-31T03-04-48-797Z.json`, `…03-05-03-880Z.json`, `…03-05-19-867Z.json`,
`…03-05-38-110Z.json`, `…03-05-56-848Z.json`. The two older `2e1a6ed` runs remain as the original baseline.

**Operator decisions:** none required; the branch is not pushed and the dashboards' layouts were not changed. The
live resource now points at `980c960`.
