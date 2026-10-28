# Home Dashboard

React and TypeScript skins for a custom Home Assistant dashboard, developed and verified in Storybook.

Cards show one Home Assistant entity each (the sensor card combines one device's temperature and humidity, and the sound card combines a sound machine's sound and volume). Lights, climate, covers, alarms, toggles, sounds and temperature/humidity sensors compose into phone, tablet and wall-panel dashboards.

This file is the Orb skin's design and composition rules. Field's distinct hardware language is in [docs/field.md](docs/field.md). Per-card behaviour is in [docs/cards.md](docs/cards.md); the Home Assistant data boundary is in [docs/home-assistant.md](docs/home-assistant.md); commands, layout and extension workflows are in AGENTS.md.

## Install

```sh
npm install
```

## Usage

```sh
npm run storybook
```

Storybook documents every card, supported footprint and skin, each skin under the same groups: Cards, Bundles (orb only), Dashboards, Foundations, Connected (AGENTS.md → Storybook). **Orb / Foundations / Design rules** draws the design sections of this file with the stories that show them. Use the Theme menu to switch between Auto (system), Light and Dark. The attention, row and Home Assistant integration rules below have operational forms in `.agents/skills/`; where wording differs, the skill named by the rule wins.


## Running with Home Assistant

To put the dashboard on your Home Assistant, fill in `.env` and run `npm run deploy`. It installs one bundle carrying `custom:home-dashboard` (Orb) and `custom:home-dashboard-field` (Field), then creates the Orb dashboard the first time. You edit either card's YAML in Home Assistant. See [docs/deploy.md](docs/deploy.md).

The presentational cards stay provider-agnostic. Each supported entity kind has a UI-free `useHa<Kind>` hook and headless component under `src/ha/`; each skin wraps those shared results in its own connected tiles or modules. Start with [docs/home-assistant.md](docs/home-assistant.md); apply the [home-assistant-integration skill](.agents/skills/home-assistant-integration/SKILL.md) before changing the seam.

The host supplies authentication and an implementation of the transport (the repository includes an adapter for the official `home-assistant-js-websocket` client). Fake transports power unit tests and Storybook; passing them is not evidence of a live Home Assistant connection.

## Orb design rules

- **One card, one entity.**
- **One modular footprint system.** Every card type and both bundle types use the same 60 px unit and 8 px gap: `compact` is 60 px, `standard` is 128 px, and `featured` is 264 px. In general, n units occupy n × 60 + (n − 1) × 8 pixels.
- **Height never changes with state, entity type or width.** Set `footprint="compact" | "standard" | "featured"` on any tile; the default is `standard`. Width may simplify the internal arrangement, but it never changes the footprint or promotes a standard card to featured.
- **Size from the container, not the viewport.** Container queries adapt the anatomy at 260 px and 440 px. Below 260 px a standard card keeps its orb, control and tappable name in the same places; a bare reading icon drops its empty orb-sized box so the name keeps its room. `featured` explicitly adds the Today strip and a large readout when that figure is not already printed on the control; below 260 px the readout yields to the orb. History remains in the sheet for smaller footprints.
- **No expanding cards.** More detail opens in a sheet (bottom sheet on phones, centered panel on wider screens), from a tap on the card's name (marked by a small chevron after it) or a press and hold on the main control. Below 186 px the chevron yields before the primary identity, but the name remains the same details button. The tap area spans the header (name and readout) under the orb; in compact rows it spans the title column, stopping 8 px short of the control, or the whole row when there is no control. No card spends a column on an open button; the only circle button is the sheet's close.
- **One UI language.** Every signal has one meaning: shape says what you can do, fill says state, a dashed outline says unavailable. **Orb / Foundations / Palette** shows each one.
  - **Shape says what you can do.**
    - **Button** (`--btn`, raised): tap it. Orbs, toggle pills, the stepper's and open/close buttons, chips, keypad keys. A disabled button lies flat.
    - **Groove** (`--groove`, recessed): slide or set along it. Brightness, curtains and shades, the heat/cool range, the setpoint stepper, the alarm's mode switch, a countdown.
    - **Readout** (no container): look at it. Sensor readings, today's temperatures, a view-only alarm. Nothing that can't be pressed looks pressable; tapping a readout still opens details. Having no edge of its own, a readout keeps the inset a pill gives its label, so it never meets a compact row's curved end; on a standard card its main figure takes the large-readout voice and fills the control row.
  - **Values sit on their control.** Where a fill passes under a label, the label flips to `--on-accent`. No floating capsules.
