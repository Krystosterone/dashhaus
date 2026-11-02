# @dashhaus/dashboard

The framework a Dashhaus skin's Lovelace card draws on: the frozen skin-author runtime, the card frame, the YAML reader and card schema, the automatic layout, the conformance preset and the custom-element base. It imports `@dashhaus/core` and never a skin or a stylesheet.

Where to start: to deploy the ready-made Orb and Field dashboards, install `@dashhaus/bundle` and `@dashhaus/deploy`
(nothing is built). To build your own look, run `npm create dashhaus-skin@latest my-skin`: the project it writes
depends on this package and its `AGENTS.md` covers the rest. Install this package directly only to compose a skin by
hand.

## Install

```sh
npm install @dashhaus/dashboard @dashhaus/core react@18 react-dom@18 home-assistant-js-websocket@9
```

React 18.3+ or 19 is supported. The websocket client is an optional peer: the element base reaches it through `@dashhaus/core/websocket`, so install it in the app that builds the browser bundle.

## Use

```tsx
import { LovelaceDashboardElement, autoInput, registerCard, scopeToHost } from "@dashhaus/dashboard/skin";
import type { LovelaceHass } from "@dashhaus/dashboard/skin";

const css = ":host { color: inherit }";

class MyCard extends LovelaceDashboardElement<{ title: string }> {
  protected readonly styles = scopeToHost(css);

  protected parse(raw: unknown) { return { title: String((raw as { title?: unknown })?.title ?? "My skin") }; }
  protected changed(_previous: LovelaceHass, _next: LovelaceHass) { return false; }
  protected draw(config: { title: string }, _hass: LovelaceHass) {
    return <main>{config.title}</main>;
  }
}

registerCard("dashhaus-my-skin", MyCard, "Dashhaus My skin", "A Dashhaus skin.");
```

## Subpaths

| Subpath | What it is |
| --- | --- |
| `.` | The full Lovelace entry: element base, nav, room sensors and token scoping |
| `./skin` | The frozen skin-author surface: `LovelaceDashboardElement`, `registerCard`, `scopeToHost`, `autoInput`, `useActionStatus` (the rejected-command status a page shows), `LovelaceHass`, `AutoEntityEntry`, `ActionStatus` and `ActionMessage` |
| `./card` | The frame every skin's card draws on: footprint flags, ids and aria, details state, tile/sheet composition |
| `./schema` | The shared YAML reader, kind table, card reader and renderer dispatch. Pure |
| `./layout` | The automatic layout: visibility, area resolution, name sort, grouping, placement. Pure |
| `./conformance` | The generic card preset a skin runs against its own cards. Node- and test-only |

## Docs

- [Skin contract](https://github.com/Krystosterone/dashhaus/blob/main/spec/contract.md)
- [Home Assistant and Lovelace](https://github.com/Krystosterone/dashhaus/blob/main/spec/home-assistant.md)
- [Repository overview](https://github.com/Krystosterone/dashhaus#readme)
