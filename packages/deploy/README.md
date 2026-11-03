# @dashhaus/deploy

The command that puts a Dashhaus dashboard into Home Assistant. It reads `dashboard.config.mjs`, builds the bundle
if the config says how, copies it into Home Assistant's `/config/www`, registers it as a dashboard resource, checks
that Home Assistant serves it, and creates each dashboard the config declares the first time. Node 22 or later; it
imports no React and no skin.

Which packages you need:

| You want | Install |
| --- | --- |
| The ready-made Orb and Field dashboards, nothing to build | `@dashhaus/bundle` and `@dashhaus/deploy` (below) |
| Your own look, a skin you build | `npm create dashhaus-skin@latest my-skin`; the scaffold depends on this package and its `AGENTS.md` walks the rest |

## Deploy the prebuilt dashboards

```sh
mkdir my-dashboards && cd my-dashboards
npm init -y
npm install @dashhaus/bundle @dashhaus/deploy
```

From release tarballs instead of the registry, install the two files: `npm install ./dashhaus-bundle-<version>.tgz
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
  this command uses it; it never goes into the bundle.
- `HA_WWW` is Home Assistant's `/config/www`, the folder it serves at `/local/`: an SSH address (the Terminal & SSH
  add-on, with your key authorized; add `HA_SSH_PORT` when it isn't 22) or a mounted folder such as
  `/Volumes/config/www` (Samba add-on, Docker volume).

`dashboard.config.mjs`, beside `.env`:

```js
import { fileURLToPath } from "node:url";
import { bundlePath } from "@dashhaus/bundle";

export default {
  pageTitle: "Home",
  bundle: fileURLToPath(bundlePath),
  dashboards: [
    {
      path: "home-orb",
      title: "Home (Orb)",
      icon: "mdi:home-variant",
      async card() {
        return { card: { type: "custom:dashhaus-orb" }, made: "automatic" };
      },
    },
    {
      path: "home-field",
      title: "Home (Field)",
      icon: "mdi:knob",
      async card() {
        return { card: { type: "custom:dashhaus-field" }, made: "automatic" };
      },
    },
  ],
};
```

Then:

```sh
npx dashhaus-deploy --skip-build
```

`--skip-build` uploads the file as installed. A successful run ends with every step marked ✓, including
`Checking that Home Assistant serves it`; reload any Home Assistant tab that was open and pick the dashboard in the
sidebar. Run the same command after `npm update`: it replaces the bundle and leaves your dashboards' layouts alone.

`npx dashhaus-deploy --help` prints the options, the dashboards your config declares, a config to start from when
there is none, and the `.env` keys.

## The config

`export default { pageTitle?, bundle, build?, dashboards }`:

| Key | What it is |
| --- | --- |
| `bundle` | The one JavaScript file to upload, relative to the config or absolute. It is copied to `$HA_WWW/<name>/<name>.js` and registered as `/local/<name>/<name>.js?v=<content hash>`, so keep its name to keep its URL; two bundles with different names live side by side. |
| `build` | Optional `async () => {}` run with the config's folder as the working directory before the upload; `--skip-build` skips it. Without one the bundle must already exist. |
| `pageTitle` | The view title of each new dashboard (default `Home`). |
| `dashboards[]` | `path` (the URL path; Home Assistant requires a hyphen, and paths are unique), `title` (sidebar), `icon` (`mdi:…`), `card(ha)` (returns `{ card, made }`: the Lovelace card config for the dashboard's one panel view, and a few words for the report), and optional `env: { path?, title? }` naming `.env` keys that may override them. |

`card(ha)` receives the authenticated websocket client (`ha.send(type, payload)`), so a factory can read the house
(`get_states`, `config/entity_registry/list_for_display`, …) before it returns a card. A dashboard that already exists
keeps its layout: the factory runs on the first deploy only, and later deploys only follow a sidebar title change.

The config may be JavaScript or TypeScript and may import packages; it is bundled with esbuild before it is loaded.
Settings live only in `.env` or the environment.

## When something goes wrong

| Message | What to do |
| --- | --- |
| `No config at …` | Write `dashboard.config.mjs` in the folder you run from, or pass `--config <file>`. |
| `Missing settings` | Add the keys it lists to `.env` beside the config. |
| `Could not reach …` / `rejected HA_TOKEN` | Check `HA_URL` (the address you open Home Assistant at) or make a new token. |
| `! … answers HTTP 404` | `HA_WWW` is not the folder Home Assistant serves at `/local/`, or `www` did not exist when Home Assistant started: restart it once. |
| `! Could not manage resources` | Your dashboards are in YAML mode; add the printed lines under `lovelace: resources:` in `configuration.yaml`. |
| "Custom element doesn't exist" on the dashboard | The tab was open before the deploy; reload it. |

## Change a layout

A new dashboard lays out every supported entity by area. To choose your own cards and rows, open it in Home Assistant,
then ⋮ → Edit dashboard → the card's ✎ → Show code editor. Mistakes are listed together, each at its path with a
suggestion. The YAML each card takes is in its own package: `@dashhaus/bundle`'s README for Orb and Field, the
skin's README for a skin you built.

## Programmatic use

| Subpath | What it is |
| --- | --- |
| `.` | `deploy({ configFile, env, skipBuild, report, warn, connect, fetch })` and the loader: `readConfig`, `resolveDashboards`, `resolveBundle`, `loadDashboards` |
| `./config` | Types for a config (`DeployConfig`, `DeployDashboard`, `DeployHa`, `DeployCard`), and `generatedDashboards()` |
