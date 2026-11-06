# @dashhaus/deploy

The command that puts Dashhaus dashboards into Home Assistant. It reads `dashboard.config.mjs`, runs the config's
build if it has one, copies each file the config names into Home Assistant's `/config/www`, registers each as a
dashboard resource, checks that Home Assistant serves them, and creates each dashboard the config declares the first
time. Node 22 or later; it imports no React and no skin.

Which packages you need:

| You want | Install |
| --- | --- |
| Orb's or Field's dashboard, nothing to build | the skin's package and this one: `@dashhaus/orb` (or `@dashhaus/field`) and `@dashhaus/deploy` (below) |
| Your own look, a skin you build | `npm create dashhaus-skin@latest my-skin`; the scaffold depends on this package and its `AGENTS.md` walks the rest |

**Beta.** Dashhaus is in beta: a new `0.x` version (0.2 → 0.3) may break what you use, and a caret range keeps
you on one `0.x` line until you move. Every `@dashhaus/` package shares one version; each
[release](https://github.com/Krystosterone/dashhaus/releases) says what changed and what to do, and an
[issue](https://github.com/Krystosterone/dashhaus/issues/new/choose) saying how it went on your setup helps.

## Deploy a skin's dashboard

```sh
mkdir my-dashboards && cd my-dashboards
npm init -y
npm install @dashhaus/orb @dashhaus/deploy
```

The app needs no React: the config only reads the path of the skin's one file, and the command uploads it. From
release tarballs instead of the registry, install the two files: `npm install ./dashhaus-orb-<version>.tgz
./dashhaus-deploy-<version>.tgz`. npm may say that esbuild's install script was blocked; the config loader works
without it.

`.env`, in the same folder (keep it out of version control):

```sh
HA_URL=http://homeassistant.local:8123
HA_TOKEN=<long-lived access token>
HA_WWW=root@homeassistant.local:/config/www
```

- `HA_URL` is the address you open Home Assistant at.
- `HA_TOKEN` is a long-lived access token from an admin user (Profile → Security → Long-lived access tokens). Only
  this command uses it; it never goes into an uploaded file.
- `HA_WWW` is Home Assistant's `/config/www`, the folder it serves at `/local/`: an SSH address (the Terminal & SSH
  add-on, with your key authorized; add `HA_SSH_PORT` when it isn't 22) or a mounted folder such as
  `/Volumes/config/www` (Samba add-on, Docker volume).

`dashboard.config.mjs`, beside `.env`:

```js
import { resourceFile as orb } from "@dashhaus/orb/resource";

export default {
  pageTitle: "Home",
  files: [orb],
  dashboards: [
    { path: "home-orb", title: "Home (Orb)", icon: "mdi:home-variant", strategy: { type: "custom:orb-dashboard" } },
    // A dashboard of your own: Orb's card with your cards or rows.
    // { path: "my-home", title: "My home", icon: "mdi:floor-plan", card: { type: "custom:dashhaus-orb", title: "Home", cards: ["light.kitchen"] } },
  ],
};
```

`resourceFile` is the absolute path of the skin's one file, `orb-dashboard.js`: Orb's Lovelace card
(`custom:dashhaus-orb`) and its dashboard strategy (`custom:orb-dashboard`). Field is the same with its own names:
install `@dashhaus/field`, import `resourceFile` from `@dashhaus/field/resource` (`field-dashboard.js`), and use
`custom:field-dashboard` and `custom:dashhaus-field`. For both, list both files: `files: [orb, field]`.

Then:

```sh
npx dashhaus-deploy --skip-build
```

`--skip-build` uploads the files as installed; a skin package's file has nothing to build. A successful run ends
with every step marked ✓, including `Checking that Home Assistant serves it`; reload any Home Assistant tab that was
open and pick the dashboard in the sidebar. Run the same command after `npm update`: it replaces the files and leaves
your dashboards alone.

`npx dashhaus-deploy --help` prints the options, the dashboards your config declares, a config to start from when
there is none, and the `.env` keys.

## The config

`export default { pageTitle?, files, build?, dashboards }`:

| Key | What it is |
| --- | --- |
| `files` | The JavaScript files to upload, each relative to the config or absolute. Each is copied to `$HA_WWW/<name>/<name>.js` and registered as `/local/<name>/<name>.js?v=<content hash>`, so keep a file's name to keep its URL. Two files may not share a file name, since they would share a URL. |
| `build` | Optional `async () => {}`, run once with the config's folder as the working directory before the files are read; `--skip-build` skips it. Without one the files must already exist. |
| `pageTitle` | The view title of each new `card` dashboard (default `Home`). |
| `dashboards[]` | `path` (the URL path; Home Assistant requires a hyphen, and paths are unique), `title` (sidebar), `icon` (`mdi:…`), exactly one of `strategy` or `card` (below), and optional `env: { path?, title? }` naming `.env` keys that may override the path and title. |

A dashboard is drawn one of two ways:

- `strategy: { type: "custom:orb-dashboard" }`, a skin's dashboard strategy, with any options it takes beside `type`.
  The dashboard is saved as `{ strategy: { … } }` and the skin draws it each time it opens, so it follows the skin as
  it updates.
- `card`, one card in a panel view, saved once and then yours to edit. Either the card's config as written, such as
  `{ type: "custom:dashhaus-orb", title: "Home", cards: ["light.kitchen"] }` for a dashboard of your own cards or
  rows, or a factory `card(ha)` returning `{ card, made }`: the card's config, and a few words for the report.
  `card(ha)` receives the authenticated websocket client (`ha.send(type, payload)`), so it can read the house
  (`get_states`, `config/entity_registry/list_for_display`, …) before it returns a card.

A dashboard that already exists is left as it is: its strategy or card is only used on the first deploy, and later
deploys only follow a sidebar title change.

The config may be JavaScript or TypeScript and may import packages; it is bundled with esbuild before it is loaded.
Settings live only in `.env` or the environment.

## When something goes wrong

| Message | What to do |
| --- | --- |
| `No config at …` | Write `dashboard.config.mjs` in the folder you run from, or pass `--config <file>`. |
| `Missing settings` | Add the keys it lists to `.env` beside the config. |
| `Could not reach …` / `rejected HA_TOKEN` | Check `HA_URL` (the address you open Home Assistant at) or make a new token. |
| `! … answers HTTP 404` | `HA_WWW` is not the folder Home Assistant serves at `/local/`, or `www` did not exist when Home Assistant started: restart it once. |
| `! Could not manage resources` | Your dashboards are in YAML mode; add the printed lines, one entry per file, under `lovelace: resources:` in `configuration.yaml`. |
| `! Another … is also registered` | The same file is installed twice, as from the Marketplace under `/hacsfiles/`; remove one under Settings → Dashboards → Resources. |
| "Custom element doesn't exist" on the dashboard | The tab was open before the deploy; reload it. |

## Change a layout

A dashboard on a skin's strategy is drawn by the skin and follows it as it updates. To choose your own
cards and rows, declare a `card` dashboard (above), or open one in Home Assistant, then ⋮ → Edit dashboard → the
card's ✎ → Show code editor. Mistakes are listed together, each at its path with a suggestion. The YAML each card
takes is in its skin's README: `@dashhaus/orb`'s, `@dashhaus/field`'s, or the README of a skin you built.

## Programmatic use

| Subpath | What it is |
| --- | --- |
| `.` | `deploy({ configFile, env, skipBuild, report, warn, connect, fetch })`, which resolves to `{ resources: [{ name, url, version, updated, error? }], dashboards }`, and the loader: `readConfig`, `resolveDashboards`, `resolveFiles`, `loadDashboards` |
| `./config` | Types for a config (`DeployConfig`, `DeployDashboard`, `DeployCardDashboard`, `DeployStrategyDashboard`, `DeployStrategy`, `DeployCardConfig`, `DeployCardFactory`, `DeployHa`, `DeployCard`), and `generatedDashboards()` |
