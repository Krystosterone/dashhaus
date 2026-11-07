# Measuring a deployed dashboard

Each deployed skin's resource carries opt-in performance marks. The repo command `npm run perf:collect` drives the live
Home Assistant dashboards in a real Chromium, combines those marks with browser timings, and writes one JSON report per
run, comparable across runs. It measures the dashboards in production, not Storybook and not the demo transports.

This is measurement only: no CI threshold, no continuous telemetry, no Home Assistant server metrics.

## Prerequisites

- The deployed resources. Run `npm run deploy` first; see [deploy.md](deploy.md).
- `.env` beside `dashboard.config.mjs` with `HA_URL` and `HA_TOKEN` (or the same variables in the shell). The token is
  an admin long-lived access token; it authenticates the browser's frontend session and restores the entity the run
  toggles. It is never printed or written to the report.
- Both dashboards open in Home Assistant. By default the collector uses the first two dashboards
  `dashboard.config.mjs` declares (Orb, then Field), after the `.env` path overrides.

## The command

```sh
npm run perf:collect
```

One run measures both skins and writes `perf/reports/run-<timestamp>.json`, which is ignored by git. Run it twice and
keep both files locally to see run-to-run variance. The report includes the commit, branch, Home Assistant URL and
version, dashboard paths, viewport, browser, timestamp, the interaction performed, and every timing below.

`npm run perf:collect -- --help` prints the options: the two dashboard paths, the control to toggle, its card's name,
the report path and a headed browser.

The default entity and card must appear in both dashboards. On the repo's live instance, `input_boolean.do_not_disturb`
is a compact toggle in Orb's Modes section and an automatic-layout module in Field, so one card name drives both.

## What a run does

1. **Off check, per skin.** Opens Orb and Field without the opt-in and asserts there is no
   `window.__dashhausPerf`, no `dashhaus:*` Performance mark or measure, no `pointerdown` listener registered by
   the skin's resource, no fetch from it, no `perf`/`__dashhaus` console line, no console or page error, and the same
   cards and hosts as the opt-in page. The listener and fetch probes judge only calls whose stack comes from a
   resource `npm run build:ha` writes, so Home Assistant's own listeners and requests do not count. This is the
   report's `instrumentation.offCheck`, one entry per skin.
2. **Cold load, per skin.** A new browser context, a disabled HTTP cache and a new Chromium page navigate to
   `<HA_URL>/<dashboard>?dashhaus_perf=1`. The collector waits for `store:painted`, so the measured page has entity
   data, not only its loading placeholders. It records the marks below plus the browser's navigation, paint, LCP,
   long-task, resource and JS-heap entries.
3. **Details.** Presses the card's name (`Do not Disturb details`) and waits for the dialog's first painted frame,
   then closes it with Escape.
4. **One reversible action.** Presses the card's own control (Orb's toggle pill, Field's key), waits for the entity
   update to paint, confirms the state changed through Home Assistant's websocket, and restores the state it found in a
   `finally` block. The report records both states and the restored state.

A failed run still restores the entity.

## The marks

The resources carry the marks in `@dashhaus/core/perf`. They are recorded only when the page opted in; with the opt-in
off, every call returns before touching a listener, the Performance API or the DOM, and no fetch, render or console
line is added.

