# Widgets

Per-widget behaviour: what each widget shows, how it interacts, and its props. The rules every widget follows are in [README.md](../README.md); folder layout, commands and the adding-a-widget steps are in AGENTS.md.

## Shared footprints

Every dashboard tile accepts `footprint="compact" | "standard" | "featured"`; the default is `standard`. Compact is 60 px, standard is 128 px, and featured is 264 px at every width. Width changes anatomy, not height or semantic prominence: below 260 px a standard tile keeps its orb, control and details action, and a bare reading icon (sensor, weather) narrows to the glyph so the name keeps its room. Use `featured` explicitly for the large readout and Today strip (the next hours, on Weather); below 260 px that readout repeats what the control or status line already says, so it yields and the orb stays. All widget types and both bundle types follow this matrix.

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

Pass `footprint="compact"` for a single 60 px row: bulb, name and control strip side by side. Under 320 px wide, the control strip gives way to a readout under the name.

Interaction: tap the bulb to switch the light, drag the bar to dim (dragging an off light turns it on), and press and hold the bulb or tap the name for quick levels, warmth, today's history and when it last changed.

The bulb is the accent when lit, whatever its colour temperature; the bar is a groove the light fills. A lit lamp with colour temperature names its warmth on the status line ("Office · Cool daylight") on standard and featured cards; compact rows keep the room alone, and the sheet names it over the warmth ruler, whose warm-to-cool scale is the one place the lamp's colour is drawn.

The connected integration paths are available through `HaProvider` and the `Ha*Tile` containers for every domain (light, climate, sensor, weather, cover, toggle, alarm); the remaining normalized callback examples below show the parent-side wiring each container replaces.

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

The control slot follows the mode: a minus/plus stepper (a groove holding two buttons) for heat, cool and auto; one range bar for heat/cool; a centered, raised Turn on button while off; and the dashed Unavailable slot. When the entity changes between those control kinds, the replacement enters over one `--press` interval with opacity and scale; reduced motion keeps the opacity cue without movement. The orb is the accent while the unit is on; running adds its bloom and the card's glow. Heat or cool is told by the mode icon and the words Heating / Cooling / Idle, never by a colour. Compact cards keep a thermostat in the orb while the mode moves into the control; under 320 px the current temperature, mode and setpoint share the value line.

**Heat/cool range bar.** In Home Assistant's `heat_cool` mode, `target_temp_low` is the heat threshold, `target_temp_high` the cool threshold, and `target_temp_low <= target_temp_high`. The bar is a groove spanning the unit's `min_temp` to `max_temp`: left of the low handle it heats, right of the high handle it cools, and between them the unit rests. The zone it is working in fills with the accent, and a tick marks the room temperature. Each handle shows its value. At widths of 260 px and up, press anywhere on the bar and the nearest handle follows; when the handles meet, the direction of the first move decides which one moves. The handles never cross, and `onRangeChange` always receives `low <= high`. Keyboard and screen readers get two sliders. Below 260 px and in compact cards the bar is a button showing the range ("19–24°") that opens the detail sheet, which adds exact half-degree steps for each threshold. The round mode button turns the unit off and back to its last mode. Press and hold it, or tap the name, for mode, preset, fan speed, today's run time and humidity. Featured and sheet views show the room temperature as the large readout.

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

Read-only: no toggle and no glow. The readings are a readout with no container: a dominant temperature and a clearly captioned secondary humidity, arranged as one metric grid. From 260 px the readout shares the title's text axis and spells out "Humidity"; below that it uses the full slot, shortens the caption to "RH", and drops the lower-priority trend before the status line can clip a word. Compact rows keep the concise right-aligned figures. On standard and featured cards the temperature is the card's large figure, and featured keeps it there rather than repeating it in the header; the header's thermometer names the reading. In the sheet the large figure is the temperature, so the readings below it keep only the captioned humidity. Temperature-only sensors leave the humidity out. Comfort is said in words, not colour. The status line puts the most important thing first: a low battery (15% or less, with the shared warning cue and warning color) replaces comfort or location; otherwise it shows comfort ("Comfortable", "Humid", "Cool, dry") or the outdoor location, then whether the temperature is rising or falling when room remains. Under 320 px, the battery warning also replaces the readings in the summary line. Tap the readings or the name for today's temperature and humidity.

