# @dashhaus/bundle

The prebuilt Dashhaus Lovelace bundle: Orb and Field, React and every stylesheet in one ES module. It registers `custom:dashhaus-orb` and `custom:dashhaus-field`, and exports the file's path so `@dashhaus/deploy` can upload it. Nothing is built in the consumer.

## Install

```sh
npm install @dashhaus/bundle @dashhaus/deploy
```

No React, `@dashhaus/core` or `@dashhaus/dashboard` install is needed: the bundle carries its own runtime. The deploy CLI needs Node 22 or newer.

## Use

`dashboard.config.mjs` beside your `.env`:

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

Then deploy the file already in the package:

```sh
npx dashhaus-deploy --skip-build
```

Each card lays out the house itself when its YAML has no `sections` or `modules`; Home Assistant keeps the generated layout editable afterwards.

## Exports

| Export | What it is |
| --- | --- |
| `bundlePath` | `dashhaus.js` as a file `URL`; pass it through `fileURLToPath` to the deploy config |

The package has no dependencies and no build step. To swap in a composition build, install `@dashhaus/orb` and/or `@dashhaus/field` and build your own bundle instead; see [Build a skin](https://github.com/Krystosterone/dashhaus/blob/main/docs/build-a-skin.md).

## Docs

- [Deploy](https://github.com/Krystosterone/dashhaus/blob/main/docs/deploy.md)
- [Release](https://github.com/Krystosterone/dashhaus/blob/main/docs/release.md)
