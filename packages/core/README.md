# @dashhaus/core

The headless Home Assistant foundation behind Dashhaus skins: entity models and their pure logic, the store and provider, mappers, actions, the `useHa<Name>` hooks, headless components, interaction primitives, shared hooks, demo transports and a testing helper. It ships no markup and no CSS.

## Install

```sh
npm install @dashhaus/core react@18 react-dom@18 home-assistant-js-websocket@9
```

`react` is a peer: React 18.3+ or 19 is supported. `home-assistant-js-websocket` is an optional peer, needed only by `./websocket`; `vitest` and `@testing-library/react` are optional peers, needed only by `./testing`.

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
| `.` | Store, provider, mappers, actions, `useHa<Name>` hooks and headless components, and the registry hooks (`useHaRegistry`, `useHaAreas`, `useHaArea`) |
| `./entities`, `./entities/*` | The pure entity models and their logic |
| `./primitives` | Headless interaction hooks: press, slider, range slider, sheet, keypad |
| `./hooks` | Shared hooks with no UI: `useNow`, `useDelayLeft`, `useScrollSpy`, `useHashPage`, `useDemoClimate` |
| `./perf` | The opt-in performance marks the deployed bundle records |
| `./websocket` | The one module that imports `home-assistant-js-websocket` |
| `./demo` | Demo transports for Storybook and tests, and `createDemoStore()` for the whole house |
| `./testing` | A fake transport (with `calls`, `emit` and `emitEntity`) and a render under a real store, for connected-card tests |
| `./fixtures/*` | Raw Home Assistant state fixtures |

## Docs

- [Core contract and auth boundary](https://github.com/Krystosterone/dashhaus/blob/main/spec/core.md)
- [Home Assistant boundary](https://github.com/Krystosterone/dashhaus/blob/main/spec/home-assistant.md)
- [Skin contract](https://github.com/Krystosterone/dashhaus/blob/main/spec/contract.md)
- [Repository overview](https://github.com/Krystosterone/dashhaus#readme)
