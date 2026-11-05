# Report: Glasshouse

## FRICTION

Every guess, retry, workaround, or pointer to somewhere I couldn't reach.

1. **Playwright couldn't find a browser.** The scaffold pins `playwright@^1.64.1`, which wants
   `chromium_headless_shell-1248`; this machine has build 1243 at `/opt/pw-browsers/chromium`. `preview/snapshot.js`
   calls `chromium.launch()` with no way to pass an executable, so I patched it to read `CHROMIUM_PATH`
   (`executablePath`) and ran every snapshot with `CHROMIUM_PATH=/opt/pw-browsers/chromium`. The error says "Playwright
   has no Chromium yet: npx playwright install chromium", one command. AGENTS.md says the first run "prints the two
   commands", which it doesn't.
2. **npm 12 blocked esbuild's install scripts** ("2 packages had install scripts blocked because they are not covered
   by allowScripts"). I ignored it. Vite still built, so the postinstall wasn't needed.
3. **`npm run add -- lock` says the lock "is on the sample house, in the Living room", but it isn't.**
   `createDemoHouseTransport` doesn't include the lock demo, so no lock showed up in the preview. I added
   `lock.front_door` (Hallway) to `preview/house.ts` and handled `lock`/`unlock`/`open` in `preview/main.ts`.
4. **Today's bars can't be seen in the preview at night.** The preview's sensors have no history, the demo house's
   history is made at morning hours, and it was 01:30 here. So every "today" chart was empty, both in the preview and
   on the deployed fake Home Assistant. To check the chart I wrote `preview/gallery.html`/`gallery.tsx`, every card on
   `@dashhaus/core/seeds/*` at their fixed clock, and `preview/gallery-shot.js`. Its first shot came out unstyled: a
   component's own `import "./x.css"` is turned into an empty module by the Vite plugin, which is documented in
   `vite.config.js` but easy to miss. The gallery now gathers the stylesheets `?inline` the way `lovelace/entry.tsx`
   does.
5. **The deployed card has no `title`, so the header disappeared.** The preview passes `title: "Home"`; the deploy
   config doesn't. The page now defaults to "Home".
6. **Theme.** The fake Home Assistant reports light mode and the reference is dark. I added a YAML `theme` key
   (`auto` | `dark` | `light`, default `auto`, still on the skin's own attribute) and set `theme: dark` in
   `dashboard.config.mjs`. `npm run deploy` deliberately leaves an existing dashboard's layout alone, and the
   dashboard was already created, so it couldn't carry the change. I wrote a throwaway websocket script that read the
   dashboard's Lovelace config and saved it back with `theme: "dark"` (`lovelace/config/save`). Guess: the night look
   is what the deployed dashboard should show.
7. **Pressing a control didn't change the server's state.** The fake Home Assistant's dashboard page answers
   `call_service` inside the page (its own `states` map). After a press, `/api/states` and websocket `get_states`
   still said `off`. I checked the round trip in the page instead: the switch's `aria-pressed` flipped after the
   store update. This is about the fake, not the skin, but it cost a retry.
8. **Guessed from the 400×300 reference:** the typeface (Plus Jakarta Sans), the exact colours, and that the nav sits
   in a top bar (not docked at the foot as the scaffold had it). The reference's greeting moved to the page header so
   cards keep to their models. The reference's "Energy usage" and "Power distribution" panels have no entity in this
   house, so the sensor card takes the energy chart's look, and climate/lock take the dial and the security panel.
9. **Layout guess.** The scaffold's automatic layout is a row per area. The reference groups by function, so
   Glasshouse's is Overview / Rooms / Devices (other kinds still get a row per area).
10. **Actions the generator leaves out.** `npm run add -- climate` leaves out `onTargetChange`/`onModeChange` and the
   light leaves out `onBrightnessChange`, as documented. I wired them by hand: the − and + steps, the mode buttons and
   a brightness slider on `useSlider`.
11. **Finding things.** `@dashhaus/core/entities/history` (`HourSample`, `normalizeReadings`), the weather helpers
   (`entities/weather/readings`, `/conditions`) and `entities/climate/modes` are not named in AGENTS.md. I found them
   by reading `node_modules/@dashhaus/core/package.json` exports and the `.d.ts` files. AGENTS.md's Rules mention
   story files and the `Glasshouse/Cards/<Name>` title, but there is no Storybook; the stories are metadata only.
12. **Docs I couldn't reach and didn't need:** the packages' `homepage` / GitHub URLs (no web access in this run).

## RESULT

- **Skin:** `/tmp/dashhaus-study-glasshouse/agent/glasshouse`, named **glasshouse**: `custom:dashhaus-glasshouse`,
  bundle `dist/dashhaus-glasshouse.js`. It has six cards: weather, climate, lock, sensor, light and toggle
  (`switch`/`input_boolean`). Each one is drawn bespoke on shared glass parts (see DESIGN.md).
- **Checks:** `npm test` passes (`tsc`, then `conformance: 6 cards and 10 stylesheets, no findings`). `npm run build`
  passes (one ES module, about 524 kB, 130 kB gzipped).
- **Deployed:** `npm run deploy` ended with every step ✓. It copied the bundle to
  `/tmp/dashhaus-study-glasshouse/ha/www/dashhaus-glasshouse/` and registered
  `/local/dashhaus-glasshouse/dashhaus-glasshouse.js?v=9e45ec4749`. Home Assistant served the uploaded file, and the
  dashboard **Home (Glasshouse)** is at **`/dashhaus-glasshouse`** (http://127.0.0.1:8801/dashhaus-glasshouse). Its
  saved config is `{"type":"custom:dashhaus-glasshouse","theme":"dark"}`, read back over the websocket.
- **How I know it draws:** `preview/deployed.js` opened that URL in Chromium, waited for the card's shadow root to
  draw `<main>`, saw no page errors, and saved desktop and phone shots. It also saved the light, climate and lock
  details dialogs. All 16 of the house's entities are there: the weather two tracks wide, the thermostat dial
  (20.6 °C, set to 21.5°, heating), the front door locked, four room sensors (the office one unavailable, with a dashed
  edge and a dash), and five lights plus the desk fan as compact rows with switches. Pressing the Bedside switch on
  the deployed page flipped it to pressed through the store (see FRICTION 7).
- **Final snapshots** (`/tmp/dashhaus-study-glasshouse/agent/snapshots/`):
  - deployed: `deployed-desktop.png`, `deployed-phone.png`, `details-light.png`, `details-climate.png`,
    `details-lock.png`
  - preview of the sample house: `desktop-dark.png`, `desktop.png` (light), `phone.png` (light)
  - every card's states and worst cases on the seeds: `gallery-dark.png`, `gallery-light.png`, `gallery-phone.png`
