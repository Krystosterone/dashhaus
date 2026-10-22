---
date: 2026-10-19T03:58:03+00:00
git_commit: 6486e0e44b54ba74c9fd5a53360f0b309e12a08d
branch: feat/home-assistant-dashboard-foundation
repository: home-dashboard
topic: "Map how Home Assistant data is coupled or decoupled from the dashboard UI"
tags: [research, home-assistant, architecture, data-flow]
status: complete
last_updated: 2026-10-19
---

# Research: Home Assistant integration map

> **Historical baseline:** This note records the repository before the Home Assistant foundation at commit `6486e0e44b54ba74c9fd5a53360f0b309e12a08d`. The current implementation status is tracked in [`research/README.md`](README.md) and [`docs/home-assistant.md`](../docs/home-assistant.md); use this note for the original evidence and decision rationale.

## Research Question

How does the current repository couple or decouple Home Assistant data from the UI, and where are the existing entity contracts, adapters, action callbacks, state owners, demos/stories, shared hooks, and integration seams for the dashboard widgets?

## Summary

This repository is a React/TypeScript component library shown through Storybook, not a running Home Assistant application. Its strongest architectural decision is already in place: widgets receive normalized domain models, optional history/forecast data, and explicit action callbacks. They do not read a global entity store, subscribe to Home Assistant, or call a provider directly.

The separation is incomplete rather than absent. The normalized models retain Home Assistant vocabulary, but only the alarm domain has a real raw-state adapter and service mapper. Light, climate, cover, toggle, sensor, and weather/home widgets expect their parent to translate raw Home Assistant state and wire actions. The demos imitate that parent boundary with local state and fake callbacks.

**Decision for the foundation work:** preserve the existing callback-driven widget contracts. Add a provider-facing integration layer above `*Tile`/`*Widget` that owns connection state, subscriptions, raw snapshots, history/forecast queries, domain mappers, capability gates, service calls, and error/reconciliation policy. Do not move Home Assistant wire-format knowledge into the presentational widgets.

## Detailed Findings

### Current repository shape

- `AGENTS.md:3-14,24-32` describes a Storybook component library, its commands, and its source layout. `README.md:1-5,7-12` describes one entity per widget, with the sensor widget combining temperature and humidity for one device.
- `package.json:6-44` contains React/ReactDOM and UI/testing tooling but no Home Assistant client package.
- `src/index.ts:1-70` exports widgets, normalized entity/history types, layout primitives, and the alarm-specific Home Assistant adapter. There is no application entry point, provider, connection owner, or entity store in the public surface.
- Existing research notes and `research/mechanism-backlog.md` describe composition and visual behavior. They do not provide a transport or data-integration layer.

### Ownership matrix

| Domain | Normalized model | Secondary data | UI actions | Existing Home Assistant coupling |
| --- | --- | --- | --- | --- |
| Light | `LightEntity` with state, brightness, color-temperature capability/range, identity, timestamps | Optional `LightHistory` | Toggle, brightness, Kelvin, details | Type comments mirror `light.*`; no raw mapper in the light folder. `src/widgets/light/types.ts:4-35`; `src/widgets/light/LightWidget.tsx:9-35` |
| Climate | `ClimateEntity` with HVAC mode/action, temperatures, ranges, limits, modes, presets, fan options, units | Optional `ClimateHistory` | Toggle, target/range, HVAC mode, preset, fan, details | Type comments mirror `climate.*`; parent must map callbacks to services. `src/widgets/climate/types.ts:3-44`; `src/widgets/climate/ClimateWidget.tsx:10-33` |
| Sensor | `SensorEntity` combining temperature/humidity and optional battery/outdoor metadata | Optional `SensorHistory` | Details only | The type documents the common two-sensor-to-one-device view; no mapper. `src/widgets/sensor/types.ts:1-30` |
| Weather/home | `WeatherEntity` for `weather.*` readings and condition | History plus hourly/daily forecasts; optional AQI and day/night inputs | Details only | AQI and `sun.sun` are named as companion inputs; no live adapter. `src/widgets/home/types.ts:1-61`; `docs/widgets.md:58-81` |
| Alarm | `AlarmEntity` with state, modes, code/delay/open-sensor metadata, timestamps | Optional `AlarmHistory` | Arm/disarm, details | Full structural adapter and service mapper in `src/widgets/alarm/hass.ts:3-28,64-133` |
| Cover | `CoverEntity` with device class, state, position/tilt, capability flags | Optional `CoverHistory` | Open, close, stop, position, tilt, details | Type comments mirror `cover.*`; no raw mapper. `src/widgets/cover/types.ts:3-28` |
| Toggle | `ToggleEntity` shared by `input_boolean.*` and `switch.*` | Optional `ToggleHistory` | Toggle, optional timed-on callback, details | Domain is named in comments but not retained in the type. `src/widgets/toggle/types.ts:3-33` |

