# Cards

Per-card behaviour: what each card shows, how it interacts, and its props. The rules every card follows are in [spec/orb.md](orb.md) and [spec/field.md](field.md); folder layout, commands and the adding-a-card steps are in AGENTS.md.

## Using the light card

```tsx
import { LightTile } from "@dashhaus/orb";

<div style={{ width: 360 }}>
  <LightTile
    entity={entity}
    history={history}
    onToggle={() => callService("light", "toggle", { entity_id: entity.entityId })}
    onBrightnessChange={(pct) => callService("light", "turn_on", { entity_id: entity.entityId, brightness_pct: pct })}
    onKelvinChange={(k) => callService("light", "turn_on", { entity_id: entity.entityId, color_temp_kelvin: k })}
    onColorChange={(hs) => callService("light", "turn_on", { entity_id: entity.entityId, hs_color: hs })}
  />
</div>
```

Pass `footprint="compact"` for a single 60 px row: bulb, name and control strip side by side. Under 320 px wide, the control strip gives way to a readout under the name.

Interaction: tap the bulb to switch the light, drag the bar to dim (dragging an off light turns it on), and press and hold the bulb or tap the name for quick levels, warmth or colour, today's history and when it last changed.

The bulb is the accent when lit, whatever its colour temperature or colour; the bar is a groove the light fills. A lit lamp with colour temperature names its warmth on the status line ("Office · Cool daylight") on standard and featured cards; compact rows keep the room alone, and the sheet names it over the warmth ruler, whose warm-to-cool scale is the one place the lamp's colour is drawn.

A colour lamp (an `hs`, `xy` or RGB colour mode) names its colour the same way ("Nursery · Amber"). Its sheet has a chip per colour, warm to cool: Red, Amber, Yellow, Green, Blue, Purple, White. Each chip carries its swatch, the one place a colour lamp's hue is drawn; the lamp's own colour is selected, and choosing one while it is off turns it on in that colour. A colour set elsewhere, such as the device's own app, takes the name of the chip nearest its hue (any colour barely saturated is White), and choosing that chip sends the chip's own colour. Pass `onColorChange` to show the chips.

```tsx
import { HaLightTile } from "@dashhaus/orb";

<HaLightTile entityId="light.living_room" footprint="compact" />
```

The connected container must be rendered below `HaProvider`; see [spec/home-assistant.md](home-assistant.md) for the transport/store setup.

## Using the climate card

```tsx
import { ClimateTile } from "@dashhaus/orb";

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

Temperature bounds remain reachable even when `(max_temp - min_temp)` is not an exact multiple of `target_temp_step`: pointer input snaps from `min_temp`, keyboard input steps from the current value, and both clamp to the reported endpoints.

### Field climate module

`ClimateModule` is the same normalized climate entity and callbacks in the Field skin; `HaClimateModule` is its connected container. See [field.md](field.md#climate).

## Using the sensor card

```tsx
import { SensorTile, HaSensorTile } from "@dashhaus/orb";

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

### Field sensor module

