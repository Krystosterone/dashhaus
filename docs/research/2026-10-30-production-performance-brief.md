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
