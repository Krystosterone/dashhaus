# Report: the Titan skin

## FRICTION

- **Scaffolding from the tarballs** worked first time with the command the scaffolder's README gives:
  `npx --yes --package ./tarballs/create-dashhaus-skin-0.2.1.tgz create-dashhaus-skin titan --tarballs ./tarballs`.
- **`npm install` blocked esbuild's install scripts** (`npm warn install-scripts … esbuild … not covered by
  allowScripts`, npm 12.2.2). I guessed this was harmless, and it was: Vite builds with the prebuilt platform binary. A
  reader can't tell from the warning whether the build will work.
- **Playwright's Chromium could not be downloaded**. `npx playwright install chromium` failed because
  `cdn.playwright.dev` was refused by the network. Workaround: the `DASHHAUS_CHROMIUM` route the snapshot script
  offers, pointed at `/usr/bin/google-chrome` (Chrome for Testing 153, older than the build Playwright wants). It worked
  for every snapshot and probe.
- **The web font.** AGENTS.md says to set `TITAN_FONT_HREF` to a Google Fonts URL. I could not use the web, and Home
  Assistant is often offline, so I installed `@fontsource/antonio` from npm and inlined its woff2 files into the bundle
  (`?inline`), handed to the page as a blob stylesheet URL.
  - First attempt failed silently. In the dev server, Vite's `?inline` on a woff2 returns a path, not a data URL. A
    path inside a blob stylesheet doesn't resolve, so the fonts reported `error` and the first snapshot fell back to a
    wide sans.
  - `npm run snapshot` waits on `document.fonts.ready` but doesn't report a font that failed. I found it only with my
    own probe script.
  - Fix: resolve the path against `import.meta.url` when it isn't a `data:` URL. The production build inlines data
    URLs, and the deployed page reports `Antonio 400/600 loaded`.
- **Replacing the palette left dangling tokens.** The scaffold's `lovelace/TitanActionStatus.css` and the host CSS
  string in `lovelace/card.tsx` used `--titan-card`, `--titan-warn`, `--titan-line` and `--titan-shadow`. I renamed
  the palette's roles, and `npm test` doesn't check for undefined `var()` references, so nothing flagged them. I found
  them by reading the files and restyled both.
- **Restyling the frame breaks `npm run add`.** Cards written by `npm run add` pass the neutral frame's props (`icon`,
  `summary`, `state`). My first frame made new required props (`code`, `entityId`, `status`, `tone`), so every
  generated card failed `tsc` until I rewrote it.
  - The fix keeps the frame backward compatible: those props are optional with sensible defaults, and `icon` is
    accepted and ignored.
  - I proved it by running `npm run add -- fan`, `npm test` (passed, 7 cards), then removing the fan card again and
    restoring `lovelace/registry.tsx`.
- **The AGENTS.md import table named the wrong module.** It lists `compass` in one row for
  `/weather/conditions, /weather/readings`. I guessed `readings`, which `tsc` refused; it is in `conditions`.
- **`WeatherEntity` has no `area`**, unlike the other models, and the generated weather card's `"area" in e` check hid
  that. The card prints "Outside".
- **The preview house is not the real house.** The preview draws lights and sensors from `preview/house.ts` and every
  other domain from core's demo house, all in "Living room". Home Assistant here has an Office area, a `switch`, a lock
  without a code, a heat-only thermostat and a weather entity with no area. I checked those against the real Home
  Assistant page (below) rather than editing the preview house.
- **Full-page snapshots put a fixed element mid-page.** On the phone snapshot the docked nav appears in the middle of
  the image, because the screenshot is full-page. It is correct on screen, which I confirmed with a viewport-sized
  crop of the live page.
- **Light versus dark.** The fake Home Assistant page sends light mode, so the deployed page was checked in light
  mode. Dark mode, which is the reference's look, was checked in the preview (`desktop-dark.png`) and in details
  screenshots.
- **Long names.** A two-line clamp on card names cuts the worst-case name ("Bedside lamp on the window side of the
  bed") without a visible ellipsis in Chrome. The full name is in the details. I left it as is.
- **Tooling.** The Write tool refused to overwrite scaffold files until I had read them, and refused to create
  REPORT.md (it treats it as a subagent report file), so this file was written with a shell heredoc.
- **The token.** `.env` (HA_URL, HA_TOKEN=fake-ha-token, HA_WWW=/tmp/dashhaus-study-titan/ha/www) sits in `titan/`.
  The scaffold's `.gitignore` already lists it.

## RESULT

**Deployed:** the Titan skin, `titan/` (`custom:dashhaus-titan`), at **`/dashhaus-titan`**: the dashboard "Home
(Titan)" at http://127.0.0.1:8801/dashhaus-titan.

- **What it is.** A starship-console look after `reference.png`: black page, slate elbows and bars, condensed Antonio
  capitals, flat keys with corner markers, ruled gauges and dot strips. Salmon means on, teal means a reading, red means
  an alert. It has a light-mode version and a phone layout with the nav docked at the bottom.
- **Cards.** Six: light (with a brightness fader), sensor, climate (setpoint fader, mode keys), lock (guarded unlock
  with question or keypad), toggle (`switch` and `input_boolean`) and weather. Those cover every domain this Home
  Assistant has.
- **Files.** `titan/dist/dashhaus-titan.js` (550 kB, CSS and fonts inlined) was copied to
  `/tmp/dashhaus-study-titan/ha/www/dashhaus-titan/` and registered as the resource
  `/local/dashhaus-titan/dashhaus-titan.js?v=a30991546f`.

**How I know:**

1. `npm test`: `tsc`, then `conformance: 6 cards and 10 stylesheets, no findings`. `npm run build` passes.
2. `npm run deploy` ended every step in ✓:
   - built, copied, connected (Home Assistant 2026.10.0);
   - registered the resource (added, then updated on the second deploy);
   - created the dashboard "with automatic", left alone on the second run;
   - Home Assistant serves `/local/dashhaus-titan/dashhaus-titan.js?v=a30991546f` as "the uploaded file".
3. I loaded http://127.0.0.1:8801/dashhaus-titan in Chrome through Playwright at 1440 px and 390 px. No page errors and
   no config problem.
   - 14 cards drew in sections Bedroom, Kitchen, Living room and Office, plus weather. They are the 16 entities less
     the 2 humidity sensors, which ride on their room's sensor card.
   - Fonts reported `Antonio 400 loaded` and `Antonio 600 loaded`.
4. Pressing Counter strip's POWER and Desk fan's ON sent `light.toggle` and `switch.toggle` with the right entity ids
   (the fake's call log). Both cards re-rendered as `on` from the store.
5. Preview snapshots in `titan/preview/snapshots/` (desktop, phone, desktop-dark) look right. So do details shots for
   the thermostat (fader, mode keys, today strip, facts), the lock's unlock keypad, and an unavailable light on a phone.