## Using the weather widget

Outdoor conditions now: the temperature, how it feels, and anything about the weather worth acting on.

```tsx
<WeatherTile entity={weather} history={todaySoFar} hourly={hourlyForecast} daily={dailyForecast} />
```

The connected Home Assistant path keeps the same normalized widget contract while selecting companions and fetching forecasts behind the boundary:

```tsx
import { HaWeatherTile } from "./src";

<HaWeatherTile
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
  - `isDay`, from `sun.sun`; it picks night icons. Unknown daylight keeps the day icons.
- **A reading.** Neutral and without glow, like the sensor: glow stays with things that use energy. The condition icon is the badge at every size, bare (no disc); there is no illustration.
- **Title.** The place name (the entity's name, "Home").
- **Status line, most urgent first.**
  - Warnings, with the shared warning cue and warning colour: poor air (US AQI over 100), gusts of 50 km/h or more, UV from very high (8) up.
  - Rain or snow in the next 12 hours: when it starts, with its chance if the forecast gives one ("70% rain at 14:00"), or when falling rain stops ("Rain until 16:00", which then stands in for the condition).
  - The condition ("Partly cloudy"), then today's low–high in whole degrees ("2°–8°"; "-3° to -1°" below zero, so a dash never meets a minus). Today's range combines the readings so far (`history`), the rest of today's hourly forecast, and the daily forecast.
- **The reading.** The temperature, with feels-like always beside it on its baseline ("6.2°  Feels 4°"). A readout, with no container; tap it for the sheet. On standard and featured cards the temperature is the large figure. Only a reading too wide for its card (an extreme value at the narrowest widths) hides feels-like rather than overflow; it is still spoken.
- **Footprints.**
  - Compact: icon, place, status line, and the reading on the right. Under 320 px the value line leads with any warning, else the temperature, feels-like and the rain or condition.
  - Standard: icon, place and status line, then the reading.
  - Featured: the standard card, with the next hours below: time, icon, temperature, and rain chance from 20%. It shows as many of the next 12 hours as its width fits.
  - The sheet: every reading as a chip-shaped tile (feels-like and dew point, humidity, wind, air quality, UV, pressure), the next hours, and the next five days. The large temperature and the Feels like tile replace the card's reading.
- **Units.** Comfort bands are in Celsius; Fahrenheit readings are converted first. This applies to the sensor widget too.

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
  - The switch is a groove; the current mode sits on a thumb that slides between segments.
  - Armed is the accent, on the thumb and the badge; disarmed, the thumb is a raised button on Off. The switch position is "Off"; the state word is "Disarmed".
  - Labels from 260 px up; icons only below 260 px.
  - Segments never drop under 24 px. With five choices below 170 px, or six below 200 px, the card shows the current state as a readout instead and arming moves to the detail sheet.
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
- **Triggered** keeps the exceptional warn fill (the pill pulses gently, not under reduced motion: the fill deepens under the text rather than fading, so the text keeps its contrast). Triggered, entry delay, and disarmed open-sensor states all declare `data-alert="warn"` and lead their status with the shared non-colour warning cue.
- **Open doors and windows** (`openSensors`) lead the status line when disarmed, and the sheet says arming will leave them unguarded.

**View only.** For a panel Home Assistant can read but not control (a Ring Alarm without a subscription, say), pass `readOnly`, or leave out `onArm` and `onDisarm`, which turns it on by itself:

```tsx
<AlarmTile entity={alarmFromHass(hass.states[id], id)} history={today} readOnly />
```

- The mode switch becomes a readout with no container: "Armed home" or "Disarmed" beside the mode's icon, with who changed it at 260 px and up ("by Keypad"). The badge is the accent while armed. In compact cards, the mode is one word ("Home", "Disarmed").
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

- **The slot is the window.** The groove is the fabric and the accent is the daylight let through; the label flips colour where daylight passes under it.
  - Curtains: two panels close in from both ends; drag away from the middle to pull them apart.
  - Blinds and shades: one panel covers from the right.
  - Taps jump, drags follow the finger, and the ends are magnetic (within 3% means fully open or closed).
  - While the cover travels, the fabric glides linearly between Home Assistant's position updates.
- **Covers without a position** (most garage doors) get Close and Open buttons at the ends of a groove, with the state in the middle; the one that can't act lies flat. The middle becomes a Stop button while the cover moves.
- **The orb** opens or closes, and becomes Stop while the cover moves (when the cover supports stop). Press and hold, or tap the name, for the sheet.
- **Orb and glow:** the orb is the accent while the cover is open.
  - Covers that let in light are energy (daylight): their glow follows how open they are.
  - Garage doors, doors and gates are a state, with no glow, and the control never fills. Left open, standard/featured cards and sheets lead with a warning ("Open since 10:20"). Compact cards keep the area/class line and add the shared non-colour warning cue; under 320 px the cue sits beside the Open readout.
- **Sheet:** quick positions (Closed, 25%, Half, Open), slat tilt for blinds that support it, and today's openness by hour.

## Using the toggle widget

A mode you switch on and off, such as Do Not Disturb, Quiet, Guest or Away. It shows one `input_boolean` or `switch`:

```tsx
<ToggleTile entity={dnd} history={today} onToggle={toggle} onTurnOnFor={(v) => turnOnFor(v)} />
```

- **Switching:** the orb and the pill both toggle. Both are raised buttons when off and the accent when on (a mode is on, not energy: no bloom, no glow). It says when the mode ends ("Until 12:54") or how long it has been on ("Since Fri 18:30").
- **Icon and optional colour per mode:**
  - Icons: `bell-off`, `moon`, `volume-off`, `guest`, `away`, `power`.
  - The entity's optional `color` (for example `lavender` for quiet and night) tints the orb on standard cards and sheets. Most modes need none.
- **Status line:** shows where the mode applies; in compact cards the end time takes its place. It never says On or Off; that's the pill's word.
- **Compact:** the toggle uses the same 60 px orb/title/control anatomy as every other widget. Use a CSS grid or `JoinedBundle` for mode grids; there is no toggle-only mini variant.
- **Sheet:** press and hold the orb, or tap the name. It has the description and "Turn on for" chips: 30 min, 1 hour, until morning, until off. While the mode is on they read "Keep on" and the active choice is selected.
  - `onTurnOnFor(value)` receives the option's value. Wire it to a timer or an automation that turns the mode off.
  - Pass your own `durations` to change the options.

## Using the owlet widget

An Owlet Smart Sock: the baby's sleep state, heart rate and oxygen saturation. It composes three sensors of the custom [`owlet` integration](https://github.com/ryanbdclark/owlet) (the sleep state needs a Dream Sock):

```tsx
<OwletTile entity={sock} history={today} />
<HaOwletTile entityId="sensor.owlet_sock_ac000w0123_sleep_state" name="Nova" />
```

- **A reading:** a bare sock icon, two balanced metric columns with the same label/value/unit grammar, a readout with no container, and no glow. From 260 px the columns share the title's text axis; the smallest standard card uses the full slot. Tap the readings or the name for the sheet.
- **Sleep state:** Deep sleep, Light sleep or Awake, on the status line. While the sock is reading but hasn't settled on a sleep state (`unknown`), it says "Sleep state unknown" and keeps the readings.
- **Readings:** the card labels heart rate and oxygen above their figures; compact rows keep the concise inline "121 bpm · 98% O₂" form. Each reading is shown or left out on its own. A 0, a non-number or an out-of-range value is no reading, never a measurement.
- **Live or stale:** while readings arrive, the small outlined heart beside the Heart rate label beats once every 2.4 s (a liveness cue, not the measured rate; with reduced motion it fades instead). In compact rows it moves beside the inline heart-rate figure. Home Assistant pushes a state only when it changes, so live means a reading changed in the last 3 minutes (`staleAfterMinutes` on `HaOwletTile`). After that the heart stands still, the figures dim, and the status line leads with the warn marker: "No new reading since 11:49", or "Stopped 11:49" in compact rows and narrow cards. When the update includes a day, the narrow form keeps the actionable time ("Stopped 18:30") rather than clipping the full timestamp. The sheet says "Live · updated 11:54". A device clock far off Home Assistant's can make fresh readings look stale.
- **Alerts:** read from the base station's own alert sensors, never worked out from the figures here.
  - **Vitals alerts** (critical, low or high oxygen; low or high heart rate) are the alarm going off. The slot fills with warn and pulses like a triggered security alarm (the fill deepens under the text; not under reduced motion), and names every vitals alert sounding, the most urgent first, with its figure: "Low oxygen · 84% O₂". It shows whatever else the card would: with no readings, in a compact row without its control, in the sheet. Beside a compact row's title the pill names the alert and the status line takes the figures; under 320 px, where compact rows keep only their value line, the alert leads that line in warn: "Critical oxygen · 79% O₂ · Low heart rate".
  - **Device problems** (sock off, sock disconnected, base lost power, battery critical or low) lead the status line with the warn marker, ahead of a stale warning.
  - The sheet lists every alert sounding. A sensor that is off, unknown, unavailable or missing is silent.
- **Charging:** while the sock is on its charger it reports nothing, and the card says Charging instead of Unavailable.
- **Unavailable:** while the sock is out of reach it reports nothing; the card says Unavailable and when it was last seen, if the host passes `lastSeen`.
- **Compact:** the status line says the sleep state and the slot the two figures. Under 320 px the value line carries both: "Deep sleep · 121 bpm · 98% O₂".
- **Featured and sheet:** today's sleep by hour (deep sleep full, light sleep half, awake on the baseline) and the minutes asleep. The sheet adds today's heart rate and oxygen, low and high.
- **Home Assistant:** `HaOwletTile` takes the sleep state sensor and finds the rest beside it: `sensor.…_heart_rate`, `sensor.…_o2_saturation`, `binary_sensor.…_charging` and the ten alert sensors (`binary_sensor.…_low_oxygen_alert`, `…_sock_off` …). Pass `heartRateEntityId`, `oxygenEntityId`, `chargingEntityId` or `alertEntityIds` when yours are named differently. It sends no services.
- **Not a medical alarm:** the card shows what Home Assistant last received, every few seconds at best, and an alert reaches it only after the base station has raised it. Owlet's own app and base station are the alarm; this card repeats it.

## Using the humidifier widget

One `humidifier.*` entity: a humidifier, or a dehumidifier by its `device_class`.

```tsx
<HumidifierTile
  entity={entity}
  history={today}
  onToggle={() => callService("humidifier", "toggle", { entity_id: entity.entityId })}
  onTargetChange={(h) => callService("humidifier", "set_humidity", { entity_id: entity.entityId, humidity: h })}
  onModeChange={(m) => callService("humidifier", "set_mode", { entity_id: entity.entityId, mode: m })}
/>
<HaHumidifierTile entityId="humidifier.bedroom" />
```

- **A state, not energy.** The orb is the accent while it is on, with no bloom and no glow: moving water is not light or heat (attention-budget skill). Whether it is working is the status line's words, never a colour.
- **Status line:** the room's humidity and what the unit is doing: "38% now · Humidifying", "Drying" or "Idle". A device that reports no `action` gives the humidity alone; one that reports neither gives the area.
- **The slot follows the state:**
  - On with a target: the setpoint stepper, the same groove as the climate widget's, in whole percent between the entity's `minHumidity` and `maxHumidity`. From 260 px it says what the target does: "Humidify to" or "Dry to".
  - On without a target (or without `onTargetChange`): the accent pill, with the mode beside it from 260 px.
  - Off: a raised Off pill that turns it back on. Unavailable: the dashed slot.
- **The readout** on featured cards and in the sheet is the room's humidity.
- **Compact:** the domain icon (mist over the unit, or a dehumidifier's tank), name, status line, and the stepper; under 320 px the humidity and setpoint share the value line ("38% · Set 45%").
- **Sheet:** press and hold the orb, or tap the name: the stepper, the mode chips when it lists more than one mode, today's on/off history, and the settable range.

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
