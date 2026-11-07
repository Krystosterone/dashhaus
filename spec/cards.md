# Cards

Per-card behaviour: what each card shows, how it interacts, and its props. The rules every card follows are in [spec/orb.md](orb.md) and [spec/field.md](field.md); folder layout, commands and the adding-a-card steps are in AGENTS.md.

## What a card draws

A card draws one normalized model, and every skin's card takes it as one `entity` prop.

| Model | Cards | What it is |
| --- | --- | --- |
| Direct | light, climate, cover, toggle, humidifier, fan, alarm | One Home Assistant entity and its attributes. |
| Composed | sensor, sound, weather, owlet, guestWifi | A primary entity plus companions its `useHa<Name>` hook composes, found beside it or given as options: a sensor with its device's humidity and battery, a sound machine's volume, the weather's air quality and sun, an Owlet sock's other sensors and base station, a guest Wi-Fi code's join QR code and buttons. |

Composition stops at the hook. The card still takes one `entity`, one footprint and one details surface, so the dashboard, layout and YAML treat it like any other card. "Device card" describes a composed model from one device; it is not a third kind of card.

Interaction is separate: a **control** has a primary action, a **reading** only shows values. A control can be read-only (an alarm with nothing to arm) and a reading can carry a small action (the Owlet's base station switch), so the two are traits of the props, not the model split.

Some domains get no card, by decision: **`todo`** (an editable list of any length is the content, and a fixed
footprint would hide it), **`number`** (a raw setpoint belongs to its device's card, as sound composes its volume
`number.*`; a slider card would duplicate it) and **`scene`** (no state to draw, and a one-shot activation is a
button, not a card). The domains still to draw are GitHub issues labelled `new card`.

A card's YAML kind is its own identity: its domain's card by default, or a shared card picked with `card:` (`sound` on a `switch`, `owlet` or `guestWifi` on a `sensor`). The sections below follow that identity.

## What every card says

A card's words and warnings belong to its model, not to a skin, so every skin says the same thing in its own voice. Each skin's rules say how it draws them: [orb.md](orb.md) → One state vocabulary and the warn colour, [field.md](field.md) → Severity and the screen.

- **Its words live in core.** A card's state words, warning words and today words are its model's, in `packages/core/src/entities/<name>/` (`words.ts`, or `readings.ts` for a reading's figures), and every skin imports them. A skin never invents a different word. Field's segment screen may shorten one to fit its places, or print a hand-picked synonym that doesn't contradict it (`OPEN` for Unlocked, `OK` for Clear, `HOLD` for Paused), and its meta line still says the core word.
- **State words are Title case, one word where one does it, and the domain's own.** The off word is the class's (`Closed`, `Dry`, `Clear`), never a bare `Off` where the domain has a better one. A transition is the verb (`Opening`, `Locking`, `Returning`), never a guessed end state. `unknown`, `unavailable` and a missing entity are **Unavailable**, never a safe-looking off; the one exception is a domain whose `unknown` can still be commanded (a light group or an optimistic light, an RF or assumed-state cover), which says **Unknown** and keeps its controls (light, cover). Where Home Assistant leaves the state set to the integration (a vacuum's), a state it doesn't name is drawn as a known state in its own words (`updating_firmware` → `Updating firmware`), and the mapper folds aliases into the canonical states, with a test.
- **Severity is ranked once, in core.** A card with warnings ranks them in `entities/<name>/severity.ts`, returning `Severity` (`entities/severity.ts`): **alarm**, act now, safety (smoke, a vitals alert, a triggered alarm); **urgent**, act soon, something has stopped working (a leak, a jam, an error); **advisory**, look when convenient (a low battery, a garage door left open). A state's own warning outranks one about the device. A choice, something switched off on purpose, is no severity, and nothing is ranked while unavailable. A skin draws the level it is given and never ranks one itself.
- **The same physical thing gets the same warning, whatever its domain.** A garage door left open warns the same way, in the same words, as a `cover` or as a `binary_sensor`; a low battery is `isLowBattery` (`entities/battery.ts`) on every card whose device reports a level, and a device that reports only its own low-battery alert (the Owlet's base station) uses that alert, never a threshold of the card's; a device that is charging or docked never warns of one.
- **A warning's words fit a row: 13 characters at most** (`Leak detected`, `Jammed`, `Low oxygen`; `WARNING_WORD_MAX` in `entities/severity.ts`, held for every card by `entities/warnings.test.ts`), so a 340 px Field row and an Orb compact row keep the word that matters. The word comes first, so what may follow it on a line (since when, a count, a sensor's name: `Open since 18:30`, `2 open · Back door`) clips before it does. The spoken label may be the whole sentence.
- **A card never invents a threshold.** "Left open too long" or "stale after N minutes" is an explicit option of the hook and the YAML (owlet's `stale_after`) or a GitHub issue, never a constant in a card.
- **Before a first value, every reading says the same words.** `No reading yet` wherever a line says the state (Orb's status line, Field's first meta line and blank screen, the spoken label), and `Waiting…` only where Orb has room for a figure alone (its readout and its compact cue). Never a blank status line, and never another phrase for it.
- **Small print: when first, then what the device is.** Facts start with when (`Last changed 08:16`, `Last seen 08:20` while unavailable, `Updated 11:53`, from `entities/facts.ts`) and end with what the device is (its battery, its capabilities, its code), in both skins.

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

A dimmable light keeps its bar in the slot whether it is on or off, so the control never changes under a finger. Home Assistant reports no brightness while a light is off, so the off bar has no fill and says Off ("Off" to a screen reader too, never a level it was last set to); a brush across it, or a quick level, turns the light on there. Only a lit light that hasn't reported a brightness yet shows the On pill instead, since a bar would claim a level it never reported.

A light Home Assistant reports as `unknown` (a group before its first state, an optimistic MQTT or RF light before its first command) can still be driven, so it is never drawn as unavailable or as off: it is a light that isn't lit, saying Unknown in its readout, its bar's words or its pill, and the bulb, the bar and the quick levels act. Tapping the bulb calls `light.toggle`, which Home Assistant answers by turning it on.

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
  - Warnings, **advisory** (`weatherSeverity`), with the shared warning cue and warning colour on the status line only: poor air (US AQI over 100), strong gusts (50 km/h or more, Beaufort 7; "Strong gusts", the speed said aloud and in the sheet's Wind), UV from very high (8) up, each 13 characters at most. The sheet's figures keep their own ink. On a card the most urgent leads with a count of the others ("Hazardous air +2"), or under 260 px the count alone ("3 warnings"), so an ellipsis never hides that more exist; the sheet names every warning, and the spoken label always does.
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
  - A text code (`codeFormat: "text"`) is typed into a real field in the dots' place, which takes the focus, so a phone or a wall panel brings up its own keyboard; its placeholder says letters work, and the digit keys still type into it. Enter in it submits.
  - Arming with doors or windows open keeps the warning above the keypad ("Back door is open. Arming will leave it unguarded."), so it is still there at the moment of commitment. In both skins.
  - `onArm` and `onDisarm` may return a promise. The keypad waits ("Checking…", the dots breathe), then closes when the call is accepted.
  - Resolving `false` means a wrong code: the dots shake and clear. Rejecting means the call didn't go through: the keypad says so and keeps the code, so Enter tries again.
  - Some integrations accept a wrong code silently and just don't change state; the keypad then closes as if accepted, and the state stays as it was.
  - The badge only shows status, so a stray tap never arms or disarms.
- **Delays.** Exit delay (arming) and entry delay (pending) count down in the slot, with Cancel or Disarm.
  - The card works out the time left from `delay` (the delay's length in seconds) and `changedAt` (when the state started), and ticks each second itself. Time running out fills the pill linearly, in the countdown's own ink for either delay: the entry delay's warning is the status line's marker, never a second warn channel.
  - Without a length, there's no timer: the slot says "Arming…" or "Entry delay · disarm now" over a soft sweep, still with Cancel or Disarm.
  - Disarming (HA's `disarming` state) shows "Disarming…" with nothing to press.
- **Warnings** take their severity (`alarmSeverity`) and their words from core (`alarmWarning`, `@dashhaus/core/entities/alarm/words`): the word first, 13 characters at most (Triggered, Entry delay, Open, 2 open), then the sensor or sensors, which may clip ("Entry delay · Front door", "2 open · Back door, Kitchen window"); a screen reader hears the sentence ("Back door and Kitchen window are open").
- **Triggered** is the **alarm**: the shared `AlarmPill` fills the slot with the exceptional warn fill (it pulses gently, not under reduced motion: the fill deepens under the text rather than fading, so the text keeps its contrast), Alarm and what set it off on the left and Disarm on the right, in compact rows too (Alarm and Disarm). The status line keeps its plain words, "Triggered · Back door", with no second marker. It declares `data-alert="alarm"`.
- **The entry delay** is **urgent** and **open doors and windows** (`openSensors`) while disarmed **advisory**: they lead the status line behind the shared non-colour warning cue and declare `data-alert="warn"`; the sheet says arming will leave open ones unguarded.

**View only.** For a panel Home Assistant can read but not control (a Ring Alarm without a subscription, say), pass `readOnly`, or leave out `onArm` and `onDisarm`, which turns it on by itself:

```tsx
<AlarmTile entity={alarmFromHass(hass.states[id], id)} history={today} readOnly />
```

- The mode switch becomes a readout with no container, on the head's axes: the mode's icon under the badge, "Armed home" or "Disarmed" on the name's line, and who changed it at the end at 260 px and up ("by Keypad"). Below 260 px it says the mode in one word ("Home"). The badge is the accent while armed. In compact cards, the mode is one word ("Home", "Disarmed").
- Exit and entry delays still count down, without Cancel or Disarm; the entry delay reads "Entry delay". Triggered keeps its warn pill, without Disarm, since when on its right.
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
  - Garage doors, doors and gates are a state, with no glow, and the control never fills. Left open, the card's warning is **advisory** (`coverSeverity`, `@dashhaus/core/entities/cover/severity`): its status line leads with it behind the shared warn marker in every footprint, compact rows too, in the words a garage door's binary sensor says it in ("Open since 10:20", `leftOpenText` in `@dashhaus/core/entities/cover/words`); under 320 px it takes the compact value's place.
- **Sheet:** quick positions (Closed, 25%, Half, Open), slat tilt for blinds that support it, and today's openness by hour.
- **Unknown:** a cover Home Assistant reports as `unknown` still takes commands: a Somfy RTS or other RF blind, or a garage door with no position sensor, driven on an assumed state. It is never drawn as closed or as unavailable (nothing is dashed): its position is dropped as stale, so it gets the Close and Open buttons with Unknown in the middle, and both ends act. The middle stays Unknown rather than Stop, since an inverse Stop at rest would say it is moving. The orb opens it, as Home Assistant's own toggle does for a cover whose state it doesn't know, and today says "Unknown since …".

### Field cover module

`CoverModule` is the same normalized cover entity in the Field skin; `HaCoverModule` is its connected container, on the same `useHaCover` hook as `HaCoverTile`, and takes the same `onOpenCover`, `onCloseCover`, `onStopCover`, `onSetPosition` and `onSetTilt`. See [field.md](field.md#cover).

## Using the toggle card

A mode you switch on and off, such as Do Not Disturb, Quiet, Guest or Away. It shows one `input_boolean` or `switch`:

```tsx
<ToggleTile entity={dnd} history={today} onToggle={toggle} onTurnOnFor={(v) => turnOnFor(v)} />
```

- **Switching:** the orb and the pill both toggle. Both are raised buttons when off and the accent when on (a mode is on, not energy: no bloom, no glow). It says when the mode ends ("Until 12:54") or how long it has been on ("Since Fri 18:30").
- **Icon per mode:** `bell-off`, `moon`, `volume-off`, `guest`, `away`, `power`, `waves`. Its orb is the accent when on, like every other card's; a mode has no colour of its own.
- **Status line:** shows where the mode applies; in compact cards the end time takes its place. It never says On or Off; that's the pill's word.
- **Compact:** the toggle uses the same 60 px orb/title/control anatomy as every other card. Use a CSS grid or `JoinedBundle` for mode grids; there is no toggle-only mini variant.
- **Sheet:** press and hold the orb, or tap the name. It has the description and "Turn on for" chips: 30 min, 1 hour, until morning, until off. While the mode is on they read "Keep on" and the active choice is selected. Its small print says when it last changed, then what it is: "Switch" or "Toggle helper" (`toggleKind`).
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
- **Live or stale:** while readings arrive, the small outlined heart beside the Heart rate label beats once every 2.4 s (a liveness cue, not the measured rate; with reduced motion it fades instead). In compact rows it moves beside the inline heart-rate figure. Home Assistant pushes a state only when it changes, so live means a reading changed in the last 3 minutes (`staleAfterMinutes` on `HaOwletTile`). After that the heart stands still, the figures dim, and the status line leads with the warn marker: "Stopped 11:49" (`staleText`), in every footprint, 13 characters at most; when the update includes a day it keeps the actionable time ("Stopped 18:30") rather than clipping the full timestamp. A screen reader and the sheet's list say it whole: "No new reading since 11:49" (`staleSaid`). The sheet says "Live · updated 11:54". A device clock far off Home Assistant's can make fresh readings look stale.
- **Alerts:** read from the base station's own alert sensors, never worked out from the figures here.
  - **Vitals alerts** (critical, low or high oxygen; low or high heart rate) are the alarm going off. The slot fills with warn and pulses like a triggered security alarm (the fill deepens under the text; not under reduced motion), and names every vitals alert sounding, the most urgent first, with its figure: "Low oxygen · 84% O₂". It shows whatever else the card would: with no readings, in a compact row without its control, in the sheet. A compact row's pill keeps the alert on the left and its figure on the right, as every alarm pill does, and the status line keeps its plain words, the sleep state; under 320 px, where compact rows keep only their value line, the alert leads that line in warn: "Critical O₂ · 79% O₂ · Low pulse". Each alert's words are 13 characters at most (`ALERT_WORD`: Critical O₂, Low oxygen, High oxygen, Low pulse, High pulse, Sock off, Sock offline, No base power, Battery dying, Battery low); a screen reader and the sheet's list say each in full (`ALERT_SAID`: "Critical oxygen", "Low heart rate").
  - **Device problems** (sock off, sock disconnected, base lost power, battery critical or low) lead the status line with the warn marker, ahead of a stale warning.
  - The sheet lists every alert sounding. A sensor that is off, unknown, unavailable or missing is silent.
- **Base station:** switched on and off in the sheet only, with the shared pill under a Base station heading: "On · Turn off" or "Off · Turn on". Never on the card: a stray tap on a dashboard must not silence a baby monitor. While it is off, the base sounds no alarm but the sock can still read, so the status line leads with "Base station off", after any warning and in plain words (switching it off is a choice, not a fault). A switch that is unknown, unavailable or missing hides the pill and says nothing.
- **Charging:** while the sock is on its charger it reports nothing, and the card says Charging instead of Unavailable, in its small print too. A charging sock never warns of its battery: the mapper drops the low and critical battery alerts while it charges.
- **Unavailable:** while the sock is out of reach it reports nothing; the card says Unavailable and when it was last seen, if the host passes `lastSeen`.
- **Compact:** the status line says the sleep state, after any warning, and the slot the two figures. Under 320 px the value line carries both: "Deep sleep · 121 bpm · 98% O₂". Before a first reading the figures' place says "Waiting…", as the readout does, and the spoken label "no reading yet".
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
- **Status line:** the room's humidity and what the unit is doing: "38% now · Humidifying", "Drying", "Idle" or "Off". A device that reports no `action` gives the humidity alone; one that reports neither gives the area, as an unavailable one does.
- **The slot follows the state:**
  - On with a target: the setpoint stepper, the same groove as the climate card's, in whole percent between the entity's `minHumidity` and `maxHumidity`. From 260 px it says what the target does: "Humidify to" or "Dry to".
  - On without a target (or without `onTargetChange`): the accent pill, with the mode beside it from 260 px.
  - Off: a centered, quieter raised Turn on pill, as the climate card's; the status line says Off. Unavailable: the dashed slot.
- **The readout** on featured cards and in the sheet is the room's humidity.
- **Compact:** the domain icon (mist over the unit, or a dehumidifier's tank), name, status line, and the stepper; under 320 px the humidity and setpoint share the value line ("38% · Humidify to 45%").
- **Sheet:** press and hold the orb, or tap the name: the stepper, the mode chips when it lists more than one mode, today's on/off history, and the small print: when it last changed, then what it is with its settable range ("Humidifier · 30–80%", `humidifierFacts`).

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
- **Sheet:** the volume and today's on/off history, then the small print: when it last changed, and what it can do ("On / off, volume", `soundAbilities`), as Field's panel says it.
- **Home Assistant:** `HaSoundTile` takes the sound's switch and finds its volume beside it: `number.<switch>_volume`, then `number.<device>_volume` (the Tuya integration's `switch.nursery_music` and `number.nursery_volume`). Pass `volumeEntityId` when it is named otherwise. The volume is a percent of the number's range, set back in its own range and step.
- **With its machine:** a sound machine whose power, night light and sound are separate entities is a titled bundle: "Sound machine" and its room on the lid, then Power (a toggle, `icon: power`), Night light and White noise as compact rows, which say since when, the colour and the volume where the room would be. Whether the device accepts the light or the sound while its power is off is the device's business; the rows show what it reports.

### Field sound module

`SoundModule` is the same normalized sound entity in the Field skin; `HaSoundModule` is its connected container, on the same `useHaSound` hook as `HaSoundTile`, so it finds the volume the same way (or takes `volumeEntityId`) and takes the same `onToggle` and `onVolumeChange`. See [field.md](field.md#sound).

## Using the lock card

A door lock: one `lock.*`, composed with the battery `sensor.*` on its device. A control whose one deliberate action is the unlock.

```tsx
<LockTile entity={door} onLock={(code) => lock(code)} onUnlock={(code) => unlock(code)} onOpenDoor={(code) => open(code)} />
<HaLockTile entityId="lock.front_door" batteryEntityId="sensor.front_door_battery" />
```

- **States:** Locked, Unlocked, Locking…, Unlocking…, Jammed, Open (unlatched, Home Assistant's `open`), Opening… and Unavailable. `unknown`, a state Home Assistant doesn't define and a missing entity are unavailable, never a safe-looking locked.
- **Locking takes a tap.** The orb and the pill lock an unlocked, open or jammed lock at once: locking is the safe direction. Locked is the accent, as armed is; unlocked is the plain raised surface. A lock is a state, so it never glows (`paint("state", 0)`).
- **Unlocking never takes a tap.** A tap on a locked lock's orb or pill opens the sheet on the question ("Unlock Front door?", what it means, Cancel and Unlock), or on the keypad when the lock asks for a code: typing the code is the confirmation. A press and hold opens the sheet as on every card, never on the question. In the sheet, focus lands on Cancel, so Enter never unlocks, and Unlock (the inverse, the one urgent action) takes no press for 400 ms after it appears (`useSettled`), so the second tap of a double tap can't land on it. While it waits for Home Assistant it says so; a call that didn't go through says "Didn't go through. Try again." and keeps the question; a refused code shakes the dots and clears.
- **Open door.** A lock with `supportsOpen` (Home Assistant's `LockEntityFeature.OPEN`) adds Open door to its sheet, behind the same question or keypad. Never on the card.
- **A code to lock.** A lock that answers `wrong_code` to a tap (it wants a code to lock too) opens the sheet on the keypad for locking.
- **Moving.** Locking, unlocking and opening replace the pill with the verb as a readout (no container), its words breathing; nothing is pressable until it lands, and a hold still opens the sheet.
- **Warnings** lead the status line behind the shared warn marker, never brightness: Jammed first, saying what it means (`Jammed · may not be locked`; the pill then offers Lock again), then a low battery (`Battery 12%`, at or under 15%, shared with the sensor through `@dashhaus/core/entities/battery`). Unlocked is a state, not a warning, however long it lasts.
- **Status line:** the area, or since when where there is none. The pill carries the state word and what a tap does (`Unlock…`, `Lock`).
- **Featured and sheet:** the battery, as a readout, and the small print every card has: the last change ("Last changed 10:58 by Keypad", `@dashhaus/core/entities/facts`) and whether it needs a code. No hourly history: a lock's day is its last change. The question names the lock, whatever it asks: "Unlock Front door?", "Open Front door?".
- **Compact:** the padlock (its shackle shut or lifted, a mark when jammed), the name, and the state word; the pill from 320 px, with its verb (Unlocked · Lock) from 400 px.
- **View only** (`readOnly`, or no `onLock` and `onUnlock`): the badge is static, the slot a readout ("Locked by Keypad"), and the sheet has nothing to press.

The handlers never reject: `createLockHandlers` answers `"done"`, `"wrong_code"` or `"failed"` and reports failures through `onActionError`.

### Field lock module

`LockModule` is the same normalized lock entity in the Field skin; `HaLockModule` is its connected container, on the same `useHaLock` hook as `HaLockTile`, and takes the same `onLock`, `onUnlock`, `onOpenDoor` and `readOnly`. See [field.md](field.md#lock).
## Using the fan card

One `fan.*` entity: a tower or desk fan, a ceiling fan, an extractor.

```tsx
<FanTile
  entity={entity}
  history={today}
  onToggle={() => callService("fan", "toggle", { entity_id: entity.entityId })}
  onPercentageChange={(pct) => callService("fan", "set_percentage", { entity_id: entity.entityId, percentage: pct })}
  onPresetChange={(p) => callService("fan", "set_preset_mode", { entity_id: entity.entityId, preset_mode: p })}
  onOscillateChange={(o) => callService("fan", "oscillate", { entity_id: entity.entityId, oscillating: o })}
  onDirectionChange={(d) => callService("fan", "set_direction", { entity_id: entity.entityId, direction: d })}
/>
<HaFanTile entityId="fan.bedroom" />
```

- **A state, not energy.** The orb is the accent while it runs, with no bloom and no glow: moving air is not light, heat or daylight (attention-budget skill). How fast it runs is the groove's fill and its words.
- **Switching:** the orb toggles it. A fan without speeds has the On/Off pill in its slot, as a switch's, and the pill toggles it too.
- **Speed is the light card's groove**, counted in the fan's own speeds: Home Assistant's `percentage_step` gives the count (33.3 is three speeds), so a three-speed fan's groove has three stops and an arrow key or a drag moves one speed; a fan with more than ten speeds, or a stepless one, moves one percent. The groove hands back the whole percentage the speed stands for (33, 67, 100), never 0, so it never switches the fan off. A fan with up to ten speeds says its speed ("Speed 2"); any other says the percent ("40%"). Dragging or tapping the groove while the fan is off turns it on at that speed; the groove is empty and reads Off while it is off, since Home Assistant reports no speed then. A fan that declares a speed but only one has the pill.
- **Status line:** the area, and while it runs its preset or that it sweeps: "Bedroom · Sleep", "Bedroom · Oscillating". Compact rows, and cards under 260 px, keep the room alone; under a titled bundle's lid it says the preset, or since when.
- **The readout** on the sheet repeats the groove's speed, or the pill's On or Off; featured cards leave it to the control, as the light card does.
- **Compact:** the fan icon, name, the room, and the groove (or the pill); under 320 px the speed is the value line ("Speed 2", "Off").
- **Sheet:** press and hold the orb, or tap the name: the groove, then the preset chips (choosing one while off turns it on), Oscillation (Off, On) and a ceiling fan's Direction (Forward, Reverse), each only when the fan declares it; then today's on/off history, and what the fan can do ("3 speeds, presets, oscillates").
- **Home Assistant:** five services, each gated on the fan's `supported_features` and on its being available: `fan.toggle`; `fan.set_percentage` (`SET_SPEED`); `fan.set_preset_mode` (`PRESET_MODE`, and only one of its own `preset_modes`); `fan.oscillate` (`OSCILLATE`); `fan.set_direction` (`DIRECTION`). A control the fan doesn't declare is never drawn, and a call it can't take is reported as unsupported, never sent. Its speed and preset are read only while it is on; `unknown`, `unavailable` and a missing entity are unavailable.

### Field fan module

`FanModule` is the same normalized fan entity in the Field skin; `HaFanModule` is its connected container, on the same `useHaFan` hook as `HaFanTile`, so it takes the same `onToggle`, `onPercentageChange`, `onPresetChange`, `onOscillateChange` and `onDirectionChange`, and its fader counts the same speeds. See [field.md](field.md#fan).

## Using the guest wifi card

A guest Wi-Fi network and what a guest types to use it, of one of two kinds (`access`):

- **`code`:** an open network whose captive portal asks for a code once you have joined. The custom [UniFi Hotspot Manager](https://github.com/ufozone/ha-unifi-voucher) integration (`unifi_voucher`) is the one found by itself: its code sensor, with the QR code image and the two buttons found beside it. Its QR code joins the network; the code is a hotspot voucher.
- **`password`:** a network with a Wi-Fi password, in any entity whose state is the password: an `input_text` or a `text` (the default `access` for those), or a template `sensor` given `access: password`. Its QR code image, its actions (a `button`, `input_button` or `script`) and the network's name are whatever the host names; without a QR code image, the card shows none.

```tsx
<GuestWifiTile entity={wifi} onRefresh={() => press("button.site_update")} onNewCode={() => press("button.site_create")} />
<HaGuestWifiTile entityId="sensor.67d9d6d6ad84e044caf4621c_voucher" />
<HaGuestWifiTile entityId="input_text.guest_wifi_password" network="Maple Guests 5G" qrEntityId="image.guest_wifi_qr" newCodeEntityId="script.new_guest_wifi_password" />
```

- **A reading:** a bare Wi-Fi icon, the code as a readout with no container under a Code caption, and no glow. The name defaults to "Guest Wi-Fi" (the integration's own names describe the integration, not the network); the status line names the network to join. The code is in the large-readout voice, sized to the card so a voucher's ten digits never clip at 174 px, and read a digit at a time: "code 9 8 6 6 8, 4 9 3 6 6". A password is captioned Password, a size down, and cut with an ellipsis where the card ends (the sheet shows it whole, wrapping); it is read a character at a time, capitals and symbols named: "password r i p e dash capital M a n g o". Tap the code or the name for the sheet.
- **Featured:** the network's join QR code on the card, beside how to join and what the code allows ("Single use · Lasts 1 day"), so a guest can scan it from a hall or a wall panel without opening anything. It takes the room the Today strip takes on other cards: a code has no day to draw. Under 260 px the QR code keeps that room alone.
- **Sheet:** the code; the QR code large and centred, how to join under it ("Join Maple Guests, then enter the code on the page that opens."; for a password, "Scan to join Maple Guests 5G, or choose it in Wi-Fi settings and type the password.", or the second half alone without a QR code); then **Codes** (**Wi-Fi password** for a password): what this code allows (its uses: "Single use", "3 of 5 uses left", "Unlimited uses"; how long it lasts once used, or the time it has left once someone has joined) and two raised pills that act once, **Refresh** (fetch the codes again now; the integration otherwise fetches them every 5 minutes) and **New code** (make one with the integration's own uses and length). Each says it is waiting ("Checking…", "Making…", and in words under them) until Home Assistant answers, by when a new code is in; one press at a time. The line under them says the codes already given keep working: making a new one never ends another. For a password, the pill is **New password…** and asks first, on the shared question ("Change the password for Maple Guests 5G?", "Devices already joined will need the new password.", Cancel and Change), since a new password ends the old one for everyone already in. Facts: when Home Assistant last fetched the codes, then when the code was made (`madeFact`).
- **Not on the card:** Refresh and New code are in the sheet only, so a stray tap on a dashboard never makes codes.
- **No code:** the integration drops a code once its uses are spent, and leaves its sensor unavailable while no code is left. While what makes a new one can still be reached, that is no code, not unavailable: the card says "No code" ("No password" for a password, `noneWord`, muted), why and what to do ("Every code has been used. Make a new one to give.", `noneSentence`; outside the sheet, where New code is not, "No code. Make one in details.", `NONE_HINT`), and the sheet offers New code. The QR code is left out, since joining would end at a page asking for a code there isn't.
- **Unavailable:** when neither the code nor its New code button can be reached (or the sensor is `unknown` or missing), the card says Unavailable everywhere, and when it was last seen if the host passes `lastSeen`; no network, code or QR code.
- **Compact:** the icon, the name over the network, and the code as the row's value.
- **Home Assistant:** `HaGuestWifiTile` takes the entity that holds the code or password. For UniFi Hotspot Manager's `sensor.<site>_voucher` it finds `image.<site>_qr_code`, `button.<site>_create` and `button.<site>_update` beside it; for anything else, or companions named otherwise, pass `qrEntityId`, `newCodeEntityId`, `refreshEntityId`, and `network` and `access` where the defaults don't fit. Its services press those actions, `button.press`, `input_button.press` or `script.turn_on`, each only while its entity can be reached. The QR code is Home Assistant's own image (`entity_picture`, which Home Assistant serves with a token it rotates), drawn as served, black on white with its quiet zone, so it scans in either theme. A new code takes the integration's defaults: choosing its uses or length, or deleting a code, is the integration's (`unifi_voucher.create`, `unifi_voucher.delete`), not this card's. Changing a password, and redrawing its QR code, is the host's script: the card shows whatever the entity and the image then say.

### Field guest wifi module

`GuestWifiModule` is the same normalized guest Wi-Fi entity in the Field skin; `HaGuestWifiModule` is its connected container, on the same `useHaGuestWifi` hook as `HaGuestWifiTile`, finding the same companions or taking the same `access`, `network`, `qrEntityId`, `newCodeEntityId` and `refreshEntityId`. See [field.md](field.md#guest-wifi).

```tsx
<HaGuestWifiModule entityId="sensor.67d9d6d6ad84e044caf4621c_voucher" />
```

## Using the binary sensor card

A door, a window, a leak, smoke: one `binary_sensor.*`, composed with the battery `sensor.*` on its device, as the lock is. A reading: it has no actions.

```tsx
<BinarySensorTile entity={door} history={today} />
<HaBinarySensorTile entityId="binary_sensor.patio_door" batteryEntityId="sensor.patio_door_battery" />
```

- **States:** on, off and Unavailable, said in the device class's words (`@dashhaus/core/entities/binarySensor/words`, the same in every skin): a door, a garage door, an opening or a window is Open or Closed, moisture Wet or Dry, smoke, gas and carbon monoxide Smoke, Gas or CO, or Clear, motion Motion or Clear, a battery Low or Normal, and the rest after Home Assistant's own device class states; with no class, On or Off. `unknown`, any state but `on` and `off`, and a missing entity are Unavailable, never a safe-looking Closed or Clear. A device class Home Assistant doesn't define is none.
- **A reading:** the bare icon its device class names (`pictureOf`: a door, a window, a drop, a smoke detector, a motion sensor, or the plain sensor), saying its state without colour (a door ajar, a window's sash out, a puddle under the drop, smoke under the detector, waves out from the motion sensor); the state's word as a readout with no container, with since when under its caption in the sensor's second track (`minmax(0, 1.35fr) minmax(44px, 0.65fr)`, left-aligned, so a column of readings lines up its second metric). Off is said in the second ink; the word is never in the warn colour, since the marker or the alarm's fill already carries the warning. It never glows (`paint("reading", 0)`). Tap the reading or the name for the sheet.
- **Warnings** take their severity (`binarySensorSeverity`), in words (`ALERT_WORDS`, 13 characters at most so a row keeps them whole; a screen reader hears the whole sentence, `alertSentence`), never brightness. Smoke, gas and carbon monoxide are an **alarm** going off: the slot fills in warn (the shared `AlarmPill`, as the Owlet's vitals), the alarm on the left (`Smoke alarm`, `CO alarm`) and since when on the right, said as "Alert: Smoke detected at Hallway smoke". A leak, heat, an unsafe or tampered device and a problem are **urgent** (`Leak detected`, `Tampered`), a cold sensor and a battery class **advisory**, and a garage door left open advisory too, as the cover card says it (`Open since 18:30`): these lead the status line behind the shared warn marker. Else a low battery (`Battery 9%`, at or under 15%, `@dashhaus/core/entities/battery`), advisory and the device's. The state's warning outranks the battery. An open door or window is a state, not a warning, however long it lasts.
- **Status line:** the warning behind its marker; else the area, or since when where there is none; `Unavailable` while it is. While the alarm fills the slot the line keeps its plain words, with no second marker. In the sheet, the area and since when (`Hall · Since 08:16`), since its header drops the slot.
- **Featured and sheet:** today's hours on (open, wet, detecting) by hour, summed as `Open 42m` or `Not open today` (`todaySummary` with the class's word, a detector's `Detected 3m`). The sheet's header says the state in words, and keeps the slot only for the alarm's fill; its small print says when it last changed (when it was last seen while unavailable), then the battery ("Battery 9%, replace soon", in the warn colour while low).
- **Compact:** the icon, the name, and the warning or the state's word under it; the word again as the row's value. An alarm fills the row's slot too, with the control shown or hidden, the alarm and the time it went off.
- **Unavailable:** the dashed slot with when it was last seen; the last state and the battery are hidden.
- **Home Assistant:** `HaBinarySensorTile` takes the sensor, and `batteryEntityId` for the battery on its device (the automatic layout finds it, `deviceCompanion`); a `battery_level` or `battery` attribute on the sensor itself wins. Today comes from the recorder through `onOffHistoryFromHass`; `loadHistory={false}` skips it.

### Field binary sensor module

`BinarySensorModule` is the same normalized binary sensor entity in the Field skin; `HaBinarySensorModule` is its connected container, on the same `useHaBinarySensor` hook as `HaBinarySensorTile`, taking the same `batteryEntityId`. See [field.md](field.md#binary-sensor).

```tsx
<HaBinarySensorModule entityId="binary_sensor.kitchen_leak" />
```

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
