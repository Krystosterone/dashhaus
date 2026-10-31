# Starting a skin

Create a neutral, first-class skin:

```sh
npm run new-skin -- canvas
```

The name is lower-case kebab-case. It determines every namespace and registration: the private workspace package `src/skins/canvas/` named `@dashhaus/canvas`, Storybook section **Canvas**, CSS variables and classes beginning `--canvas-` / `canvas-`, public symbols beginning `Canvas`, and Lovelace card `custom:dashhaus-canvas`. Use `--dry-run` to validate and list the transaction without writing it.

The command creates and registers:

- a `package.json` named `@dashhaus/canvas`: `private`, `type: module`, the workspace's dependencies and peers, and the exports below;
- scoped light/dark tokens, fixed `compact` and `standard` footprints, neutral Parts, unavailable treatment, a native Details dialog, and CSS rules tests;
- Dashboard page, section, columns, cell, header and nav Parts, their stories, and an explicit empty state;
- Foundations → Design rules, Palette and Parts, backed by `docs/canvas.md`;
- the package's YAML reader and card schema (`@dashhaus/dashboard/schema`) and automatic area layout (`@dashhaus/dashboard/layout`), pages and nav, a `LovelaceDashboardElement` and `registerCard` from `@dashhaus/dashboard/skin`, its place in the Home Assistant bundle entry (`apps/lovelace/entry.ts`), and first-deploy dashboard;
- its own entry (`src/skins/<skin>/index.ts`, which imports its tokens), Storybook setup and static group order, conformance tests, and empty Cards / Connected group explanations.

The baseline is intentionally neutral. It proves the architecture before visual work; it does not copy Orb or synthesize Field's mature hardware design.

## The package surface

`npm install` links the skin through the root `src/skins/*` workspace glob. Its manifest declares the four exports the root consumes:

| Export | File | Consumer |
| --- | --- | --- |
| `.` | `index.ts` | Programmatic use: Parts, Dashboard furniture, and every Card's presentational and connected export; loads `styles/tokens.css` once |
| `./styles/tokens.css` | `styles/tokens.css` | `apps/lovelace/entry.ts`, so the Home Assistant bundle carries the skin's palette |
| `./lovelace/card` | `lovelace/card.tsx` | `apps/lovelace/entry.ts`, to register `custom:dashhaus-canvas` |
| `./storybook` | `storybook.tsx` | `.storybook/preview.tsx`, for the skin's section, toolbar and decorator |

The root apps import those specifiers; they never reach into `src/skins/canvas/` by relative path. A Card added later stays inside the package: its components, tests, demo seeds, registry row and entry exports. The only writes outside it are declared registration seams: the Storybook section order, the shared card documentation and the skin's design document. `scripts/packages.mjs` is the one map of package locations and specifiers for both generators, and `verify/generator-packages.test.ts` holds it to the root workspaces and the generated manifest.

## Add real Cards

A generated skin is recognized by its package manifest and its skin-local `lovelace/registry.tsx`. That registry is the only runtime seam joining Card kinds to Connected adapters; it stays under `lovelace/` so presentational Card code remains provider-agnostic. Add any existing shared domain through the normal Card command:

```sh
npm run new-card -- light --skin canvas
npm run new-card -- climate --skin canvas
npm run new-card -- sensor --skin canvas
```

The Card generator reads the existing `@dashhaus/core/entities/<name>` model, `useHa<Name>` hook, actions, Orb Seeds, demo transport, fixture, and Lovelace domain routing through `scripts/packages.mjs`. It writes a skin-qualified presentational Card (`CanvasLightCard`), Connected adapter (`HaCanvasLightCard`), standard stories, focused tests, local Seeds, the skin's entry exports, documentation, Storybook order, Dashboard demo data, and one runtime registry entry. It writes inside the skin package plus its declared registration seams; every insertion targets a `// new-card: …` marker or the small registry, so an unrelated line moving in a package-owned file does not break a dry run.

A neutral control exposes the shared handler's zero-argument actions. Actions that require values or credentials are not guessed: the Card starts read-only until its bespoke design supplies the right control. `--kind reading` can deliberately suppress available zero-argument actions. Existing Orb generation and the committed Field generator remain unchanged.

## Make it its own skin

1. Replace `styles/tokens.css` and the neutral Parts in `shared/`; keep every colour in the scoped token file.
2. Record the skin's rules in `docs/<skin>.md` and encode CSS-enforceable rules in `styles/rules.test.ts`.
3. Replace each Card's placeholder glyph, summary, actions, history and Details content without forking its domain model or Home Assistant hook.
4. Keep presentational code out of `packages/core/src/ha`; only the skin's `ha/` and `lovelace/` folders, and its entry that re-exports their connected containers, cross that seam.
5. Keep Storybook's standard state, width, footprint, compact, worst-case and Details stories while adding domain-specific stories.

Verify the result:

```sh
npm run check
npm run test-storybook
npm run build:ha
npm run storybook
```

In Storybook, inspect every generated Card's All states, Sizes, Footprints, Compact, Worst case and Details stories, then the whole Dashboard and Lovelace card at phone, tablet and wall-panel widths.
