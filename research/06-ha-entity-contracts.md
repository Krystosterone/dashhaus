---
date: 2026-10-19T03:58:03+00:00
git_commit: 6486e0e44b54ba74c9fd5a53360f0b309e12a08d
branch: feat/home-assistant-dashboard-foundation
repository: home-dashboard
topic: "Home Assistant entity state, capabilities, actions, and update contracts used by this repository"
tags: [research, home-assistant, entities, services, websocket]
status: complete
last_updated: 2026-10-19
---

# Research: Home Assistant entity contracts

> **Historical baseline:** This note records the entity/action contract from the baseline repository before the connected climate slice was implemented. Current implementation status is tracked in [`research/README.md`](README.md) and [`docs/home-assistant.md`](../docs/home-assistant.md); use this note for the original evidence and contract rationale.

## Research Question

Which Home Assistant domains and entity fields does the repository already represent, how should raw state and attributes be normalized for its widgets, which actions and payloads are required, and what availability, capability, update, and integration caveats must the dashboard boundary preserve?

## Summary

The repository models `alarm_control_panel`, `light`, `climate`, `sensor`, `weather`, `cover`, and a shared toggle shape for `input_boolean` or `switch`. It treats AQI and sun/daylight as optional companions to the weather widget. There is no direct `air_quality` model in the searched `src` tree.

The repository's widget types are intentionally smaller than Home Assistant's wire objects. That is appropriate for presentation, but only if a future integration retains the raw snapshot or a lossless side channel. Home Assistant distinguishes `unknown` from `unavailable`, attributes can change without the state string changing, and capabilities vary by integration. The adapter must not turn missing data into a safe-looking value such as `off`, `closed`, or daytime.

**Decision for the integration boundary:** keep a raw snapshot keyed by `entity_id`, preserve domain/state/attributes/timestamps/capabilities, and map it through pure domain adapters into the existing widget models. Separate service acceptance from state readback. Gate actions on capabilities, not merely on the presence of an attribute. Keep histories and forecasts as separate query products.

## Detailed Findings

### Repository coverage

| Home Assistant source | Existing model | Current fields and actions |
| --- | --- | --- |
| `alarm_control_panel` | `AlarmEntity` | State, supported modes, code policy, delay, open/triggered context, timestamps; arm/disarm actions. `src/widgets/alarm/types.ts:3-51`; `src/widgets/alarm/hass.ts:117-133` |
| `light` | `LightEntity` | `on/off/unavailable`, brightness percent, color-temperature capability and limits, timestamps; toggle, brightness, Kelvin. `src/widgets/light/types.ts:4-26`; `docs/widgets.md:11-17` |
| `climate` | `ClimateEntity` | HVAC mode/action, temperatures, setpoints/ranges, limits/step/unit, presets/fans; toggle, setpoint/range, mode, preset, fan. `src/widgets/climate/types.ts:3-34`; `docs/widgets.md:31-39` |
| `sensor` | `SensorEntity` | Temperature/humidity/battery/outdoor view; read-only. `src/widgets/sensor/types.ts:1-30` |
| `weather` | `WeatherEntity` | Condition, readings, units, optional AQI/day flag; forecasts supplied separately. `src/widgets/home/types.ts:1-61` |
| `sun` | No separate model | Only `isDay?: boolean` is consumed. `src/widgets/home/types.ts:7-10,31-34` |
| `cover` | `CoverEntity` | State, device class, position/tilt, capability booleans; open/close/stop/position/tilt. `src/widgets/cover/types.ts:3-22`; `src/widgets/cover/CoverWidget.tsx:55-90,120-138` |
| `input_boolean` or `switch` | Shared `ToggleEntity` | On/off/unavailable plus dashboard metadata; toggle and optional timed-on callback. `src/widgets/toggle/types.ts:3-33`; `docs/widgets.md:167-185` |
| `air_quality` | No direct model | AQI is an optional weather field; literal `air_quality` search under `src` returned zero matches. This is a bounded source finding. |