`entityId`, display identity, current state, and history are already normalized at the component boundary. That is the seam to keep. The important missing pieces are the source of those values and the policy around capability, availability, action acknowledgement, and updates.

### Widget and tile ownership

- `*Widget` components derive presentation state from normalized props and render controls. Light derives percent/glow and forwards action callbacks (`src/widgets/light/LightWidget.tsx:42-115`). Climate selects a stepper, range bar, or pill and orders range values before invoking the callback (`src/widgets/climate/ClimateWidget.tsx:59-99`). Sensor and home are read-only (`src/widgets/sensor/SensorWidget.tsx:9-25`; `src/widgets/home/HomeWidget.tsx:11-29,90-163`).
- `*Tile` wrappers add the card container and own only sheet-open state. They pass the same entity/history/action props to the card and sheet (`src/widgets/light/LightTile.tsx:5-21`; analogous files for climate, sensor, home, cover, alarm, and toggle).
- Alarm has additional local view state for the pending keypad action and delay clock, but it still receives its entity and asynchronous action callbacks from above (`src/widgets/alarm/AlarmWidget.tsx:8-40,44-95,161-180`).
- Shared hooks are interaction/time mechanisms, not provider state: `useTrack` handles pointer-to-value translation, `useLongPress` separates hold from click, and `useNow` handles minute-boundary time (`src/shared/useTrack.ts:4-61`; `src/shared/useLongPress.ts:4-59`; `src/shared/useNow.ts:3-25`). `SheetExtra` is bundle presentation context, not an entity store (`src/shared/ui.tsx:192-220`).
- Bundles keep state above the bundle. `LeadBundle` repeats row content in the lead sheet, while the demo creates each row's state before passing it into the bundle (`src/bundles/Bundle.tsx:26-45`; `src/bundles/demo/DemoBundle.tsx:20-83`; `README.md:73-87`).

### Representative flows

**Light:** a parent supplies `LightEntity`, history, and callbacks. The documented usage maps those callbacks to `light.toggle` and `light.turn_on` service calls (`docs/widgets.md:5-23`). `LightTile` owns sheet state; `LightWidget` renders the current normalized model; `useDemoLight` owns local demo state/history and returns fake callbacks (`src/widgets/light/demo/useDemoLight.ts:44-64`). No component calls Home Assistant.

**Climate:** the parent supplies HVAC mode/action, target/range, limits, capability arrays, and callbacks. `ClimateWidget` chooses the control and preserves `low <= high`; the docs show the expected `climate` service mapping (`src/widgets/climate/ClimateWidget.tsx:59-147`; `docs/widgets.md:25-46`). The demo owns local state and derives HVAC action/history (`src/widgets/climate/demo/useDemoClimate.ts:81-137`).

**Sensor and weather/home:** the sensor model deliberately composes what are usually two HA sensor entities into one read-only view (`src/widgets/sensor/types.ts:1-30`). The home model accepts weather data plus optional AQI and `isDay` from other sources, with forecast/history arrays supplied separately (`src/widgets/home/types.ts:7-61`; `docs/widgets.md:58-81`). Neither widget can fetch or subscribe.

**Alarm:** `HassAlarmState` is a structural raw-state shape and `HassLike` requires only `states` plus `callService` (`src/widgets/alarm/hass.ts:3-28`). `alarmFromHass` maps known states, feature bits, delays, open sensors, and timestamps; `callAlarm` maps intents to services and distinguishes a recognized wrong code from other failures (`src/widgets/alarm/hass.ts:64-133`). `DemoHassAlarm` is the only demo that runs a raw-HA-shaped object through the real adapter (`src/widgets/alarm/demo/DemoHassAlarm.tsx:8-45`). This is the existing precedent for the missing domain adapters.

