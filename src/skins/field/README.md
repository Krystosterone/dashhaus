# @dashhaus/field

The Field skin: React modules drawn after Teenage Engineering's EP–133 K.O. II, its module system and page furniture, and `custom:dashhaus-field`, the Lovelace card that draws a whole dashboard from YAML. It imports `@dashhaus/core` and `@dashhaus/dashboard`, never another skin.

## Install

```sh
npm install @dashhaus/field @dashhaus/core @dashhaus/dashboard react@18 react-dom@18 home-assistant-js-websocket@9
```

React 18 is required. The websocket client is an optional peer: the Lovelace element reaches it through `@dashhaus/core/websocket`, so install it in the app that builds the browser bundle.

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
| `./styles/tokens.css` | Field's design tokens, the only source of its colours |

The Lovelace card accepts `custom:dashhaus-field` YAML with `title`, `modules`, `sections`, `pages`, `nav` and `finish`; without `modules` or `sections` it draws every supported entity by Home Assistant area.

## Docs

- [Field design](https://github.com/Krystosterone/dashhaus/blob/main/docs/field.md)
- [Card behaviour](https://github.com/Krystosterone/dashhaus/blob/main/docs/cards.md)
- [Deploy YAML](https://github.com/Krystosterone/dashhaus/blob/main/docs/deploy.md)
- [Build a skin](https://github.com/Krystosterone/dashhaus/blob/main/docs/build-a-skin.md)
