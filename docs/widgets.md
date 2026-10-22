# Widgets

Per-widget behaviour: what each widget shows, how it interacts, and its props. The rules every widget follows are in [README.md](../README.md); folder layout, commands and the adding-a-widget steps are in AGENTS.md.

## Shared footprints

Every dashboard tile accepts `footprint="compact" | "standard" | "featured"`; the default is `standard`. Compact is 60 px, standard is 128 px, and featured is 264 px at every width. Width changes anatomy, not height or semantic prominence: below 260 px a standard tile keeps its control and details action while its duplicate orb yields to the title. Use `featured` explicitly for the large readout and Today strip. All widget types and both bundle types follow this matrix.

`showControl={false}` applies to compact tiles. It replaces the inline control with the short value and makes the row open details; actionable orbs keep their independent tap and hold behavior.

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

Pass `footprint="compact"` for a single 60 px row: bulb, name, control strip and details arrow side by side. Under 320 px wide, the control strip gives way to a readout under the name.

Interaction: tap the bulb to switch the light, drag the bar to dim (dragging an off light turns it on), and press and hold the bulb or tap the arrow for quick levels, warmth, today's history and when it last changed.

The connected integration paths are available through `HaProvider` and the `Ha*Tile` containers for every domain (light, climate, sensor, home weather, cover, toggle, alarm); the remaining normalized callback examples below show the parent-side wiring each container replaces.

```tsx
import { HaLightTile } from "./src";

<HaLightTile entityId="light.living_room" footprint="compact" />
```

The connected container must be rendered below `HaProvider`; see [docs/home-assistant.md](home-assistant.md) for the transport/store setup.

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

The control slot follows the mode: a minus/plus stepper for heat, cool and auto; one range bar for heat/cool; a hatched Off pill that turns the unit back on; and the Unavailable pill. Compact cards keep a thermostat in the orb while the mode moves into the control; under 320 px the current temperature, mode and setpoint share the value line.

**Heat/cool range bar.** In Home Assistant's `heat_cool` mode, `target_temp_low` is the heat threshold, `target_temp_high` the cool threshold, and `target_temp_low <= target_temp_high`. The bar spans the unit's `min_temp` to `max_temp`: apricot left of the low handle (heats below), blue right of the high handle (cools above), and a neutral band between where the unit rests, with a tick at the room temperature. Each handle shows its value. At widths of 260 px and up, press anywhere on the bar and the nearest handle follows; when the handles meet, the direction of the first move decides which one moves. The handles never cross, and `onRangeChange` always receives `low <= high`. Keyboard and screen readers get two sliders. Below 260 px and in compact cards the bar shows a single "19–24°" readout and opens the detail sheet, which adds exact half-degree steps for each threshold. The round mode button turns the unit off and back to its last mode. Press and hold it, or tap the arrow, for mode, preset, fan speed, today's run time and humidity. Featured and sheet views show the room temperature as the large readout.

## Using the sensor widget

```tsx
import { SensorTile, HaSensorTile } from "./src";

<SensorTile entity={{ entityId: "sensor.bedroom", name: "Bedroom", state: "ok", temperature: 20.1, humidity: 52, unit: "°C", battery: 64 }} history={history} />
```

For the connected Home Assistant path, keep the primary sensor and optional companions explicit:

```tsx
<HaSensorTile
  entityId="sensor.bedroom_temperature"
  humidityEntityId="sensor.bedroom_humidity"
  batteryEntityId="sensor.bedroom_battery"
/>
```

Read-only: no toggle and no glow. The readings sit on one bar: the temperature and its trend on the left, tinted by the temperature (blue under 18°, butter when comfortable, apricot over 25°), and the humidity in a neutral inset at the right end. Temperature-only sensors leave the inset out. The status line puts the most important thing first: a low battery (15% or less, with the shared warning cue and warning color), then comfort ("Comfortable", "Humid", "Cool, dry"), then whether it's rising or falling. Under 320 px, the battery warning replaces the readings in the summary line. Outdoor sensors show their location instead of comfort. Tap the readings or the arrow for today's temperature and humidity.

## Using the home widget

Outdoor conditions for the home, beside a drawing of the house:

```tsx
<HomeTile entity={weather} history={todaySoFar} hourly={hourlyForecast} daily={dailyForecast} />
```

The connected Home Assistant path keeps the same normalized widget contract while selecting companions and fetching forecasts behind the boundary:

```tsx
import { HaHomeTile } from "./src";

<HaHomeTile
  entityId="weather.home"
  aqiEntityId="sensor.home_aqi"
  aqiScale="US"
  sunEntityId="sun.sun"
  onForecastError={(error) => reportDashboardError(error)}
/>
```

Use `loadForecasts={false}` when the host supplies `hourly` and `daily` arrays through another query boundary. A rejected forecast request is not treated as a current-weather failure; handle it through `onForecastError`.

- **Entity.** `entity` mirrors a `weather.*` entity. Two values usually come from elsewhere and are optional:
  - `aqi`, from an air-quality sensor.
  - `isDay`, from `sun.sun`.
