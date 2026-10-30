# Home Assistant integration

The dashboard remains a React/TypeScript component library. The normalized entity models (`LightEntity`, `ClimateEntity`, …) live in `packages/core/src/entities/`, free of any UI, so more than one skin can sit on them; a skin's cards take those models and callback actions as props. Home Assistant wire data is owned by `packages/core/src/ha/`, whose mappers and actions import only from `packages/core/src/entities/`.

## Data flow

```text
Home Assistant auth + connection
  -> injected transport / official websocket adapter
     -> shared entity store (raw snapshots + connection status)
        -> pure domain mapper + capability gate
           -> useHa<Kind>() hook: { entity, history, actions }
              -> any skin; in orb, the Ha*Tile container -> Tile/Card props
              (or the hook as a headless component: <HaLight entityId>{(light) => …}</HaLight>)
```

The store is the source for current state. A successful service call means Home Assistant accepted the command; it is not proof that the entity reached the requested state. The next entity snapshot is the readback boundary.

## Connected entity slices: lights, climate, sensors, weather, covers, toggles, alarms, humidifiers, and sounds

The integration now covers one `light.*` entity, one `climate.*` entity, one composed `sensor.*` view, one composed `weather.*` home view, one `cover.*` entity, one `input_boolean.*`/`switch.*` toggle, one `alarm_control_panel.*` entity, one `humidifier.*` entity, and one sound `switch.*` with its volume `number.*`:

