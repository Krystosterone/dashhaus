# __Section__, a study

__Section__ is a **study**: a skin an agent built with this repository's generators, kept so you can see what they
make and start from it. It is not finished or polished, and it doesn't ship: it isn't in the Lovelace bundle, and
`npm run deploy` doesn't create its dashboard.

## Use it

Do what you want with it: take ideas from it, copy a part or a card, improve it, or build a skin of your own on top of
it. If you make it better, contributions back are welcome; open a pull request.

## Where things are

- **Storybook:** Studies → __Section__, with the same groups as every skin (Cards, Dashboards, Foundations, Connected).
- **Source:** `src/skins/__skin__/`, the private workspace package `@dashhaus/__skin__`.
- **Its design rules:** `spec/__skin__.md`.

## How it was made

`npm run new-skin -- __skin__ --study`, then `npm run new-card -- <domain> --skin __skin__` for each card. Replace this
paragraph with what was done after that, and what the run taught about the generators.

## Make it a real skin

A study becomes a skin when someone takes it further: remove `dashhaus.study` from its `package.json`, move its stories
from `Studies/__Section__` to `__Section__`, and register it in the Lovelace bundle and the deploy config as `new-skin`
does for any skin (spec/skins.md → Studies).