| Mark | When | Detail |
| --- | --- | --- |
| `dashhaus:resource:entry` | The resource's entry module runs, after its imports. | |
| `dashhaus:element:connected` | A Lovelace dashboard element's `connectedCallback`. | `first` |
| `dashhaus:hass:ready` | The element receives its first `hass`. | |
| `dashhaus:store:created` | The element creates the store for that connection. | |
| `dashhaus:config:parsed` | The element's YAML parsed. | |
| `dashhaus:render:start` | The element starts a React render. | `first` |
| `dashhaus:render:painted` | The first frame after that render. It can precede entity data. | `first` |
| `dashhaus:store:connected` | The first complete entity snapshot arrives, or the frontend snapshot the store was created with (`hass.states`). | `generation`, `seeded` |
| `dashhaus:store:painted` | The first frame after that snapshot: the dashboard with entity data. The collector's ready mark. | `generation`, `seeded` |
| `dashhaus:input:pointerdown` | A press on a button, link or `[role=button]`, captured on the document so it sees into shadow roots. | `label`, `tag` |
| `dashhaus:details:request` | A details trigger (`useDetails.openDetails` or a tile's name). | |
| `dashhaus:details:visible` | The dialog's first painted frame. | `label` |
| `dashhaus:action:start` | A service call begins. | `seq`, `label`, `entityId` |
| `dashhaus:action:ack` | Home Assistant answers the service call. | `seq`, `label` |
| `dashhaus:action:state` | The target entity's update arrives on the subscription. | `seq`, `state` |
| `dashhaus:action:settled` | The first painted frame after that update. | `seq` |
| `dashhaus:action:error` | The call failed or its outcome is unknown. | `seq`, `code` |
| `dashhaus:action:superseded` | A second action began before the first entity update arrived. | `seq` |
| `dashhaus:store:error`, `dashhaus:store:disconnected` | The connection failed or dropped. | `generation` |

The marks are also Performance marks with the same names. Their full details, in order, are in
`window.__dashhausPerf.marks`, which is what the collector reads. Entering the opt-in on a page before its first
dashhaus code runs is what counts: add `?dashhaus_perf=1` to a dashboard URL, or set
`localStorage["dashhaus:perf"] = "1"` and reload. A page that did not opt in stays off even if storage changes later.

## The report

All millisecond values are relative to the page's time origin, the same base as the browser's Performance entries.
`navigationToReadyMs` is the dashboard with entity data, measured from navigation start; it is the cold-load number to
compare. `entryToReadyMs` isolates the resource's own work. `render:painted` and `navigationToPaintedMs` are the first
React frame and can precede the store's entity snapshot when the store has to wait for its own subscription; that is
why `store:painted` is the ready mark. When the element has Home Assistant's `hass.states`, it seeds the store with
that snapshot and connects it before the first render, so the first frame already carries data and `store:painted`
coincides with `render:painted`; the mark's `seeded` detail says which path ran, `entryToPaintedMs` is then the first
data frame rather than a placeholder frame, and `storeToReadyMs` is only the two-frame paint window after that connect,
not a wait for a subscription. `largestContentfulPaintMs` is the
document's LCP, which on these dashboards is usually Home Assistant's shell before the skin's resource loads; use
`navigationToReadyMs` for the dashboard.

The opt-in cold-load `probe` shows the off check is not vacuous: it must see the one `pointerdown` listener the opt-in
installs, and no fetch from the resource. The off check then requires zero of each.

`ackToStateMs` can be negative: Home Assistant broadcasts the entity update before it answers the service call, so
`state` can arrive first. `inputToSettledMs` is the press-to-painted interaction latency and does not depend on that
order.

## Baseline

The first measured cut is the comparison a later run starts from. It seeded the store from the frontend snapshot:
`LovelaceDashboardElement` passes `hass.states` to `createHaStore(transport, initialEntities)` and connects it before
the first render, so the first frame carries the house and the live subscription replaces the seed. That removed the
resource's own subscription round trip between `element:connected` and `store:connected`; it did not move a mark over
the same work.

Run conditions (the entry mark was then named `dashhaus:bundle:entry`): code `980c960` (base `5a63d53`), 5 cold runs per
skin, 1440 × 1000, dark, device scale 1, headless Chromium 156.0.8078.4, cache disabled, Home Assistant 2026.10.4, the
collector's default reversible control (`input_boolean.do_not_disturb`), each run restored to `on`. Medians with the
5-run range:

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
| resource transferred | 653,816 B | 654,213 B | 653,816 B | 654,213 B |

Orb's entry-to-ready fell 39.4% and Field's 59.7% (the bar was 15% on one skin). The other skin and the details/toggle
medians stayed inside the baseline 5-run ranges. Orb's `entryToPainted` rose because the first paint is now the full
data render rather than a cheaper placeholder frame; data-ready still fell. `store:connected → store:painted` is the
two-frame paint window after the seeded connect, not a wait for data. Resource transfer size did not change materially,
and resource fetch duration and TTFB varied with the host and network, so neither is attributed to the change. The
opt-in off check still found no global, no mark, no resource listener, no extra fetch and no console line, with 85 cards
and one host per skin.

The runs' JSON reports were evidence at the time and are not tracked; the numbers above are the record.

## Limits

- One desktop viewport (`1440 × 1000`, dark, device scale 1), headless Chromium, cache disabled for the measured load.
  There is no phone, device-lab or browser matrix, and no CI threshold.
- The collector toggles one `input_boolean` or `switch` and restores it. It refuses locks, covers, alarms, lights and
  anything else whose state would need more than an on/off restore.
- The browser's Home Assistant session is a temporary Playwright context; its token is not written to the report.
- Reports are local files, not uploads, and `/perf/reports/` is ignored by git. A report carries the Home Assistant
  URL, dashboard paths, card names and timings — environment detail, not a secret, but not something the repo tracks.
  It never contains the token or `.env`.

The first reports' finding, and the cut it led to (2026-10-31): half of entry-to-ready was the resource waiting on its
own subscription's snapshot, after a cheaper placeholder frame. `LovelaceDashboardElement` now seeds the store from
the frontend's `hass.states` before the first render (`store:connected` and `store:painted` carry `seeded: true`),
and the live subscription replaces the seed. Median entry-to-ready fell from 126 to 76 ms on Orb and from 119 to
48 ms on Field (five cold runs each); details and toggle timings stayed inside their baseline ranges. Weighed and
not taken: per-skin chunks, Preact or a compressed loader (deploy uploads one file, and the bytes weren't the wait),
and moving a mark earlier without the data (it would win the number and prove nothing).
