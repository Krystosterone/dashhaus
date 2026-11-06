# @dashhaus/field

The Field skin: React modules drawn after Teenage Engineering's EP–133 K.O. II, its module system and page furniture, and `custom:dashhaus-field`, the Lovelace card that draws a whole dashboard from YAML. It imports `@dashhaus/core` and its Lovelace framework, never another skin.

**Beta.** Dashhaus is in beta: a new `0.x` version (0.2 → 0.3) may break what you use, and a caret range keeps
you on one `0.x` line until you move. Every `@dashhaus/` package shares one version; each
[release](https://github.com/Krystosterone/dashhaus/releases) says what changed and what to do, and an
[issue](https://github.com/Krystosterone/dashhaus/issues/new/choose) saying how it went on your setup helps.

## Install

```sh
npm install @dashhaus/field @dashhaus/core @dashhaus/core/lovelace react@18 react-dom@18 home-assistant-js-websocket@9
```

React 18.3+ or 19 is supported. The websocket client is an optional peer: the Lovelace element reaches it through `@dashhaus/core/websocket`, so install it in the app that builds the browser bundle.

## Use

```tsx
import tokens from "@dashhaus/field/styles/tokens.css?inline";
import { defineFieldCard } from "@dashhaus/field/lovelace/card";

// Registers custom:dashhaus-field for Lovelace's card picker.
defineFieldCard(tokens);
```

Import `@dashhaus/field/styles/tokens.css` in the browser bundle so its stylesheet reaches the build, or pass the bundled text to `defineFieldCard`.

## Subpaths

| Subpath | What it is |
| --- | --- |
| `.` | The skin's modules, connected modules and page furniture. Loads the token CSS |
| `./lovelace/card` | `createFieldCard`, `defineFieldCard` and the `custom:dashhaus-field` element |
| `./storybook` | The skin's Storybook section, toolbar and decorator (repo tooling) |
| `./styles/tokens.css` | Field's design tokens, the only source of its colours, every one prefixed `--fd-` |

The Lovelace card accepts `custom:dashhaus-field` YAML with `title`, `cards` or `rows`, `columns`, `flow`, `pages`, `nav` and `finish`; without `cards` or `rows` it draws every supported entity, a row per Home Assistant area.

## Docs

- [Field design](https://github.com/Krystosterone/dashhaus/blob/main/spec/field.md)
- [Card behaviour](https://github.com/Krystosterone/dashhaus/blob/main/spec/cards.md)
- [Deploy YAML](https://github.com/Krystosterone/dashhaus/blob/main/spec/deploy.md)
- [Build a skin](https://github.com/Krystosterone/dashhaus/blob/main/spec/build-a-skin.md)