### Common state and update contract

Home Assistant's [state-object documentation](https://www.home-assistant.io/docs/configuration/state_object/) says every entity has exactly one state and an attribute map. `unavailable` means the entity cannot provide its state right now; `unknown` means the state has no value yet. Attributes are integration-dependent and may be null. `supported_features` is a numeric bitmask, and a `state_changed` event can be emitted when attributes change even if the state string does not.

The [WebSocket API](https://developers.home-assistant.io/docs/api/websocket/) uses authenticated numbered messages, event subscriptions, and commands. A service call carries a domain, service, service data, target, and optionally `return_response`. The repository's local examples put `entity_id` inside the callback data (`docs/widgets.md:14-16,34-39`), so the transport adapter must translate that local callback shape to the native WebSocket message shape.

The [custom card developer contract](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card) supplies a changing `hass` object to a card. A dashboard-level integration should therefore replace the complete raw snapshot on updates rather than only reacting to the `state` string.

### Domain contracts and actions

#### `light`

Home Assistant light entities normally expose `on`/`off`; capabilities are expressed primarily by `supported_color_modes`, with attributes such as `brightness` in the 1–255 range, `color_mode`, `color_temp_kelvin`, and Kelvin limits. Sources: [light integration](https://www.home-assistant.io/integrations/light/), [light entity developer contract](https://developers.home-assistant.io/docs/core/entity/light), and [light constants](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/light/const.py).

Relevant actions are `light.toggle`, `light.turn_on`, and `light.turn_off`. The repository's documented parent callbacks are:

```ts
callService("light", "toggle", { entity_id });
callService("light", "turn_on", { entity_id, brightness_pct: percent });
callService("light", "turn_on", { entity_id, color_temp_kelvin: kelvin });
```

Source: `docs/widgets.md:5-23`; official actions: [turn on](https://www.home-assistant.io/actions/light.turn_on/), [toggle](https://www.home-assistant.io/actions/light.toggle/), [turn off](https://www.home-assistant.io/actions/light.turn_off/).

The adapter must convert 1–255 brightness to the widget's 1–100 percent contract (`src/widgets/light/types.ts:13-19`; `src/widgets/light/LightWidget.tsx:47-57`), derive capability from color modes rather than a stale brightness value, and gate Kelvin controls on actual color-temperature support.

#### `climate`

Climate state modes include `off`, `heat`, `cool`, `heat_cool`, `auto`, `dry`, and `fan_only`, with `unknown` and `unavailable` also possible. Capability/state data includes current and target temperature, target range, min/max/step, humidity, `hvac_action`, fan modes, preset modes, and other optional controls. Sources: [climate integration](https://www.home-assistant.io/integrations/climate/), [climate entity contract](https://developers.home-assistant.io/docs/core/entity/climate), and [climate constants](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/climate/const.py).

Relevant actions are `climate.turn_on`, `climate.turn_off`, `climate.set_temperature`, `climate.set_hvac_mode`, `climate.set_preset_mode`, and `climate.set_fan_mode`. The repository's documented payloads are at `docs/widgets.md:25-46`:

```ts
callService("climate", "turn_on" | "turn_off", { entity_id });
callService("climate", "set_temperature", { entity_id, temperature });
callService("climate", "set_temperature", { entity_id, target_temp_low, target_temp_high });
callService("climate", "set_hvac_mode", { entity_id, hvac_mode });
callService("climate", "set_preset_mode", { entity_id, preset_mode });
callService("climate", "set_fan_mode", { entity_id, fan_mode });
```

`ClimateWidget` preserves `targetLow <= targetHigh` (`src/widgets/climate/ClimateWidget.tsx:82-86`). The adapter should also preserve raw feature flags and map unknown `hvac_action` values to a safe generic presentation rather than indexing a narrowed union with an unrecognized value.

#### `sensor` and AQI

A sensor can have a numeric, timestamp, or text state. `unknown` means not yet known; `unavailable` means currently unavailable. Device class and unit determine interpretation, and `state_class` determines whether numeric long-term statistics are meaningful. The official `aqi` device class is unitless and does not guarantee the US AQI scale. Source: [sensor integration](https://www.home-assistant.io/integrations/sensor/) and the [raw sensor integration source](https://raw.githubusercontent.com/home-assistant/home-assistant.io/current/source/_integrations/sensor.markdown).

The repository intentionally combines temperature and humidity inputs into one read-only view (`src/widgets/sensor/types.ts:1-30`). Its weather model labels `aqi` as “US AQI, 0-500” and the UI uses US AQI bands (`src/widgets/home/types.ts:31-32`; `src/widgets/home/conditions.tsx:48-55`). That is a repository assumption, not a universal Home Assistant guarantee. The integration must either carry the scale/region or label the value generically.

#### `weather` and `sun`

A weather entity exposes a condition state and optional readings; not every integration supplies every attribute. Forecast data is requested through `weather.get_forecasts`, not assumed to be a permanent current-state attribute. Sources: [weather integration](https://www.home-assistant.io/integrations/weather/), [weather entity contract](https://developers.home-assistant.io/docs/core/entity/weather), and [forecast action](https://www.home-assistant.io/actions/weather.get_forecasts/).

The repository expects `WeatherEntity` plus separate hourly/daily forecast arrays (`src/widgets/home/types.ts:1-61`; `src/widgets/home/HomeWidget.tsx:11-15`). It has no forecast callback, so the integration layer must own forecast fetch, loading/error, refresh, and response-shape handling. A forecast request that returns data needs the WebSocket action response path (`return_response` in the native protocol).

The sun integration exposes `above_horizon`/`below_horizon`. The repository consumes only `isDay?: boolean`; omitted or unavailable daylight remains unknown and the widget does not silently treat missing data as daytime (`src/widgets/home/types.ts:1-61`; `src/widgets/home/HomeWidget.tsx:95-102`). The adapter should preserve unknown/unavailable sun state instead of inferring a daylight presentation.

#### `alarm_control_panel`

The official alarm states include disarmed, armed modes, arming, pending, disarming, and triggered; a panel need not support every mode. Feature bits include home, away, night, custom bypass, and vacation. Sources: [alarm integration](https://www.home-assistant.io/integrations/alarm_control_panel/), [alarm entity developer contract](https://developers.home-assistant.io/docs/core/entity/alarm-control-panel), and [alarm constants](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/alarm_control_panel/const.py).

Actions are `alarm_control_panel.alarm_arm_home`, `alarm_arm_away`, `alarm_arm_night`, `alarm_arm_vacation`, `alarm_arm_custom_bypass`, and `alarm_disarm`, with an optional code. Sources: [arm away](https://www.home-assistant.io/actions/alarm_control_panel.alarm_arm_away/) and [disarm](https://www.home-assistant.io/actions/alarm_control_panel.alarm_disarm/).

The repository adapter is the most complete domain boundary: `alarmFromHass` decodes state and feature bits, defaults `codeArmRequired` to true, and maps optional integration-specific delay/open-sensor fields (`src/widgets/alarm/hass.ts:64-95`). It maps unrecognized states, including `unknown`, to `unavailable` (`src/widgets/alarm/hass.ts:67-70`). `callAlarm` maps intents and optional code, returns `false` for a recognized wrong-code error, and rethrows other errors (`src/widgets/alarm/hass.ts:98-125`). Some integrations may accept a wrong code without changing state, so even this adapter must reconcile against a later state event. PINs must never be logged or persisted.

#### `cover`

Cover states include opening, open, closing, closed, unavailable, and unknown. Entity capabilities include current position/tilt and feature flags for open, close, position, stop, and tilt operations. Sources: [cover integration](https://www.home-assistant.io/integrations/cover/), [cover entity contract](https://developers.home-assistant.io/docs/core/entity/cover), and [cover constants](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/cover/const.py).

Relevant actions are `cover.open_cover`, `cover.close_cover`, `cover.stop_cover`, `cover.set_cover_position`, and tilt equivalents. Sources: [open](https://www.home-assistant.io/actions/cover.open_cover/), [close](https://www.home-assistant.io/actions/cover.close_cover/), [stop](https://www.home-assistant.io/actions/cover.stop_cover/), [set position](https://www.home-assistant.io/actions/cover.set_cover_position/), and [set tilt](https://www.home-assistant.io/actions/cover.set_cover_tilt_position/).

`CoverWidget` uses a state-derived fallback position for presentation when no measured position exists (`src/widgets/cover/CoverWidget.tsx:60-73`). The adapter must never send that fallback back as measured state. It should map HA `unknown` explicitly; unknown is not closed. Render stop/position/tilt actions only when the corresponding feature flag and usable value are present.

#### `input_boolean` and `switch`

An input boolean is a virtual helper with `on`/`off` state and restart restore behavior; a switch exposes `on`/`off` plus `unknown`/`unavailable`. Sources: [input boolean](https://www.home-assistant.io/integrations/input_boolean/), [switch](https://www.home-assistant.io/integrations/switch/), [input boolean toggle](https://www.home-assistant.io/actions/input_boolean.toggle/), and [switch toggle](https://www.home-assistant.io/actions/switch.toggle/).

The correct action is domain-specific: `input_boolean.toggle` or explicit turn on/off for an input boolean, and `switch.toggle` or explicit turn on/off for a switch. The local `ToggleEntity` omits the domain (`src/widgets/toggle/types.ts:5-23`), so the integration configuration must retain it outside the widget view model. The `onTurnOnFor(value)` callback is an application timer/automation hook, not a native duration field (`docs/widgets.md:167-185`).

### Action and update matrix

| Widget intent | Native action | Required boundary rule |
| --- | --- | --- |
| Light toggle/brightness/Kelvin | `light.toggle`; `light.turn_on` | Convert brightness units; gate by color modes; reconcile from entity state |
| Climate on/off/setpoint/mode/preset/fan | `climate.turn_*`, `set_*` | Gate by feature/capability arrays; preserve range ordering; map unknown action safely |
| Alarm arm/disarm | `alarm_control_panel.alarm_arm_*`, `alarm_disarm` | Gate by feature bit and code policy; never log PIN; wait for readback |
| Cover open/close/stop/position/tilt | `cover.*` actions | Gate by feature flags; never send a fallback position; unknown is not closed |
| Toggle | `input_boolean.*` or `switch.*` | Retain domain outside `ToggleEntity`; duration is a separate automation/timer concern |
| Weather forecast | `weather.get_forecasts` | Treat as request/response data, not current state; own loading/error/refresh |

A WebSocket service result means the transport accepted the command. It does not necessarily mean the physical entity reached the requested state. The command path and the `state_changed` readback path must remain separate in the integration design.

## Architecture Documentation

The raw boundary should retain at least:

```ts
interface RawEntitySnapshot {
  entityId: string;
  domain: string;
  state: string;
  attributes: Record<string, unknown>;
  lastChanged?: string;
  lastUpdated?: string;
  lastReported?: string;
  context?: unknown;
}
```

This is a design sketch, not an implementation contract. It preserves information the current widget models intentionally discard. Pure domain mappers can then produce the existing `LightEntity`, `ClimateEntity`, and related models, while action modules produce typed callbacks and classify transport errors.

The boundary must also answer four cases explicitly:

1. **Availability:** available, unknown, unavailable, restored, and missing entity must not collapse silently.
2. **Capability:** use feature bits, color modes, and capability arrays; do not infer support solely from an optional attribute.
3. **Acknowledgement:** action acceptance, later state readback, timeout, and action error are different outcomes.
4. **Secondary data:** histories, statistics, and forecasts need separate query/cache policy and do not belong in a current-state mapper.

## Code References

- `src/widgets/alarm/hass.ts:3-28,30-36,64-133` — current raw-state adapter and service/error mapping.
- `src/widgets/light/types.ts:4-26`; `src/widgets/climate/types.ts:3-34`; `src/widgets/sensor/types.ts:1-30`; `src/widgets/home/types.ts:1-61`; `src/widgets/cover/types.ts:3-22`; `src/widgets/toggle/types.ts:3-33` — current normalized contracts.
- `src/widgets/light/LightWidget.tsx:47-57,84-97`; `src/widgets/climate/ClimateWidget.tsx:64-99`; `src/widgets/cover/CoverWidget.tsx:60-90`; `src/widgets/home/HomeWidget.tsx:95-123` — capability and missing-data presentation behavior.
- `docs/widgets.md:5-23,25-46,58-81,83-145,147-185` — existing parent-side action examples.

## External Sources

- [Home Assistant state object](https://www.home-assistant.io/docs/configuration/state_object/)
- [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/)
- [Custom card developer documentation](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card)
- [Light integration](https://www.home-assistant.io/integrations/light/) and [light entity developer contract](https://developers.home-assistant.io/docs/core/entity/light)
- [Climate integration](https://www.home-assistant.io/integrations/climate/) and [climate entity developer contract](https://developers.home-assistant.io/docs/core/entity/climate)
- [Sensor integration](https://www.home-assistant.io/integrations/sensor/)
- [Weather integration](https://www.home-assistant.io/integrations/weather/) and [weather forecast action](https://www.home-assistant.io/actions/weather.get_forecasts/)
- [Sun integration](https://www.home-assistant.io/integrations/sun/)
- [Alarm integration](https://www.home-assistant.io/integrations/alarm_control_panel/) and [alarm entity developer contract](https://developers.home-assistant.io/docs/core/entity/alarm-control-panel)
- [Cover integration](https://www.home-assistant.io/integrations/cover/) and [cover entity developer contract](https://developers.home-assistant.io/docs/core/entity/cover)
- [Input boolean integration](https://www.home-assistant.io/integrations/input_boolean/) and [switch integration](https://www.home-assistant.io/integrations/switch/)

## Open Questions

- Should the local widget types gain an explicit `unknown` state, or should adapters preserve it in a wrapper while keeping the UI model unchanged?
- Should `ToggleEntity` gain a domain discriminant before action wiring begins?
- What AQI scale/region will the real installation provide?
- Which Home Assistant version and integrations must the first adapter set support?
- Should the first implementation expose registry metadata and `last_reported`, or defer them until a concrete widget needs them?
- What history/forecast freshness, caching, and retention policy is acceptable?

## Checks Run

- Inspected the isolated worktree at base commit `6486e0e44b54ba74c9fd5a53360f0b309e12a08d`; no repository files were changed during research.
- Read the executable widget types, alarm adapter/tests, widgets, docs, demos, and relevant tests.
- Searched `src` for the requested domains and for `air_quality`; the latter returned zero literal matches.
- Retrieved official state-object, WebSocket, custom-card, domain integration, action, entity-developer, raw integration Markdown, and core-constant sources. Some key HTML pages returned HTTP 429 from the keyless extraction backend; raw official sources and available pages were used instead.
- The research checkout's `npm run check`, lint, and test commands were dependency-blocked because declared packages were not installed; no installation was performed.

## Next Action

The raw-snapshot and action/readback contracts were initially encoded by `src/ha/types.ts`, `src/ha/store.ts`, and the light mapper/actions, with fake-connection tests. This is a historical research boundary; the current connected light, climate, and sensor slices, and the next domain order, are tracked in `research/README.md` and `docs/home-assistant.md`.
