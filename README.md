# Home Dashboard

Widgets for a custom Home Assistant dashboard, in React and TypeScript, with Storybook. Each widget shows one entity (the sensor widget shows one device's temperature and humidity together). Lights, climate, covers, alarms, toggles and temperature/humidity sensors are composed into phone, tablet and wall-panel dashboards.

This file is the rules: what every widget must do, how motion behaves, and how dashboards compose. Per-widget behaviour is in [docs/widgets.md](docs/widgets.md); the Home Assistant data boundary is in [docs/home-assistant.md](docs/home-assistant.md); commands, layout and the adding-a-widget steps are in AGENTS.md. Use the Theme menu in the Storybook toolbar to switch between Auto (system), Light and Dark. The attention, row and Home Assistant integration rules below have operational forms in `.agents/skills/`; where wording differs, the skill named by the rule wins.

## Running with Home Assistant

To put the dashboard on your Home Assistant, fill in `.env` and run `npm run deploy`. It installs the `custom:home-dashboard` card and creates a dashboard laid out from your areas. You then edit its YAML in Home Assistant. See [docs/deploy.md](docs/deploy.md).

The presentational widgets stay provider-agnostic. The connected Home Assistant slices currently include a shared injected transport/store, a loss-preserving raw entity snapshot, pure light, climate, sensor, and weather mappers, typed light/climate actions, forecast response queries, and `HaLightTile`/`HaClimateTile`/`HaSensorTile`/`HaWeatherTile` containers. Start with [docs/home-assistant.md](docs/home-assistant.md); apply the [home-assistant-integration skill](.agents/skills/home-assistant-integration/SKILL.md) before changing the boundary.

The host supplies authentication and an implementation of the transport (the repository includes an adapter for the official `home-assistant-js-websocket` client). Fake transports power unit tests and Storybook; passing them is not evidence of a live Home Assistant connection.

## Design rules every widget follows

- **One widget, one entity.**
- **One modular footprint system.** Every widget type and both bundle types use the same 60 px unit and 8 px gap: `compact` is 60 px, `standard` is 128 px, and `featured` is 264 px. In general, $n$ units occupy $n \times 60 + (n - 1) \times 8$ pixels.
- **Height never changes with state, entity type or width.** Set `footprint="compact" | "standard" | "featured"` on any tile; the default is `standard`. Width may simplify the internal arrangement, but it never changes the footprint or promotes a standard card to featured.
- **Size from the container, not the viewport.** Container queries adapt the anatomy at 260 px and 440 px. Below 260 px a standard card keeps its orb, control and tappable name in the same places; a bare reading icon drops its empty orb-sized box so the name keeps its room. `featured` explicitly adds the Today strip and a large readout when that figure is not already printed on the control; below 260 px the readout yields to the orb. History remains in the sheet for smaller footprints.
- **No expanding cards.** More detail opens in a sheet (bottom sheet on phones, centered panel on wider screens), from a tap on the card's name (marked by a small chevron after it) or a press and hold on the main control. Below 186 px the chevron yields before the primary identity, but the name remains the same details button. The tap area spans the header (name and readout) under the orb; in compact rows it spans the title column, stopping 8 px short of the control, or the whole row when there is no control. No card spends a column on an open button; the only circle button is the sheet's close.
- **One UI language.** Every signal has one meaning: shape says what you can do, fill says state, a dashed outline says unavailable. **Foundations / Palette** shows each one.
  - **Shape says what you can do.**
    - **Button** (`--btn`, raised): tap it. Orbs, toggle pills, the stepper's and open/close buttons, chips, keypad keys. A disabled button lies flat.
    - **Groove** (`--groove`, recessed): slide or set along it. Brightness, curtains and shades, the heat/cool range, the setpoint stepper, the alarm's mode switch, a countdown.
    - **Readout** (no container): look at it. Sensor readings, today's temperatures, a view-only alarm. Nothing that can't be pressed looks pressable; tapping a readout still opens details. Having no edge of its own, a readout keeps the inset a pill gives its label, so it never meets a compact row's curved end; on a standard card its main figure takes the large-readout voice and fills the control row.
  - **Values sit on their control.** Where a fill passes under a label, the label flips to `--on-accent`. No floating capsules.
- **One palette.** Colour is the exception, not the state. The one question colour answers is "is it on?".
  - **Neutrals** for everything by default. Off is the plain surface: a raised button, or a groove with nothing in it.
  - **The accent** (one token, `--brand-c` / `--brand-h` in `tokens.css`, Crextio yellow by default) is solid and means on, whatever the role: a lit light, a mode switched on, an armed alarm, an open cover, a thermostat that's on, a chosen chip or mode. It's the only solid fill, the glow, the "now" stick and the page wash.
    - Energy (`data-role="energy"`: lit, heating or cooling running, daylight let in by a cover) adds the orb's bloom and, on standard and larger cards, the glow. It never changes the fill, so on always looks the same.
    - To re-colour the whole dashboard, change those two numbers; Storybook's Accent toolbar tries a few. Never recycle the accent for an unrelated meaning on the same surface.
  - **Dashed** means unavailable: a dashed outline and muted text, on the orb and the control alike. Nothing else is dashed, so off and unavailable never look alike.
  - **No disc** means a reading: read-only widgets (sensors, weather) show a bare icon where controls have an orb, so a reading never looks like a control switched off. On cards the bare icon is only as wide as its glyph, so its edge meets the content edge as a disc's does; compact rows keep the orb's box so every row's icon shares one column. A reading's large figure is its slot, so a featured reading keeps it there instead of repeating it in the header.
  - **Inverse** (`--inv-bg` / `--inv-fg`) is for the one urgent action (Stop, Disarm, Cancel, the keypad's Enter), never a state. In dark mode it is near-white, so as a state it would outshine the accent.
  - **Warn orange**, text only, for problems. The one exception is an alarm that has gone off, which fills: a triggered security alarm, or a baby monitor's vitals alert (low oxygen, heart rate).
  - **Subtraction first.** At the densest layouts, mute decorative colour, fills, glows and unnecessary markers before adding a hue. No source establishes a hue-count or tile-count limit; do not invent one.
  - **Contrast, both themes.** Semantic colour — the orb and warn states — must clear the applicable WCAG thresholds (4.5:1 text, 3:1 large text and graphics) against adjacent backgrounds in light and dark themes.
  - **The colour slot** is opt-in: the one place a widget can carry its own colour, and it's the orb only, never a fill or a glow. No widget colours its orb by default. Heat or cool is told by the mode icon and the words Heating / Cooling; a lamp's warmth is named on its status line ("Office · Cool daylight"). Compact cards never take it. Every widget takes `color` ("lavender", `{ c, h }`, or "none"); toggles also read the entity's `color`. Widgets declare `data-role` (energy, state or reading) through `paint()` in `shared/ui.tsx`.
- **Compact cards carry their own identity.** Every compact card shows a stable domain icon in its orb (thermostat, window, bulb), a concise primary identity, and one state/action cue — climate: mode and setpoint; covers: position or travel; lights: on/off and brightness. The area line carries the room, or the climate's current temperature and action. Colour reinforces the state; it never defines the row. Icon size, stroke weight, text slots and action placement stay stable across widget types.
- **One state vocabulary.** A state word appears once: simple toggles carry it on the control; climate carries its action on the status line and uses **Turn on** as the off-state control. Each domain has one pair: On / Off (lights, modes), Open / Closed (covers), Armed home… / Disarmed (alarm), Heating · Cooling · Idle / Off (climate). Transitions use the verb: Opening, Closing, Arming, Disarming. A widget that can't be reached says **Unavailable** everywhere (slot, status line, "Unavailable since …" in the Today strip); controls keep their room on the status line, and readings show "Unavailable" in place of the reading.
- **Light and dark themes** come from the tokens in `src/styles/tokens.css`. Never use a colour literal in a widget's CSS.

## Motion and touch rules

Applied from Emil Kowalski's design-engineering skills (emil-design-eng, review-animations, animation-performance, mobile-native, break-ui).

- **Easing tokens only:** `--ease-out` for anything entering, exiting or answering a press, `--ease-in-out` for movement on screen, `--ease-drawer` for the phone sheet. Never `ease-in`, never `transition: all`.
- **Durations:** presses take `--press` (160 ms). Fades and jumps take 160 to 300 ms. The phone sheet takes 380 ms in and 240 ms out. Exits are always faster than entries.
- **Only `transform`, `opacity`, `clip-path` and colour changes animate.** Never layout properties: `width`, `height`, `padding`, `margin`, `top`, `left`. The glow is its own layer that fades with opacity. Bar fills use clip-path. Knobs and markers ride layers moved with transform. State colours fade on `background-color`, `color` and `box-shadow`.
- **Not everything animates.** Keyboard steps and drags never animate: the value follows the finger. Only a tap that jumps a track animates; `useTrack` sets `data-anim` for that. A control kind entering after an entity state change may use one `--press` opacity/scale handoff; reduced motion keeps opacity only.
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
- **Controls aren't selectable.** No selection, callout or tap highlight, and `touch-action: manipulation` is on. Visible compact controls keep a 44 px hit dimension; crowded alarm modes move to the sheet instead of shrinking their targets.
- **Host page baseline.** The page that hosts a dashboard needs:
  - `viewport-fit=cover`, so the bottom sheet's `env(safe-area-inset-bottom)` padding works.
  - A `theme-color` per scheme.
  - Zoom left enabled.
  - `body.ha-surface`, which also stops pull-to-refresh on the page.
  - See `.storybook/preview-head.html`.
- **Worst-case data:** **Foundations / Worst case** runs every widget at narrow, medium and wide standard widths plus featured and compact footprints against realistic bad values.
  - The values: long and compound names, missing areas, raw floats, readings near zero or far past comfort, no reading yet, handles that meet, and every mode, preset and fan option.
  - A Demo / Worst case toggle switches the data. Check it after any change.
- **Compact cards without a control.** Every widget accepts `showControl={false}` when `footprint="compact"` (default true). The card then has no pill, bar, stepper or switch: the value replaces it, and tapping the row opens the detail sheet. An actionable orb keeps its tap (switch) and hold (details). This works in bundles because bundles use the same tile contract. **Foundations / Compact rows** shows every widget both ways.
  - The value is short where the status line already says the rest: the thermostat shows its setpoint ("Set 21.5°"), a mode "On", the home row its temperature.
  - Under 320 px a compact card already gives up its inline control for the value under the name; only the row tap differs when `showControl={false}`.

## Bundles

Bundles use the same footprint matrix as standalone cards. Members are ordinary tiles with their own tap, long-press and sheet behavior; the bundle owns their footprints and draws one outer card.

**Joined** — equal compact members side by side, with no extra header. Any widget type is valid.

```tsx
<JoinedBundle label="Sleep">
  <ToggleTile {...novaSleepMode} />
  <ToggleTile {...doNotDisturb} />
</JoinedBundle>
```

- The bundle forces every member to `compact`; caller-provided footprints cannot create mixed density inside it.
- One horizontal row is 60 px. When members stack, total height follows the same formula: two are 128 px, three 196 px, four 264 px.
- Members stack once each would get less than about 170 px (two under 340 px wide; three under 510 px; four stack under 450 px and go two by two through 599 px).

**Lead and rows** — one standard widget followed by compact widgets.

```tsx
<LeadBundle lead={<LightTile {...nightLight} />}>
  <ToggleTile {...whiteNoise} />
</LeadBundle>
```

- The bundle forces the lead to `standard` and every row to `compact`, regardless of caller props.
- The same 8 px gap separates members. A lead plus one row is always 196 px.
- Row orbs line up with the lead. Tap a row's name, or hold its orb, for its details.
- The lead's history remains in its sheet. The sheet lists rows under "Also in this bundle", live; opening a row's sheet stacks it above the lead sheet.
- Keep state above the bundle (as with Home Assistant, where it lives in `hass`): rows appear in the card and the lead's sheet, and both copies must show the same entity. `src/bundles/demo/DemoBundle.tsx` shows the demo-hook version.

`SheetExtra` (in `shared/ui.tsx`) supplies the lead sheet's live rows.

## Dashboards

`DashboardPage`, `WidgetGrid`, `Section`, `Columns` and `Cell` are optional composition helpers; the footprint contract does not depend on them. `WidgetGrid` is the section-free primitive. Tiles can be mixed directly in it or any CSS grid, grouped by room, urgency, workflow or no semantic concern at all. Every tile brings the same internal density and modular height.

**Composing for a glance.**

- **One hero per screen.** Use `featured` only for a deliberate hero or history-bearing card. Width alone never upgrades a card.
- **Glow follows urgency, not position.** In a one-column `Section`, later routine glows are damped, but a genuinely urgent state can outrank them. The `100% / 50% / 0%` damping is a local heuristic, not an external standard.
- **Normal order: frequent actions, household status, then room/environment glance.** Phone and tablet pin actual frequent controls first; the automatic layout cannot infer frequency, so it puts all actionable sections first for the person to refine. There is no conditional alert region for now. Problems stay in their ordinary section with the shared warn marker rather than moving the layout or becoming brighter.
- **Never glow alone.** Every important state has a non-colour cue: text, icon, position, or meaningful state motion.
- **Use compact rows when alignment matters.** Stack them with the shared 8 px gap. Below 320 px of dashboard content, multi-column grids become one column so primary identity survives; inside a compact card below 320 px, the inline control yields to name and value while the orb keeps its independent action.
- **Compact stays quiet.** Compact cards never glow and never take the colour slot. Colour and glow belong to standard, featured and sheet surfaces.
- **Mixing concerns is valid.** Room-first, importance-first and task-first layouts use the same cards; no `Section` or bundle is needed to normalize them.
- **One wall, one column per place** remains the example wall-panel composition, not a requirement of the card system.

The Storybook dashboards demonstrate:

- **Phone:** a shortlist of four quick actions first (a bundle counts each of its members), then household and nursery status, then room readings; compact controls and both bundle types share the same grid.
- **Tablet, landscape:** the same four actions, one of them featured, followed by household and nursery status, then outside and room readings.
- **Wall panel:** one column per place, each ordered actions, status, then glance; the complete 1280 × 800 surface fits without scrolling.
- **Phone, ungrouped footprints:** unrelated widget types, all three footprints and both bundle forms share one `WidgetGrid` without a section.
