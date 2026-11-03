# Dashhaus

[![CI](https://github.com/Krystosterone/dashhaus/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Krystosterone/dashhaus/actions/workflows/ci.yml)

React and TypeScript skins for a custom Home Assistant dashboard, developed and verified in Storybook.

Dashhaus draws Home Assistant dashboards from React + TypeScript cards, composed into phone, tablet and wall-panel pages. Two skins, Orb and Field, sit on the same entity models and Home Assistant hooks; each brings its own cards, dashboard furniture and Lovelace card (`custom:dashhaus-orb`, `custom:dashhaus-field`). It is a component library, not a runnable app: Storybook is where the cards are developed and checked.

Documentation: **[krystosterone.github.io/dashhaus](https://krystosterone.github.io/dashhaus/)**, with Storybook at [/storybook](https://krystosterone.github.io/dashhaus/storybook/).

## Install

```sh
npm install
```

Requires Node 22.9 or later (`.nvmrc` pins 22).

## Usage

```sh
npm run storybook
```

Runs at http://localhost:6006. Storybook documents every card, supported footprint and skin, each skin under the same groups: Cards, Bundles (Orb only), Dashboards, Foundations, Connected. Use the Theme menu to switch between Auto (system), Light and Dark.

Create a new skin from the neutral shell:

```sh
npm run new-skin -- canvas
```

It registers the skin's Foundations, Dashboard, its own entry and Lovelace card; add real entity Cards with `npm run new-card -- light --skin canvas`. See [spec/skins.md](spec/skins.md). To build a skin in its own directory from the published packages, with no Storybook or workspace, use `npm create dashhaus-skin@latest my-skin` and [spec/build-a-skin.md](spec/build-a-skin.md).

## Packages

`@dashhaus/core`, `@dashhaus/dashboard` and `@dashhaus/deploy` are the headless foundation, the framework and the
deploy CLI; `@dashhaus/orb` and `@dashhaus/field` are the two skins. `@dashhaus/bundle` ships the prebuilt one-file
Lovelace bundle: a deploy-only app installs it with the CLI, names `fileURLToPath(bundlePath)` in its config and runs
`npx dashhaus-deploy --skip-build`. `create-dashhaus-skin` scaffolds a standalone skin. Package READMEs live in each
package; the release policy is [spec/release.md](spec/release.md).

## Running with Home Assistant

Fill in `.env` and deploy:

```sh
npm run deploy
```

It installs one bundle carrying `custom:dashhaus-orb` (Orb), `custom:dashhaus-field` (Field) and every registered generated skin, then creates one dashboard for each the first time, from the set declared in `dashboard.config.mjs`. You edit any Lovelace card's YAML in Home Assistant. See [spec/deploy.md](spec/deploy.md). Measure the deployed pages with `npm run perf:collect`; see [spec/performance.md](spec/performance.md). The data boundary, the shared `useHa<Kind>` hooks and the injected transport are in [spec/home-assistant.md](spec/home-assistant.md).

## Spec

The specification the code is held to, written for maintainers and agents. Tests, generators and Storybook read these files.

| File | What it covers |
| --- | --- |
| [spec/orb.md](spec/orb.md) | Orb's design and composition rules |
| [spec/field.md](spec/field.md) | Field's design and composition rules |
| [spec/cards.md](spec/cards.md) | Per-card behaviour |
| [spec/home-assistant.md](spec/home-assistant.md) | The Home Assistant data boundary and hooks |
| [spec/core.md](spec/core.md) | The core contract, error metadata, transport lifecycle and auth boundary |
| [spec/deploy.md](spec/deploy.md) | Deploying the bundle and the Lovelace YAML |
| [spec/performance.md](spec/performance.md) | The deployed pages' performance marks and report |
| [spec/skins.md](spec/skins.md) | Starting a skin in this repository |
| [spec/build-a-skin.md](spec/build-a-skin.md) | Building a standalone skin from the published packages |
| [spec/contract.md](spec/contract.md) | What a third-party skin may rely on |
| [spec/release.md](spec/release.md) | Building and releasing the public packages |

## Contributing

Ask questions and agree proposed changes in [GitHub Issues](https://github.com/Krystosterone/dashhaus/issues). Pull requests are accepted after that agreement. Before opening one, run `npm run check` and `npm run test-storybook`, document behavior changes, and preserve the domain → Home Assistant → skin import direction.

## License

MIT — see [LICENSE](LICENSE).

Third-party material keeps its own terms: the skills under `.agents/skills/` and `.agents/design/` are installed
from their upstream projects, named in `skills-lock.json`, and are not covered by this repository's license.
