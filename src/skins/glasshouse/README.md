# Glasshouse, a study

Glasshouse is a **study**: a skin an agent built, kept so you can see what it made and start from it.
It is not finished or polished, and it doesn't ship: it isn't in the Lovelace bundle, and `npm run deploy` doesn't
create its dashboard. It is checked like every skin in this repository, so it keeps working as the packages change.

## Use it

Do what you want with it: take ideas from it, copy a part or a card, improve it, or build a skin of your own on top of
it. If you make it better, contributions back are welcome; open a pull request.

## Where things are

- **Storybook:** Studies → Glasshouse, with the same groups as every skin (Cards, Dashboards, Foundations, Connected).
- **Source:** `src/skins/glasshouse/`, the private workspace package `@dashhaus/glasshouse`.
- **Its design rules:** `src/skins/glasshouse/design.md`, also drawn in Storybook as Foundations → Design rules.
- **The run:** `study.json` records how it was made and what it was built from; `captures/` holds what it looked like.

## How it was made

A fresh agent built it from the Dashhaus 0.2.1 release packages (commit `bbc5dbc`) and the picture in [reference.png](reference.png), the way someone outside this repository would: in an empty folder, with `npm create dashhaus-skin`, its `AGENTS.md` and `npm run add`, then deployed it to a simulated Home Assistant. Its whole task:

> # Task
>
> Build and deploy a Dashhaus skin that looks like ./reference.png
>
> Home Assistant runs at http://127.0.0.1:8801; a long-lived token for an admin: fake-ha-token; its /config/www is mounted at /tmp/dashhaus-study-glasshouse/ha/www.
> The packages aren't on npm yet; their release tarballs are in ./tarballs.
> Work only in this folder; don't ask questions.
>
> When you're done, write two files in this folder, beside the skin:
>
> - DESIGN.md: the skin's design rules, for whoever builds on it: what the look is after, then ## Palette, ## Parts, ## Dashboards
>   and one `## <Card>` section per card (`## Light`), each saying what it shows and why.
> - REPORT.md, with two sections:
>   - ## FRICTION: every guess, retry, workaround, or doc that pointed somewhere you couldn't reach.
>   - ## RESULT: what is deployed and how you know.

- [`REPORT.md`](REPORT.md) is its own account: its FRICTION (every guess, retry and dead end) and its RESULT.
- [`design.md`](design.md) is the design rules it wrote.
- [`captures/`](captures/) holds its preview snapshots and `deployed.png`, the dashboard it deployed.

`npm run study:keep` then brought it into this repository: the agent's files over a shell from `npm run new-skin -- --study` and `npm run new-card -- <domain> --skin`, which add the stories, tests and Connected cards every skin has here. What only a standalone skin needs (its manifest, build and deploy config, preview and guide) stayed behind: the repository builds, previews and deploys its skins itself.

Kept, it failed this repository's checks, so the study was changed (the checks were not):

- The frame's sub line put the area and the state in one string, so an unavailable card had no "Unavailable" to read on its own; the state is now its own span. Its details now end with the entity's id (`entityId` on `GlasshouseCardFrame`), which every card passes.
- The header's `h1` was the greeting; it is now the dashboard's title (the wordmark), and the greeting a paragraph styled as before.
- Sensor and toggle each wrote the same figure-and-caption row; it is one part now, `.glasshouse-figure-row` in `shared/ui.css`.
- The study's `styles/rules.test.ts` pinned the neutral shell's heights (176 and 72 px); it now pins the agent's own (236 px standard, 76 px compact), still one height per footprint and none per state.
- The agent's own preview gallery (`preview/gallery.*`, `deployed.js`) stayed behind with the rest of its preview.
- `captures/deployed.png` is a screenshot of the deployed dashboard taken by hand from the simulated Home Assistant, because `study:keep`'s own screenshot found no matching Chromium on the machine that kept it. The dark look in it is there because the agent saved `theme: dark` into the dashboard's config itself (its FRICTION, item 6).

## Make it a real skin

A study becomes a skin when someone takes it further: remove `dashhaus.study` from its `package.json`, move its design
rules to `spec/glasshouse.md` (and its cards' entries to `spec/cards.md`), move its stories from `Studies/Glasshouse` to
`Glasshouse`, and register it in the Lovelace bundle and the deploy config as `new-skin` does for any skin (spec/skins.md →
Studies).
