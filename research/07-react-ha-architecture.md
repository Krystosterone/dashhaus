---
date: 2026-10-19T03:58:03+00:00
git_commit: 6486e0e44b54ba74c9fd5a53360f0b309e12a08d
branch: feat/home-assistant-dashboard-foundation
repository: home-dashboard
topic: "React and Home Assistant integration architecture survey"
tags: [research, home-assistant, react, architecture, websocket]
status: complete
last_updated: 2026-10-19
---

# Research: React and Home Assistant architecture

> **Historical baseline:** This note records the repository and external architecture survey before the Home Assistant foundation at commit `6486e0e44b54ba74c9fd5a53360f0b309e12a08d`. The current implementation status is tracked in [`research/README.md`](README.md) and [`docs/home-assistant.md`](../docs/home-assistant.md); use this note for the original evidence and decision rationale.

## Research Question

Which transport, authentication, entity-state, action, subscription, and React/UI boundaries are demonstrated by strong Home Assistant integrations, and which subset should this component-first repository adopt without importing an entire dashboard framework?

## Summary

The repository should add a small, explicit integration seam rather than teaching the existing widgets Home Assistant's wire format.

1. A long-lived transport/session owner should manage authentication, connection status, reconnect generation, visibility handling, and subscription cleanup.
2. A shared entity source should normalize raw state by `entity_id`, share subscriptions, and expose selector-oriented reads.
3. Pure domain mappers should convert raw state plus registry metadata into the existing `*Entity` view models.
4. Typed action modules should build service payloads, normalize errors, and return promises; history and forecasts should be separate query functions.
5. Existing callback-driven tiles/widgets should remain presentational and locally own only interaction state.

**Ranked recommendation:** use `hass-react` as the strongest boundary/test reference, `hakit` for selector and typed-service ergonomics, and `thomasv04/ha-react-dashboard` as the closest applied component-first example. Use the official `home-assistant-js-websocket` and official frontend as protocol/lifecycle authorities, not as complete application dependencies. Treat `home-assistant-react/dashboard` as a later-scale decomposition reference and `darkmariachi/ha-dashboard` as a small-provider comparator with a visible action-error weakness.

## Detailed Findings

### The local starting point is already component-ready

`package.json:6-44` has React and UI/testing tooling but no Home Assistant client. `src/index.ts:1-70` exports domain widgets, normalized entity types, and layout primitives, not a transport. `LightWidgetProps` and `LightTile` show the intended boundary: normalized entity/history plus callbacks, with tile-local sheet state (`src/widgets/light/LightWidget.tsx:9-36`; `src/widgets/light/LightTile.tsx:5-19`). The alarm adapter demonstrates the provider-facing pattern for one domain (`src/widgets/alarm/hass.ts:4-27,64-134`).

That means the first implementation can be additive: create integration modules and containers above the current components rather than rewriting the UI around raw `HassEntity` objects.

### Canonical Home Assistant client and frontend

