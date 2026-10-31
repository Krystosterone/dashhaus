# Measuring a deployed dashboard

The deployed bundle carries opt-in performance marks. The repo command `npm run perf:collect` drives the live Home
Assistant dashboards in a real Chromium, combines those marks with browser timings, and writes one JSON report per
run, comparable across runs. It measures the dashboards in production, not Storybook and not the demo transports.

This is measurement only: no CI threshold, no continuous telemetry, no Home Assistant server metrics.

## Prerequisites

- A deployed bundle. Run `npm run deploy` first; see [deploy.md](deploy.md).
- `.env` beside `dashboard.config.mjs` with `HA_URL` and `HA_TOKEN` (or the same variables in the shell). The token is
  an admin long-lived access token; it authenticates the browser's frontend session and restores the entity the run
  toggles. It is never printed or written to the report.
- Both dashboards open in Home Assistant. By default the collector uses the first two dashboards
  `dashboard.config.mjs` declares (Orb, then Field), after the `.env` path overrides.

## The command

```sh
npm run perf:collect
```

One run measures both skins and writes `perf/reports/run-<timestamp>.json`. Run it twice and keep both files to see
run-to-run variance. The report includes the commit, branch, Home Assistant URL and version, dashboard paths, viewport,
browser, timestamp, the interaction performed, and every timing below.

Options:

| Option | Meaning |
| --- | --- |
| `--orb <path>` | Orb dashboard path. Default: the first dashboard in `dashboard.config.mjs`, after overrides. |
| `--field <path>` | Field dashboard path. Default: the second dashboard. |
| `--entity <id>` | The reversible control to toggle. Default: `input_boolean.do_not_disturb`. Only `input_boolean.*` and `switch.*` are accepted, so the collector can restore the exact on/off state. |
| `--card <name>` | The card's printed name, when the dashboard renames it away from the entity's friendly name. |
| `--out <file>` | Report path. Default: `perf/reports/run-<timestamp>.json`. |
| `--headed` | Show the browser instead of running headless. |
| `--help` | Print the usage. |

The default entity and card must appear in both dashboards. On the repo's live instance, `input_boolean.do_not_disturb`
is a compact toggle in Orb's Modes section and an automatic-layout module in Field, so one card name drives both.

## What a run does

1. **Off check, per skin.** Opens Orb and Field without the opt-in and asserts there is no
   `window.__dashhausPerf`, no `dashhaus:*` Performance mark or measure, no `pointerdown` listener registered by
   the bundle, no fetch from the bundle, no `perf`/`__dashhaus` console line, no console or page error, and the same
   cards and hosts as the opt-in page. The listener and fetch probes judge only calls whose stack comes from the
   bundle, so Home Assistant's own listeners and requests do not count. This is the report's
   `instrumentation.offCheck`, one entry per skin.
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

The bundle carries the marks in `@dashhaus/core/perf`. They are recorded only when the page opted in; with the opt-in
off, every call returns before touching a listener, the Performance API or the DOM, and no fetch, render or console
line is added.

| Mark | When | Detail |
| --- | --- | --- |
| `dashhaus:bundle:entry` | The bundle's entry module runs, after its imports. | |
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

The report is JSON, one file per invocation, shaped like this (values elided):

```json
{
  "schema": 1,
  "generatedAt": "…",
  "commit": "…",
  "branch": "perf/production-instrumentation",
  "dirty": false,
  "ha": { "url": "…", "version": "…", "dashboards": { "orb": "…", "field": "…" } },
  "browser": { "name": "Chromium", "version": "…", "headless": true },
  "viewport": { "width": 1440, "height": 1000, "deviceScaleFactor": 1, "colorScheme": "dark" },
  "instrumentation": {
    "optIn": "…",
    "offCheck": {
      "orb": { "global": false, "marks": 0, "measures": 0, "pointerdownListeners": 0, "fetches": 0, "console": [], "cards": 0, "hosts": 0 },
      "field": { "global": false, "marks": 0, "measures": 0, "pointerdownListeners": 0, "fetches": 0, "console": [], "cards": 0, "hosts": 0 }
    }
  },
  "interaction": { "entity": "…", "card": "…" },
  "skins": {
    "orb": {
      "dashboard": "dashhaus-orb",
      "url": "…",
      "coldLoad": {
        "browser": { "ttfbMs": 0, "firstContentfulPaintMs": 0, "largestContentfulPaintMs": 0, "longTasks": {} },
        "marks": { "bundleEntryMs": 0, "elementConnectedMs": 0, "storeConnectedMs": 0, "storePaintedMs": 0 },
        "timings": {
          "navigationToReadyMs": 0,
          "entryToReadyMs": 0,
          "connectedToReadyMs": 0,
          "storeToReadyMs": 0,
          "entryToPaintedMs": 0,
          "navigationToPaintedMs": 0
        },
        "cards": 0,
        "hosts": 0,
        "probe": { "pointerdownListeners": 1, "fetches": 0 },
        "bundle": { "url": "…", "durationMs": 0, "transferSize": 0 },
        "resources": []
      },
      "details": { "requestToVisibleMs": 0, "inputToVisibleMs": 0 },
      "interaction": {
        "before": "on",
        "after": "off",
        "restored": "on",
        "action": {
          "startToAckMs": 0,
          "ackToStateMs": 0,
          "stateToSettledMs": 0,
          "inputToSettledMs": 0,
          "startToSettledMs": 0
        }
      },
      "errors": { "console": 0, "page": 0 }
    }
  }
}
```

All millisecond values are relative to the page's time origin, the same base as the browser's Performance entries.
`navigationToReadyMs` is the dashboard with entity data, measured from navigation start; it is the cold-load number to
compare. `entryToReadyMs` isolates the bundle's own work. `render:painted` and `navigationToPaintedMs` are the first
React frame and can precede the store's entity snapshot when the store has to wait for its own subscription; that is
why `store:painted` is the ready mark. When the element has Home Assistant's `hass.states`, it seeds the store with
that snapshot and connects it before the first render, so the first frame already carries data and `store:painted`
coincides with `render:painted`; the mark's `seeded` detail says which path ran, `entryToPaintedMs` is then the first
data frame rather than a placeholder frame, and `storeToReadyMs` is only the two-frame paint window after that connect,
not a wait for a subscription. `largestContentfulPaintMs` is the
document's LCP, which on these dashboards is usually Home Assistant's shell before the dashhaus bundle loads; use
`navigationToReadyMs` for the dashboard.

The opt-in cold-load `probe` shows the off check is not vacuous: it must see the one `pointerdown` listener the opt-in
installs, and no fetch from the bundle. The off check then requires zero of each.

`ackToStateMs` can be negative: Home Assistant broadcasts the entity update before it answers the service call, so
`state` can arrive first. `inputToSettledMs` is the press-to-painted interaction latency and does not depend on that
order.

## Limits

- One desktop viewport (`1440 × 1000`, dark, device scale 1), headless Chromium, cache disabled for the measured load.
  There is no phone, device-lab or browser matrix, and no CI threshold.
- The collector toggles one `input_boolean` or `switch` and restores it. It refuses locks, covers, alarms, lights and
  anything else whose state would need more than an on/off restore.
- The browser's Home Assistant session is a temporary Playwright context; its token is not written to the report.
- Reports are local files, not uploads. They are safe to commit: they carry the HA URL, dashboard paths and card
  names, never the token or `.env`.

The follow-up cut that acts on the first reports' findings is scoped in
[2026-10-30-production-performance-brief.md](research/2026-10-30-production-performance-brief.md).
