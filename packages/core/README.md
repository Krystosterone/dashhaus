# @dashhaus/core

The Home Assistant foundation behind Dashhaus skins: entity models and their pure logic, the store and provider, mappers, actions, the `useHa<Name>` hooks, headless components, interaction primitives, shared hooks, demo transports and a testing helper, all headless. Under `./lovelace`, the framework a skin's Lovelace card draws on: the custom-element base, the card frame, the YAML reader, the automatic layout and the conformance preset. No entry ships CSS, and the headless entries never reach `./lovelace`, so a React app of your own needs only them.

Where to start: to deploy the ready-made Orb or Field dashboard, install `@dashhaus/orb` or `@dashhaus/field` with
`@dashhaus/deploy` (nothing is built). To build your own look, run `npm create dashhaus-skin@latest my-skin`: the project it writes
depends on this package and its `AGENTS.md` covers the rest. Install this package directly only to compose a skin by
hand.

**Beta.** Dashhaus is in beta: a new `0.x` version (0.2 → 0.3) may break what you use, and a caret range keeps
you on one `0.x` line until you move. Every `@dashhaus/` package shares one version; each
[release](https://github.com/Krystosterone/dashhaus/releases) says what changed and what to do, and an
[issue](https://github.com/Krystosterone/dashhaus/issues/new/choose) saying how it went on your setup helps.

## Install

```sh
npm install @dashhaus/core react@18 react-dom@18 home-assistant-js-websocket@9
```

`react` is a peer: React 18.3+ or 19 is supported. `react-dom` is an optional peer, needed only by `./lovelace` and its subpaths (a skin's Lovelace card); `home-assistant-js-websocket` is an optional peer, needed only by `./websocket` and by the Lovelace element base, which reaches it through `./websocket`; `vitest` and `@testing-library/react` are optional peers, needed only by `./testing`.

## Use

```tsx
import { HaLight, HaProvider, createHaStore } from "@dashhaus/core";
import { createHomeAssistantTransport } from "@dashhaus/core/websocket";

const store = createHaStore(createHomeAssistantTransport(connection));

<HaProvider store={store}>
  <HaLight entityId="light.desk">
    {(light) => (
      <button onClick={light.actions.onToggle}>
        {light.entity.name}: {light.entity.state === "on" ? "on" : "off"}
      </button>
    )}
  </HaLight>
</HaProvider>;
```

## Subpaths

| Subpath | What it is |
| --- | --- |
| `.` | The transport and store, `HaProvider` and its selectors, the `useHa<Name>` hooks and `Ha<Name>` headless components, the registry, history and request hooks (`useHaRegistry`, `useHaAreas`, `useHaArea`, `useHaHistory`, `useHaRequest`), the mappers and action factories, and `HaActionError` |
| `./entities`, `./entities/*` | The entity models and their pure logic (`./entities/light/types`, `./entities/format`), with no React and no Home Assistant |
| `./primitives` | Headless interaction hooks: press, slider, range slider, sheet, keypad, and `useGuardedAction` for an action that asks first or takes a code |
| `./hooks` | Shared hooks with no UI: `useNow`, `useDelayLeft`, `useScrollSpy`, `useHashPage`, and `useDemoClimate` for stories |
| `./perf` | The opt-in performance marks the deployed bundle records, off unless the page asks for them with `?dashhaus_perf=1` |
| `./websocket` | `connectHomeAssistant` and `createHomeAssistantTransport`: the one module that imports `home-assistant-js-websocket` |
| `./seeds/*` | One domain's demo data per module (`./seeds/lock`): its `<NAME>_SEEDS`, `<NAME>_WORST_CASE` and `useDemo<Name>` hook, the same for every skin's stories |
| `./demo` | Demo transports for Storybook and tests, and `createDemoStore()` for the whole house |
| `./testing` | A fake transport (with `calls`, `emit` and `emitEntity`) and a render under a real store, for connected-card tests (needs Vitest and Testing Library) |
| `./fixtures/*` | Raw Home Assistant state fixtures |
| `./lovelace` | The full Lovelace entry: element base, nav, room sensors and token scoping. Not part of the contract |
| `./lovelace/skin` | The frozen skin-author surface: `LovelaceDashboardElement`, `registerCard`, `scopeToHost`, `autoInput`, `useActionStatus` (the rejected-command status a page shows), `LovelaceHass`, `AutoEntityEntry`, `ActionStatus` and `ActionMessage`. The frozen contract |
| `./lovelace/card` | The frame every skin's card draws on: footprint flags, ids and aria, details state, tile/sheet composition. The frozen contract |
| `./lovelace/schema` | The shared YAML `Reader`, the card kind table and card reader, the shared option readers, the renderer dispatch and `DashboardConfigError`. Pure; the frozen contract |
| `./lovelace/layout` | The automatic layout: visibility, area resolution, name sort, grouping, placement. Pure; may change with the layout work |
| `./lovelace/conformance` | `checkCards`, the generic card preset a skin runs against its own cards. Node- and test-only; the compatibility test |

### The Lovelace framework

What a skin's Lovelace card draws on. `npm create dashhaus-skin@latest my-skin` writes a project on these; import them
directly only to compose a skin by hand. Each row of the table above says how stable its subpath is: the frozen
contract (`./lovelace/skin`, `/card`, `/schema`) is what a third-party skin may rely on.

```tsx
import { LovelaceDashboardElement, registerCard, scopeToHost } from "@dashhaus/core/lovelace/skin";
import type { LovelaceHass } from "@dashhaus/core/lovelace/skin";

class MyCard extends LovelaceDashboardElement<{ title: string }> {
  protected readonly styles = scopeToHost(":host { color: inherit }");

  protected parse(raw: unknown) { return { title: String((raw as { title?: unknown })?.title ?? "My skin") }; }
  protected changed(_previous: LovelaceHass, _next: LovelaceHass) { return false; }
  protected draw(config: { title: string }, _hass: LovelaceHass) {
    return <main>{config.title}</main>;
  }
}

registerCard("dashhaus-my-skin", MyCard, "My skin", "A dashboard of my own.");
```

## Docs

- [Core contract and auth boundary](https://github.com/Krystosterone/dashhaus/blob/main/spec/core.md)
- [Home Assistant boundary](https://github.com/Krystosterone/dashhaus/blob/main/spec/home-assistant.md)
- [Skin contract](https://github.com/Krystosterone/dashhaus/blob/main/spec/contract.md)
- [Repository overview](https://github.com/Krystosterone/dashhaus#readme)
