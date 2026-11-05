# Titan, a study

Titan is a **study**: a skin an agent built, kept so you can see what it made and start from it.
It is not finished or polished, and it doesn't ship: it isn't in the Lovelace bundle, and `npm run deploy` doesn't
create its dashboard. It is checked like every skin in this repository, so it keeps working as the packages change.

It is an unofficial homage, drawn after a fan-made LCARS console, the Titan page at
[mewho.com/titan](https://www.mewho.com/titan/), itself after the look of a fictional interface. It is not affiliated
with or endorsed by that site's author or the owners of Star Trek; LCARS and Titan are their names, used here only to
say what it imitates.

## Use it

Do what you want with it: take ideas from it, copy a part or a card, improve it, or build a skin of your own on top of
it. If you make it better, contributions back are welcome; open a pull request.

## Where things are

- **Storybook:** Studies → Titan, with the same groups as every skin (Cards, Dashboards, Foundations, Connected).
- **Source:** `src/skins/titan/`, the private workspace package `@dashhaus/titan`.
- **Its design rules:** `src/skins/titan/design.md`, also drawn in Storybook as Foundations → Design rules.
- **The run:** `study.json` records how it was made and what it was built from; `captures/` holds what it looked like.

## How it was made

A fresh agent built it from the Dashhaus 0.2.1 release packages (commit `321186c`) and a picture, `reference.png`, the way someone outside this repository would: in an empty folder, with `npm create dashhaus-skin`, its `AGENTS.md` and `npm run add`, then deployed it to a simulated Home Assistant. The picture was a screenshot of [mewho.com/titan](https://www.mewho.com/titan/) at 1440 × 900, taken the day it ran. It isn't kept here: it is someone else's design, not ours to share without their consent, so it was removed and `study.json` marks it `withdrawn`. Its whole task:

> # Task
>
> Build and deploy a Dashhaus skin that looks like ./reference.png
>
> Home Assistant runs at http://127.0.0.1:8801; a long-lived token for an admin: fake-ha-token; its /config/www is mounted at /tmp/dashhaus-study-titan/ha/www.
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

The agent ran as a subagent of the session that kept it, told to stay in its sandbox folder and off the web, rather
than as a separate process: the session's permissions refused to start one. It had the same task, files and tarballs.

Kept, it failed this repository's checks, so the study was changed (the checks were not):

- `shared/surface.ts` inlined the Antonio font from `@fontsource/antonio`, a dependency of the agent's own manifest,
  which stays behind. It now links Antonio from Google Fonts, as every skin here does. The agent's reason for bundling
  it (a Home Assistant with no route out) is in its REPORT and design rules, and is worth keeping in mind if Titan
  becomes a real skin.
- The lock's bolt and the switch's rail each wrote the same ruled well; it is one part now, `.titan-rail` in
  `shared/ui.css`, and each card draws only its own bar in it.
- The fader's carriage set `transition: transform 0ms` with no easing token; it now sets none, which is the same, and
  the animated rule still adds the skin's easing.
- Light mode failed axe's colour contrast in Storybook: small words in the salmon headline colour and in alert red, on
  the pale page, and the white label on an alert datum. Two light tokens are darker: `--titan-title` `#a8462e` →
  `#a3432c` and `--titan-alert` `#d63a22` → `#b82f1a`, all now at least 4.5:1. Dark mode, the reference's look, is
  unchanged. `design.md` keeps the agent's own values and its account of the font; this list is what differs.
- The study's `styles/rules.test.ts` pinned the neutral shell's heights (176 and 72 px); it now pins the agent's own
  (196 px standard, 48 px compact), still one height per footprint and none per state.

## Make it a real skin

A study becomes a skin when someone takes it further: remove `dashhaus.study` from its `package.json`, move its design
rules to `spec/titan.md` (and its cards' entries to `spec/cards.md`), move its stories from `Studies/Titan` to
`Titan`, and register it in the Lovelace bundle and the deploy config as `new-skin` does for any skin (spec/skins.md →
Studies).