- `packages/core/src/ha/types.ts` defines the raw snapshot, transport, connection status, and action-error contracts.
- `packages/core/src/ha/store.ts` turns one transport into a snapshot store: status, raw entities, a `generation`, and the latest action error. The transport keeps the entity subscription alive across its own reconnects; the store clears entities while the connection is down and advances `generation` on every loss, recovery, failure, connect and disconnect, so a read or action that settles under a newer generation is reported as an unknown outcome. Concurrent callers share one `connect()`; a terminal transport error or a throwing subscription fails closed with a sanitized error; `disconnect()` unsubscribes and clears state but leaves closing the connection to the host that opened it. Subscriber callback failures are isolated, and service input is validated before it reaches the transport.
- `packages/core/src/ha/provider.tsx` exposes the store through React. `useHaEntity` (and `useHaSelector`, `useHaStatus`, `useHaGeneration`) re-render only when their slice changes; unchanged entities keep their identity across updates, so one sensor ticking does not re-render every tile. `useHaSnapshot` re-renders on every change and is meant for diagnostics.
- `packages/core/src/ha/useHaRequest.ts` runs background reads (history, registries, forecasts) through the store, shared across callers by store, generation and key, with results from an older generation dropped.
- `packages/core/src/ha/mappers/light.ts` maps raw light state and `supported_color_modes` into the existing `LightEntity` model, with `hs_color` for a colour lamp while its `color_mode` is a colour (not `color_temp`).
- `packages/core/src/ha/actions/light.ts` builds `light.toggle` and `light.turn_on` payloads (`brightness_pct`, `color_temp_kelvin`, `hs_color`) and reports rejected actions.
- `packages/core/src/ha/hooks/light.ts` (`useHaLight`) selects the raw light, maps it, reads today's history and builds the handlers; `src/skins/orb/ha/HaLightTile.tsx` is that hook above the existing `LightTile`. Every kind has the same pair: a `useHa<Kind>` hook in `packages/core/src/ha/hooks/` that any UI can call, and a `Ha<Kind>Tile` that hands its result to this UI's tile.
- `packages/core/src/ha/mappers/climate.ts` maps HVAC modes/actions, temperatures, setpoint ranges, limits, units, presets, fans, and timestamps into the existing `ClimateEntity` model.
- `packages/core/src/ha/actions/climate.ts` builds climate on/off, setpoint, range, mode, preset, and fan payloads, gates capability arrays, validates finite/ranged temperatures, and reports rejected actions.
- `src/skins/orb/ha/HaClimateTile.tsx` and `src/skins/field/ha/HaClimateModule.tsx` connect the same hook to each skin without changing the normalized climate contract.
- `packages/core/src/ha/mappers/sensor.ts` composes a primary temperature or humidity sensor with optional humidity and battery companions, preserving numeric readings, units, availability, outdoor metadata, and timestamps.
- `src/skins/orb/ha/HaSensorTile.tsx` and `src/skins/field/ha/HaSensorModule.tsx` connect `useHaSensor` to each skin's read-only sensor; neither has service actions.
- `packages/core/src/ha/mappers/weather.ts` maps `weather.*` conditions and numeric readings, composes explicit `sensor.*` AQI and `sun.sun` companions, and parses response-shaped hourly/daily forecast data without treating forecasts as current state.
- `packages/core/src/ha/hooks/weather.ts` (`useHaWeather`) requests hourly and daily forecasts through `weather.get_forecasts` with a response request, and leaves forecast failures observable through `onForecastError`; `src/skins/orb/ha/HaWeatherTile.tsx` and `src/skins/field/ha/HaWeatherModule.tsx` connect it to each skin's read-only weather.
- `packages/core/src/ha/mappers/cover.ts` maps raw cover state, device class, position/tilt readings, and `supported_features` bits (set-position, stop, tilt) into the existing `CoverEntity` model; unknown is never presented as closed.
- `packages/core/src/ha/actions/cover.ts` builds `cover.open_cover`, `close_cover`, `stop_cover`, `set_cover_position`, and `set_cover_tilt_position` payloads, gated by the entity's feature flags, and never sends a presentation fallback position as measured state. `packages/core/src/ha/hooks/cover.ts` (`useHaCover`) wires them to the store; `src/skins/orb/ha/HaCoverTile.tsx` and `src/skins/field/ha/HaCoverModule.tsx` connect it to each skin's cover, with today's openness history.
- `src/skins/orb/ha/HaCoverTile.tsx` connects the store to the existing `CoverTile`.
- `packages/core/src/ha/mappers/toggle.ts` maps raw `input_boolean.*`/`switch.*` state into the existing `ToggleEntity` model; icon, colour, and description stay host metadata because Home Assistant carries none of them.
- `packages/core/src/ha/actions/toggle.ts` builds a domain-native toggle service (`input_boolean.toggle` or `switch.toggle`), the domain read from the entity id; the card's timed-on sheet feature stays a host timer hook because neither domain has a native duration service.
- `packages/core/src/ha/hooks/toggle.ts` (`useHaToggle`) wires them to the store; `src/skins/orb/ha/HaToggleTile.tsx` and `src/skins/field/ha/HaToggleModule.tsx` connect it to each skin's toggle.
- `packages/core/src/ha/mappers/alarm.ts` maps raw `alarm_control_panel` state, `supported_features` mode bits, code policy, delays, and trigger context into the existing `AlarmEntity` model; unknown states map to unavailable.
- `packages/core/src/ha/actions/alarm.ts` builds the arm/disarm services with an optional code, resolves false for a recognized wrong code (sanitized `translation_key`/service-validation scalar) and rejects for anything else; codes are never logged or persisted. `packages/core/src/ha/hooks/alarm.ts` (`useHaAlarm`) wires them to the store; `src/skins/orb/ha/HaAlarmTile.tsx` and `src/skins/field/ha/HaAlarmModule.tsx` connect it to each skin's alarm, with today's armed hours.
- `packages/core/src/ha/mappers/owlet.ts` composes an Owlet sock (custom `owlet` integration) from its sleep state sensor and its heart rate and oxygen companions, found beside it by `owletCompanionIds` with its charging and ten alert binary sensors and its base station `switch.*`; `unknown` and charging are unavailable, each reading is dropped on its own when it is 0, not a number or out of range, only an `on` alert sensor sounds, and the base station is on or off only while its switch says so. `packages/core/src/ha/actions/owlet.ts` sends `switch.turn_on` or `switch.turn_off` to the base station for the state shown, and nothing else: the readings are read-only. `packages/core/src/ha/hooks/owlet.ts` (`useHaOwlet`) reads the binary sensors through `useHaEntities`, which re-renders only when one of them changes; `src/skins/orb/ha/HaOwletTile.tsx` and `src/skins/field/ha/HaOwletModule.tsx` connect it to each skin, the base station's switch in their details only.
- `src/skins/orb/ha/HaAlarmTile.tsx` connects the store to the existing `AlarmTile`.
- `packages/core/src/ha/mappers/humidifier.ts` maps raw `humidifier.*` state, `device_class` (humidifier or dehumidifier), `action`, current and target humidity, `min_humidity`/`max_humidity` (Home Assistant's 0–100 when absent), and `mode`/`available_modes` into `HumidifierEntity`; `unknown` is unavailable, readings are dropped while unavailable, and a target outside the bounds is left out rather than clamped.
- `packages/core/src/ha/actions/humidifier.ts` builds `humidifier.toggle`, `set_humidity` (whole percent, validated against the bounds, offered only when the entity reports a target) and `set_mode` (only listed modes). `packages/core/src/ha/hooks/humidifier.ts` (`useHaHumidifier`) wires them to the store; `src/skins/orb/ha/HaHumidifierTile.tsx` and `src/skins/field/ha/HaHumidifierModule.tsx` connect it to each skin's humidifier, with today's on/off history.
- `packages/core/src/ha/mappers/sound.ts` maps a sound machine's sound `switch.*` and its volume `number.*` into `SoundEntity`: the volume is a percent of the number's `min`/`max`, left out when it reports none, is out of range, or the switch is unavailable. `soundVolumeCandidates` finds the volume beside the switch (`switch.<device>_music` → `number.<device>_music_volume`, then `number.<device>_volume`, as the Tuya integration names them).
- `packages/core/src/ha/actions/sound.ts` builds `switch.toggle` and `number.set_value` (the percent turned back into the number's range and step); setting the volume never switches the sound. `packages/core/src/ha/hooks/sound.ts` (`useHaSound`) wires them to the store; `src/skins/orb/ha/HaSoundTile.tsx` and `src/skins/field/ha/HaSoundModule.tsx` connect it to each skin's sound, with today's on/off history.

The store routes action service calls through `callService` and background reads through `query` (forecasts) or `callApi` (generic websocket commands such as `history/history_during_period`), the last two never mutating action ordering or `lastActionError`. A rejection is classified as `transport_unknown` when the connection changed during the call or the library reports `ERR_CONNECTION_LOST` (code `3`), otherwise `service_failed`; only the provider's `translation_key` and `code` string scalars are kept, never its message, which can echo an alarm code. The latest failed non-sensitive action can be retried from the store; calls containing an alarm code and calls with an unknown outcome are never retained for retry.

`packages/core/src/websocket.ts` adapts an official `home-assistant-js-websocket` connection. Entities come from the library's `subscribeEntities` collection, which decodes the compressed `subscribe_entities` stream and resubscribes on every reconnect; the library reconnects with backoff. The adapter forwards `ready`, `disconnected` and `reconnect-error` (invalid auth, after which the library stops retrying) as `connected`, `disconnected` and `error`. Injected transports follow the same contract: deliver the full entity map on subscribe and after every change, keep unchanged entities' identity, and keep the subscription alive across their own reconnects. `HaProvider` uses shared ownership counts and defers final cleanup by one microtask to remain safe under React StrictMode's effect replay.

The official adapter is optional at the host boundary. `connectHomeAssistant(auth)` opens a connection and the host closes it with `transport.close()`; tests and Storybook use injected transports, so the component library does not require a live instance to build or verify.

## The Lovelace card

The deployed host is the orb skin's `custom:home-dashboard` custom element (`src/skins/orb/lovelace/card.tsx`), which Home Assistant's frontend loads as a dashboard resource; what every skin's card shares is in `src/ha/lovelace/` (`element.tsx`, the base the card extends, and `styles.ts`), and the bundle's entry that registers both cards is `apps/lovelace/entry.ts`. Lovelace hands it the YAML config and a live `hass`. The card builds the transport from `hass.connection` with `createHomeAssistantTransport`, so it shares the frontend's authenticated socket and never closes it. It re-renders only for config, connection and dark-mode changes, because entity states reach the tiles through the store. In `src/skins/orb/lovelace/`, `config.ts` checks the YAML and normalizes it, `ConfigDashboard.tsx` maps each card onto its `Ha*Tile` inside the dashboard layout helpers, and `auto.ts` generates a layout from states plus the entity, device and area registries. The card renders into a shadow root: the build (`vite.lovelace.config.ts`) inlines every stylesheet and `styles.ts` moves tokens.css's `:root` rules onto `:host`. Deployment and the YAML format are in [deploy.md](deploy.md).

## Usage with an injected transport

```tsx
import {
  HaLightTile,
  HaClimateTile,
  HaSensorTile,
  HaWeatherTile,
  HaProvider,
  createHaStore,
  connectHomeAssistant,
} from "./src";

const transport = await connectHomeAssistant(auth);
const store = createHaStore(transport);

root.render(
  <HaProvider store={store}>
    <HaLightTile entityId="light.living_room" footprint="standard" />
  </HaProvider>,
);
```

The same store can feed a climate tile without changing the card contract:

```tsx
<HaClimateTile entityId="climate.living_room" footprint="standard" />
```

A sensor tile can compose one primary temperature entity with linked humidity and battery entities:

```tsx
<HaSensorTile
  entityId="sensor.living_room_temperature"
  humidityEntityId="sensor.living_room_humidity"
  batteryEntityId="sensor.living_room_battery"
  footprint="standard"
/>
```

The weather tile selects its optional companions explicitly. It requests both forecast scopes through the same store; pass `loadForecasts={false}` when the host supplies forecast arrays through another query boundary:

```tsx
<HaWeatherTile
  entityId="weather.home"
  aqiEntityId="sensor.home_aqi"
  aqiScale="US"
  sunEntityId="sun.sun"
  footprint="standard"
  onForecastError={(error) => reportDashboardError(error)}
/>
```

The transport's optional service-call target and `returnResponse` options are used for the native forecast response path. A successful request means Home Assistant accepted the query; parsed forecast arrays remain separate from current-entity readback.

To surface a rejected action, read `useHaSnapshot()` or pass `onActionError` to an individual `Ha*Tile`. The Lovelace `ConfigDashboard` reads the shared store once and shows one page-level recovery row with the affected entity, Retry when repeating the call is safe, and Dismiss. The row floats at the bottom of the view, so it is in sight wherever the failed control was, and it never moves a card. Wrong alarm codes stay in the keypad, where the specific recovery already exists. The raw entity snapshot remains authoritative for readback.

## Contract rules

- Preserve raw `state`, `attributes`, `last_changed`, and `last_updated` before mapping.
- Keep `unknown`, `unavailable`, and a missing entity distinct from `off`.
- Derive light capabilities from `supported_color_modes`; do not infer support from a stale `brightness` attribute alone.
- Convert Home Assistant brightness (`0..255`) to the card's percent contract (`1..100`). If a capable light has not reported brightness, reports a non-finite/out-of-range value, or its raw state is `unknown`/`unavailable`, keep normalized brightness and Kelvin readings absent while retaining capability metadata; render the safe on/off fallback and never send or display a fabricated measured value.
- Treat `last_changed` as a state-transition timestamp, not as proof of last reachability. `lastSeen` is populated only from explicit adapter metadata.
- Accept timestamps only when their ISO date/time components are valid; reject nonexistent timezone-less local times during DST gaps and do not let JavaScript date normalization turn impossible values into plausible display times. Display them relative to the tile's minute clock: the time for today, weekday and time within the last week, the date before that.
- Reject non-finite brightness/Kelvin inputs and Kelvin values outside the entity's reported range before sending a service payload.
- Climate modes/actions, current/target temperatures, ranges, limits, units, presets, and fans are mapped only from their raw attributes. Missing current or target readings stay absent, and stale measured values are suppressed while the raw entity is unknown or unavailable; documented Home Assistant defaults are used only for control metadata needed by the normalized card.
- Climate range actions order `target_temp_low <= target_temp_high`, validate both values against the reported bounds, and use `climate.turn_on`/`climate.turn_off` rather than inventing a prior HVAC mode.
- Sensor mappers parse numeric `sensor.*` states for the supported temperature, humidity, and battery device classes; when `device_class` is absent, a recognized temperature unit may provide the temperature fallback, but an explicit other class wins over a contradictory unit. Companion humidity/battery entities are optional, percentage values outside `0..100` are omitted, blank/invalid numeric states are omitted, and unknown/unavailable primary entities suppress normalized readings rather than exposing stale attributes.
- Weather mappers accept the documented Home Assistant condition set, suppress current readings while the weather state is `unknown` or `unavailable`, reject invalid humidity/UV/wind/AQI values, and never infer `isDay` from a missing or unavailable `sun.sun` companion. Only an explicit AQI companion with `device_class: "aqi"`, a declared `aqiScale="US"`, and a `0..500` value is mapped into the repository's US-AQI model; without the scale assertion, AQI remains absent.
- Weather forecasts are a separate `weather.get_forecasts` query product. The integration requests `hourly` and `daily` scopes with a target and response flag through `store.query`, which stays out of action ordering and `lastActionError`, reads each scope once per hour (keeping the previous hour's forecast up while the next loads), deduplicates in-flight requests by store/generation/entity/scope/hour across StrictMode effect replay, requires a valid forecast timestamp before accepting any record (even when an explicit hour/day field is present), rejects contradictory explicit hourly fields instead of letting a convenient fallback override the timestamp, uses local-calendar hours so DST does not create 23/25-hour rollover values, validates condition/temperature fields, rejects inverted daily high/low bounds, omits incomplete daily records, ignores late results across reconnects with generation checks, and reports each rejected request via `onForecastError` while retaining a successful result from the other scope; no forecast value becomes a current reading.
- Keep domain action payload construction in `packages/core/src/ha/actions/`, not in cards or Storybook stories. Each module runs its services through `serviceRunner()` (`packages/core/src/ha/actions/run.ts`), which sanitizes rejections and refuses actions on an unavailable entity; an entity whose state is `on`/`off` reads today through `onOffHistoryFromHass`.
- Cover mappers gate position, stop, and tilt on the entity's `supported_features` bits, map `unknown` to unavailable rather than closed, and never send the card's presentation fallback position back as measured state.
- Toggle integration reads the domain (`input_boolean` or `switch`) from the entity id, so `ToggleEntity` needs no field for it; the card's timed-on sheet feature stays a host timer hook because neither domain has a native duration service.
- Alarm mappers default `codeArmRequired` to true, map unrecognized states including `unknown` to unavailable, and take delay/open-sensor metadata from host options rather than inventing it. Alarm actions resolve false only for a recognized wrong code (the sanitized `invalid_code` translation-key scalar); any other rejection, including a bare service-validation scalar, means the call did not go through, and codes are never logged or persisted.
- When a compact home card hides its control (`footprint="compact" showControl={false}`), preserve the normalized details interaction: the value row remains keyboard and pointer activatable and opens the existing details sheet.
- Keep optimistic interaction state separate from the current-state mapper. Histories and registry metadata are their own read-only slices: pure per-domain parsers over `history/history_during_period` rows plus a registry lookup, fetched through `store.callApi`, never a current reading and never action state.

### History slice

`packages/core/src/ha/useHaHistory.ts` reads the local day through `history/history_during_period` (`entity_ids`, local midnight to now, `include_start_time_state`, `significant_changes_only: false` so attribute-only changes such as brightness, position, `hvac_action` and weather temperature are included). The response is an object keyed by entity id holding compressed rows `{ s, a, lu, lc? }` with epoch-second times; `packages/core/src/ha/fixtures/history_during_period.json` follows that shape. (Earlier revisions called `recorder/history_during_period`, which does not exist; see the correction in [research/README.md](../research/README.md#corrections).) After the read, every live change to the requested entities extends the day, so the strip stays current without polling; the read repeats for every new connection generation and at local midnight. Failures resolve to no history; `loadHistory={false}` or a host-supplied `history` prop replaces the read.

`packages/core/src/ha/history.ts` parses rows into records (a row's time is `lu`, falling back to `lc`; rows without attributes carry the previous row's forward) and walks them per domain into the existing history models. The latest record from before midnight is the state carried into hour 0; records after `now` are ignored; the hour axis is local-calendar (DST days still yield 24 samples); hours before the first record read `unavailable` for state domains and `null` for readings; minute totals count full past hours plus the current minute. Climate derives `activity` from the day's dominant `hvac_action`; sensor composes temperature plus an optional humidity entity; weather reads the `temperature` attribute because its state is a condition; cover uses position when the entity reports it.

### Registry slice

`packages/core/src/ha/registry.ts` resolves an entity's area from `config/entity_registry/list_for_display` (`{ entities: [{ ei, ai?, di? }] }`), `config/device_registry/list` and `config/area_registry/list`. An entity's own area wins; otherwise it inherits its device's area, which is how most entities get one. The three lists are read once per connection generation and shared by every tile, and resolve to `undefined` when the transport lacks generic commands. Tiles use the result as the `area` fallback after their explicit prop.

## Development checks

```bash
npm run check
npm run test-storybook
```

`npm run lint` enforces the boundary: outside `packages/core/src/ha/`, a skin's `ha/` and `lovelace/` and its entry (`src/skins/*/index.ts`), nothing may import `packages/core/src/ha`, `home-assistant-js-websocket`, or another module's entry. `packages/core/src/ha/mappers/fixtures.test.ts` runs every raw-state fixture in `packages/core/src/ha/fixtures/` through its real mapper. Neither proves connectivity to a live Home Assistant instance; live auth, CORS, permissions, reconnect behaviour against a real server, forecast service permissions and state readback still need host-specific validation. The history fixture follows Home Assistant core's documented compressed format; replace it with a capture from a real instance when one is available.
