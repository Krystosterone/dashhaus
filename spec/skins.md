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

`npm install` links the skin through the root `src/skins/*` workspace glob. The root apps import its package exports; they never reach into `src/skins/canvas/` by relative path. A Card added later stays inside the package: its components, tests, demo seeds, registry row and entry exports. The only writes outside it are declared registration seams: the Storybook section order, the shared card documentation and the skin's design document. `scripts/packages.js` is the one map of package locations and specifiers for both generators, and `verify/generator-packages.test.ts` holds it to the root workspaces and the generated manifest.

## The page around the cards

What a skin gets right outside its cards, besides [its theme attribute](#rules-every-skin-keeps). The generated shell already has both, and `verify/skin-surface.test.ts` holds every skin in this repo (and the scaffold's templates) to them:

- **One font seam.** `shared/surface.ts` names the theme attribute and the skin's web font (`CANVAS_FONT_HREF`, undefined for the system stack); Orb and Field keep the same pair. The Lovelace card links it as its `fontHref`; the Storybook setup names it as `fontHref`, and `.storybook/preview.tsx` links it and, in a loader, waits for its families' faces before the story renders (four seconds at most, then the fallback stack), so a first paint, an axe pass and the docs screenshots see the real type. A skin never injects a font link from its decorator, and `preview-head.html` links no font.
- **A rejected command shows on the page.** Every Connected Card's action goes through the shared store, which keeps the latest rejection; `useActionStatus()` from the frozen `@dashhaus/dashboard/skin` turns it into a title, a detail, Retry when repeating the call is safe, and Dismiss. The generated `lovelace/CanvasActionStatus.tsx` draws it once for the page, above the NavBar or as the last block, so no Card or adapter wires an error of its own and a refused tap never fails silently. Restyle the row; keep its `alert` role and both buttons.

The generated Card frame also names its `<article>` after its title (`useCardFrame`'s `article` points at `nameId`), and the title button carries `aria-haspopup="dialog"`.

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

- **One card, one model.** A card draws one normalized model: a **direct model** is one Home Assistant entity, a
  **composed model** is a primary entity plus the companions its hook composes (a sensor's device readings, an
  Owlet's vitals). The model stays in the entity type and hook, so every card takes one `entity` prop; several
  things on one page are a skin's bundle of cards.
- **Colours come from tokens.** No colour literal in a skin's CSS: every colour is a token in the skin's
  `styles/tokens.css`, under the skin's namespace, with its light and dark values.
- **A card's height never changes with its state.** Turning something on, a longer value or an unavailable entity
  never moves the page. A height comes from the card's footprint and its container, never the viewport.
- **Motion only on `transform`, `opacity`, `clip-path` and colours**, never on layout properties. Easing and
  durations come from the skin's tokens; reduced motion drops the movement and keeps the change.
- **Hover only under `@media (hover: hover) and (pointer: fine)`**, so a tap never leaves a hover state behind.
- **A theme attribute of its own.** A skin's tokens key their dark (or light) values on an attribute in its own
  namespace (`data-canvas-theme`, Orb's `data-orb-theme`, Field's `data-fd-finish`), never the shared `data-theme`:
  skins share one Storybook `<html>` and one Home Assistant page, so a shared attribute set for one re-colours the
  others. The Lovelace card sets it on its host (`scopeToHost` turns `:root` into that host) and the skin's Storybook
  toolbar sets it on `<html>`. Every token block sits on `:root` alone: a token set again on an element inside the page
  would override the dark values it inherits.
- **Controls feel like controls:** no text selection or tap highlight, `touch-action: manipulation`, press feedback
  on `:active`, built on the `@dashhaus/core/primitives` hooks rather than hand-written ARIA.

## Studies

A study is a skin an agent built with the generators, kept so people can see what they make, use it and build on it.
It is not finished or polished, and it doesn't ship. Make one with:

```sh
npm run new-skin -- <name> --study
npm run new-card -- <domain> --skin <name>
```

`--study` runs the same generator and templates as any skin, so a study exercises them exactly as a real skin does. It
differs in five places only, all from one marker:

- **The marker:** its `package.json` carries `"dashhaus": { "study": { "theme": … } }` (the theme toolbar global the
  docs site draws it with) and a description that says it is a study.
- **What it says:** a `README.md` (what a study is, where things are, how it was made, how to take it further) that
  Storybook draws as its first page, **Read me first**.
- **Where it sits:** its Storybook section is `Studies/<Name>`, after every skin. `new-card` reads a skin's section
  from its `storybook.tsx`, so a study's cards land there too.
- **What it skips:** the Lovelace bundle, the deploy config and `spec/deploy.md`. No study reaches Home Assistant.
- **Where its docs live:** in its own folder. Its design rules are `src/skins/<name>/design.md`, not `spec/<name>.md`,
  and its cards get no entries in `spec/cards.md`: the specs, AGENTS.md and the docs pages describe the shipped skins
  and studies in general, never one study by name.

The docs site's Studies page is built from the markers, so a new study appears there with no edit. A study becomes a
skin by removing the marker, moving its design rules into `spec/` and its stories out of `Studies/`, and adding the
two registrations `new-skin` makes for any skin; that isn't automated. `verify/studies.test.ts` holds all of it.

## Make it its own skin

1. Replace `styles/tokens.css` and the neutral Parts in `shared/`, within [Rules every skin keeps](#rules-every-skin-keeps).
2. Record the skin's rules in `spec/<skin>.md` and encode CSS-enforceable rules in `styles/rules.test.ts`.
3. Replace each Card's placeholder glyph, summary, actions, history and Details content without forking its domain model or Home Assistant hook.
4. Keep presentational code out of `packages/core/src/ha`; only the skin's `ha/` and `lovelace/` folders, and its entry that re-exports their connected containers, cross that seam.
5. Keep Storybook's standard state, width, footprint, compact, worst-case and Details stories while adding domain-specific stories.

Then verify it as [AGENTS.md → Verifying changes](../AGENTS.md#verifying-changes) says, with `npm run build:ha`.
