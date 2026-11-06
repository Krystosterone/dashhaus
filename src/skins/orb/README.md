# @dashhaus/orb

The Orb skin: React cards for Home Assistant entities, its card system, bundles, dashboard furniture, and `custom:dashhaus-orb`, the Lovelace card that draws a whole dashboard from YAML. It imports `@dashhaus/core` and its Lovelace framework, never another skin.

**Beta.** Dashhaus is in beta: a new `0.x` version (0.2 → 0.3) may break what you use, and a caret range keeps
you on one `0.x` line until you move. Every `@dashhaus/` package shares one version; each
[release](https://github.com/Krystosterone/dashhaus/releases) says what changed and what to do, and an
[issue](https://github.com/Krystosterone/dashhaus/issues/new/choose) saying how it went on your setup helps.

## Install

```sh
npm install @dashhaus/orb @dashhaus/core @dashhaus/core/lovelace react@18 react-dom@18 home-assistant-js-websocket@9
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

The Lovelace card accepts `custom:dashhaus-orb` YAML with `title`, `cards` or `rows`, `columns`, `flow`, `pages`, `nav`, `theme` and `accent`; without `cards` or `rows` it lays the house out automatically.

## Docs

- [Orb design](https://github.com/Krystosterone/dashhaus/blob/main/spec/orb.md)
- [Card behaviour](https://github.com/Krystosterone/dashhaus/blob/main/spec/cards.md)
- [Deploy YAML](https://github.com/Krystosterone/dashhaus/blob/main/spec/deploy.md)
- [Build a skin](https://github.com/Krystosterone/dashhaus/blob/main/spec/build-a-skin.md)