`SensorModule` is the same normalized sensor entity and history in the Field skin; `HaSensorModule` is its connected container, taking the same `humidityEntityId`, `batteryEntityId` and `outdoor` options as `HaSensorTile`. See [field.md](field.md#sensor).

## Using the weather card

Outdoor conditions now: the temperature, how it feels, and anything about the weather worth acting on.

```tsx
<WeatherTile entity={weather} history={todaySoFar} hourly={hourlyForecast} daily={dailyForecast} />
```

The connected Home Assistant path keeps the same normalized card contract while selecting companions and fetching forecasts behind the boundary:

```tsx
import { HaWeatherTile } from "@dashhaus/orb";

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
  - Warnings, with the shared warning cue and warning colour: poor air (US AQI over 100), gusts of 50 km/h or more, UV from very high (8) up. On a card the most urgent leads with a count of the others ("Hazardous air +2"), or under 260 px the count alone ("3 warnings"), so an ellipsis never hides that more exist; the sheet names every warning, and the spoken label always does.
  - Rain or snow in the next 12 hours: when it starts, with its chance if the forecast gives one ("70% rain at 14:00"), or when falling rain stops ("Rain until 16:00", which then stands in for the condition).
  - The condition ("Partly cloudy"), then today's low–high in whole degrees ("2°–8°"; "-3° to -1°" below zero, so a dash never meets a minus). Today's range combines the readings so far (`history`), the rest of today's hourly forecast, and the daily forecast.
- **The reading.** The temperature, with feels-like always beside it on its baseline ("6.2°  Feels 4°"). A readout, with no container; tap it for the sheet. On standard and featured cards the temperature is the large figure. Only a reading too wide for its card (an extreme value at the narrowest widths) hides feels-like rather than overflow; it is still spoken.
- **Footprints.**
  - Compact: icon, place, status line, and the reading on the right. Under 320 px the value line leads with any warning, else the temperature, feels-like and the rain or condition.
  - Standard: icon, place and status line, then the reading.
  - Featured: the standard card, with the next hours below: time, icon, temperature, and rain chance from 20%. It shows as many of the next 12 hours as its width fits.
  - The sheet: every reading as a chip-shaped tile (feels-like and dew point, humidity, wind, air quality, UV, pressure), the next hours, and the next five days. The large temperature and the Feels like tile replace the card's reading.
- **Units.** Comfort bands are in Celsius; Fahrenheit readings are converted first. This applies to the sensor card too.

### Field weather module

`WeatherModule` is the same normalized weather entity, history and forecasts in the Field skin, with the same warnings, rain line and today's low–high (`packages/core/src/entities/weather/readings.ts`); `HaWeatherModule` is its connected container, on the same `useHaWeather` hook as `HaWeatherTile`, taking the same `aqiEntityId`, `aqiScale`, `sunEntityId` and `loadForecasts`. See [field.md](field.md#weather).

```tsx
<HaWeatherModule entityId="weather.home" aqiEntityId="sensor.home_aqi" aqiScale="US" sunEntityId="sun.sun" />
```

## Using the alarm card

A security alarm: one `alarm_control_panel.*`.

```tsx
<AlarmTile entity={panel} history={today} onArm={(mode, code) => arm(mode, code)} onDisarm={(code) => disarm(code)} />
```

With Home Assistant, the connected slice in `packages/core/src/ha/` does the mapping both ways — `alarmFromHass` and `createAlarmHandlers`, or the ready-made `HaAlarmTile`:

```tsx
import { HaAlarmTile } from "@dashhaus/orb";

<HaAlarmTile entityId="alarm_control_panel.house" area="Whole home" exitDelay={30} entryDelay={30} />
```

- **The slot is the mode switch:** Off, then each supported mode (Home, Away, Night, Vacation, Custom).
  - The switch is a groove; the current mode sits on a thumb that slides between segments.
  - Armed is the accent, on the thumb and the badge; disarmed, the thumb is a raised button on Off. The switch position is "Off"; the state word is "Disarmed".
  - Every choice on a card is labelled: words from 260 px, and with six choices the icon with a small label under it. Compact cards show icons.
  - A mode switch only stays on the card while every choice keeps a 44 px target and its label: five choices need at least 260 px, and six need 340 px. Below that, the card shows the current state and opens the detail sheet for arming.
  - Compact cards show up to four 44 px mode targets from 360 px up. Narrower cards and alarms with five or more choices show the current state and move arming to the detail sheet.
  - Armed in a mode the switch doesn't list (custom bypass set from the panel itself) still shows that mode, not Off.
- **Codes.** When the code is needed, the sheet opens on a keypad.
  - Disarming needs it whenever `codeFormat` is set. Arming needs it too unless `codeArmRequired` is `false`; like Home Assistant, it defaults to required.
  - A physical keyboard works too: digits, Backspace, Enter.
  - `onArm` and `onDisarm` may return a promise. The keypad waits ("Checking…", the dots breathe), then closes when the call is accepted.
  - Resolving `false` means a wrong code: the dots shake and clear. Rejecting means the call didn't go through: the keypad says so and keeps the code, so Enter tries again.
  - Some integrations accept a wrong code silently and just don't change state; the keypad then closes as if accepted, and the state stays as it was.
  - The badge only shows status, so a stray tap never arms or disarms.
- **Delays.** Exit delay (arming) and entry delay (pending) count down in the slot, with Cancel or Disarm.
  - The card works out the time left from `delay` (the delay's length in seconds) and `changedAt` (when the state started), and ticks each second itself. Time running out fills the pill linearly; the entry delay is tinted with the warn colour.
  - Without a length, there's no timer: the slot says "Arming…" or "Entry delay · disarm now" over a soft sweep, still with Cancel or Disarm.
  - Disarming (HA's `disarming` state) shows "Disarming…" with nothing to press.
- **Triggered** keeps the exceptional warn fill (the pill pulses gently, not under reduced motion: the fill deepens under the text rather than fading, so the text keeps its contrast). Triggered, entry delay, and disarmed open-sensor states all declare `data-alert="warn"` and lead their status with the shared non-colour warning cue.
- **Open doors and windows** (`openSensors`) lead the status line when disarmed, and the sheet says arming will leave them unguarded.

**View only.** For a panel Home Assistant can read but not control (a Ring Alarm without a subscription, say), pass `readOnly`, or leave out `onArm` and `onDisarm`, which turns it on by itself:

```tsx
<AlarmTile entity={alarmFromHass(hass.states[id], id)} history={today} readOnly />
```

- The mode switch becomes a readout with no container, on the head's axes: the mode's icon under the badge, "Armed home" or "Disarmed" on the name's line, and who changed it at the end at 260 px and up ("by Keypad"). Below 260 px it says the mode in one word ("Home"). The badge is the accent while armed. In compact cards, the mode is one word ("Home", "Disarmed").
- Exit and entry delays still count down, without Cancel or Disarm; the entry delay reads "Entry delay". Triggered keeps its warn pill, without Disarm.
- Nothing opens the keypad. The sheet has the status, today's history and "View only" in its info row; open doors and windows are still listed.

### Field alarm module

`AlarmModule` is the same normalized alarm entity in the Field skin; `HaAlarmModule` is its connected container, on the same `useHaAlarm` hook as `HaAlarmTile`, and takes the same `onArm`, `onDisarm` and `readOnly`. See [field.md](field.md#alarm).

## Using the cover card

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

### Field cover module

`CoverModule` is the same normalized cover entity in the Field skin; `HaCoverModule` is its connected container, on the same `useHaCover` hook as `HaCoverTile`, and takes the same `onOpenCover`, `onCloseCover`, `onStopCover`, `onSetPosition` and `onSetTilt`. See [field.md](field.md#cover).

## Using the toggle card

A mode you switch on and off, such as Do Not Disturb, Quiet, Guest or Away. It shows one `input_boolean` or `switch`:

```tsx
<ToggleTile entity={dnd} history={today} onToggle={toggle} onTurnOnFor={(v) => turnOnFor(v)} />
```

- **Switching:** the orb and the pill both toggle. Both are raised buttons when off and the accent when on (a mode is on, not energy: no bloom, no glow). It says when the mode ends ("Until 12:54") or how long it has been on ("Since Fri 18:30").
- **Icon and optional colour per mode:**
  - Icons: `bell-off`, `moon`, `volume-off`, `guest`, `away`, `power`, `waves`.
  - The entity's optional `color` (for example `lavender` for quiet and night) tints the orb on standard cards and sheets. Most modes need none.
- **Status line:** shows where the mode applies; in compact cards the end time takes its place. It never says On or Off; that's the pill's word.
- **Compact:** the toggle uses the same 60 px orb/title/control anatomy as every other card. Use a CSS grid or `JoinedBundle` for mode grids; there is no toggle-only mini variant.
- **Sheet:** press and hold the orb, or tap the name. It has the description and "Turn on for" chips: 30 min, 1 hour, until morning, until off. While the mode is on they read "Keep on" and the active choice is selected.
  - `onTurnOnFor(value)` receives the option's value. Wire it to a timer or an automation that turns the mode off.
  - Pass your own `durations` to change the options.

### Field toggle module

`ToggleModule` is the same normalized toggle entity, history, `durations` and `onTurnOnFor` in the Field skin; `HaToggleModule` is its connected container, on the same `useHaToggle` hook as `HaToggleTile`, taking the same host's `icon` and `description`. See [field.md](field.md#toggle).

## Using the owlet card

An Owlet Smart Sock: the baby's sleep state, heart rate and oxygen saturation. It composes three sensors of the custom [`owlet` integration](https://github.com/ryanbdclark/owlet) (the sleep state needs a Dream Sock):

```tsx
<OwletTile entity={sock} history={today} onBaseToggle={() => callService("switch", sock.baseOn ? "turn_off" : "turn_on", { entity_id: "switch.owlet_sock_ac000w0123_base_station_on" })} />
<HaOwletTile entityId="sensor.owlet_sock_ac000w0123_sleep_state" name="Nova" />
```

- **A reading:** a bare sock icon, three balanced metric columns with the same label/value/unit grammar (Sleep, Heart rate, Oxygen), a readout with no container, and no glow. From 260 px the columns share the title's text axis; the smallest standard card uses the full slot. Under 320 px three figures don't fit: the sleep state keeps its large figure and the two vitals stack beside it in the compact row's inline form ("121 bpm" over "98% O₂"). Tap the readings or the name for the sheet.
- **Sleep state:** a first-class reading, the readout's lead figure: Deep, Light or Awake under a Sleep caption, dimmed with the vitals once readings stop. While the sock is reading but hasn't settled on a sleep state (`unknown`), it says Unknown in the plain words of no reading, and keeps the vitals. With the sleep state in the readout, the status line carries the area, or what leads it (a warning, "Base station off"). Wherever the readout can't draw it, the status line carries the sleep state after any warning: in compact rows ("Stopped 11:49 · Deep sleep", "Battery low · Deep sleep"; under 440 px the figure alone, "Stopped 11:49 · Deep") and while a vitals alarm fills the slot ("Light sleep"). The readout and the sheet say it aloud first: "deep sleep, live, heart rate 121 beats per minute, oxygen 98 percent".
- **Readings:** the card labels heart rate and oxygen above their figures; compact rows keep the concise inline "121 bpm · 98% O₂" form. Each reading is shown or left out on its own. A 0, a non-number or an out-of-range value is no reading, never a measurement.
- **Live or stale:** while readings arrive, the small outlined heart beside the Heart rate label beats once every 2.4 s (a liveness cue, not the measured rate; with reduced motion it fades instead). In compact rows it moves beside the inline heart-rate figure. Home Assistant pushes a state only when it changes, so live means a reading changed in the last 3 minutes (`staleAfterMinutes` on `HaOwletTile`). After that the heart stands still, the figures dim, and the status line leads with the warn marker: "No new reading since 11:49", or "Stopped 11:49" in compact rows and narrow cards. When the update includes a day, the narrow form keeps the actionable time ("Stopped 18:30") rather than clipping the full timestamp. The sheet says "Live · updated 11:54". A device clock far off Home Assistant's can make fresh readings look stale.
- **Alerts:** read from the base station's own alert sensors, never worked out from the figures here.
  - **Vitals alerts** (critical, low or high oxygen; low or high heart rate) are the alarm going off. The slot fills with warn and pulses like a triggered security alarm (the fill deepens under the text; not under reduced motion), and names every vitals alert sounding, the most urgent first, with its figure: "Low oxygen · 84% O₂". It shows whatever else the card would: with no readings, in a compact row without its control, in the sheet. Beside a compact row's title the pill names the alert and the status line takes the figures; under 320 px, where compact rows keep only their value line, the alert leads that line in warn: "Critical oxygen · 79% O₂ · Low heart rate".
  - **Device problems** (sock off, sock disconnected, base lost power, battery critical or low) lead the status line with the warn marker, ahead of a stale warning.
  - The sheet lists every alert sounding. A sensor that is off, unknown, unavailable or missing is silent.
- **Base station:** switched on and off in the sheet only, with the shared pill under a Base station heading: "On · Turn off" or "Off · Turn on". Never on the card: a stray tap on a dashboard must not silence a baby monitor. While it is off, the base sounds no alarm but the sock can still read, so the status line leads with "Base station off", after any warning and in plain words (switching it off is a choice, not a fault). A switch that is unknown, unavailable or missing hides the pill and says nothing.
- **Charging:** while the sock is on its charger it reports nothing, and the card says Charging instead of Unavailable.
- **Unavailable:** while the sock is out of reach it reports nothing; the card says Unavailable and when it was last seen, if the host passes `lastSeen`.
- **Compact:** the status line says the sleep state, after any warning, and the slot the two figures. Under 320 px the value line carries both: "Deep sleep · 121 bpm · 98% O₂".
- **Featured and sheet:** today's sleep by hour (deep sleep full, light sleep half, awake on the baseline) and the minutes asleep. The sheet adds today's heart rate and oxygen, low and high.
- **Home Assistant:** `HaOwletTile` takes the sleep state sensor and finds the rest beside it: `sensor.…_heart_rate`, `sensor.…_o2_saturation`, `binary_sensor.…_charging`, the ten alert sensors (`binary_sensor.…_low_oxygen_alert`, `…_sock_off` …) and the base station's `switch.…_base_station_on`. Pass `heartRateEntityId`, `oxygenEntityId`, `chargingEntityId`, `baseEntityId` or `alertEntityIds` when yours are named differently. Its one service is the base station's `switch.turn_on` or `switch.turn_off`, for the state the card shows (never `toggle`, so a repeated tap repeats the request instead of undoing it).
- **Not a medical alarm:** the card shows what Home Assistant last received, every few seconds at best, and an alert reaches it only after the base station has raised it. Owlet's own app and base station are the alarm; this card repeats it.

### Field owlet module

`OwletModule` is the same normalized owlet entity and history in the Field skin, with the same sleep words, alert names and ranking (`packages/core/src/entities/owlet/readings.ts`); `HaOwletModule` is its connected container, on the same `useHaOwlet` hook as `HaOwletTile`, finding the same companions or taking the same `heartRateEntityId`, `oxygenEntityId`, `chargingEntityId`, `baseEntityId`, `alertEntityIds` and `staleAfterMinutes`. See [field.md](field.md#owlet).

```tsx
<HaOwletModule entityId="sensor.owlet_sock_ac000w0123_sleep_state" name="Nova" />
```

## Using the humidifier card

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
- **Status line:** the room's humidity and what the unit is doing: "38% now · Humidifying", "Drying", "Idle" or "Off". A device that reports no `action` gives the humidity alone; one that reports neither gives the area.
- **The slot follows the state:**
  - On with a target: the setpoint stepper, the same groove as the climate card's, in whole percent between the entity's `minHumidity` and `maxHumidity`. From 260 px it says what the target does: "Humidify to" or "Dry to".
  - On without a target (or without `onTargetChange`): the accent pill, with the mode beside it from 260 px.
  - Off: a centered, quieter raised Turn on pill, as the climate card's; the status line says Off. Unavailable: the dashed slot.
- **The readout** on featured cards and in the sheet is the room's humidity.
- **Compact:** the domain icon (mist over the unit, or a dehumidifier's tank), name, status line, and the stepper; under 320 px the humidity and setpoint share the value line ("38% · Set 45%").
- **Sheet:** press and hold the orb, or tap the name: the stepper, the mode chips when it lists more than one mode, today's on/off history, and the settable range.

### Field humidifier module

`HumidifierModule` is the same normalized humidifier entity in the Field skin; `HaHumidifierModule` is its connected container, on the same `useHaHumidifier` hook as `HaHumidifierTile`, so it takes the same `onToggle`, `onTargetChange` and `onModeChange`. See [field.md](field.md#humidifier).

## Using the sound card

A sound machine's sound: one `switch.*` that plays it, and the `number.*` that sets its volume (one device, as the sensor card reads one device's temperature and humidity):

```tsx
<SoundTile
  entity={entity}
  history={today}
  onToggle={() => callService("switch", "toggle", { entity_id: entity.entityId })}
  onVolumeChange={(pct) => callService("number", "set_value", { entity_id: "number.nursery_volume", value: pct })}
/>
<HaSoundTile entityId="switch.nursery_music" name="White noise" />
```

- **Switching:** the orb and the pill both toggle the sound. Both are raised buttons when off and the accent when on (a state: no bloom, no glow; the attention-budget skill keeps energy for light and heat).
- **Status line:** the area and the volume ("Nursery · Volume 62%") on standard and featured cards; compact rows keep the room alone, except under a titled bundle's lid that already names it, where they say the volume. It never says On or Off; that's the pill's word.
- **Volume, in the sheet only:** press and hold the orb, or tap the name, for a volume groove the accent fills while the sound plays. It rarely changes, and a stray tap on a groove beside a sleeping baby would jump it, so no card carries it. Setting it never switches the sound: while the sound is off the groove stays empty and reads "Off · 62%". A sound without a volume entity has no groove.
- **The readout** on featured cards and in the sheet is the volume; a sound without one repeats the pill's On or Off there.
- **Sheet:** the volume and today's on/off history.
- **Home Assistant:** `HaSoundTile` takes the sound's switch and finds its volume beside it: `number.<switch>_volume`, then `number.<device>_volume` (the Tuya integration's `switch.nursery_music` and `number.nursery_volume`). Pass `volumeEntityId` when it is named otherwise. The volume is a percent of the number's range, set back in its own range and step.
- **With its machine:** a sound machine whose power, night light and sound are separate entities is a titled bundle: "Sound machine" and its room on the lid, then Power (a toggle, `icon: power`), Night light and White noise as compact rows, which say since when, the colour and the volume where the room would be. Whether the device accepts the light or the sound while its power is off is the device's business; the rows show what it reports.

### Field sound module

`SoundModule` is the same normalized sound entity in the Field skin; `HaSoundModule` is its connected container, on the same `useHaSound` hook as `HaSoundTile`, so it finds the volume the same way (or takes `volumeEntityId`) and takes the same `onToggle` and `onVolumeChange`. See [field.md](field.md#sound).

<!-- new-card: cards -->
## The dashboard header

Not a card, so it lives with the page in `src/skins/orb/dashboards/` (`Header`, `hh-`). The top of a dashboard: its name, today's date under it, and an optional clock on the right. `DashboardPage` renders it for you; pass its props to the page:

```tsx
<DashboardPage title="Home" showTime>…</DashboardPage>
<Header title="Living room" subtitle="Comfortable · 21.4°" />
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