- **One palette.** Colour is the exception, not the state. The one question colour answers is "is it on?".
  - **Neutrals** for everything by default. Off is the plain surface: a raised button, or a groove with nothing in it.
  - **The accent** (one token, `--brand-c` / `--brand-h` in `tokens.css`, Crextio yellow by default) is solid and means on, whatever the role: a lit light, a mode switched on, an armed alarm, an open cover, a thermostat that's on, a chosen chip or mode. It's the only solid fill, the glow and the "now" stick. The page wash stays neutral-warm, so colour is not present before a state earns it.
    - Energy (`data-role="energy"`: lit, heating or cooling running, daylight let in by a cover) adds the orb's bloom and, on standard and larger cards, the glow. It never changes the fill, so on always looks the same.
    - To re-colour active state across the dashboard, change those two numbers; Storybook's Accent toolbar tries a few. Never recycle the accent for an unrelated meaning on the same surface.
  - **Dashed** means unavailable: a dashed outline and muted text, on the orb and the control alike. Nothing else is dashed, so off and unavailable never look alike.
  - **No disc** means a reading: read-only cards (sensors, weather) show a bare icon where controls have an orb, so a reading never looks like a control switched off. On cards the bare icon is only as wide as its glyph, so its edge meets the content edge as a disc's does; compact rows keep the orb's box so every row's icon shares one column. A reading's large figure is its slot, so a featured reading keeps it there instead of repeating it in the header.
  - **Inverse** (`--inv-bg` / `--inv-fg`) is for the one urgent action (Stop, Disarm, Cancel, the keypad's Enter), never a state. In dark mode it is near-white, so as a state it would outshine the accent.
  - **Warn orange**, text only, for problems. The one exception is an alarm that has gone off, which fills: a triggered security alarm, or a baby monitor's vitals alert (low oxygen, heart rate).
  - **Subtraction first.** At the densest layouts, mute decorative colour, fills, glows and unnecessary markers before adding a hue. No source establishes a hue-count or tile-count limit; do not invent one.
  - **Contrast, both themes.** Semantic colour — the orb and warn states — must clear the applicable WCAG thresholds (4.5:1 text, 3:1 large text and graphics) against adjacent backgrounds in light and dark themes.
  - **The colour slot** is opt-in: the one place a card can carry its own colour, and it's the orb only, never a fill or a glow. No card colours its orb by default. Heat or cool is told by the mode icon and the words Heating / Cooling; a lamp's warmth or colour is named on its status line ("Office · Cool daylight", "Nursery · Amber"), and its hue is drawn only in its sheet, on the warmth ruler or the colour chips' swatches. Compact cards never take it. Every card takes `color` ("lavender", `{ c, h }`, or "none"); toggles also read the entity's `color`. Cards declare `data-role` (energy, state or reading) through `paint()` in `shared/ui.tsx`.
- **Compact cards carry their own identity.** Every compact card shows a stable domain icon in its orb (thermostat, window, bulb), a concise primary identity, and one state/action cue — climate: mode and setpoint; covers: position or travel; lights: on/off and brightness. The area line carries the room, or the climate's current temperature and action; under a titled bundle's lid, which names the room once, a part's area line carries its own detail instead. Colour reinforces the state; it never defines the row. Icon size, stroke weight, text slots and action placement stay stable across card types.
- **One state vocabulary.** A state word appears once: simple toggles carry it on the control; climate and humidifiers carry their action on the status line and use **Turn on** as the off-state control. Each domain has one pair: On / Off (lights, modes), Open / Closed (covers), Armed home… / Disarmed (alarm), Heating · Cooling · Idle / Off (climate). Transitions use the verb: Opening, Closing, Arming, Disarming. A card that can't be reached says **Unavailable** everywhere (slot, status line, "Unavailable since …" in the Today strip); controls keep their room on the status line, and readings show "Unavailable" in place of the reading.
- **Light and dark themes** come from the tokens in `src/skins/orb/styles/tokens.css`. Never use a colour literal in a card's CSS.

## Motion and touch rules

Applied from Emil Kowalski's design-engineering skills (emil-design-eng, review-animations, animation-performance, mobile-native, break-ui).

- **Easing tokens only:** `--ease-out` for anything entering, exiting or answering a press, `--ease-in-out` for movement on screen, `--ease-drawer` for the phone sheet. Never `ease-in`, never `transition: all`.
- **Durations:** presses take `--press` (160 ms). Fades and jumps take 160 to 300 ms. The phone sheet takes 380 ms in and 240 ms out. Exits are always faster than entries.
- **Only `transform`, `opacity`, `clip-path` and colour changes animate.** Never layout properties: `width`, `height`, `padding`, `margin`, `top`, `left`. The glow is its own layer that fades with opacity. Bar fills use clip-path. Knobs and markers ride layers moved with transform. State colours fade on `background-color`, `color` and `box-shadow`.
- **Not everything animates.** Keyboard steps and drags never animate: the value follows the finger. Only a tap that jumps a track animates; the slider primitive (`src/primitives/slider.ts`) sets `data-anim` for that. A control kind entering after an entity state change may use one `--press` opacity/scale handoff; reduced motion keeps opacity only.
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
- **Worst-case data:** **Orb / Foundations / Worst case** runs every card at narrow, medium and wide standard widths plus featured and compact footprints against realistic bad values.
  - The values: long and compound names, missing areas, raw floats, readings near zero or far past comfort, no reading yet, handles that meet, and every mode, preset and fan option.
  - A Demo / Worst case toggle switches the data. Check it after any change.
- **Compact cards without a control.** Every card accepts `showControl={false}` when `footprint="compact"` (default true). The card then has no pill, bar, stepper or switch: the value replaces it, and tapping the row opens the detail sheet. An actionable orb keeps its tap (switch) and hold (details). This works in bundles because bundles use the same tile contract. **Foundations / Compact rows** shows every card both ways.
  - The value is short where the status line already says the rest: the thermostat shows its setpoint ("Set 21.5°"), a mode "On", the home row its temperature.
  - Under 320 px a compact card already gives up its inline control for the value under the name; only the row tap differs when `showControl={false}`.

## Bundles

Bundles use the same footprint matrix as standalone cards. Members are ordinary tiles with their own tap, long-press and sheet behavior; the bundle owns their footprints and draws one outer card.

**Joined** — equal compact members side by side, with no extra header. Any card type is valid.

```tsx
<JoinedBundle label="Sleep">
  <ToggleTile {...novaSleepMode} />
  <ToggleTile {...doNotDisturb} />
</JoinedBundle>
```

- The bundle forces every member to `compact`; caller-provided footprints cannot create mixed density inside it.
- One horizontal row is 60 px. When members stack, total height follows the same formula: two are 128 px, three 196 px, four 264 px.
- Members stack once each would get less than about 170 px (two under 340 px wide; three under 510 px; four stack under 450 px and go two by two through 599 px).

**Lead and rows** — one standard card followed by compact cards.

```tsx
<LeadBundle lead={<ClimateTile {...secondFloor} />}>
  <ClimateTile {...dysonHeater} />
</LeadBundle>
```

- The bundle forces the lead to `standard` and every row to `compact`, regardless of caller props.
- The same 8 px gap separates members. A lead plus one row is always 196 px.
- Row orbs line up with the lead. Tap a row's name, or hold its orb, for its details.
- The lead's history remains in its sheet. The sheet lists rows under "Also in this bundle", live; opening a row's sheet stacks it above the lead sheet.
- Keep state above the bundle (as with Home Assistant, where it lives in `hass`): rows appear in the card and the lead's sheet, and both copies must show the same entity. `src/skins/orb/bundles/demo/DemoBundle.tsx` shows the demo-hook version.

`SheetExtra` (in `shared/ui.tsx`) supplies the lead sheet's live rows.

**Titled** — the parts of one thing, usually one device split into several entities, under a lid that names it and its room once.

```tsx
<TitledBundle title="Sound machine" area="Baby Room">
  <ToggleTile {...power} />
  <LightTile {...nightLight} />
  <SoundTile {...whiteNoise} />
</TitledBundle>
```

- The lid is one 60 px unit: the title, and the room on the line under it, the same two lines a card's name and status make. Every member is forced to `compact`, so a lid and three parts are 264 px, the featured height.
- The lid sits above every part, so what it says covers them all. Name each part for what it is on the thing ("Power", "Night light", "White noise"), never "Sound machine power".
- A part in the lid's room drops the room from its card (`useCard` resolves it through `BundleLid`) and its status line says its own detail instead: since when (a toggle), its warmth or colour (a light), its volume (a sound). A part somewhere else keeps its room.
- The lid is a heading, not a card: it opens nothing, since a sheet of the same rows would only repeat the bundle. Each part opens its own sheet, which, seen without the lid, says whose part it is: "Sound machine · Baby Room".
- Use it when the members make up one named thing. A lead bundle is for one member that matters most with related rows hanging off it.

## Dashboards

`DashboardPage`, `CardGrid`, `Section`, `Columns` and `Cell` are optional composition helpers; the footprint contract does not depend on them. `CardGrid` is the section-free primitive. Tiles can be mixed directly in it or any CSS grid, grouped by room, urgency, workflow or no semantic concern at all. Every tile brings the same internal density and modular height.

**Composing for a glance.**

- **One hero per screen.** Use `featured` only for a deliberate hero or history-bearing card. Width alone never upgrades a card.
- **Glow follows urgency, not position.** In a one-column `Section`, later routine glows are damped, but a genuinely urgent state can outrank them. The `100% / 50% / 0%` damping is a local heuristic, not an external standard.
- **Normal order: frequent actions, household status, then room/environment glance.** Phone and tablet pin actual frequent controls first; the automatic layout cannot infer frequency, so it puts all actionable sections first for the person to refine. There is no conditional alert region for now. Problems stay in their ordinary section with the shared warn marker rather than moving the layout or becoming brighter.
- **Never glow alone.** Every important state has a non-colour cue: text, icon, position, or meaningful state motion.
- **Use compact rows when alignment matters.** Stack them with the shared 8 px gap. Below 320 px of dashboard content, multi-column grids become one column so primary identity survives; inside a compact card below 320 px, the inline control yields to name and value while the orb keeps its independent action.
- **Compact stays quiet.** Compact cards never glow and never take the colour slot. Colour and glow belong to standard, featured and sheet surfaces.
- **Mixing concerns is valid.** Room-first, importance-first and task-first layouts use the same cards; no `Section` or bundle is needed to normalize them.
- **One wall, one column per place** remains the example wall-panel composition, not a requirement of the card system.
- **Navigate without hiding.** A page can dock a bottom nav (`DashboardPage`'s `nav`, drawn by `NavBar`, its own stories under **Orb / Dashboards / Nav bar**): one raised pill per section, page or other dashboard, the current one in the solid accent, as a chosen chip is. A section pill scrolls there and stays lit while that section is read, so the page keeps its importance-first order; rooms that deserve their own page get one rather than a filter. The Lovelace card's `nav` and `pages` are in `docs/deploy.md` → Navigation.
- **Set type for the viewing distance, not the width.** A wall panel read from across the room takes `viewing="far"` (YAML `viewing: far`): status lines, captions and warn cues grow and readouts gain a weight step, through the `--type-*` role tokens in `tokens.css`. Width can't tell a wall panel from a tablet in the hand, so it is never inferred, and card heights don't move.

The Storybook dashboards (**Orb / Dashboards / Examples**) are examples of composing with these rules, not templates and not a list of every card. They show:

- **Phone:** a shortlist of four quick actions first (a bundle counts each of its members), then household and nursery status, then room readings; compact controls and bundles share the same grid, and a nav docked at the bottom jumps between the four sections.
- **Tablet, landscape:** the same four actions, one of them featured, followed by household status (the upstairs heating as a lead bundle) and the nursery, then outside and room readings.
- **Wall panel:** one column per place, each ordered actions, status, then glance; the complete 1280 × 800 surface fits without scrolling.
- **Phone, ungrouped footprints:** unrelated card types, all three footprints and two bundle forms share one `CardGrid` without a section.

## Contributing

Ask questions and agree proposed changes in [GitHub Issues](https://github.com/Krystosterone/home-dashboard/issues). Pull requests are accepted after that agreement. Before opening one, run `npm run check` and `npm run test-storybook`, document behavior changes, and preserve the domain → Home Assistant → skin import direction.

## License

UNLICENSED.
