# Home Dashboard

Widgets for a custom Home Assistant dashboard, in React and TypeScript, with Storybook. Each widget shows one entity (the sensor widget shows one device's temperature and humidity together). So far: lights, climate and temperature/humidity sensors, composed into phone, tablet and wall-panel dashboards.

## Run

```sh
npm install
npm run storybook        # http://localhost:6006
npm run build-storybook  # static build in storybook-static/
npm run typecheck
```

Use the Theme menu in the Storybook toolbar to switch between Auto (system), Light and Dark.

## Structure

```
src/
  styles/tokens.css        Light and dark design tokens, and the .ha-surface page background
  shared/
    card.css               The card system: shell, header, orb, circle button, pills, unavailable,
                           today strip, chips, sheet, sizes and the thin density (classes hd-)
    ui.tsx                 Orb, CircleButton, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, Sheet
    useLongPress.ts        Press and hold
    useTrack.ts            Pointer input for tracks (tap or sideways drag; vertical swipes scroll)
    useNow.ts              A clock that ticks on the minute
  widgets/
    header/                Dashboard header: title, date, optional clock (classes hh-), stories
    light/                 Brightness bar and warmth ruler (classes lw-), types, Kelvin colors, demo, stories
    climate/               Setpoint stepper and heat/cool range (classes cw-), HVAC mode tones, types, demo, stories
    sensor/                Read-only temperature and humidity readings (classes sw-), comfort and trend, demo, stories
    alarm/                 Security panel: mode switch, countdowns, keypad (classes al-), demo (code 1234), stories
    cover/                 Curtains, blinds, shades and garage doors (classes cv-), demo with travel, stories
    toggle/                Modes switched on and off (classes tw-), tones and icons, demo, stories
    home/                  Outdoor conditions beside the house model (classes hw-, sc-), conditions, demo, stories
  bundles/                 JoinedBundle and LeadBundle: several widgets in one card (classes hb-), demo, stories
  dashboards/              DashboardPage (with the header widget), Section, Columns, Cell, and the phone, tablet and wall-panel dashboards
  stories/                 Foundations: color temperature, worst-case data
  index.ts                 Public exports
```

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
- **Thin rows carry their own identity.** Every thin row shows a stable domain icon (thermostat, window, bulb), a concise primary identity, and meaningful secondary state text — climate: mode and setpoint; covers: position or travel; lights: on/off and brightness — plus one explicit state or action cue. Colour reinforces the state; it never defines the row. Icon size, stroke weight, text slots and action placement stay stable across rows, and the Controls column groups by domain.
- **Light and dark themes** come from the tokens in `src/styles/tokens.css`. Never use a color literal in a widget's CSS.

## Motion and touch rules

Applied from Emil Kowalski's design-engineering skills (emil-design-eng, review-animations, animation-performance, mobile-native, break-ui).

- **Easing tokens only:** `--ease-out` for anything entering, exiting or answering a press, `--ease-in-out` for movement on screen, `--ease-drawer` for the phone sheet. Never `ease-in`, never `transition: all`.
- **Durations:** presses take `--press` (160 ms). Fades and jumps take 160 to 300 ms. The phone sheet takes 380 ms in and 240 ms out. Exits are always faster than entries.
- **Only `transform`, `opacity` and `clip-path` animate.** The glow is its own layer that fades with opacity. Bar fills use clip-path. Knobs and markers ride layers moved with transform.
- **Not everything animates.** Keyboard steps and drags never animate: the value follows the finger. Only a tap that jumps a track animates; `useTrack` sets `data-anim` for that.
- **Sheet motion uses CSS transitions plus `@starting-style`**, so closing mid-open reverses smoothly.
  - A flick (0.4 px/ms over the last 100 ms) or a drag past 30% dismisses it.
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

## Adding a widget

1. Create `src/widgets/<name>/` with the component, its CSS (prefix classes with a short widget code), its entity type, a `demo/` folder and a `<Name>.stories.tsx` titled `Widgets/<Name>`.
2. Build it from the shared card system: an `hd` article inside an `hd-c` container, an `hd-head` with an `Orb`, title and `CircleButton`, one `hd-slot`, and the sheet blocks. Spread `paint(role, glow, own, color)` from `shared/ui.tsx` onto the article for its colour: the role (`energy`, `state` or `reading`), how much energy is flowing (0 to 1, for the glow), and its own colour for the orb, if any. Then sizes, thin density, the sheet and the heights come for free.
3. Export it from `src/index.ts`.
4. Add it to the dashboards in `src/dashboards/Dashboards.stories.tsx`.

## Using the light widget

```tsx
import { LightTile } from "./src";

<div style={{ width: 360 }}>
  <LightTile
    entity={entity}
    history={history}
    onToggle={() => callService("light", "toggle", { entity_id: entity.entityId })}
    onBrightnessChange={(pct) => callService("light", "turn_on", { entity_id: entity.entityId, brightness_pct: pct })}
    onKelvinChange={(k) => callService("light", "turn_on", { entity_id: entity.entityId, color_temp_kelvin: k })}
  />
</div>
```

Pass `density="thin"` for a single 56 px row: bulb, name, control strip and details arrow side by side. Under 240 px wide, the control strip gives way to a readout under the name.

Interaction: tap the bulb to switch the light, drag the bar to dim (dragging an off light turns it on), and press and hold the bulb or tap the arrow for quick levels, warmth, today's history and when it last changed.

## Using the climate widget

```tsx
import { ClimateTile } from "./src";

<div style={{ width: 360 }}>
  <ClimateTile
    entity={entity}
    history={history}
    onToggle={() => callService("climate", entity.state === "off" ? "turn_on" : "turn_off", { entity_id: entity.entityId })}
    onTargetChange={(t) => callService("climate", "set_temperature", { entity_id: entity.entityId, temperature: t })}
    onRangeChange={(low, high) => callService("climate", "set_temperature", { entity_id: entity.entityId, target_temp_low: low, target_temp_high: high })}
    onModeChange={(m) => callService("climate", "set_hvac_mode", { entity_id: entity.entityId, hvac_mode: m })}
    onPresetChange={(p) => callService("climate", "set_preset_mode", { entity_id: entity.entityId, preset_mode: p })}
    onFanChange={(f) => callService("climate", "set_fan_mode", { entity_id: entity.entityId, fan_mode: f })}
  />
</div>
```

The control slot follows the mode: a minus/plus stepper for heat, cool and auto; one range bar for heat/cool; a hatched Off pill that turns the unit back on; and the Unavailable pill.

**Heat/cool range bar.** In Home Assistant's `heat_cool` mode, `target_temp_low` is the heat threshold, `target_temp_high` the cool threshold, and `target_temp_low <= target_temp_high`. The bar spans the unit's `min_temp` to `max_temp`: apricot left of the low handle (heats below), blue right of the high handle (cools above), and a neutral band between where the unit rests, with a tick at the room temperature. Each handle shows its value. From M size up, press anywhere on the bar and the nearest handle follows; when the handles meet, the direction of the first move decides which one moves. The handles never cross, and `onRangeChange` always receives `low <= high`. Keyboard and screen readers get two sliders (heat below, cool above). At S and in thin rows the bar shows a single "19–24°" readout and opens the details sheet, which adds exact half-degree steps for each threshold. The round mode button turns the unit off and back to its last mode. Press and hold it, or tap the arrow, for mode, preset, fan speed, today's run time and humidity. The card shows the room temperature at L size and in the sheet.

## Using the sensor widget

```tsx
import { SensorTile } from "./src";

<SensorTile entity={{ entityId: "sensor.bedroom", name: "Bedroom", state: "ok", temperature: 20.1, humidity: 52, unit: "°C", battery: 64 }} history={history} />
```

Read-only: no toggle and no glow. The readings sit on one bar: the temperature and its trend on the left, tinted by the temperature (blue under 18°, butter when comfortable, apricot over 25°), and the humidity in a neutral inset at the right end. Temperature-only sensors leave the inset out. The status line puts the most important thing first: a low battery (15% or less, in the warning color), then comfort ("Comfortable", "Humid", "Cool, dry"), then whether it's rising or falling. Outdoor sensors show their location instead of comfort. Tap the readings or the arrow for today's temperature and humidity.

## Using the home widget

Outdoor conditions for the home, beside a drawing of the house:

```tsx
<HomeTile entity={weather} history={todaySoFar} hourly={hourlyForecast} daily={dailyForecast} />
```

- **Entity.** `entity` mirrors a `weather.*` entity. Two values usually come from elsewhere and are optional:
  - `aqi`, from an air-quality sensor.
  - `isDay`, from `sun.sun`.
- **The house** is a white architectural model in neutral `--scene-*` materials, with no sky drawn. The weather is told with the system's own parts:
  - The glow is the sunshine: strong when clear, faint when overcast, none at night.
  - The icon is the condition.
  - At night the windows light up in lamp tone.
  - Nothing animates.
- **Status line.** A coming dry or wet change ("Rain at 14:00") replaces the condition at S and M, and moves to the today strip at L and in the sheet. Poor air and strong gusts lead the status line in the warn colour, like a sensor's low battery.
- **Today bar.** It runs from today's low to today's high, cold to warm, with the current temperature on the knob. An end label steps aside while the knob covers it.
- **Sizes.**
  - S and thin: a condition badge instead of the house.
  - M: the house on the left.
  - L: adds the big temperature and today's hours; forecast hours are drawn lighter.
  - The sheet: every reading as a chip-shaped tile (feels like, humidity, wind, air quality, UV, pressure), the hours, and the next five days.
- **Units.** Tones and comfort bands are in Celsius; Fahrenheit readings are converted first. This applies to the sensor widget too.

## Using the alarm widget

A security alarm: one `alarm_control_panel.*`.

```tsx
<AlarmTile entity={panel} history={today} onArm={(mode, code) => arm(mode, code)} onDisarm={(code) => disarm(code)} />
```

With Home Assistant, `./widgets/alarm/hass.ts` does the mapping both ways:

```tsx
import { AlarmTile, alarmFromHass, alarmHandlers } from "./src";

const id = "alarm_control_panel.house";
<AlarmTile
  entity={alarmFromHass(hass.states[id], id, { area: "Whole home", exitDelay: 30, entryDelay: 30 })}
  {...alarmHandlers(hass, id)}
/>
```

- **The slot is the mode switch:** Off, then each supported mode (Home, Away, Night, Vacation, Custom).
  - The current mode sits on a thumb that slides between segments.
  - Armed is charcoal (on, not energy); Off sits on hatching, because nothing is guarded.
  - Labels from M up; icons only at S and in thin rows.
  - With all five modes (six segments), M shows icons only, and L and the sheet put a small label under each icon.
  - Armed in a mode the switch doesn't list (custom bypass set from the panel itself) still shows that mode, not Off.
- **Codes.** When the code is needed, the sheet opens on a keypad.
  - Disarming needs it whenever `codeFormat` is set. Arming needs it too unless `codeArmRequired` is `false`; like Home Assistant, it defaults to required.
  - A physical keyboard works too: digits, Backspace, Enter.
  - `onArm` and `onDisarm` may return a promise. The keypad waits ("Checking…", the dots breathe), then closes when the call is accepted.
  - Resolving `false` means a wrong code: the dots shake and clear. Rejecting means the call didn't go through: the keypad says so and keeps the code, so Enter tries again.
  - The badge only shows status, so a stray tap never arms or disarms.
- **Delays.** Exit delay (arming) and entry delay (pending) count down in the slot, with Cancel or Disarm.
  - The widget works out the time left from `delay` (the delay's length in seconds) and `changedAt` (when the state started), and ticks each second itself. Time running out fills the pill linearly; the entry delay is tinted with the warn colour.
  - Without a length, there's no timer: the slot says "Arming…" or "Entry delay · disarm now" over a soft sweep, still with Cancel or Disarm.
  - Disarming (HA's `disarming` state) shows "Disarming…" with nothing to press.
- **Triggered** is the one place the warn colour fills a pill (it pulses gently, not under reduced motion). The status line says what set it off.
- **Open doors and windows** (`openSensors`) lead the status line in warn when disarmed, and the sheet says arming will leave them unguarded.

**View only.** For a panel Home Assistant can read but not control (a Ring Alarm without a subscription, say), pass `readOnly`, or leave out `onArm` and `onDisarm`, which turns it on by itself:

```tsx
<AlarmTile entity={alarmFromHass(hass.states[id], id)} history={today} readOnly />
```

- The mode switch becomes a status pill: "Armed home" in charcoal, or "Disarmed" on hatching, with who changed it from M up ("by Keypad"). In thin rows, the mode in one word.
- Exit and entry delays still count down, without Cancel or Disarm; the entry delay reads "Entry delay". Triggered keeps its warn pill, without Disarm.
- Nothing opens the keypad. The sheet has the status, today's history and "View only" in its info row; open doors and windows are still listed.

What Home Assistant gives you, and what `alarmFromHass` does with it:

| Widget | Home Assistant |
| --- | --- |
| `state` | The entity state, all 11 of them. Anything else reads as unavailable. |
| `modes` | `supported_features` bits (home 1, away 2, night 4, custom bypass 16, vacation 32), optionally narrowed with `modes`. |
| `codeFormat`, `codeArmRequired` | `code_format`, `code_arm_required` (default true). |
| `armingTo` | `next_state` (manual alarm, Alarmo) or Alarmo's `arm_mode`. The core entity doesn't say, so the slot reads plain "Arming". |
| `delay` | Alarmo's `delay` attribute; otherwise the `exitDelay` / `entryDelay` you pass (the manual alarm's `arming_time` and `delay_time`). |
| `changedAt`, `lastChanged`, `changedBy` | `last_changed`, `changed_by`. |
| `openSensors` | Alarmo's `open_sensors` (ids, named with `nameOf`), or your own list. |
| `triggeredBy` | Not in HA; pass it if an automation tracks it. |

`callAlarm` turns a `ServiceValidationError` about the code (the manual alarm raises one) into `false`, and rethrows anything else. Some integrations accept a wrong code silently and just don't change state; the keypad then closes as if accepted, and the state stays as it was.

## Using the cover widget

Curtains, blinds, shades, shutters, awnings, windows, garage doors, doors and gates: one `cover.*` each. Position follows Home Assistant: 0 is closed, 100 is open.

```tsx
<CoverTile entity={curtains} history={today} onOpenCover={open} onCloseCover={close} onStopCover={stop} onSetPosition={setPosition} onSetTilt={setTilt} />
```

- **The slot is the window.** Daylight is the tone and the fabric is hatching (hatching is absence, here of light).
  - Curtains: two panels close in from both ends; drag away from the middle to pull them apart.
  - Blinds and shades: one panel covers from the right.
  - Taps jump, drags follow the finger, and the ends are magnetic (within 3% means fully open or closed).
  - While the cover travels, the fabric glides linearly between Home Assistant's position updates.
- **Covers without a position** (most garage doors) get Close and Open buttons at the ends of the pill, with the state in the middle. It becomes a Stop button while the cover moves.
- **The orb** opens or closes, and becomes Stop while the cover moves (when the cover supports stop). Press and hold, or tap the arrow, for the sheet.
- **Tone and glow:**
  - Covers that let in light take the butter tone, and their glow follows how open they are.
  - Garage doors, doors and gates take apricot with no glow. Left open, they lead the status line in the warn colour ("Open since 10:20").
- **Sheet:** quick positions (Closed, 25%, Half, Open), slat tilt for blinds that support it, and today's openness by hour.

## Using the toggle widget

A mode you switch on and off, such as Do Not Disturb, Quiet, Guest or Away. It shows one `input_boolean` or `switch`:

```tsx
<ToggleTile entity={dnd} history={today} onToggle={toggle} onTurnOnFor={(v) => turnOnFor(v)} />
```

- **Switching:** the orb and the pill both toggle. The pill is hatched when off and filled with the mode's tone when on. It says when the mode ends ("Until 12:54") or how long it has been on ("Since Fri 18:30").
- **Tone and icon per mode:**
  - `calm` lavender for quiet and night, `sage` for people, `apricot` for away, `blue` or the house `butter`.
  - Icons: `bell-off`, `moon`, `volume-off`, `guest`, `away`, `power`.
- **Status line:** shows where the mode applies; at S and in thin rows the end time takes its place.
- **Mini** (`density="mini"`): a 64px tile that is itself the switch, for grids of modes, two to four across.
  - Tap anywhere to switch. On, the whole tile turns charcoal; a colour slot, if set, shows on its disc.
  - Press and hold for the sheet. The arrow appears once the tile is at least 220px wide; from the keyboard, Shift+F10 or the context-menu key opens the sheet.
- **Sheet:** press and hold the orb, or tap the arrow. It has the description and "Turn on for" chips: 30 min, 1 hour, until morning, until off. While the mode is on they read "Keep on" and the active choice is selected.
  - `onTurnOnFor(value)` receives the option's value. Wire it to a timer or an automation that turns the mode off.
  - Pass your own `durations` to change the options.

## Using the header widget

The top of a dashboard: its name, today's date under it, and an optional clock on the right. `DashboardPage` renders it for you; pass its props to the page:

```tsx
<DashboardPage title="Home" showTime>…</DashboardPage>
<HeaderWidget title="Living room" subtitle="Comfortable · 21.4°" />
```

- **Not a card:** it's type on the page surface, framing the cards below, and it sizes itself from its own width (phone to wall panel).
- **The date:** formatted for the locale. `subtitle` replaces it.
- **The clock:**
  - It ticks on the minute boundary and catches up at once when a sleeping tablet or background tab comes back.
  - It never animates, and its digits are tabular, so nothing shifts.
  - `hourCycle` forces 12 or 24 hours. 24-hour clocks pad the hour ("09:05"), and AM/PM is set small.
  - `timeZone` shows Home Assistant's time zone when the device is elsewhere.
  - `locale` sets the language.
  - `now` freezes it for stories.

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

Build a dashboard from `DashboardPage`, `Section` (a titled grid), `Columns` (sections side by side) and `Cell` (a grid cell that spans columns). Widgets size themselves from their cell, so the same widget is a small tile in a 2-column phone grid, a card in a single column and a large card with history on a tablet.

**Composing for a glance.** The widgets are tuned to read at a glance; the page must be too:

- **One hero per screen.** The most important card alone at the top; everything else follows it. In a one-column section the first glowing card is the primary attention claim and later ones are subordinate (`--glow-damp` in `layout.css`), so the glow budget scales with composition, not just entity state.
- **Glow follows urgency, not position.** Subordinate treatment follows semantic urgency rather than a fixed ratio: a later card with a genuinely urgent state can outrank a routine first glow. The `100% / 50% / 0%` damping is a local heuristic, not an external standard.
- **Alerts first, then glance, then controls.** The alarm is one thin row above the hero; room sensors are a glance strip; modes and bundles follow; the rest are thin rows. Urgent and problem states (low battery, an open door, an alarm) get a distinct warn marker rather than a brighter glow. No vendor standard puts alerts first; the conditional alert row is our own call, and the placement stays testable.
- **Never glow alone.** Every important state has a non-colour cue: text, icon, position, or meaningful state motion. Colour and glow are never the only channel.
- **Stack thin rows in one column** so their controls line up. Thin rows in a 2-column phone grid collapse below 320 px to name and value only.
- **Quiet densities stay quiet.** Thin rows and mini tiles never glow, and their on-state never takes the colour slot. Colour and glow belong to regular cards and sheets.
- **Two layers, not one model.** Quick access and spatial inventory coexist — Apple's Categories, Favorites and Rooms, Google's Favorites and All-devices-by-room. No vendor fixes their relative order; hero-first is our call, not Apple's or Google's. Mushroom cards are vocabulary only: ordering and hierarchy belong to this composition layer.
- **One wall, one column per place.** The wall panel groups each room's widgets together; the phone and tablet group by importance instead. Room access on phone and tablet stays one step away — our acceptance criterion, not a vendor tap-count.

The example dashboards in Storybook follow these rules:

- **Phone:** the alarm as one thin row, the main thermostat as the hero card, room sensors as small tiles in pairs, the sleep bundle with the modes, the night-light bundle with the nursery heater as a thin row, and everything else as thin rows in one Controls column.
- **Tablet, landscape:** weather and room sensors at the top, then climate and security with covers and lights, and the modes and bundles last.
- **Wall panel:** one column per place, readable from across the room. The sleep bundle (stacked, at 300px) in Bedroom; both lead bundles in Nursery and office. Thin rows narrower than 320 px show their value under the name; the control moves into the details sheet.
