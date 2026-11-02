# create-dashhaus-skin

Start a Dashhaus skin: your own look for a Home Assistant dashboard, as a standalone project. It writes one control
card (lights), one reading card (sensors), the `@dashhaus/core` hooks behind them, the Lovelace custom element and its
YAML reader, a local preview on a sample house, the card and CSS checks, a Vite build that emits one file and a deploy
config. `npm run add -- <domain>` adds the card for any other domain `@dashhaus/core` reads. A skin starts from the
same templates as the skins built inside the Dashhaus repository. It also writes an `AGENTS.md`, so an agent handed only "make it look like this" knows where the colours,
type, parts and rules live and how to check its work. No Storybook, no workspace, no repository.

Just want the ready-made Orb and Field dashboards? Install `@dashhaus/bundle` and `@dashhaus/deploy` instead; nothing
is built.

## Use

```sh
npm create dashhaus-skin@latest my-skin
cd my-skin
npm install
npm run snapshot     # look at it: preview/snapshots/*.png (or npm run preview for the browser)
npm run add -- climate   # another domain's card
npm test
npm run build
cp .env.example .env # HA_URL, HA_TOKEN, HA_WWW
npm run deploy
```

From release tarballs instead of the registry, run the bin from the scaffolder's tarball and point the new project
at the folder holding the others:

```sh
npx --yes --package ./create-dashhaus-skin-<version>.tgz create-dashhaus-skin my-skin --tarballs .
```

The folder's name is the skin's name (lower-case kebab-case). It must be new or empty. `--dry-run` lists the files
instead of writing them; `--help` prints the options.

## What it writes

```
AGENTS.md (+ CLAUDE.md)               the guide: the loop, where things live, the rules, restyling from a picture
cards/light/__Skin__LightCard.tsx     the control card: the light's model in a neutral frame, its Toggle action
cards/sensor/__Skin__SensorCard.tsx   the reading card
ha/                                   the useHaLight and useHaSensor adapters
shared/                               the card frame, its details dialog, the action button; the font and theme attribute
dashboards/                           the page: layout, card grid, header and nav bar
lovelace/                             the custom element, YAML reader, automatic layout, card registry, page and
                                      rejected-command row, bundle entry
styles/tokens.css                     every colour, font and easing, light and dark
preview/                              the local preview, its sample house and the snapshot script
conformance.js, tsconfig.json         npm test: tsc, then @dashhaus/dashboard/conformance plus the CSS rules
vite.config.js                        one ES module, dist/dashhaus-<skin>.js, CSS inlined
dashboard.config.mjs, .env.example    the deploy: the dashboard, the bundle, the settings
```

`__Skin__` is the folder's name in PascalCase. The project depends on `@dashhaus/core`, `@dashhaus/dashboard`, React
18.3+ or 19 and `home-assistant-js-websocket`; `@dashhaus/deploy`, Vite, TypeScript and Playwright (for
`npm run snapshot`) are dev dependencies; Playwright's Chromium is installed on the first snapshot's word.