**Cover and toggle:** cover and toggle demos own local simulated state and return the callback shapes expected by the tiles (`src/widgets/cover/demo/useDemoCover.ts:46-104`; `src/widgets/toggle/demo/useDemoToggle.ts:56-74`). The docs show parent-side service wiring but no implementation (`docs/widgets.md:147-185`).

### Bounded seam search

A source-bounded search over `src/**/*.ts*` found:

- the alarm adapter family as the only `Hass*`/`alarmFromHass` integration family;
- only the alarm adapter/test/demo references to `callService`, network, WebSocket, `subscribeEntities`, or `home-assistant-js-websocket`;
- no application-level entity store, HA context, or provider;
- only `SheetExtra` as shared React context.

These are bounded absence findings for this checkout. They do not rule out a future host application or an external integration package.

## Architecture Documentation

The current dependency direction is:

```text
Story/demo parent
  -> normalized Entity + History/Forecast + action callbacks
     -> Tile (sheet-open state)
        -> Widget (presentation and local interaction mechanics)
           -> shared UI primitives/hooks
```

The intended functioning-dashboard direction should add, above that tree:

```text
Home Assistant connection/auth
  -> shared raw snapshot + registries + connection status
     -> domain mappers and capability gates
        -> typed action/query functions
           -> container hooks
              -> existing Tile/Widget props
```

The integration layer should own multi-entity composition (temperature + humidity, weather + AQI + sun), histories and forecasts, service payloads, reconnect/subscription cleanup, and command/readback/error policy. The widgets should continue to own visual state, sheets, keypads, pointer mechanics, and the normalized callback contract.

## Code References

- `AGENTS.md:3-14,24-44` — repository identity, commands, layout, and hard UI rules.
- `README.md:7-22,57-87` — normalized widget constraints and state-above-bundle rule.
- `src/index.ts:1-70` — public component/type surface and alarm-only HA exports.
- `src/widgets/alarm/hass.ts:3-28,64-133` — existing raw-state adapter, service mapping, and error contract.
- `src/widgets/light/types.ts:4-35`; `src/widgets/climate/types.ts:3-44`; `src/widgets/sensor/types.ts:1-30`; `src/widgets/home/types.ts:1-61`; `src/widgets/cover/types.ts:3-28`; `src/widgets/toggle/types.ts:3-33` — normalized models.
- `src/widgets/light/LightWidget.tsx:9-115`; `src/widgets/climate/ClimateWidget.tsx:10-147`; `src/widgets/cover/CoverWidget.tsx:27-141`; `src/widgets/toggle/ToggleWidget.tsx:18-145` — callback-driven UI boundaries.
- `src/bundles/Bundle.tsx:26-45`; `src/shared/ui.tsx:192-220` — composition state and presentation context.
- `docs/widgets.md:5-23,25-46,58-81,83-145,147-185` — documented parent-side action and entity mapping examples.

## External Sources

None required for this local map. The external protocol and architecture evidence is preserved in `research/06-ha-entity-contracts.md` and `research/07-react-ha-architecture.md`.

## Open Questions

- How will the host obtain authentication: embedded in Home Assistant, standalone OAuth, long-lived token, or a server-side transport?
- Should the integration use one shared normalized store with selector hooks, or a smaller first implementation around a shared connection and domain hooks?
- Which raw distinctions must be added to local types before wiring: `unknown`, toggle domain, AQI scale, capability bitmasks, registry metadata, and timestamps beyond `last_changed`?
- What is the source and retention policy for the widget histories and weather forecasts?
- What error/readback behavior should the dashboard show when Home Assistant accepts a service call but the entity does not reach the requested state?

## Checks Run

- Inspected the isolated worktree at base commit `6486e0e44b54ba74c9fd5a53360f0b309e12a08d`; the worktree was clean before and after the read-only research pass.
- Read `AGENTS.md`, `README.md`, `docs/widgets.md`, the research index/backlog, package/config files, all requested widget contracts and implementations, shared hooks/primitives, demos, stories, dashboards, bundles, and relevant tests.
- Ran bounded source searches for Home Assistant adapters, network/subscription terms, state/context ownership, action callbacks, and histories.
- The research checkout's typecheck, lint, and unit-test attempts were dependency-blocked because declared npm packages were not installed; no installation was performed.

## Next Action

The transport/store/mappers/actions boundary is now implemented under `src/ha/`, with fake-connection tests and connected light, climate, and sensor slices behind the existing normalized widget props. The next action is to choose the host authentication/deployment mode and validate that host-specific boundary with a real authenticated connection.
