# Widgets

Per-widget behaviour: what each widget shows, how it interacts, and its props. The rules every widget follows are in [README.md](../README.md); folder layout, commands and the adding-a-widget steps are in AGENTS.md.

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

Pass `density="thin"` for a single 56 px row: bulb, name, control strip and details arrow side by side. Under 320 px wide, the control strip gives way to a readout under the name.

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

With Home Assistant, `src/widgets/alarm/hass.ts` does the mapping both ways:

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