- **The house** is a white architectural model in neutral `--scene-*` materials, with no sky drawn. The weather is told with the system's own parts:
  - The glow is the sunshine: strong when clear, faint when overcast, none at night.
  - The icon is the condition.
  - At night the windows light up in lamp tone.
  - Nothing animates.
- **Status line.** A coming dry or wet change ("Rain at 14:00") replaces the condition in standard and compact cards, and moves to the Today strip in featured and sheet views. Poor air and strong gusts lead with the shared warning cue and warning colour; under 320 px, the warning takes priority over temperature and condition.
- **Today bar.** It runs from today's low to today's high, cold to warm, with the current temperature on the knob. An end label steps aside while the knob covers it.
- **Footprints.**
  - Compact and standard below 260 px: a condition badge instead of the house.
  - Standard at 260 px and up: the house on the left.
  - Featured: the house, large temperature and today's hours; forecast hours are lighter.
  - The sheet: every reading as a chip-shaped tile, the hours, and the next five days.
- **Units.** Tones and comfort bands are in Celsius; Fahrenheit readings are converted first. This applies to the sensor widget too.

## Using the alarm widget

A security alarm: one `alarm_control_panel.*`.

```tsx
<AlarmTile entity={panel} history={today} onArm={(mode, code) => arm(mode, code)} onDisarm={(code) => disarm(code)} />
```

With Home Assistant, the connected slice in `src/ha/` does the mapping both ways — `alarmFromHass` and `createAlarmHandlers`, or the ready-made `HaAlarmTile`:

```tsx
import { HaAlarmTile } from "./src";

<HaAlarmTile entityId="alarm_control_panel.house" area="Whole home" exitDelay={30} entryDelay={30} />
```

- **The slot is the mode switch:** Off, then each supported mode (Home, Away, Night, Vacation, Custom).
  - The current mode sits on a thumb that slides between segments.
  - Armed is charcoal (on, not energy); Off sits on hatching, because nothing is guarded.
  - Labels from 260 px up; icons only below 260 px.
  - Compact cards show up to four 44 px mode targets from 360 px up. Narrower cards and alarms with five or more choices show the current state and move arming to the detail sheet.
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
- **Triggered** keeps the exceptional warn fill (the pill pulses gently, not under reduced motion). Triggered, entry delay, and disarmed open-sensor states all declare `data-alert="warn"` and lead their status with the shared non-colour warning cue.
- **Open doors and windows** (`openSensors`) lead the status line when disarmed, and the sheet says arming will leave them unguarded.

**View only.** For a panel Home Assistant can read but not control (a Ring Alarm without a subscription, say), pass `readOnly`, or leave out `onArm` and `onDisarm`, which turns it on by itself:

```tsx
<AlarmTile entity={alarmFromHass(hass.states[id], id)} history={today} readOnly />
```

- The mode switch becomes a status pill: "Armed home" in charcoal, or "Disarmed" on hatching, with who changed it at 260 px and up ("by Keypad"). In compact cards, the mode is one word.
- Exit and entry delays still count down, without Cancel or Disarm; the entry delay reads "Entry delay". Triggered keeps its warn pill, without Disarm.
- Nothing opens the keypad. The sheet has the status, today's history and "View only" in its info row; open doors and windows are still listed.

What Home Assistant gives you, and what `alarmFromHass` does with it:

| Widget | Home Assistant |
| --- | --- |
| `state` | The entity state, all 11 of them. Anything else reads as unavailable. |
| `modes` | `supported_features` bits (home 1, away 2, night 4, custom bypass 16, vacation 32); an empty set stays empty rather than inventing a mode. |
| `codeFormat`, `codeArmRequired` | `code_format`, `code_arm_required` (default true). |
| `armingTo` | `next_state` (manual alarm, Alarmo) or Alarmo's `arm_mode`. The core entity doesn't say, so the slot reads plain "Arming". |
| `delay` | Alarmo's `delay` attribute; otherwise the `exitDelay` / `entryDelay` you pass (the manual alarm's `arming_time` and `delay_time`). |
| `changedAt`, `lastChanged`, `changedBy` | `last_changed`, `changed_by`. |
| `openSensors` | Host-composed from your own binary sensors; pass the names in. |
| `triggeredBy` | Not in HA; pass it if an automation tracks it. |

`createAlarmHandlers` resolves `false` when Home Assistant rejects the call with the `invalid_code` translation key (the manual alarm's wrong code), so the keypad shakes; any other rejection — including a bare `service_validation_error`, whose message the transport sanitizes away — means the call did not go through. Some integrations accept a wrong code silently and just don't change state; the keypad then closes as if accepted, and the state stays as it was.

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
  - Garage doors, doors and gates take apricot with no glow. Left open, standard/featured cards and sheets lead with a warning ("Open since 10:20"). Compact cards keep the area/class line and add the shared non-colour warning cue; under 320 px the cue sits beside the Open readout.
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
- **Status line:** shows where the mode applies; in compact cards the end time takes its place.
- **Compact:** the toggle uses the same 60 px orb/title/control/arrow anatomy as every other widget. Use a CSS grid or `JoinedBundle` for mode grids; there is no toggle-only mini variant.
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
