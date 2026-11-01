# Starting a skin

This page is the repository's generator reference: a skin inside this workspace, with Storybook and the shared
bundle. To build a skin in its own directory from the published packages, with no Storybook or workspace, use
[build-a-skin.md](build-a-skin.md) and `npm create dashhaus-skin`.

Create a neutral, first-class skin:

```sh
npm run new-skin -- canvas
```

The name is lower-case kebab-case. It determines every namespace and registration: the private workspace package `src/skins/canvas/` named `@dashhaus/canvas`, Storybook section **Canvas**, CSS variables and classes beginning `--canvas-` / `canvas-`, public symbols beginning `Canvas`, and Lovelace card `custom:dashhaus-canvas`. Use `--dry-run` to validate and list the transaction without writing it.

The baseline is intentionally neutral. It proves the architecture before visual work; it does not copy Orb or synthesize Field's mature hardware design.

## The package surface

`npm install` links the skin through the root `src/skins/*` workspace glob. The root apps import its package exports; they never reach into `src/skins/canvas/` by relative path. A Card added later stays inside the package: its components, tests, demo seeds, registry row and entry exports. The only writes outside it are declared registration seams: the Storybook section order, the shared card documentation and the skin's design document. `scripts/packages.mjs` is the one map of package locations and specifiers for both generators, and `verify/generator-packages.test.ts` holds it to the root workspaces and the generated manifest.

## Add real Cards

A generated skin is recognized by its package manifest and its skin-local `lovelace/registry.tsx`. That registry is the only runtime seam joining Card kinds to Connected adapters; it stays under `lovelace/` so presentational Card code remains provider-agnostic. Add any existing shared domain through the normal Card command:

```sh
npm run new-card -- light --skin canvas
npm run new-card -- climate --skin canvas
npm run new-card -- sensor --skin canvas
```

The Card generator writes inside the skin package plus its declared registration seams; every insertion targets a `// new-card: …` marker or the small registry, so an unrelated line moving in a package-owned file does not break a dry run.

A neutral control exposes the shared handler's zero-argument actions. Actions that require values or credentials are not guessed: the Card starts read-only until its bespoke design supplies the right control. `--kind reading` can deliberately suppress available zero-argument actions. Existing Orb generation and the committed Field generator remain unchanged.

## Rules every skin keeps

These hold for every skin: Orb, Field, a skin `new-skin` generates and a standalone skin from `create-dashhaus-skin`.
This section is their one home. A skin's own spec adds its numbers and names (footprints, token names, its
accent), and the scaffold's `AGENTS.md` repeats each rule under the same bold title for an agent with only the
package; `verify/skin-rules.test.ts` holds it to that.

- **One card, one entity.** A card draws one Home Assistant entity; companions (a humidity sensor beside a
  temperature) are that card's options, and several things on one card are a skin's bundle of cards.
- **Colours come from tokens.** No colour literal in a skin's CSS: every colour is a token in the skin's
  `styles/tokens.css`, under the skin's namespace, with its light and dark values.
- **A card's height never changes with its state.** Turning something on, a longer value or an unavailable entity
  never moves the page. A height comes from the card's footprint and its container, never the viewport.
- **Motion only on `transform`, `opacity`, `clip-path` and colours**, never on layout properties. Easing and
  durations come from the skin's tokens; reduced motion drops the movement and keeps the change.
- **Hover only under `@media (hover: hover) and (pointer: fine)`**, so a tap never leaves a hover state behind.
- **Controls feel like controls:** no text selection or tap highlight, `touch-action: manipulation`, press feedback
  on `:active`, built on the `@dashhaus/core/primitives` hooks rather than hand-written ARIA.

## Make it its own skin

1. Replace `styles/tokens.css` and the neutral Parts in `shared/`, within [Rules every skin keeps](#rules-every-skin-keeps).
2. Record the skin's rules in `spec/<skin>.md` and encode CSS-enforceable rules in `styles/rules.test.ts`.
3. Replace each Card's placeholder glyph, summary, actions, history and Details content without forking its domain model or Home Assistant hook.
4. Keep presentational code out of `packages/core/src/ha`; only the skin's `ha/` and `lovelace/` folders, and its entry that re-exports their connected containers, cross that seam.
5. Keep Storybook's standard state, width, footprint, compact, worst-case and Details stories while adding domain-specific stories.

Then verify it as [AGENTS.md → Verifying changes](../AGENTS.md#verifying-changes) says, with `npm run build:ha`.
