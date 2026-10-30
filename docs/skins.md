# Starting a skin

Create a neutral, first-class skin:

```sh
npm run new-skin -- canvas
```

The name is lower-case kebab-case. It determines every namespace and registration: `src/skins/canvas/`, Storybook section **Canvas**, CSS variables and classes beginning `--canvas-` / `canvas-`, public symbols beginning `Canvas`, and Lovelace card `custom:home-dashboard-canvas`. Use `--dry-run` to validate and list the transaction without writing it.

The command creates and registers:

- scoped light/dark tokens, fixed `compact` and `standard` footprints, neutral Parts, unavailable treatment, a native Details dialog, and CSS rules tests;
- Dashboard page, section, columns, cell, header and nav Parts, their stories, and an explicit empty state;
- Foundations → Design rules, Palette and Parts, backed by `docs/canvas.md`;
- a YAML reader, automatic area layout, pages and nav, a `LovelaceDashboardElement`, card-picker registration, Home Assistant bundle entry, and first-deploy dashboard;
- public exports, Storybook setup and static group order, conformance tests, and empty Cards / Connected group explanations.

The baseline is intentionally neutral. It proves the architecture before visual work; it does not copy Orb or synthesize Field's mature hardware design.

## Add real Cards

A generated skin is recognized by its skin-local `lovelace/registry.tsx`. That registry is the only runtime seam joining Card kinds to Connected adapters; it stays under `lovelace/` so presentational Card code remains provider-agnostic. Add any existing shared domain through the normal Card command:

```sh
npm run new-card -- light --skin canvas
npm run new-card -- climate --skin canvas
npm run new-card -- sensor --skin canvas
```

The Card generator reads the existing `src/domains/<name>/` model, `useHa<Name>` hook, actions, Orb Seeds, demo transport, fixture, and Lovelace domain routing. It writes a skin-qualified presentational Card (`CanvasLightCard`), Connected adapter (`HaCanvasLightCard`), standard stories, focused tests, local Seeds, public exports, documentation, Storybook order, Dashboard demo data, and one runtime registry entry.

A neutral control exposes the shared handler's zero-argument actions. Actions that require values or credentials are not guessed: the Card starts read-only until its bespoke design supplies the right control. `--kind reading` can deliberately suppress available zero-argument actions. Existing Orb generation and the committed Field generator remain unchanged.

## Make it its own skin

1. Replace `styles/tokens.css` and the neutral Parts in `shared/`; keep every colour in the scoped token file.
2. Record the skin's rules in `docs/<skin>.md` and encode CSS-enforceable rules in `styles/rules.test.ts`.
3. Replace each Card's placeholder glyph, summary, actions, history and Details content without forking its domain model or Home Assistant hook.
4. Keep presentational code out of `src/ha`; only the skin's `ha/` and `lovelace/` folders cross that seam.
5. Keep Storybook's standard state, width, footprint, compact, worst-case and Details stories while adding domain-specific stories.

Verify the result:

```sh
npm run check
npm run test-storybook
npm run build:ha
npm run storybook
```

In Storybook, inspect every generated Card's All states, Sizes, Footprints, Compact, Worst case and Details stories, then the whole Dashboard and Lovelace card at phone, tablet and wall-panel widths.
