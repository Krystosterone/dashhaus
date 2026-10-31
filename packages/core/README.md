# @dashhaus/core

The headless Home Assistant foundation behind Dashhaus skins: entity models and their pure logic, the store and provider, mappers, actions, the `useHa<Name>` hooks, headless components, interaction primitives, shared hooks, demo transports and a testing helper. It ships no markup and no CSS.

## Install

```sh
npm install @dashhaus/core react@18 react-dom@18 home-assistant-js-websocket@9
```

`react` is a peer. `home-assistant-js-websocket` is an optional peer, needed only by `./websocket`; `vitest` and `@testing-library/react` are optional peers, needed only by `./testing`.

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
| `.` | Store, provider, mappers, actions, `useHa<Name>` hooks and headless components |
| `./entities`, `./entities/*` | The pure entity models and their logic |
| `./primitives` | Headless interaction hooks: press, slider, range slider, sheet, keypad |
| `./hooks` | Shared hooks with no UI: `useNow`, `useDelayLeft`, `useScrollSpy`, `useHashPage`, `useDemoClimate` |
| `./perf` | The opt-in performance marks the deployed bundle records |
| `./websocket` | The one module that imports `home-assistant-js-websocket` |
| `./demo` | Demo transports for Storybook and tests |
| `./testing` | A fake transport and a render under a real store, for connected-card tests |
| `./fixtures/*` | Raw Home Assistant state fixtures |

## Docs

- [Home Assistant boundary](https://github.com/Krystosterone/dashhaus/blob/main/docs/home-assistant.md)
- [Skin contract](https://github.com/Krystosterone/dashhaus/blob/main/docs/contract.md)
- [Repository overview](https://github.com/Krystosterone/dashhaus#readme)
