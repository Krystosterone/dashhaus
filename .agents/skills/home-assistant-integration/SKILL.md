---
name: home-assistant-integration
description: Keeps Home Assistant transport, raw entity state, mappers, actions, and React containers behind the dashboard's normalized card props. Use when adding or reviewing live Home Assistant integration, entity adapters, service actions, connection/store code, or dashboard containers. Don't use for presentational card styling, Storybook-only demo fixtures, or generic React components.
---

# Home Assistant integration

Preserve the repository's component boundary while adding live Home Assistant data. The integration owns connection lifecycle, raw snapshots, capability checks, service payloads, and action errors; cards receive the existing normalized entities and callbacks.

Read `docs/home-assistant.md` before changing the boundary. The current contract lives there; `research/05-ha-integration-map.md`, `research/06-ha-entity-contracts.md`, and `research/07-react-ha-architecture.md` are the historical evidence behind it.

## Procedure

### Boundary

- Put provider-facing code in `@scope/core`'s Home Assistant layer (`packages/core/src/ha/`). Keep every `src/skins/<skin>/cards/` tree independent of Home Assistant wire objects and transport imports; within a skin, only its `ha/` and `lovelace/` trees, and its entry, may import core's Home Assistant subpaths (`.`, `./websocket`, `./demo`, `./testing`, `./fixtures/*`), while presentation imports `./entities`, `./primitives` and `./hooks`. Core's HA layer never imports a skin; the bundle registration lives outside it, in `apps/lovelace/entry.ts`. Mappers import normalized models from `@scope/core/entities/*`, never a skin.
- Preserve raw entity snapshots keyed by `entity_id`, including the raw state string, attributes, and timestamps.
- Keep `unknown`, `unavailable`, missing entities, and capability absence explicit. Suppress stale measured readings in the normalized model while an entity is unavailable; never default them to a safe-looking active or closed state.

### Mappers

Make mappers pure. Convert one raw domain object plus optional metadata into the existing card model, and test normal, unavailable, unknown, missing, and capability-limited inputs beside the mapper.

- **Light:** reject non-finite or out-of-wire brightness rather than clamping invalid measurements into a plausible percentage; use an explicit allowlist of brightness-capable color modes; omit Kelvin readings outside the entity's own consistent min/max bounds.
- **Climate:** omit target setpoints outside the reported control bounds.
- **Timestamps:** parse through `packages/core/src/ha/time.ts`: validate ISO date/time components and reject nonexistent timezone-less local times during DST gaps. Format against the hook's minute clock (`now` mapper option): time for today, weekday and time within a week, date before that; never a bare time for an older day.
- **Read-only sensor slice:** compose a primary temperature/humidity entity with explicit companion snapshots; parse the raw numeric state rather than stale attributes; treat an explicit device class as authoritative over a contradictory unit; allow unit fallback only when the class is absent; omit out-of-range percentages.
- **Weather/home slice:** map `weather.*` conditions/readings plus explicit AQI and `sun.sun` companions; require an explicit AQI scale assertion before applying the normalized US-AQI bands; keep unknown daylight neutral; suppress measured values while the weather state is unknown or unavailable; parse `weather.get_forecasts` response records separately from current state.
- **Forecasts:** require valid forecast timestamps even when fallback hour/day fields are supplied; reject contradictory explicit hourly fields; use local-calendar rollover arithmetic across DST.
- **Cover:** gate position, stop, and tilt on `supported_features` bits; map `unknown` to unavailable rather than closed; never send the card's presentation fallback position back as measured state.
- **Toggle:** retain the domain (`input_boolean` or `switch`) beside the entity because the card model cannot carry it; the timed-on sheet feature stays a host timer hook because neither domain has a native duration service.
- **Alarm:** default `codeArmRequired` to true; map unrecognized states including `unknown` to unavailable; take delay and open-sensor metadata from host options rather than inventing them.
- **History:** read `history/history_during_period` with `entity_ids` and `significant_changes_only: false`; the reply is `{ [entity_id]: [{ s, a, lu, lc? }] }` with epoch-second times. Parse it defensively; drop rows without a time; carry the latest pre-midnight record into hour 0; extend the day with live changes after the read and read again at local midnight; keep the hour axis local-calendar so DST days still yield 24 samples; mark pre-first-record hours `unavailable` for state domains and `null` for sensor/weather readings; the current hour's sample is the current state's value; minute totals count full past hours plus the current minute; climate derives `activity` from the day's dominant `hvac_action`; sensor composes temperature plus an optional humidity entity; weather reads the `temperature` attribute, never the condition state.
- **Registry:** resolve an entity's area through `config/entity_registry/list_for_display`, `config/device_registry/list` and `config/area_registry/list`: the entity's own area, else its device's; read once per generation; return undefined when the transport lacks generic commands; an explicit connected-surface prop always wins over the lookup.

### Actions

Make actions typed and domain-specific.

- Build the native service payload in one action module.
- Gate unsupported controls; reject non-finite values and domain-range violations; clamp bounded percentage controls to their supported payload range; preserve ordering for ranged controls.
- Distinguish service acceptance from later state readback; never invent optimistic confirmation. Expose rejected actions to the store or an explicit error callback.
- When a domain provides native `turn_on`/`turn_off` semantics, use them instead of inventing a remembered mode.
- Never log or persist alarm PINs. Classify a recognized wrong code through the sanitized error scalars (`translationKey`/`providerCode` on `HaActionError`), never through raw provider objects or messages.

### Store

Use one shared store per connection. Keep it small: the transport owns the socket.

