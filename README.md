# Home Dashboard

Widgets for a custom Home Assistant dashboard, in React and TypeScript, with Storybook. Each widget shows one entity (the sensor widget shows one device's temperature and humidity together). So far: lights, climate and temperature/humidity sensors, composed into phone, tablet and wall-panel dashboards.

This file is the rules: what every widget must do, how motion behaves, and how dashboards compose. Per-widget behaviour is in [docs/widgets.md](docs/widgets.md); commands, layout and the adding-a-widget steps are in AGENTS.md. Use the Theme menu in the Storybook toolbar to switch between Auto (system), Light and Dark. The attention and row rules below have operational forms in the `attention-budget` and `row-identity` skills (`.agents/skills/`); where wording differs, the skills win.

## Design rules every widget follows

- **One widget, one entity.**
- **Height never changes with state.** A card's height depends only on its container width. Different states swap what fills a fixed-size area; they never add or remove rows.
- **Size from the container, not the viewport.** Use container queries. The light widget uses S under 260 px, M 260 to 439 px, L 440 px and up.
- **No expanding cards.** More detail opens in a sheet (bottom sheet on phones, centered panel on wider screens), from a circle arrow button or a press and hold on the main control.
- **One palette.** Colour is the exception, not the state:
  - **Neutrals** for everything by default.
  - **The accent** (one token, `--brand-c` / `--brand-h` in `tokens.css`, Crextio yellow by default) means energy: a lit light, heating or cooling running, daylight through an open cover, sunshine. It's the only fill colour, the glow, the "now" stick and the page wash. To re-colour the whole dashboard, change those two numbers; Storybook's Accent toolbar tries a few. Never recycle the accent for an unrelated meaning on the same surface.
  - **Charcoal** means on or chosen when it isn't energy: a mode switched on, a thermostat on but idle, a door left open, a selected chip.
  - **Hatching** means absence: off, closed, unavailable, the resting band of a heat/cool range.
  - **Warn orange**, text only, for problems. The one exception is an alarm that has gone off, which fills.
  - **Subtraction first.** At the densest layouts, mute decorative colour, fills, glows and unnecessary markers before adding a hue. No source establishes a hue-count or tile-count limit; do not invent one.
  - **Contrast, both themes.** Semantic colour — the orb and warn states — must clear the applicable WCAG thresholds (4.5:1 text, 3:1 large text and graphics) against adjacent backgrounds in light and dark themes.
  - **The colour slot** is the one standard place a widget can carry its own colour, and it's the orb only, never a fill or a glow. Thin rows and mini tiles never take it: there the on-state is the role tone (accent for energy, charcoal for state), and the glow never shows. It's on by default only where the colour is the data: a lamp's colour temperature, and apricot or blue for a thermostat heating or cooling. Everywhere else it's off. Every widget takes `color` ("lavender", `{ c, h }`, or "none"); toggles also read the entity's `color`. Widgets declare `data-role` (energy, state or reading) through `paint()` in `shared/ui.tsx`.
- **Thin rows carry their own identity.** Every thin row shows a stable domain icon in its orb (thermostat, window, bulb), a concise primary identity, and its state and value in the control slot — climate: mode and setpoint on the stepper; covers: position or travel; lights: on/off and brightness — as the explicit state cue. The area line carries the room, or the climate's current temperature and action. Colour reinforces the state; it never defines the row. Icon size, stroke weight, text slots and action placement stay stable across rows, and the Controls column groups by domain.
- **Light and dark themes** come from the tokens in `src/styles/tokens.css`. Never use a colour literal in a widget's CSS.

## Motion and touch rules

Applied from Emil Kowalski's design-engineering skills (emil-design-eng, review-animations, animation-performance, mobile-native, break-ui).

- **Easing tokens only:** `--ease-out` for anything entering, exiting or answering a press, `--ease-in-out` for movement on screen, `--ease-drawer` for the phone sheet. Never `ease-in`, never `transition: all`.
- **Durations:** presses take `--press` (160 ms). Fades and jumps take 160 to 300 ms. The phone sheet takes 380 ms in and 240 ms out. Exits are always faster than entries.
- **Only `transform`, `opacity`, `clip-path` and colour changes animate.** Never layout properties: `width`, `height`, `padding`, `margin`, `top`, `left`. The glow is its own layer that fades with opacity. Bar fills use clip-path. Knobs and markers ride layers moved with transform. State colours fade on `background-color`, `color` and `box-shadow`.
- **Not everything animates.** Keyboard steps and drags never animate: the value follows the finger. Only a tap that jumps a track animates; `useTrack` sets `data-anim` for that.
- **Sheet motion uses CSS transitions plus `@starting-style`**, so closing mid-open reverses smoothly.
  - A flick (0.4 px/ms over the last 100 ms) or a drag past 30% of its height (capped at 140 px) dismisses it.
  - Dragging up meets growing friction.
  - Only one pointer at a time.
- **Every control gives press feedback on `:active`.** Scales are 0.92 to 0.98: small buttons go lower, wide pills stay near 1.
- **Hover styles live under `@media (hover: hover) and (pointer: fine)`.**
- **Reduced motion means gentler, not none.** Fades and color changes stay; scaling and sliding go.
- **Tracks** (brightness, warmth, heat/cool range) take pointer input on a hit layer with `touch-action: pan-y`.
  - Touch values change on a tap or a sideways drag, so a vertical scroll that starts on a track changes nothing.
  - A hidden range input stays for keyboard and screen readers. A native iOS range input only moves when you grab its thumb.
- **Controls aren't selectable.** No selection, callout or tap highlight, and `touch-action: manipulation` is on.
- **Host page baseline.** The page that hosts a dashboard needs:
  - `viewport-fit=cover`, so the bottom sheet's `env(safe-area-inset-bottom)` padding works.
  - A `theme-color` per scheme.
  - Zoom left enabled.
  - `body.ha-surface`, which also stops pull-to-refresh on the page.
  - See `.storybook/preview-head.html`.
- **Worst-case data:** **Foundations / Worst case** runs every widget at S, M, L and thin against realistic bad values.
  - The values: long and compound names, missing areas, raw floats, readings near zero or far past comfort, no reading yet, handles that meet, and every mode, preset and fan option.
  - A Demo / Worst case toggle switches the data. Check it after any change.
- **Thin rows without a control.** Every widget with a thin density takes `showControl={false}` (default true). The row then has no pill, bar, stepper or switch: the value shows as plain text where the control was, and tapping anywhere on the row opens the details sheet, where every control is. The orb keeps its tap (switch) and hold (details). It works in bundles too: pass it on a row tile. **Foundations / Thin rows** shows every widget both ways.
  - The value is short where the status line already says the rest: the thermostat shows its setpoint ("Set 21.5°"), a mode "On", the home row its temperature.
  - Under 320 px a thin row already gives up its control for the value under the name, so the two look the same there; only the row tap differs.

## Bundles

Several widgets that belong together, sharing one card. The members are ordinary tiles: each keeps its own tap, long-press and sheet. The bundle only takes away their card and draws one around them.

**Joined** — equal members side by side, no header. Made for mini toggles.

```tsx
<JoinedBundle label="Sleep">
  <ToggleTile {...novaSleepMode} density="mini" />
  <ToggleTile {...doNotDisturb} density="mini" />
</JoinedBundle>
```

- One 64px strip, a hairline between members (hidden next to a member that's on, since the charcoal already separates them).
- Members stack once each would get less than about 170px (two under 340px wide; three under 450px; four go two by two under 600px). Stacked, it's 64px per member.

**Lead and rows** — one widget stays fully itself; the others sit below it as thin rows.

```tsx
<LeadBundle lead={<LightTile {...nightLight} />}>
  <ToggleTile {...whiteNoise} />
</LeadBundle>
```

- Rows are shown thin whatever density they're given. Their badges and arrows line up with the lead's.
- The lead's history strip moves to its sheet; the rows take that zone. Height is the lead's card plus 56px per row, the same in every state: at M, 139 + 56 for one row.
- At S, rows show name and value (the thin row's narrow form) and drop their arrow to make room; hold a row, or open the lead's sheet, for its details.
- The lead's sheet lists the rows under "Also in this bundle", live. Opening a row's sheet from there stacks it on top; Escape and dragging down close only the top one.
- Keep state above the bundle (as with Home Assistant, where it lives in `hass`): the rows appear twice, in the card and in the lead's sheet, and both copies must show the same entity. `src/bundles/demo/DemoBundle.tsx` shows how with the demo hooks.

`SheetExtra` (in `shared/ui.tsx`) is how the lead's sheet gets its rows: any tile rendered inside it shows that content under its sheet.

## Dashboards

Build a dashboard from `DashboardPage`, `Section` (a titled grid), `Columns` (sections side by side) and `Cell` (a grid cell that spans columns). `Section` accepts `when`; `false` omits the complete section, including its heading and grid, so conditional rows do not leave empty chrome. Widgets size themselves from their cell, so the same widget is a small tile in a 2-column phone grid, a card in a single column and a large card with history on a tablet.

**Composing for a glance.** The widgets are tuned to read at a glance; the page must be too:

- **One hero per screen.** The most important card alone at the top; everything else follows it. In a one-column section the first glowing card is the primary attention claim and later ones are subordinate (`--glow-damp` in `layout.css`), so the glow budget scales with composition, not just entity state.
- **Glow follows urgency, not position.** Subordinate treatment follows semantic urgency rather than a fixed ratio: a later card with a genuinely urgent state can outrank a routine first glow. The `100% / 50% / 0%` damping is a local heuristic, not an external standard.
- **Alerts first, then glance, then controls.** The alarm is one thin row above the hero; room sensors are a glance strip; modes and bundles follow; the rest are thin rows. Urgent and problem states (low battery, an open door, an alarm) get a distinct warn marker rather than a brighter glow. No vendor standard puts alerts first; the conditional alert row is our own call, kept testable with `Section when={…}`.
- **Never glow alone.** Every important state has a non-colour cue: text, icon, position, or meaningful state motion. Colour and glow are never the only channel.
- **Stack thin rows in one column** so their controls line up. Thin rows in a 2-column phone grid collapse below 320 px to name and value only; the row body and arrow open details while the orb keeps its independent action.
- **Quiet densities stay quiet.** Thin rows and mini tiles never glow, and their on-state never takes the colour slot. Colour and glow belong to regular cards and sheets.
- **Two layers, not one model.** Quick access and spatial inventory coexist — Apple's Categories, Favorites and Rooms, Google's Favorites and All-devices-by-room. No vendor fixes their relative order; hero-first is our call, not Apple's or Google's. Mushroom cards are vocabulary only: ordering and hierarchy belong to this composition layer.
- **One wall, one column per place.** The wall panel groups each room's widgets together; the phone and tablet group by importance instead. Room access on phone and tablet stays one step away — our acceptance criterion, not a vendor tap-count.

The example dashboards in Storybook follow these rules:

- **Phone:** the alarm as one thin row, the main thermostat as the hero card, room sensors as small tiles in pairs, the sleep bundle with the modes, the night-light bundle with the nursery heater as a thin row, and everything else as thin rows in one Controls column.
- **Tablet, landscape:** weather and room sensors at the top, then climate and security with covers and lights, and the modes and bundles last.
- **Wall panel:** one column per place, readable from across the room. The sleep bundle (stacked, at 300px) in Bedroom; both lead bundles in Nursery and office. Thin rows narrower than 320 px show their value under the name; the control moves into the details sheet.
