# Futura, a study

Futura is a **study**: a skin an agent built with this repository's generators, kept so you can see what they make and
start from it. It draws the house as a dark instrument console lit by two neon signals, cyan for live and amber for
energy. It is not finished or polished, and it doesn't ship: it isn't in the Lovelace bundle, and `npm run deploy`
doesn't create its dashboard.

## Use it

Do what you want with it: take ideas from it, copy a part or a card, improve it, or build a skin of your own on top of
it. If you make it better, contributions back are welcome; open a pull request.

## Where things are

- **Storybook:** Studies → Futura, with the same groups as every skin (Cards, Dashboards, Foundations, Connected).
- **Source:** `src/skins/futura/`, the private workspace package `@dashhaus/futura`.
- **Its design rules:** `src/skins/futura/design.md`, also drawn in Storybook as Foundations → Design rules.
- **Review captures** from the run: [phone](captures/examples-phone-390.png),
  [tablet](captures/examples-tablet-1280.png) and [parts](captures/foundations-parts-1280.png).

## How it was made

An agent ran `npm run new-skin -- futura`, then `npm run new-card -- <domain> --skin futura` for `light`, `climate`,
`toggle`, `sensor` and `weather`, and gave the neutral shell its own look: tokens, parts, cards and dashboards, then
a pass of Impeccable's critique and polish. Its cards keep every generated contract: the shared entity models and
`useHa<Name>` hooks, the card frame from `@dashhaus/dashboard/card`, fixed footprints and the skin-local Card registry.

The run's real output was what it taught about the generators. Its friction became fixes in the generators and
templates, so the next skin starts without it: a theme attribute of each skin's own, one font seam for the Lovelace
card and Storybook, a named card article, a row for a command Home Assistant refused, and a toolchain that fails
loudly on the wrong npm.

## Make it a real skin

A study becomes a skin when someone takes it further: remove `dashhaus.study` from its `package.json`, move its design
rules to `spec/futura.md` (and its cards' entries to `spec/cards.md`), move its stories from `Studies/Futura` to
`Futura`, and register it in the Lovelace bundle and the deploy config as `new-skin` does for any skin (spec/skins.md →
Studies).
