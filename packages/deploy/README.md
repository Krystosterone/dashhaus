# @dashhaus/deploy

The Node-only deploy CLI for Dashhaus dashboards. It reads a `dashboard.config.mjs`, builds and uploads the bundle to Home Assistant, registers or updates the dashboard resource, and creates the dashboards the config declares the first time. It imports no React and no skin.

## Install

```sh
npm install @dashhaus/deploy
```

Node 22 or later.

## Use

Write `dashboard.config.mjs` beside the bundle:

```js
import { generatedDashboards } from "@dashhaus/deploy/config";

export default {
  bundle: "dist/dashhaus.js",
  dashboards: [
    {
      path: "home-orb",
      title: "Home (Orb)",
      icon: "mdi:home-variant",
      card: async () => ({ card: { type: "custom:dashhaus-orb" }, made: "automatic" }),
    },
    ...generatedDashboards([{ id: "canvas", title: "Canvas", icon: "mdi:view-dashboard-outline" }]),
  ],
};
```

Fill `.env` beside it (`HA_URL`, `HA_TOKEN`, `HA_WWW`, and `HA_SSH_PORT` when needed), then run:

```sh
npx dashhaus-deploy
```

`--skip-build` uses a bundle that already exists; `--config <file>` points at another config; `--help` lists the options and the declared dashboards.

## Subpaths

| Subpath | What it is |
| --- | --- |
| `.` | The CLI and its loader: `deploy`, `loadDashboards`, `readConfig`, `resolveDashboards`, `resolveBundle` |
| `./config` | The pure author config surface: `DeployConfig`, `DeployDashboard`, `DeployHa`, `DeployCard`, `GeneratedSkin` and `generatedDashboards` |

## Docs

- [Deploying and the dashboard config](https://github.com/Krystosterone/dashhaus/blob/main/docs/deploy.md)
- [Releasing the public packages](https://github.com/Krystosterone/dashhaus/blob/main/docs/release.md)
- [Repository overview](https://github.com/Krystosterone/dashhaus#readme)
