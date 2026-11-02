# Lcars, a study

Lcars is a **study**: a skin an agent built, kept so you can see what it made and start from it.
It is not finished or polished, and it doesn't ship: it isn't in the Lovelace bundle, and `npm run deploy` doesn't
create its dashboard. It is checked like every skin in this repository, so it keeps working as the packages change.

## Use it

Do what you want with it: take ideas from it, copy a part or a card, improve it, or build a skin of your own on top of
it. If you make it better, contributions back are welcome; open a pull request.

## Where things are

- **Storybook:** Studies → Lcars, with the same groups as every skin (Cards, Dashboards, Foundations, Connected).
- **Source:** `src/skins/lcars/`, the private workspace package `@dashhaus/lcars`.
- **Its design rules:** `src/skins/lcars/design.md`, also drawn in Storybook as Foundations → Design rules.
- **The run:** `study.json` records how it was made and what it was built from; `captures/` holds what it looked like.

## How it was made

A fresh agent built it from the Dashhaus 0.2.0 release packages (commit `1e13615`) and this description: "Star Trek's LCARS", the way someone outside this repository would: in an empty folder, with `npm create dashhaus-skin`, its `AGENTS.md` and `npm run add`, then deployed it to a simulated Home Assistant. Its whole task:

> Create a new Dashhaus skin that looks like Star Trek's LCARS, and deploy it to my Home Assistant at http://127.0.0.1:8801 (token fake-ha-token, its www folder is ~/dashhaus-try/ha/www).
>
> Asked once it was done: write REPORT.md beside the skin with two sections, ## FRICTION (every guess, retry, workaround, or doc that pointed somewhere you could not reach) and ## RESULT (what is deployed and how you know). Later: write DESIGN.md beside it, the skin's design rules (## Palette, ## Parts, ## Dashboards, then ## Light and ## Sensor).

- [`REPORT.md`](REPORT.md) is its own account: its FRICTION (every guess, retry and dead end) and its RESULT.
- [`design.md`](design.md) is the design rules it wrote.
- [`captures/`](captures/) holds its preview snapshots and `deployed.png`, the dashboard it deployed.

`npm run study:keep` then brought it into this repository: the agent's files over a shell from `npm run new-skin -- --study` and `npm run new-card -- <domain> --skin`, which add the stories, tests and Connected cards every skin has here. What only a standalone skin needs (its manifest, build and deploy config, preview and guide) stayed behind: the repository builds, previews and deploys its skins itself.

### After keeping

- `cards/sensor/LcarsSensorCard.tsx`: removed a `stateWords` helper the card never used. The repository's lint
  refuses unused code; the skin's own `npm test` doesn't check for it.
- `captures/deployed.png` is from the run's first keep, before studies took this shape; its other captures are the
  agent's own snapshots.

## Make it a real skin

A study becomes a skin when someone takes it further: remove `dashhaus.study` from its `package.json`, move its design
rules to `spec/lcars.md` (and its cards' entries to `spec/cards.md`), move its stories from `Studies/Lcars` to
`Lcars`, and register it in the Lovelace bundle and the deploy config as `new-skin` does for any skin (spec/skins.md →
Studies).