The official [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/) defines authentication, numbered commands/results, event subscriptions, and `call_service`. The official [home-assistant-js-websocket](https://github.com/home-assistant/home-assistant-js-websocket) client at pinned commit `84185e8a7d5a6be9c9d3d3168289575dcd18c9a9` provides the low-level reference:

- `lib/connection.ts:85-162,195-245,298-360` tracks in-flight commands/subscriptions, connection lifecycle, and reconnect behavior.
- `lib/entities.ts:47-131,134-207` turns compressed entity additions/removals/diffs into a map keyed by entity ID and handles attribute additions/removals.
- `lib/collection.ts:11-109,120-181` shares connection-local collections, starts the backend subscription at first consumer, and tears it down after a five-second last-subscriber grace period.
- `lib/services.ts:22-87` maintains service metadata from registration/removal events and debounces refreshes.

The official [frontend architecture](https://developers.home-assistant.io/docs/frontend/architecture/) is Lit/custom-element based, but its lifecycle is a useful comparator. `connection-mixin.ts` creates one shared `hass` context containing auth, connection, entities, registries, services, status, and `callService`/`callApi`/`callWS`; layout components consume that context rather than owning sockets. It also surfaces connected/disconnected/auth-invalid states and service errors. The React translation is a provider plus narrow hooks, not a socket prop on every card.

### Ranked examples

#### 1. `dlwiest/hass-react` — best foundation/reference

Pinned source: `88904eb70ff0a64d2b7cc443a3dda8daa7383ba9`.

Observed mechanisms:

- `src/services/entityStore.ts:9-55` stores entities by ID, per-entity subscription errors, and the active connection. Subscription bookkeeping is intentionally outside the public Zustand state so mounting a component does not publish every registration.
- `src/services/entityStore.ts:56-141,158-230,261-320` shares one `state_changed` subscription, batches initial snapshots, deduplicates concurrent registrations, unregisters callbacks, and uses connection generations to reject stale completions from an old connection.
- `src/types/transport.ts:1-34` defines a minimal `sendMessagePromise`/`subscribeEvents` connection and an alternate transport interface. The comments explicitly allow server-side credential handling, authorization, allowlisting, sanitization, and channel-loss reporting at that boundary.
- `src/providers/HAProvider.tsx:111-232,283-313` exposes idle/connecting/connected/disconnected/error states and removes listeners before closing a connection.
- `src/hooks/useServiceCall.ts:1-79` rejects while disconnected, sends typed `call_service` messages, supports response-returning calls, wraps errors, and applies bounded retry policy.
- Its tests cover shared subscriptions, initial snapshots, StrictMode/unmount races, stale connection completion, external transport, service payloads, and retry (`src/services/__tests__/entityStore.test.ts:78-258`; `src/providers/__tests__/HAProvider.externalTransport.test.tsx:138-260`; `src/hooks/__tests__/useServiceCall.test.tsx:28-197`).

Why it fits: it has the clearest answer to the hard correctness problems—one shared stream, stale connection protection, explicit connection state, injectable transport, and tests. Limit: its provider/store/auth/retry layer is substantially larger than this repository's initial need. Copy boundaries and acceptance tests, not the entire package policy.

Primary sources: [entity store](https://github.com/dlwiest/hass-react/blob/88904eb70ff0a64d2b7cc443a3dda8daa7383ba9/src/services/entityStore.ts), [transport interface](https://github.com/dlwiest/hass-react/blob/88904eb70ff0a64d2b7cc443a3dda8daa7383ba9/src/types/transport.ts), [provider](https://github.com/dlwiest/hass-react/blob/88904eb70ff0a64d2b7cc443a3dda8daa7383ba9/src/providers/HAProvider.tsx), [service hook](https://github.com/dlwiest/hass-react/blob/88904eb70ff0a64d2b7cc443a3dda8daa7383ba9/src/hooks/useServiceCall.ts).

#### 2. `shannonhochkins/ha-component-kit` / `@hakit/core` — best React-facing API model

Pinned source: `df12c20dba61ca68ab462fd3ec0918db16dc8a8f`.

Observed mechanisms:

- `packages/core/src/HassConnect/Provider.tsx:84-243` owns connection/auth and registers entity, registry, config, service, user, locale, and suspend/resume subscriptions.
- `packages/core/src/hooks/useHass/index.ts:1-52` exposes selector-based `useHass` access over a shared store.
- `packages/core/src/hooks/useSubscribeEntity/index.ts:1-31` makes missing-entity behavior explicit: return null when requested or throw a localized not-found error.
- `packages/core/src/hooks/useService/index.ts:8-74` creates typed domain service proxies with target normalization, service data, and response options.
- `packages/core/src/HassConnect/handleSuspendResume.ts:22-38,132-233` handles hidden/frozen/resumed pages and cleans up listeners.

Why it fits: it supplies the hook ergonomics and typed action shape that the current widgets need. Limit: its broad provider is a full ecosystem, and `Provider.tsx:40-43,264-287` uses a module-level attempted-URL guard that can make a provider remount/retry lifecycle surprising. Preserve an explicit retry path rather than copying that guard without its host assumptions.

Primary sources: [provider](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/core/src/HassConnect/Provider.tsx), [useHass](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/core/src/hooks/useHass/index.ts), [entity hook](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/core/src/hooks/useSubscribeEntity/index.ts), [service proxy](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/core/src/hooks/useService/index.ts), [visibility lifecycle](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/core/src/HassConnect/handleSuspendResume.ts).

#### 3. `thomasv04/ha-react-dashboard` — best applied component-first example

Pinned source: `76385c284af3c0814f946ff2eafc40ede23c3ac3`.

Observed mechanisms:

- `src/hooks/useSafeEntity.ts:4-49` selects one entity, returns null instead of throwing when it is missing, and uses shallow state/attribute comparison to suppress equivalent rerenders.
- `src/lib/ha-service.ts:15-54` centralizes friendly-name fallback, active-state interpretation, and domain-specific toggle service selection.
- `src/components/cards/LightCard/LightCard.tsx:50-157` keeps slider interaction state local, reads normalized entity data through hooks, and debounces continuous service actions.
- `src/hooks/useEntityHistory.ts:17-166` keeps history as a separate query, handles old/new Home Assistant response formats, carries forward sparse attributes, filters numeric points, downsamples, and cleans its refresh interval.
- `src/ha-panel.tsx:78-207` receives embedded HA auth, refreshes the access token, and keeps one React root alive across panel host reconstruction.

Why it fits: it demonstrates how to place domain service selection, safe entity access, history fetching, and local control state around real cards. Limit: it is a full product with theme, layout, add-on, panel, and server concerns; copy the seams, not the application surface. Its use of `@hakit/core` also inherits the provider lifecycle constraints above.

Primary sources: [safe entity](https://github.com/thomasv04/ha-react-dashboard/blob/76385c284af3c0814f946ff2eafc40ede23c3ac3/src/hooks/useSafeEntity.ts), [HA service helper](https://github.com/thomasv04/ha-react-dashboard/blob/76385c284af3c0814f946ff2eafc40ede23c3ac3/src/lib/ha-service.ts), [light card](https://github.com/thomasv04/ha-react-dashboard/blob/76385c284af3c0814f946ff2eafc40ede23c3ac3/src/components/cards/LightCard/LightCard.tsx), [history hook](https://github.com/thomasv04/ha-react-dashboard/blob/76385c284af3c0814f946ff2eafc40ede23c3ac3/src/hooks/useEntityHistory.ts), [panel entry](https://github.com/thomasv04/ha-react-dashboard/blob/76385c284af3c0814f946ff2eafc40ede23c3ac3/src/ha-panel.tsx).

#### 4. `home-assistant-react/dashboard` — later-scale decomposition reference

Pinned source: `bd8c27cd66bf83dfbb1e9e8e513fb15f6d80bac1`.

`HassProvider` owns connection creation, initial states, entity subscription, and auth errors (`packages/providers/src/HassProvider/HassProvider.tsx:22-137`). `DashboardProvider` owns dashboard mutations and persists them through a separate API client (`packages/providers/src/DashboardProvider/DashboardProvider.tsx:25-63`). Domain services centralize payload construction (`packages/api/src/services/light/light-services.ts:16-73`). This is useful if the project later becomes an editable dashboard product.

Limit: its ref-based live entity projection and separate per-hook subscription shape are less clear for a small live view. Treat it as evidence for provider/API decomposition, not as the first implementation target.

Primary sources: [HA provider](https://github.com/home-assistant-react/dashboard/blob/bd8c27cd66bf83dfbb1e9e8e513fb15f6d80bac1/packages/providers/src/HassProvider/HassProvider.tsx), [dashboard provider](https://github.com/home-assistant-react/dashboard/blob/bd8c27cd66bf83dfbb1e9e8e513fb15f6d80bac1/packages/providers/src/DashboardProvider/DashboardProvider.tsx), [light services](https://github.com/home-assistant-react/dashboard/blob/bd8c27cd66bf83dfbb1e9e8e513fb15f6d80bac1/packages/api/src/services/light/light-services.ts).

#### 5. `darkmariachi/ha-dashboard` — compact provider comparator

Pinned source: `00b7af2e6c7af4b6a39c4c2cfc584ac7c7722eb0`.

`HaProvider` owns a connection ref, entity map, registries, status, login/logout, service calls, raw messages, and custom subscriptions (`src/ha/HaProvider.tsx:33-73,81-227`). Entity and area metadata are normalized before domain cards (`src/ha/HaProvider.tsx:229-310`; `src/components/EntityCard.tsx:13-50`). It is a readable small-provider example.

The observed weakness is important: cards swallow rejected service calls with `.catch(() => {})`, so a rejected action can leave local optimistic slider state with no visible error (`src/components/cards/LightCard.tsx:26-38`). The bounded clone search found no test files. Use this example for compact shape, not error policy.

Primary sources: [provider](https://github.com/darkmariachi/ha-dashboard/blob/00b7af2e6c7af4b6a39c4c2cfc584ac7c7722eb0/src/ha/HaProvider.tsx), [entity card](https://github.com/darkmariachi/ha-dashboard/blob/00b7af2e6c7af4b6a39c4c2cfc584ac7c7722eb0/src/components/EntityCard.tsx), [light card](https://github.com/darkmariachi/ha-dashboard/blob/00b7af2e6c7af4b6a39c4c2cfc584ac7c7722eb0/src/components/cards/LightCard.tsx).

### Recommended local boundaries

The smallest durable shape that preserves the current UI is:

```text
src/ha/transport/
  authenticated connection, reconnect, status, send, subscribe, cleanup
src/ha/store/
  raw entity map, registries, connection state, subscription errors, selectors
src/ha/auth/
  embedded auth or standalone OAuth/token policy; no token props on widgets
src/ha/mappers/
  pure raw-state plus registry -> existing domain view models
src/ha/actions/
  typed domain actions, payload construction, error classification, readback policy
src/ha/queries/
  history, forecast, and other request/response data with cancellation/refetch
src/ha/hooks/
  selector hooks and domain composition hooks
src/widgets/
  existing normalized props, callback contracts, and local interaction state
```

This is a recommendation, not an existing tree. One app-level connection owner should feed a shared raw entity source. Containers/hooks should select the minimum state and call pure mappers/actions. Widgets should never import the transport client or know raw attribute names.

### First implementation acceptance gates

Before any live Home Assistant connection is considered working, a fake/injected connection should prove:

- initial entity snapshot, state update, entity removal, service success, service rejection, reconnect, and stale old-connection completion;
- two widgets for the same entity share one server-side subscription; removing one keeps the other alive; final unmount cleans up;
- an old connection cannot publish into the current store;
- missing/unavailable entities render the existing fallback without throwing;
- every service rejection is observable by a caller/top-level error surface;
- presentational widget tests continue to use plain normalized fixtures and callback spies without importing Home Assistant packages.

## Architecture Documentation

The adoption decision is intentionally narrower than copying a framework:

- **Use from `hass-react`:** connection-generation protection, shared subscriptions, injectable transport, explicit connection status, typed action error handling, and the failure tests.
- **Use from `hakit`:** selector hooks, explicit missing-entity behavior, typed domain service proxies, and visibility cleanup.
- **Use from Thomas's dashboard:** safe entity selectors, centralized action selection, local slider state with reconciliation, separate history queries, and embedded auth refresh.
- **Use from official sources:** WebSocket protocol, entity collection semantics, auth lifecycle, service/event behavior, and connection/error status concepts.
- **Avoid initially:** complete dashboard editors, registry breadth not needed by the current UI, opaque optimistic state, swallowed action errors, and a dependency that imports a whole dashboard framework.

## Code References

- Local callback boundary: `src/widgets/light/LightWidget.tsx:9-36`; `src/widgets/light/LightTile.tsx:5-19`; `docs/widgets.md:5-18`.
- Local adapter precedent: `src/widgets/alarm/hass.ts:4-27,64-134`.
- Official client: `lib/connection.ts:85-162,195-245,298-360`; `lib/entities.ts:47-131,134-207`; `lib/collection.ts:11-109,120-181`; `lib/services.ts:22-87` at pinned commit `84185e8a7d5a6be9c9d3d3168289575dcd18c9a9`.
- `hass-react`: `src/services/entityStore.ts`, `src/types/transport.ts`, `src/providers/HAProvider.tsx`, `src/hooks/useServiceCall.ts` at pinned commit `88904eb70ff0a64d2b7cc443a3dda8daa7383ba9`.
- `hakit`: provider/hooks/service/visibility paths at pinned commit `df12c20dba61ca68ab462fd3ec0918db16dc8a8f`.
- Thomas dashboard: safe entity, service helper, light card, history, and panel entry at pinned commit `76385c284af3c0814f946ff2eafc40ede23c3ac3`.

## External Sources

- [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/)
- [Home Assistant authentication](https://www.home-assistant.io/docs/authentication/)
- [Official home-assistant-js-websocket](https://github.com/home-assistant/home-assistant-js-websocket)
- [Official frontend architecture](https://developers.home-assistant.io/docs/frontend/architecture/)
- [hass-react](https://github.com/dlwiest/hass-react)
- [hakit / ha-component-kit](https://github.com/shannonhochkins/ha-component-kit)
- [ha-react-dashboard](https://github.com/thomasv04/ha-react-dashboard)
- [home-assistant-react/dashboard](https://github.com/home-assistant-react/dashboard)
- [darkmariachi/ha-dashboard](https://github.com/darkmariachi/ha-dashboard)

## Open Questions

- Will the first host run embedded inside Home Assistant, as a standalone OAuth app, or behind a server-side transport? This changes auth, CORS, token storage, and service allowlisting.
- Should the first implementation use the official `home-assistant-js-websocket` directly or an injected transport interface that can later support a backend-for-frontend?
- How much registry metadata is needed for the first dashboard: friendly names only, or areas/devices/floors as well?
- What should the reconciliation UX be for continuous controls such as brightness sliders and cover position while Home Assistant lags or rejects a command?
- Which history/forecast queries are in the first vertical slice, and what loading/error/cache policy do they require?
- What is the minimum supported Home Assistant version for compressed entity updates, forecast response formats, and auth behavior?

## Checks Run

- Read the isolated repository worktree and verified it remained clean at `6486e0e44b54ba74c9fd5a53360f0b309e12a08d`.
- Inspected pinned primary-source clones of `hass-react`, `ha-component-kit`/`@hakit/core`, `home-assistant-react/dashboard`, `darkmariachi/ha-dashboard`, `thomasv04/ha-react-dashboard`, official `home-assistant-js-websocket`, and a bounded official frontend checkout.
- Re-read the official WebSocket, authentication, and frontend architecture references and the cited source files. Some HTML retrievals returned HTTP 429; pinned git/raw sources remained available for the load-bearing implementation claims.
- Searched the bounded ecosystem set rather than claiming an exhaustive census.
- No repository runtime integration, dependency change, commit, push, or live Home Assistant test was performed during the research pass.

## Next Action

The first vertical slices are implemented: a shared injected transport/store, pure light, climate, and sensor mappers, typed light/climate actions, and `HaLightTile`/`HaClimateTile`/`HaSensorTile` preserve the existing widget boundary. The next action is to choose the authentication/deployment mode and run the acceptance gates against a real host, keeping fake/injected evidence separate from live evidence.
