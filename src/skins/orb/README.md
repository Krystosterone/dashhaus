# @dashhaus/orb

The Orb skin: React cards for Home Assistant entities, its card system, bundles, dashboard furniture, and `custom:dashhaus-orb`, the Lovelace card that draws a whole dashboard from YAML. It imports `@dashhaus/core` and `@dashhaus/dashboard`, never another skin.

## Install

```sh
npm install @dashhaus/orb @dashhaus/core @dashhaus/dashboard react@18 react-dom@18 home-assistant-js-websocket@9
```

React 18.3+ or 19 is supported. The websocket client is an optional peer: the Lovelace element reaches it through `@dashhaus/core/websocket`, so install it in the app that builds the browser bundle.

## Use

```tsx
import tokens from "@dashhaus/orb/styles/tokens.css?inline";
import { defineDashhausCard } from "@dashhaus/orb/lovelace/card";

// Registers custom:dashhaus-orb for Lovelace's card picker.
defineDashhausCard(tokens);
```

The browser bundle needs one more step: import `@dashhaus/orb/styles/tokens.css` so the stylesheet reaches the build, or pass its own bundled text to `defineDashhausCard`. Orb's own docs and the consumer guide show both recipes.

## Subpaths

| Subpath | What it is |
| --- | --- |
| `.` | The skin's cards, connected tiles, bundles and dashboard furniture. Loads the token CSS |
| `./lovelace/card` | `createDashhausCard`, `defineDashhausCard` and the `custom:dashhaus-orb` element |
| `./lovelace/auto` | `autoDashboard`, the automatic layout a config or deploy factory can call. Pure, no React |
| `./storybook` | The skin's Storybook section, toolbar and decorator (repo tooling) |
| `./styles/tokens.css` | Orb's design tokens, the only source of its colours |

The Lovelace card accepts `custom:dashhaus-orb` YAML with `title`, `sections`, `pages`, `nav`, `theme` and `accent`; without `sections` it lays the house out automatically.

## Docs

- [Orb design](https://github.com/Krystosterone/dashhaus/blob/main/spec/orb.md)
- [Card behaviour](https://github.com/Krystosterone/dashhaus/blob/main/spec/cards.md)
- [Deploy YAML](https://github.com/Krystosterone/dashhaus/blob/main/spec/deploy.md)
- [Build a skin](https://github.com/Krystosterone/dashhaus/blob/main/spec/build-a-skin.md)
