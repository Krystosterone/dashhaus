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
    toggle/                Modes switched on and off (classes tw-), tones and icons, demo, stories
    home/                  Outdoor conditions beside the house model (classes hw-, sc-), conditions, demo, stories
  dashboards/              DashboardPage (with the header widget), Section, Columns, Cell, and the phone, tablet and wall-panel dashboards
  stories/                 Foundations: color temperature, worst-case data
  index.ts                 Public exports
```

## Design rules every widget follows

- **One widget, one entity.**
- **Height never changes with state.** A card's height depends only on its container width. Different states swap what fills a fixed-size area; they never add or remove rows.
- **Size from the container, not the viewport.** Use container queries. The light widget uses S under 260 px, M 260 to 439 px, L 440 px and up.
- **No expanding cards.** More detail opens in a sheet (bottom sheet on phones, centered panel on wider screens), from a circle arrow button or a press and hold on the main control.
- **Tone is energy, charcoal is selection, hatching is absence** (unlit, off, unreachable). Lights take their tone from color temperature; climate from the mode: apricot for heat, blue for cool, butter for heat/cool and auto. The corner glow shows energy flowing: a lit light, a unit actively heating or cooling.
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

## Adding a widget

1. Create `src/widgets/<name>/` with the component, its CSS (prefix classes with a short widget code), its entity type, a `demo/` folder and a `<Name>.stories.tsx` titled `Widgets/<Name>`.
2. Build it from the shared card system: an `hd` article inside an `hd-c` container, an `hd-head` with an `Orb`, title and `CircleButton`, one `hd-slot`, and the sheet blocks. Set `--accent-c`, `--accent-h` and `--hd-glow` for its tone and energy. Then sizes, thin density, the sheet and the heights come for free.
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

## Dashboards

Build a dashboard from `DashboardPage`, `Section` (a titled grid), `Columns` (sections side by side) and `Cell` (a grid cell that spans columns). Widgets size themselves from their cell, so the same widget is a small tile in a 2-column phone grid, a card in a single column and a large card with history on a tablet.

- **Phone:** room sensors as small tiles in pairs, the main thermostat as a card, everything else as thin rows.
- **Tablet, landscape:** a row of room sensors, then climate and lights side by side, with today's history on the first card of each.
- **Wall panel:** one column per place, readable from across the room. Thin rows narrower than 320 px show their value under the name; the control moves into the details sheet.