- The transport delivers the full entity map on subscribe and after every change, keeps unchanged entities' object identity, and keeps the subscription alive across its own reconnects. The official adapter gets all of this from `home-assistant-js-websocket`'s `subscribeEntities`; do not re-implement the compressed stream or resubscription.
- Fan snapshots out to React; isolate subscriber callback failures. Components select slices (`useHaEntity`, `useHaStatus`, `useHaGeneration`); never subscribe a connected surface to the whole snapshot.
- Clear stale entities on loss. Advance `generation` on every loss, recovery, failure, connect and disconnect; a read or action that settles under a newer generation has an unknown outcome.
- Concurrent callers share one `connect()`. A terminal transport error or a throwing subscription fails closed with a sanitized error. `disconnect()` unsubscribes and clears state; the host that opened the connection closes it.
- Route background reads through `useHaRequest` over `store.query` (forecasts) or `store.callApi` (history, registries); both stay out of action ordering and `lastActionError`.
- Only the latest action owns `lastActionError`, and only within its generation. Keep provider string scalars (`translation_key`, `code`), never messages.
- Shared React providers need reference-counted ownership so replacing/unmounting one provider cannot tear down a store still used by another.
- The current Orb and Field Lovelace cards extend `LovelaceDashboardElement` from `src/ha/lovelace/element.tsx`. The base builds its transport from the frontend's `hass.connection`: one store per connection, never closed by a card, and no re-render on every `hass` set; entity states reach connected surfaces through the store. New card implementations reuse that shared lifecycle rather than duplicating it; equivalent composition is acceptable.

### Containers

Each domain gets a UI-free hook, `packages/core/src/ha/hooks/<domain>.ts` (`useHa<Kind>(entityId, options)` returning `{ entity, history, actions }`). Each skin that draws it gets a thin connected container under `src/skins/<skin>/ha/`, named for that skin's surface such as `Ha<Kind>Tile` or `Ha<Kind>Module`; it only adapts the shared result to the presentational component. In the hook, select raw entities with `useHaEntity`, run the minute clock (`useNow` from `packages/core/src/hooks/`) into the mapper and history parser, and memoize the mapped entity, parsed history and handlers. Companion entities and their defaults belong in the hook, so every skin gets them. Keep optimistic interaction state out of the integration; histories and registry metadata are their own read-only slices, never a current reading and never action state.

The weather/home container owns hourly/daily `weather.get_forecasts` request/response parsing through `useHaRequest`, keyed by entity, scope and hour so forecasts refresh hourly while the previous hour's stays up; partial success is independent and failures reach `onForecastError`. Forecast arrays remain separate from the current-state mapper.

### Adding a domain or skin surface

When a domain joins the shared connected boundary, start from `npm run new-card -- <name> --code <xx> --domain <domain>`. The current generator writes the shared mapper, actions, fixture and demo transport plus Orb's initial connected tile, tests, story and registrations. Then:

- Add its canonical raw fixture to `packages/core/src/ha/fixtures/` and register it in `packages/core/src/ha/mappers/fixtures.test.ts`, which runs every fixture entity through the real mapper. Include representative states plus `unknown`/`unavailable`; toggle fixtures span both `input_boolean` and `switch` ID prefixes. Forecast and history response fixtures stay in their parser tests because they are request/response data rather than entity snapshots.
- Ship a Storybook demo transport that exercises the real store, mapper, action and history path, and a story for that generated Orb tile. The demo transport answers `history/history_during_period` in the compressed wire shape and the three registry lists, so the story shows the Today strip and a registry-resolved area.
- For a domain that already has this shared slice, follow `AGENTS.md` → Adding an existing domain to another skin. Reuse the hook and demo transport; add only the skin's presentational card, thin connected surface and Lovelace config/auto/renderer entries. Export both components and their prop types; load token CSS once at the skin's entry, never from an individual card or connected surface. The skin's Lovelace renderer reuses its connected surface instead of repeating hook-to-view wiring.

## Verification

Run `npm run check` (typecheck, lint including the import boundary, and unit tests), `npm run test-storybook` and `npm run build:ha`; all must pass at the final revision. Exercise the affected skin's connected surface through its state matrix at every supported size and footprint, including compact, details, unavailable and worst-case labels. If no live Home Assistant instance is available, report the injected/fake transport evidence separately from live connection evidence.

The ESLint boundary permits `@scope/core`'s Home Assistant subpaths only from `src/skins/*/ha/`, `src/skins/*/lovelace/` and the skins' entries (`src/skins/*/index.ts`); only `@scope/core/websocket` imports `home-assistant-js-websocket`. Fix a crossing at its source instead of weakening the rule. Documentation must name the exact evidence boundary: fake/injected tests are not proof of a live Home Assistant instance.

## Output

Report the changed integration paths, the exact test and check results, and the live boundary separately. Use `live Home Assistant runtime unrun` unless a real authenticated connection, service action, reconnect, and state readback were exercised.

## Recovery

- If a mapper needs a raw field that the card model cannot represent, preserve it in the raw snapshot or an explicit adapter-side type. If the UI must distinguish missing data, evolve the normalized model deliberately with presentation/tests; never fabricate a measured value just to satisfy an old required field.
- If a normalized control requires bounds or a step that Home Assistant defines a documented metadata default for, keep that distinction explicit: metadata defaults may keep a control usable, but never default current/target readings, availability, or state.
- When the connection changes, advance the generation first. Ignore entity callbacks from an abandoned subscription, and drop forecast, history and registry results from an older generation.
- Treat transport and Home Assistant payloads as untrusted input: malformed entity shapes fail closed, and public lifecycle/action errors must not retain raw provider error objects or their messages.
- If the boundary lint rule fails, inspect the import direction and fix the source boundary rather than weakening the rule; keep raw Home Assistant coupling out of presentational cards.
- Do not add authentication tokens to card props or commit real credentials. Authentication belongs to the host-supplied transport or the official Home Assistant client adapter.
