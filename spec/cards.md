# Cards

Per-card behaviour: what each card shows, how it interacts, and its props. The rules every card follows are in [spec/orb.md](orb.md) and [spec/field.md](field.md); folder layout, commands and the adding-a-card steps are in AGENTS.md.

## What a card draws

A card draws one normalized model, and every skin's card takes it as one `entity` prop.

| Model | Cards | What it is |
| --- | --- | --- |
| Direct | light, climate, cover, toggle, humidifier, fan, alarm, camera, media player, sun | One Home Assistant entity and its attributes (a camera's still and a player's artwork are its own `entity_picture`, core.md → Pictures). |
| Composed | sensor, sound, weather, owlet, guestWifi, dyson | A primary entity plus companions its `useHa<Name>` hook composes, found beside it or given as options: a sensor with its device's humidity and battery, a sound machine's volume, the weather's air quality and sun, an Owlet sock's other sensors and base station, a guest Wi-Fi code's join QR code and buttons, a Dyson's air sensors, filters, night mode and heater. |

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
- **Severity is ranked once, in core.** A card with warnings ranks them in `entities/<name>/severity.ts`, returning `Severity` (`entities/severity.ts`): **alarm**, act now, safety (smoke, a vitals alert, a triggered alarm); **urgent**, act soon, something has stopped working (a leak, a jam, an error); **advisory**, look when convenient (a low battery, a garage door left open). A state's own warning outranks one about the device. A choice, something switched off on purpose, is no severity, and nothing is ranked while unavailable. A skin draws the level it is given and never ranks one itself. Orb and Field write it on the card's root as `data-level` (Orb's `CardFrame`, Field's `Module`), core's word as it is (a skin's DOM is its own, [contract.md](contract.md), so a generated skin need not): a skin may omit levels it draws no differently, never rename one, so `[data-level]` alone never means pressing: every selector and query reads it with its value (`[data-level="urgent"]`), never by its presence (each skin's `styles/rules.test.ts`), and every seed's level is core's in both skins (Orb's `cards/alerts.test.tsx`; Field's `shared/alerts.test.tsx`, at the pressing levels it writes). **Urgent** and **alarm** are what outranks in every skin: Field's alert line, Orb's glow budget ([orb.md](orb.md) → Composing for a glance, [field.md](field.md) → Severity).
- **The same physical thing gets the same warning, whatever its domain.** A garage door left open warns the same way, in the same words, as a `cover` or as a `binary_sensor`; a low battery is `isLowBattery` (`entities/battery.ts`) on every card whose device reports a level, and a device that reports only its own low-battery alert (the Owlet's base station) uses that alert, never a threshold of the card's; a device that is charging or docked never warns of one.
  - **A door or gate left open.** An access point that is normally closed and that the dashboard can close warns when it is left open, as **advisory**: a cover of class `garage`, `gate` or `door` (a motorised door; `isAccess` in `entities/cover/position.ts`). A garage door's contact sensor (a `binary_sensor` of class `garage_door`) warns the same way, in the same words (`ON_SEVERITY` in `entities/binarySensor/severity.ts`): it is still that door when Home Assistant can only sense it. A plain door contact (`door`, and `opening` and `window` with it) stays a state, because people walk through doors all day, and "open for N minutes" would be a threshold the card invented, which the rule below forbids. `entities/access.test.ts` holds the two models to this.
- **A warning's words fit a row: 13 characters at most** (`Leak detected`, `Jammed`, `Low oxygen`; `WARNING_WORD_MAX` in `entities/severity.ts`, held for every card by `entities/warnings.test.ts`), so a 340 px Field row and an Orb compact row keep the word that matters. **The word is the last thing on a card to give way.** It comes first, so what may follow it on a line (since when, a count, a sensor's name: `Open since 18:30`, `2 open · Back door`) clips before it does; where the word and what follows still don't fit, what follows goes and the word stays whole (`Stopped`, never `Stoppe…`). What shares its line goes before it too: a figure beside it (an alarm pill's `84% O₂`), and on a screen the unlit places and the unit, which are still heard. Only on a card's narrowest sizes, where nothing is left to give way (a Field row under 280 px, a Field module under 240 px, an Orb card under 180 px), may a word too wide for its line on its own end in an ellipsis; it is heard whole, and the details say it whole. Everywhere else the word is never cut, in every skin (the Storybook run measures every warning that clips). The spoken label may be the whole sentence, and core says it without the card's name (`numericWarningSaid`, `alertSaid`, `batteryAdvice`), so each skin puts the name where its own grammar does: Orb's marker names the card first (orb.md → Warn orange), and Field's `Warn` follows the module's title.
- **A card never invents a threshold.** "Left open too long" or "stale after N minutes" is an explicit option of the hook and the YAML (owlet's `stale_after`, the numeric card's `warn_above` and `warn_below`) or a GitHub issue, never a constant in a card.
- **A guard says core's words, in the skin's punctuation.** What an action that asks first or takes a code says (its question, what yes means, the yes, the line while it is on its way, the failure, and the keypad's Checking and Wrong code) is core's: `@dashhaus/core/entities/guard` for what every guard shares (`waitingFor`, `ACTION_FAILED`, `WRONG_CODE`, `CHECKING_CODE`) and the domain's words for the rest (`coverQuestion`, `lockAskDetail`, `newPasswordQuestion`). A skin changes only the end punctuation, by one rule its spec writes: Orb ends an in-progress word in `…` and a sentence in `.` ([orb.md](orb.md) → One state vocabulary), Field prints both bare ([field.md](field.md) → Type). The keypad's prompt is the one frame of the skin's own (Orb's `Enter the code to unlock`, Field's legend `Code to unlock`). No card passes its question a literal, and no card or part writes `Try again` itself (`verify/card-words.test.ts`).
- **What asks first is said once, in the details.** A card whose action asks first for this entity says so in its details while no question stands, in core's words: `COVER_ASKS_HINT` (`Opening and closing ask first.`), `lockAsksHint` (`Unlocking asks first.`, `Opening the door asks first.`), `NEW_PASSWORD_HINT`, or `asksFirst` for a card that has none of its own (a generated one). Its control's name carries the skin's mark ([skins.md](skins.md) → Rules every skin keeps); no card writes the hint's sentence itself (`verify/card-words.test.ts`), and `verify/guarded-actions.test.tsx` holds every seed of Orb's and Field's guarded cards to both.
- **A figure both skins print from one model value is rounded the same way**, in core or by the same call: a position is rounded before it is printed (`99.6` is `100%` in both), a feels-like temperature is whole (`deg0`, `Feels 4°` on the card and in its details), a room temperature keeps its tenth (`fmt1`). Never one skin's tenth beside the other's whole (`verify/card-figures.test.tsx` draws every seed in both).
- **Every state a card's code draws has a seed, the same for every skin**, in `@dashhaus/core/seeds/<name>`: a state only one skin's story draws, or that no story draws, is a seed missing. For a guard it is held: each value an action's `when` names has a seed, some seed is one it doesn't ask for, and a cover that asks has a seed on its way that can't stop (`verify/guarded-actions.test.tsx`).
- **Before a first value, every reading says the same words.** `No reading yet` wherever a line says the state (Orb's status line, Field's first meta line and blank screen, the spoken label), and `Waiting…` only where Orb has room for a figure alone (its readout and its compact cue). Never a blank status line, and never another phrase for it.
- **A blank figure says whether it may never come.** Where the device doesn't declare a figure (its supported features, colour modes or attributes don't include it: a light with no colour temperature mode, a fan without the direction feature, a humidifier with no current humidity), the figure isn't drawn: no blank and no words, a line leaves it out and a details channel for it goes. Only where Field's fixed places must still hold something does it say one phrase, core's `Not reported` (`NOT_REPORTED` in `entities/facts.ts`). Where the device declares it but hasn't sent it yet, it says `No reading yet` (`NO_READING_YET`), as every reading does before its first value. A climate entity declares no feature for the room's temperature, so its attribute tells the two apart: no `current_temperature` at all is not reported (`reportsCurrentTemperature: false`, from the climate mapper), one with no number in it yet is no reading yet; Orb's status line then says `No reading yet` in the room temperature's place, and nothing where it is never reported. No card says another phrase for either (`verify/card-words.test.ts`).
- **A picture is data, never a signal.** A camera's still or a player's artwork (core.md → Pictures) never glows, never carries the state and never sits in a compact row. While unavailable no picture is drawn at all, never a past frame; a still that isn't refreshing says when it is from (`Still from 22:14`), and one that failed with nothing to keep says `No picture`, on the line that says the state, never over the picture.
- **Small print: when first, then what the device is.** Facts start with when (`Last changed 08:16`, `Last seen 08:20` while unavailable, `Updated 11:53`, from `entities/facts.ts`) and end with what the device is (its battery, its capabilities, its code), in both skins.
- **Clock words follow the dashboard's hour cycle.** A dashboard has one clock, its header's: YAML `hour_cycle` (`h12` or `h23`), else the locale's (core.md → One hour cycle per dashboard). Every time a card says is on it, in every skin and every card, whether its mapper wrote it (`Since 2:05 PM`, `Last seen Mon 6:12 AM`, `formatHaTime`) or the card works it out (`Until 12:15 PM`, `Tomorrow 9:30 AM`, `70% rain at 2:00 PM`, `Still from 10:14 PM`). On 24 hours the hour is padded (`09:30`); on 12 it isn't, and core says the period (`AM`, `PM`, after a no-break space), never the locale's (`p.m.`). The words around a time stay English (`Tue 14:32`, `Oct 3`). A column of hours heads each with `14`, or `2PM` on 12 hours, and an hour axis names its hours the same way (`00 06 12 18`, or `12AM 6AM 12PM 6PM`; `hourLabel`); a span says its start's period only where it differs from its end's (`2:00–3:00 PM`, `11:30 AM–12:30 PM`). A warning that carries a time keeps its word first and within 13 characters on either clock, the time after it as its detail (`Stopped 11:49 AM`, `Open since 6:30 PM`), so a clipped line keeps the word (`entities/warnings.test.ts` holds both cycles). A clip keeps a time whole with its period, or drops it whole, never `1:44…`, `2:53 A…` or `Fri 1…`, on either clock: what follows a time gives way first, then the time goes whole, with its weekday and the ` · ` that leads it in, and the words before it stay (`Sets in 5h 14m…`, `Stopped …`). Core cuts a line at its times (`lineParts`, `entities/clock.ts`) and each skin draws each one as one piece (`timed`), so every line works the same way in both. A line that says only when (Field's camera, `Still from 1:44 PM`) keeps its time and lets its words go instead. A line whose figure can't carry the period says the when first, its clock before its day (`9:30 AM Tomorrow · School trip`, so a narrow row's clip keeps the period: Field's 4-place row screen has no room for it beside the digits; the Storybook run measures every time, and every 12-hour story draws the skin's narrowest width too). A skin never formats a time itself: it passes `useHourCycle()` to core's words (`verify/card-words.test.ts`).

## What every card shows

A card's signals belong to its model too, so a state lights the same way in every skin and a level or a clock behaves the same on every card. Each skin's rules say how it draws them: [orb.md](orb.md) → One UI language and A clock runs on by itself, [field.md](field.md) → A lit LED says on, the Fader and A clock runs on by itself.

- **One active signal, in every skin.** A model says once which of its states are active (`isActive` in `entities/<name>/words.ts` where it isn't simply `on`), and every skin's active signal follows that one set: Orb's accent and pressed orb, Field's LED, lit pictogram and bright figure. A skin never draws its own set. A transient state between two active ones (a player buffering between tracks) shares the active signal, so it doesn't flicker off and on; a powered `on` with nothing playing (a TV showing an input) is active, as a light that is on is.
- **A level that is a loudness or an output** (a player's volume, a sound machine's) fills only while that output is active and unmuted, since a full groove beside silence would say it sounds. Unfilled, its words give the reason before the value (`Off · 62%`, `Muted · 45%`, `Paused · 30%`; `volumeText` in `entities/volume.ts`, with the card's reason, `volumeReason` or `soundVolumeReason`), and what a screen reader hears says it too (`62 percent, sound off`, `volumeSaid`). Setting it never switches the output on or unmutes it. A step never switches the output on or unmutes it either: a player that only steps its volume sends `volume_up` or `volume_down` and nothing else, and its steps still act while it is muted or paused, since they change the level it comes back at.
- **A clock that runs on by itself** (a player's position) is worked out once from what Home Assistant reported and then left to CSS, so nothing re-renders every second:
  - it cuts and never slides: each place steps through its digits with hard cuts, its keyframe stops written to four decimals, so even the slowest place never visibly slides;
  - it stops at the end of what it measures (a track's length) and holds there, never counting past it;
  - it starts from the fractional position, each place's animation started that far into its turn, so it turns when the fill says it should, never a second late;
  - reduced motion keeps it, because a hard cut is not motion and a clock that stopped would lie;
  - a dashboard's `quiet` draws none, neither the clock nor a line that fills with it (deploy.md), since a held one would lie and a running one changes by itself;
  - a seek moves it to where it was let go, and it runs on from there until Home Assistant reports (or refuses it): while a finger or a key is on it, it holds at the target, its animations off so the values drawn under them show it, and it is sent once, on release, never on every move (`useSeek`), with no snap back and no timeout.

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

The status line says the room's temperature now and what the unit is doing (`20.4° now · Heating`): before the thermostat's first reading `No reading yet` in its place, and where it never reports one (`reportsCurrentTemperature: false`), what the unit is doing alone (What every card says → A blank figure says whether it may never come).

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
  - Featured: the standard card, with the next hours below: time (`14`, or `2PM` on a 12-hour dashboard), icon, temperature, and rain chance from 20%. It shows as many of the next 12 hours as its width fits.
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
- **Triggered** is the **alarm**: the shared `AlarmPill` fills the slot with the exceptional warn fill (it pulses gently, not under reduced motion: the fill deepens under the text rather than fading, so the text keeps its contrast), Alarm and what set it off on the left and Disarm on the right, in compact rows too (Alarm and Disarm). The status line keeps its plain words, "Triggered · Back door", with no second marker. Its level is `data-level="alarm"`.
- **The entry delay** is **urgent** and **open doors and windows** (`openSensors`) while disarmed **advisory**: they lead the status line behind the shared non-colour warning cue with their level as `data-level` (`urgent`, `advisory`); the sheet says arming will leave open ones unguarded.

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

- **A garage door, door or gate never moves on one press:** Orb's tap and Field's press open the details on the question; Stop is one press; its position is shown, not set. These are the covers that let a person in (`coverAsksFirst`, `isAccess` in `@dashhaus/core/entities/cover/position`, the same three that warn when left open), and core declares it (`COVER_ACTIONS`: open and close ask first `when` the device class is one of them), so a generated card asks for the same three. The question, what yes means and the yes itself are core's words (`coverQuestion`, `coverAskDetail`, `coverAskAction` in `@dashhaus/core/entities/cover/words`, with `coverAskWaiting` while the yes is on its way: `Waiting for the garage door`, each skin adding its own end punctuation): `Close Garage door?`, `It closes now. Check nothing is in its way.` (opening: `It opens now, and anyone outside can come in.`), with `Where it is isn't known.` while unknown and `It can't be stopped from here.` for one that can't stop, and a yes that names the thing (`Close garage door`, `Open gate`), never a bare Close beside the details' own close. The details say `Opening and closing ask first.` while no question stands. On its way where it can't be stopped, its control lies flat and says where it is going, so a press never opens an empty question. A garage door Home Assistant gives no `device_class` is drawn as a shade and moves on one press until it has one. A guarded partial position (a gate's pedestrian opening) is a GitHub issue.
- **The slot is the window.** The groove is the fabric and the accent is the daylight let through; the label flips colour where daylight passes under it.
  - Curtains: two panels close in from both ends; drag away from the middle to pull them apart.
  - Blinds and shades: one panel covers from the right.
  - Taps jump, drags follow the finger, and the ends are magnetic (within 3% means fully open or closed).
  - While the cover travels, the fabric glides linearly between Home Assistant's position updates.
- **Covers without a position** (most garage doors), and every garage door, door or gate, get Close and Open buttons at the ends of a groove, with the state in the middle; the one that can't act lies flat. The middle becomes a Stop button while the cover moves. On a garage door, door or gate the ends ask first: their names carry the ellipsis (`Close Garage door…`), and in the sheet both lie flat while the question stands, so one Close or Open answers.
- **The orb** opens or closes, and becomes Stop while the cover moves (when the cover supports stop); on a garage door, door or gate it asks first, as the lock's unlock does (`Close Garage door…`). Press and hold, or tap the name, for the sheet.
- **Orb and glow:** the orb is the accent while the cover is open.
  - Covers that let in light are energy (daylight): their glow follows how open they are.
  - Garage doors, doors and gates are a state, with no glow, and the control never fills. Left open, the card's warning is **advisory** (`coverSeverity`, `@dashhaus/core/entities/cover/severity`; why these three and not a curtain is What every card says → A door or gate left open): its status line leads with it behind the shared warn marker in every footprint, compact rows too, in the words a garage door's binary sensor says it in ("Open since 10:20", `leftOpenText` in `@dashhaus/core/entities/cover/words`); under 320 px it takes the compact value's place.
- **Sheet:** the question, while one stands; quick positions (Closed, 25%, Half, Open), never for a garage door, door or gate; slat tilt for blinds that support it, and today's openness by hour.
- **Unknown:** a cover Home Assistant reports as `unknown` still takes commands: a Somfy RTS or other RF blind, or a garage door with no position sensor, driven on an assumed state. It is never drawn as closed or as unavailable (nothing is dashed): its position is dropped as stale, so it gets the Close and Open buttons with Unknown in the middle, and both ends act. The middle stays Unknown rather than Stop, since an inverse Stop at rest would say it is moving. The orb opens it, as Home Assistant's own toggle does for a cover whose state it doesn't know, and today says "Unknown since …".

### Field cover module

`CoverModule` is the same normalized cover entity in the Field skin; `HaCoverModule` is its connected container, on the same `useHaCover` hook as `HaCoverTile`, and takes the same `onOpenCover`, `onCloseCover`, `onStopCover`, `onSetPosition` and `onSetTilt`. A garage door, door or gate asks first as above (Using the cover card), on the panel's question. See [field.md](field.md#cover).

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
- **Live or stale:** while readings arrive, the small outlined heart beside the Heart rate label beats once every 2.4 s (a liveness cue, not the measured rate; with reduced motion it fades instead). In compact rows it moves beside the inline heart-rate figure. Home Assistant pushes a state only when it changes, so live means a reading changed in the last 3 minutes (`staleAfterMinutes` on `HaOwletTile`). After that the heart stands still, the figures dim, and the status line leads with the warn marker: "Stopped 11:49" (`staleText`), in every footprint: its word, `Stopped`, 13 characters at most, then since when as its detail, on the dashboard's hour cycle ("Stopped 11:49 AM" on 12 hours), which gives way before the word does (Orb's status line clips after the word; Field's block, too narrow for both, drops the time); when the update includes a day it keeps the actionable time ("Stopped 18:30", "Stopped 6:30 PM") rather than clipping the full timestamp (`staleWarning`). A screen reader and the sheet's list say it whole: "No new reading since 11:49" (`staleSaid`). The sheet says "Live · updated 11:54". A device clock far off Home Assistant's can make fresh readings look stale.
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
- **Volume, in the sheet only:** press and hold the orb, or tap the name, for a volume groove the accent fills while the sound plays. It rarely changes, and a stray tap on a groove beside a sleeping baby would jump it, so no card carries it. Setting it never switches the sound: while the sound is off the groove stays empty and reads "Off · 62%", and a screen reader hears "62 percent, sound off", in both skins (What every card shows → A level that is a loudness). A sound without a volume entity has no groove.
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
- **No code:** the integration drops a code once its uses are spent, and leaves its sensor unavailable while no code is left. While what makes a new one can still be reached, that is no code, not unavailable: the card says "No code" ("No password" for a password, `noneWord`, muted), why and what to do ("Every code has been used. Make a new one to give.", `noneSentence`; outside the sheet, where New code is not, "Make one in details.", `NONE_HINT`, under the slot's "No code" on the featured card, never saying it twice), and the sheet offers New code. The QR code is left out, since joining would end at a page asking for a code there isn't.
- **QR code fails:** a QR code that fails to load (a network error, a token that expired before the attribute rotated) never shows the browser's broken picture: its frame stays, empty and the same size, and how to join says so first ("No QR code. Choose Loft Guests in Wi-Fi settings and type the password.", `qrFailedWords`), as a camera's still that fails says No picture. On a featured card under 260 px, where the QR code keeps the room alone, those words take it instead. A rotated token's new URL is tried afresh. Details, QR code fails, in both skins.
- **Unavailable:** when neither the code nor its New code button can be reached (or the sensor is `unknown` or missing), the card says Unavailable everywhere, and when it was last seen if the host passes `lastSeen`; no network, code or QR code.
- **Compact:** the icon, the name over the network, and the code as the row's value.
- **Home Assistant:** `HaGuestWifiTile` takes the entity that holds the code or password. For UniFi Hotspot Manager's `sensor.<site>_voucher` it finds `image.<site>_qr_code`, `button.<site>_create` and `button.<site>_update` beside it; for anything else, or companions named otherwise, pass `qrEntityId`, `newCodeEntityId`, `refreshEntityId`, and `network` and `access` where the defaults don't fit. Its services press those actions, `button.press`, `input_button.press` or `script.turn_on`, each only while its entity can be reached. The QR code is Home Assistant's own image (`entity_picture`, which Home Assistant serves with a token it rotates), resolved against the connection's Home Assistant (`useHaPicture`) so it loads on another origin too, and left out while the image is unavailable or unknown; it is drawn as served, a plain image black on white with its quiet zone, so it scans in either theme, not on the skin's `Picture` part (core.md → Pictures → A QR code is resolved as a picture and drawn as a code). A new code takes the integration's defaults: choosing its uses or length, or deleting a code, is the integration's (`unifi_voucher.create`, `unifi_voucher.delete`), not this card's. Changing a password, and redrawing its QR code, is the host's script: the card shows whatever the entity and the image then say.

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
- **Warnings** take their severity (`binarySensorSeverity`), in words (`ALERT_WORDS`, 13 characters at most so a row keeps them whole; a screen reader hears the whole sentence, `alertSaid`), never brightness. Smoke, gas and carbon monoxide are an **alarm** going off: the slot fills in warn (the shared `AlarmPill`, as the Owlet's vitals), the alarm on the left (`Smoke alarm`, `CO alarm`) and since when on the right, said as "Alert: Hallway smoke: Smoke detected". A leak, heat, an unsafe or tampered device and a problem are **urgent** (`Leak detected`, `Tampered`), a cold sensor and a battery class **advisory**, and a garage door left open advisory too, as the cover card says it (`Open since 18:30`; What every card says → A door or gate left open): these lead the status line behind the shared warn marker. Else a low battery (`Battery 9%`, at or under 15%, `@dashhaus/core/entities/battery`), advisory and the device's. The state's warning outranks the battery. An open door or window is a state, not a warning, however long it lasts (the same rule says why).
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

## Using the camera card

A doorbell's or a nursery's camera: one `camera.*`, its state and its still. A reading: no actions and no history.

```tsx
<CameraTile entity={frontDoor} onOpenLive={openStream} />
<HaCameraTile entityId="camera.front_door" refresh={10} />
```

- **States:** Idle, Recording, Streaming and Unavailable, Home Assistant's own (`@dashhaus/core/entities/camera/words`, the same in every skin); a state it doesn't name is said in its own words (`motion_alert` → Motion alert), never as Idle. `unknown`, `unavailable` and a missing entity are Unavailable. A camera has no warnings: nothing is ranked.
- **A reading:** the bare camera on its mount in place of an orb, saying its state without colour (a dot by the lens while it records, waves while it streams), and the state's word as a readout with no container, Idle in the second ink. It never glows (`paint("reading", 0)`).
- **The still** is a picture (spec/core.md → Pictures, orb.md → A picture is a readout): Home Assistant's own signed `entity_picture`, added by `useHaCamera` (`useHaPicture`), drawn in `Picture` through `usePicture`. It loads only once its card is on screen and the page visible, refreshes every `refresh` seconds (default 10) only while both stay true, and keeps its last frame while the next decodes. Standard: beside the words, as tall as the card's inside, 16:9 cropped narrower as the card narrows, and gone under 260 px, where the sheet has it. Featured: across the card under the header at 16:9 on a phone's card, the state's word moving to the header's readout (under 260 px the words keep the slot and the still takes the rest); with stills off a featured camera has nothing more to show, and the space under its words stays empty rather than hold filler, so give it the standard footprint. Sheet: the whole frame, `contain`, at the sheet's width. Never in a compact row, never glowing, never the state's colour, no word over it.
- **What it says of its still** (`stillNote`), on the status line in place of the area, never over the picture: `No picture` when there is none to show (Home Assistant names none, or it failed with nothing to keep: the well holds the camera in muted ink, never a broken image), `Still from 22:14` when the frame isn't refreshing (a refresh failed and the last frame stays, or a `quiet` dashboard holds it).
- **Unavailable:** the dashed slot with when it was last seen, whole at the card's width, as on every card: a standard card drops its still's column, which nothing can fill, and a featured card keeps the dashed well under the slot, with no frame at all, never a past one. The state, still and small print about the camera are hidden.
- **Its own words:** a state the integration names (`Motion alert`) wraps to a second line where its column is narrow (beside the still, under 260 px) rather than lose its end; Home Assistant's own words fit on one.
- **The press:** the name and the reading open the sheet, as on every card. The still opens the live stream where the host has one (`onOpenLive`: `useHaMoreInfo`, Home Assistant's more-info dialog inside Home Assistant), else the sheet, with the still large and refreshing while it is open. Where there is a stream the sheet carries one way to it that needs no still, a raised `Live view` pill under its header (a one-shot action, no heading), so a camera with stills off still reaches it; with no stream, and while unavailable, there is none. No stream player of Dashhaus's own. The press's words are core's, as its state's are: `openStillWord` after the still's label, `LIVE_VIEW` on the pill and `liveViewSaid` spoken for it.
- **Privacy and cost:** `still={false}` (YAML `still: false`, or the dashboard's `stills: false`) draws and fetches no still at all, and the card is its state and its icon; `paused` (the dashboard's `quiet`) loads a still when the card comes on screen and when the panel wakes, never on a timer.
- **Compact:** the camera, the name and the area, the state's word as the row's value.
- **Small print:** when it last changed (when it was last seen while unavailable), then what it is: `Reolink Video Doorbell · motion detection on` (`cameraKind`).
- **Home Assistant:** `HaCameraTile` takes the camera and `still`, `refresh` and `paused`; it wires `onOpenLive` itself. It reads no history.

### Field camera module

`CameraModule` is the same normalized camera entity in the Field skin; `HaCameraModule` is its connected container, on the same `useHaCamera` hook as `HaCameraTile`, taking the same `still`, `refresh` and `paused`. See [field.md](field.md#camera).

```tsx
<HaCameraModule entityId="camera.nursery" />
```

## Using the media player card

Now playing: one `media_player.*` (a speaker, a TV, a cast), a direct model and a control whose one press does what the player can do now. Its artwork is the entity's own picture (core.md → Pictures).

```tsx
<MediaPlayerTile entity={kitchen} history={today} onPlay={play} onPause={pause} onPrevious={back} onNext={next} onTurnOn={on} onTurnOff={off} onVolumeChange={setVolume} onSeek={seek} onVolumeUp={louder} onVolumeDown={quieter} onMuteChange={mute} onSourceChange={pick} onOpenMore={openInHomeAssistant} />
<HaMediaPlayerTile entityId="media_player.kitchen" />
```

- **States:** Home Assistant's, in words the same in every skin (`@dashhaus/core/entities/mediaPlayer/words`): Playing, Paused, Buffering, Idle, On (on with nothing loaded), Standby, Off and Unavailable. The names older and custom integrations give the same ones are mapped onto them (`stopped` is Idle, `loading` Buffering, `sleeping` Standby); any other state is said in its own words (`connecting` → `Connecting`), never guessed onto one Home Assistant names. `unknown` and a missing entity are Unavailable, and say nothing of what was playing.
- **One press**, gated on `supported_features` (`mediaPress`): while it plays or buffers the orb and the pill pause it, while it is paused, idle, on or in a state of its own they play it, and while it is off or in standby they turn it on; one that is on and can do none of that but turns off (a TV showing an input) turns off, as a light does. One that can do nothing now shows its state as a readout with nothing to press. The pill carries the state word and what a press does (`Playing · Pause`, `Off · Turn on`, `On · Turn off`); what a press does stays whole, the state word giving way before it (`Updating firmw… Turn off`), and under 260 px the pill says it alone (`Pause`), the status line then leading with the state it dropped (orb.md → A pill says what a press does). Its active states are the accent, the orb pressed and the pill solid (`isActive`, What every card shows → One active signal): playing, buffering (on its way to playing, so the accent doesn't flicker between tracks) and on (a TV showing an input, whose pill says `On · Turn off`, as a light that is on); paused, idle, standby, off and an integration's own state rest, raised, the readout in the quieter ink. A player is a state, so it never glows (`paint("state", 0)`). No warnings: nothing a player does is a fault to rank, and Muted is a choice.
- **Status line:** what is playing, the title first so a narrow card keeps it (`Sunday Morning · Maroon 5`), the title or artist alone, else the app; then `Muted` after it while muted. With nothing loaded, the area; with no area either, since when (`Since 11:40`), never the state word the slot already shows. Featured and in the sheet, which show the title under the head, the area and where it plays from (`Kitchen · Spotify`). Under 260 px, where the pill says only what a press does, the line leads with the state (`Playing · Radio Paradise · Muted`, `Updating firmware, do not unplug · Kitchen`).
- **Readout,** featured and in the sheet: the volume (`45%`), `Muted`, or the pill's word where it reports none.
- **Featured:** the standard card, then what is playing in place of today's strip, as the weather's next hours are: the artwork square in its well at the row's height (only where the player gives one: no empty well for a stream), the title over two lines, the artist, and how far in. Under 260 px the artwork yields and the title keeps the room.
- **How far in** ticks with no re-render: a thin line that fills (`clip-path`, one linear animation the length of the track, started where it is), the time played under its start and the length under its end, each place of the clock a strip of digits stepped through by its own timed animation with a hard cut, as a segment turns (`usePlayhead`, `clockPlaces`). Worked out once from `media_position`, `media_position_updated_at` and `media_duration`, and again only when one of them or the state changes (a new track, a pause, a seek): never on a timer. Held where it was while paused or buffering, and stopped at the length when the track ends (fill `forwards`, each place turning only as many times as there is track left), never counting past it. A stream with no duration draws no line and no clock, never a guessed one, and neither does a dashboard set `quiet`, where nothing runs by itself and a held clock would lie (the card's `quiet`, which the Lovelace card passes from its YAML; What every card shows → A clock that runs on by itself); a screen reader hears `1 minute 23 seconds of 4 minutes 5 seconds`. A player that seeks (`SEEK`) is seeked in its details only, never from the card's face, where a stray tap would jump the track (as the volume, which lives in the details too): the featured card always keeps the readout, and so does a player that doesn't seek, or has nothing to seek along (a stream, `quiet`).
- **Seek** (`onSeek`, the sheet's position groove): slid or tapped, it seeks once, when it is let go (pointer up, key up, or at once for an assistive swipe), since every `media_seek` makes most players rebuffer; while held, the time played is the target, in the full ink, held still, and the length stays. Once let go the line runs on from there under a new key until Home Assistant reports the entity again, or the seek is refused (`onSeek` answers `false`), never snapping back meanwhile. It steps 5 seconds per key or swipe, Page keys 50, Home and End to the ends, each from where it is now, and is heard as the time it was drawn at (`2 minutes 31 seconds of 4 minutes 5 seconds`). Reduced motion keeps the running line and clock; only a tap's jump stops moving.
- **Artwork** is data, never a signal: it never glows, never carries the state, never sits in a compact row or in the orb. It is asked for only where its well is drawn (featured and the sheet), and loads only on screen, through core's picture lifecycle (`usePicture`), with no refresh timer: it changes when its URL does, with the track. A failed one leaves the well with the player's glyph and no words, since the title already says what is playing; unavailable, off or in standby, none is drawn at all.
- **Sheet:** the head, the pill, then what is playing (the artwork, title, artist, album and, for a player that can't seek, how far in); for one that can, how far in as a full-width groove first in the controls, the played part an ink tint and the clock on it (Seek, above); `Previous` and `Next` as raised pills that act once; the volume groove the sound card has (`Volume`, set as a percent), filled by the accent only while the player is active and not muted, else unfilled and saying why before the value (`Muted · 45%`, `Paused · 30%`, `Idle · 25%`; `volumeReason`, What every card shows → A level that is a loudness); setting it never plays or unmutes; for a player that steps its volume (`VOLUME_STEP`) and has no groove (no `VOLUME_SET`, or no level reported; `volumeBySteps`), the volume's steps in its place: a `Volume` heading with what it says (the level and why it doesn't sound where one is reported, `45%`, `Muted · 45%`, `Paused · 30%`; with none, `Muted` while muted, else nothing, never an invented figure; `volumeStepValue`), over `Down` and `Up`, raised pills that each act once, as `Previous` and `Next` do, never a groove or a stepper, which would claim a level the player never reported; only where a level is reported does one lie flat at 0 or 100, and there is no hold to repeat; `Mute` as chips (Off, On); the source as chips (the player's own list); `Turn off`; inside Home Assistant, last among the controls, a raised `Open in Home Assistant` pill, a one-shot action with no heading, that opens Home Assistant's own player, its more-info dialog, for what the card leaves to it (browsing media, grouping players, the sound mode); today's playing by hour (`Playing 1h 20m` or `Not playing today`). Each only where the player supports it. The pill is there only where the host has the dialog (`onOpenMore`: `useHaMoreInfo`, as the camera's `Live view`): in Storybook, a demo or a standalone app there is none, never a control that opens nothing (core.md → Pictures), and while unavailable there is none either. It is in the details only: never on the card's face, the featured card or the artwork, and the name still opens the sheet. The small print says when it last changed, then what it can do (`Skip, seek, volume, mute, 3 sources`, `Volume steps, mute`, or `View only`).
- **Compact:** the player's glyph, the name, and what is playing (or the area) under it; the pill with the state word (with its verb from 400 px), or the word as the row's value. Never the artwork or the line.
- **Unavailable:** the dashed slot with when it was last seen (`Last seen 08:20`); what was playing, the artwork, the volume and every action are hidden.
- **Its words** are core's, as every card's are: the states, the press (`pressWord`), the skips (`SKIP_WORDS`, `skipSaid`), what the artwork is (`artworkLabel`), the volume (`volumeText`, `volumeReason`), its steps (`VOLUME_STEP_WORDS`, `volumeStepSaid`, `volumeStepValue`), the seek (`POSITION`, its time in `fmtPlayTime` and `playTimeSpoken`) and the way to Home Assistant's own player (`OPEN_IN_HOME_ASSISTANT` printed whole on Orb's pill, Field's key printing `Open` under its `Home Assistant` legend as the camera's `Live` under `Camera`, `openInHomeAssistantSaid` spoken: `Open Kitchen speaker in Home Assistant`).
- **Home Assistant:** `createMediaPlayerHandlers` calls `media_player.media_play`, `media_pause`, `media_previous_track`, `media_next_track`, `turn_on`, `turn_off`, `volume_set` (the percent as a level from 0 to 1), `volume_up` and `volume_down` (one step each, for `VOLUME_STEP` or `VOLUME_SET`, as Home Assistant registers them; never an unmute or a turn on), `media_seek` (`seek_position`, in seconds, kept within the track; it answers `true` once Home Assistant takes it, `false` when it doesn't, as the alarm's do), `volume_mute` and `select_source`, each only where `supported_features` declares it (`PLAY`, `PAUSE`, `PREVIOUS_TRACK`, `NEXT_TRACK`, `TURN_ON`, `TURN_OFF`, `VOLUME_SET`, `VOLUME_STEP`, `SEEK`, `VOLUME_MUTE`, `SELECT_SOURCE` with a `source_list`), reporting what it can't do as `unsupported` and a source it doesn't list as `invalid_input`. `MEDIA_PLAYER_ACTIONS` declares the six presses and the two volume steps (`onVolumeUp`, `onVolumeDown`, which generators draw as `Volume up` and `Volume down`), the volume as a `level`, the seek as a `level` over the track that `runs` on by itself (`{ field: "position", min: 0, max: "duration", runs: true }`, so a generator leaves it out rather than draw a frozen fader, and each skin draws it on its own running clock), mute as a `switch` and the source as a `choice` over `sources`, so every skin's generator draws them. `useHaMediaPlayer` adds the artwork (`useHaPicture`, while something is loaded); today comes from the recorder through `mediaPlayerHistoryFromHass`, playing and buffering as on; `loadHistory={false}` skips it. `HaMediaPlayerTile` and `HaMediaPlayerModule` pass `useHaMoreInfo(entityId)` as `onOpenMore`, as the camera's connected cards pass `onOpenLive`: it is the host's dialog, not a service, so `MEDIA_PLAYER_ACTIONS` doesn't declare it and no generator draws it.

## Using the numeric card

A number one `sensor.*` measures: CO₂ in ppm, power in W, energy in kWh, or any other. One generic card, not one per kind of reading: the device class and the unit drive its words, its icon and its formatting. A direct model and a reading: it has no actions and no companions.

```tsx
<NumericTile entity={co2} history={today} />
<HaNumericTile entityId="sensor.living_room_co2" />
```

- **What it measures:** the device class's words (`@dashhaus/core/entities/numeric/words`, the same in every skin; its figures are `…/readings`): a short label for a line (`CO₂`, `PM2.5`, `Power`, `Energy`, `Light`) and a long one for the small print and a screen reader (`Carbon dioxide`, `Fine particles`), and a picture: air (CO₂, particles, VOC, ozone, AQI), power (power, current, voltage), a meter (energy, gas, water, volume) or a gauge (any other). A class it has no words for, and none, is a plain reading with the gauge and no label.
- **The figure:** as precise as its size needs (`fmtNumeric`: whole from 100, one decimal from 10, two under 10; never `-0`), at most five places, a sign and a point included, so it never loses a digit to an ellipsis: beyond, it is scaled with an SI letter (`numericFigure`: 123456 is `123k`, 1234567.8 `1.2M`), and heard in full. Its unit after it, a symbol on the figure (`41%`) and a word after a space (`650 ppm`); none is a bare number. A negative reading keeps its sign; it is never a warning.
- **A reading:** the bare icon its class names, the figure in the large-readout voice with its unit in the second ink, as a readout with no container, and today under its caption in the sensor's second track (`minmax(0, 1.35fr) minmax(44px, 0.65fr)`, left-aligned): the day's low and high (`470–940`; a range below zero says `-1240 to 420`; a day that never moved says its one value), or, for a meter that only climbs (`state_class: total_increasing`), how far it rose since the day's first reading (`+8.6`), since a meter's low and high would only be midnight and now. A metric that can't fit the track whole (more than `TODAY_SHORT_PLACES`, nine characters, as `-1240 to 420`) is left out rather than cut, and the strip and the sheet say it in full. Under 260 px the figure keeps the slot to itself. It never glows (`paint("reading", 0)`). Tap the reading or the name for the sheet.
- **A warning you set:** a CO₂ or power threshold of its own would be a guess, so it warns only past a limit the person set: `warn_above` and `warn_below` in YAML, `warnAbove` and `warnBelow` on `useHaNumeric`, in the entity's own unit, copied onto the model by the mapper. Strictly over `warnAbove`, or strictly under `warnBelow`, it warns (a reading at its limit does not); with both, a band, `warnBelow` under `warnAbove`. Never while unavailable or before a first reading. Core ranks it (`numericSeverity`, `entities/numeric/severity.ts`), always **advisory**: a number the person picked has no meaning core knows, so it never claims urgent or alarm, and has no option to; and core words it (`numericWarning` beside it, its words `numericWarningWord` and `numericWarningSaid` in `entities/numeric/words.ts`): `High <label>` or `Low <label>` from what it measures (`High CO₂`, `High PM2.5`, `Low voltage`, `High humidity`), a symbol or an acronym in its case and an ordinary word lower-case; a temperature `Too warm` or `Too cold`; `Too high` or `Too low` for a plain reading and for a class whose `High <label>` would pass 13 characters (`Power factor`), on both sides alike. The name is never in it. Heard as `Warning: Carbon dioxide above 1200 ppm` (`Warning: above 1200 ppm` for a plain reading) after the card's name: Orb's marker names the card first, as every Orb card's does (`Warning: Bedroom CO₂: Carbon dioxide above 1200 ppm`), and Field's `Warn` follows its title, as every Field module's. The word leads the status line behind the warn marker, in place of what it measures, then the area (`High CO₂ · Bedroom`; in a card under 220 px the area gives way, so the line never clips and the word keeps its room); the figure keeps its own ink and the card no glow. It has no delay and no hysteresis: a warning that must reach someone (a notification, an automation, a freezer that has failed) is Home Assistant's Threshold helper's, whose binary sensor can sit on the dashboard beside the reading; the card never reads one as a companion.
- **Status line:** the area and what it measures (`Living room · CO₂`); the area alone with no class; `Unavailable` while it is. Before a first reading, as the sensor card: the area and `No reading yet` (`Outside · No reading yet`), and `Waiting…` in the readout and as a compact row's value.
- **Featured and sheet:** today's readings by hour on the strip, from its low to its high, summed as `Low 470 ppm · High 940 ppm` (`Steady at 0 kW`; a meter's `+8.6 kWh today`); a featured card's readout keeps the figure alone, since the strip says the day. The sheet's header says the figure and drops the slot; its small print says when it last reported (when it was last seen while unavailable), then what it is (`numericFact`: `Carbon dioxide in ppm`) and the limits it warns past, whether or not it warns now (`numericLimitFact`: `Warns above 1200 ppm`, `Warns below 18°C or above 24°C`).
- **Compact:** the icon, the name, the status line, and the figure with its unit as the row's value. Past a limit the row's status line leads with the warning as the card's does, and where the value line stands in for it (under 320 px) the warning leads it behind the marker, the figure after it in its own ink (`High CO₂ · 1450 ppm`), so a clip gives up the figure first; a hidden reading's place keeps the figure alone.
- **Unavailable:** `unknown`, `unavailable` and a missing entity are Unavailable: the dashed slot with when it was last seen, and the last value hidden. A state that isn't a finite number is `No reading yet`, never a made-up value.
- **Home Assistant:** `HaNumericTile` takes the sensor and, where the entity doesn't say, its `unit`, and the limits it warns past (`warnAbove`, `warnBelow`), passed through to `useHaNumeric`; `device_class` and `state_class` are read from it. It is a shared kind on `sensor` (`SHARED_KINDS`), never the domain's default: YAML picks it with `card: numeric`, or leaves it to the sensor: a `sensor.*` listed on its own (no `card:` and none of the sensor card's keys) draws numeric when its attributes declare a number that isn't the room's temperature or humidity, a `state_class`, a unit, or a device class other than `enum`, `timestamp` or `date` (`sensorCard`, `@dashhaus/core/lovelace`, as each skin's Lovelace card draws; a room reading is the sensor mapper's `isRoomReading`, and `card: sensor` keeps the room sensor). It reads what the entity declares, never its value, so a reading that goes unavailable keeps its card. The automatic layouts write `card: numeric` themselves, and pick it by device class for the room's air quality only (`numericSensors`: CO₂, then particles, then VOC, one per device), and for the house's own power and energy meters from Home Assistant's energy preferences (`energy/get_prefs`, read once per connection; `energySensors`): electricity only, the grid's, solar's and the batteries' power now first, then their meters (grid consumption, grid return, solar production, battery out, battery in), each a visible `sensor.*` that exists, under Energy, the last row in both skins, at the standard footprint so a meter's today says what it rose. No preferences, empty ones or a refusal give no row and say nothing. Gas, water, the devices listed under device consumption and any other power or energy sensor are hand-added. Today comes from the recorder through `readingHistoryFromHass`; `loadHistory={false}` skips it.

### Field numeric module

`NumericModule` is the same normalized numeric entity in the Field skin; `HaNumericModule` is its connected container, on the same `useHaNumeric` hook as `HaNumericTile`, taking the same `unit`, `warnAbove` and `warnBelow`. See [field.md](field.md#numeric).

```tsx
<HaNumericModule entityId="sensor.house_energy" />
```

## Using the vacuum card

A robot vacuum: one `vacuum.*`, its battery an attribute of its own (not a companion). A control whose one press does what the vacuum can do now.

```tsx
<VacuumTile entity={robot} history={today} onStart={start} onPause={pause} onReturnToBase={dock} onLocate={locate} onFanSpeedChange={setSpeed} />
<HaVacuumTile entityId="vacuum.robot_vacuum" />
```

- **States:** Home Assistant's activities, in words the same in every skin (`@dashhaus/core/entities/vacuum/words`): Cleaning, Docked, Returning, Paused, Idle, Error and Unavailable. The names integrations give the same ones are mapped onto them (`charging` is Docked, `returning_home` Returning, `stopped` Idle, an older vacuum's `on` and `off` Cleaning and Idle); a kind of cleaning named its own way (`spot_cleaning`, `mopping`) is Cleaning, said as the integration says it (`Spot cleaning`); any other state is said in its own words (`Emptying the bin`), never guessed onto an activity. `unknown` and a missing entity are Unavailable.
- **One press**, gated on `supported_features` (`vacuumPress`): while it moves (cleaning, returning) the orb and the pill pause it; while it stands (docked, idle, paused, in error, its own state) they start it, or resume it. A vacuum that can't pause is sent back to its dock instead while it cleans; one that can do neither now shows its state as a readout with nothing to press (the shared `hd-st`, as a lock's while it turns). The pill carries the state word and what a press does (`Cleaning · Pause`, `Paused · Resume`); after an error it says `Start again`, as a jammed lock's says Lock again. What a press does stays whole, the state word giving way before it, and under 260 px the pill says it alone (`Resume`), the status line then saying the state it dropped, first (`Cleaning · Hall`) or after a warning, which leads (`Battery 15% · Paused`; orb.md → A pill says what a press does). Its active set is cleaning and returning (`isActive`), the one every skin's active signal follows: the accent and the pressed orb here, so on its way home between a clean and the dock it keeps the signal rather than flicker off; a vacuum is a state, so it never glows (`paint("state", 0)`).
- **Warnings** take their severity (`vacuumSeverity`), behind the shared warn marker, never brightness: an error is **urgent**, leading the status line with what went wrong where Home Assistant says (`Error · Main brush jammed`; `Error` alone on a compact row, 13 characters at most; a screen reader hears "Stopped with an error: main brush jammed", `vacuumWarningSaid`, after the card's name); a low battery (`Battery 9%`, at or under 15%) while it stands away from its dock and isn't charging (idle, paused, or an integration's own state) is **advisory**, the device's. A docked or charging vacuum never warns of its battery, and nor does one cleaning or returning, since it heads home on its own; an error outranks it. Paused, idle and returning are states, however long they last.
- **Status line:** the warning behind its marker; else the area, with what the integration's `status` adds after it where it says more than the state (`Landing · Charging`); since when where there is no area.
- **Featured and sheet:** today's cleaning by hour, summed as `Cleaning 1h 15m` or `Not cleaning today`. The sheet's header repeats the state word; under the pill, `Return to dock` (`RETURN_WORDS`, its spoken label `returnSaid`) (hidden while it is docked or on its way, or when the pill already sends it home) and `Locate` (it plays a sound, `locateSaid`), raised pills that act once, side by side (the shared `hd-acts`); then its fan speeds as chips (`Fan speed`, the vacuum's own list in words, `max_plus` → `Max plus`). The small print says when it last changed, then its battery (`Battery 64%, charging`; `Battery 9%, needs charging` in the warn colour while it warns).
- **Compact:** the vacuum from above, the name, and the warning or the area under it; the pill with the state word (with its verb from 400 px), or the word as the row's value.
- **Unavailable:** the dashed slot with when it was last seen; battery, fan speed and actions are hidden.
- **Home Assistant:** `createVacuumHandlers` calls `vacuum.start`, `vacuum.pause`, `vacuum.return_to_base`, `vacuum.locate` and `vacuum.set_fan_speed`, each only where `supported_features` declares it (`START`, `PAUSE`, `RETURN_HOME`, `LOCATE`, `FAN_SPEED` with a `fan_speed_list`), reporting what it can't do as `unsupported` and a speed it doesn't list as `invalid_input`. `VACUUM_ACTIONS` declares the four presses and the fan speed as a `choice` over `fanSpeeds`, so every skin's generator draws them. Today comes from the recorder through `vacuumHistoryFromHass`, the on/off parser with cleaning as on; `loadHistory={false}` skips it.

## Using the calendar card

What's next, and when: one `calendar.*`, composed with its events from today's start to its horizon (7 days unless `days` says), and those of any other calendars read beside it (`calendarEntityIds`), merged. A reading: it has no actions and no warnings.

```tsx
<CalendarTile entity={family} history={today} />
<HaCalendarTile entityId="calendar.family" calendarEntityIds={["calendar.school"]} days={14} />
```

- **Events:** their own ranged read, `calendar.get_events` through the store's `query`, as the weather's forecasts are, never the recorder's history. Each event is a title (`Busy` when it has none), a start and an end, all-day or timed, a location, and its calendar's name when more than one is read. What the card says about them is `@dashhaus/core/entities/calendar/words` and `/agenda`, the same in every skin, counted from the entity's own minute (`now`), never a timer of the card's: times on the dashboard's hour cycle (`14:00`, or `2:00 PM`; What every card says → Clock words follow the dashboard's hour cycle), as the weather's hours; days as `Today`, `Tomorrow`, the weekday within the week (`Thu`), then the date (`Oct 26`).
- **The next event** (`calendarAgenda`): one under way, else the next to start; within a day a timed event leads before the all-day ones, so bin day never hides the dentist at 14:00, and an all-day event leads only when the day has nothing timed left. An event that began yesterday and runs on counts as today's.
- **A reading:** a bare calendar icon, its day filled while an event is under way, timed or all-day (`isActive`, the active set Field's lit pictogram and `NOW` follow too), so the shape says it without colour. The readout is the next event's title, a little smaller than a reading's number since it is words, and when it is under its caption in the sensor's second track (`eventWhen`): `In` `2h 6m` for one still to come today, `Until` `12:15` for one under way, `Today` `All day`, `Until` `Fri` for an all-day event running on, `Tomorrow` `09:30` or `Thu` `All day` for another day. With nothing to the horizon it says `Free` in the second ink, `For` `7 days`; before its events are read, `Waiting…`, the status line `No reading yet` after the area, as every reading says it. It never glows (`paint("reading", 0)`). Tap the reading or the name for the sheet.
- **Status line:** what's left today (`2 left today`, `Nothing more today`, `Nothing today`), all-day events included; `Unavailable` while it is. In the sheet, the area before it.
- **Featured and sheet:** today's plan by hour (`calendarDay`): the share of each hour taken by timed events, overlaps once, the hours ahead included and drawn lighter, since a calendar knows them, summed as `Busy 2h 30m` or `Not busy today`; all-day events take no hours. The sheet keeps the readout in its slot, then lists **Events today** (`CALENDAR_WORDS.eventsToday`), all-day first, those already over in the third ink, the one under way with `Now` before its title, each with its span (`14:00–15:00`, `22:00–Tue 06:40`, `All day`, `Until Fri`) and where and on which calendar it is; then **Coming up**, the next five after today (`Tomorrow 18:00`, `Thu`). Its small print says when the calendar last changed, then how far it looks (`Next 7 days`, `3 calendars · Next 31 days`).
- **Compact:** the icon, the name, and the next event's title under it; one cue on the right, `Now` while a timed event is under way, else when (`In 2h 6m`, `All day`, `Tomorrow 09:30`, `Free for 7 days`). Under 320 px the line says both (`Dentist · In 2h 6m`).
- **Unavailable:** the dashed slot with when it was last seen; no events, no lists.
- **Home Assistant:** `HaCalendarTile` takes the calendar, `calendarEntityIds` for more calendars and `days` for the horizon (1 to 31). The events are read again each hour, on a new day, and whenever the calendar itself changes (an event starts or ends), the last ones staying up while the next read loads; until the first read settles, the calendar's own current or next event (its `message`, `start_time` and `end_time` attributes) stands in. `events` supplies them from the host instead, and `loadEvents={false}` skips the read; `loadHistory={false}` (YAML `history: false`) leaves out today's plan.

## Using the sun card

When the sun next sets or rises, and where it is in the day: Home Assistant's `sun.sun`, from its `sun` integration. A reading: it has no actions and no warnings.

```tsx
<SunTile entity={sun} history={today} />
<HaSunTile entityId="sun.sun" />
```

- **Times:** the entity's own `next_rising`, `next_setting`, `next_dawn`, `next_dusk` and `next_noon`, on the dashboard's hour cycle (`20:30`, or `8:30 PM`; What every card says → Clock words follow the dashboard's hour cycle), as the calendar's and the weather's, and every word counted from the entity's own minute (`now`), never a timer of the card's. What the card says is `@dashhaus/core/entities/sun/words`, the same in every skin.
- **What comes next** (`sunNext`): the sunset while the sun is up, the sunrise while it is down. Within a day the countdown says how long (`Sets in 4h 35m`, `Rises in 9m`, never `in 0m`); further off, its day (`Rises Thu`). Where none is reported within two days, as in a polar summer or winter, it says `Up all day` or `Down all day` in words, never a guessed time.
- **A reading:** a bare icon, the sun on the horizon with an arrow over it the way it goes next, down to its sunset or up to its sunrise, its disc filled while the sun is up (`isActive`, the active set Field's lit pictogram follows too), so the shape says it without colour. The readout is what comes next, in the large-readout voice (`20:30`, or `8:30 PM` on 12 hours, its period set small after it as the header's is, so a narrow card keeps it whole), the other beside it under its caption (`Sunrise` `05:01`); up or down all day is the figure in words. Before Home Assistant reports it, `Waiting…`, the status line `No reading yet`, as every reading says it. It never glows (`paint("reading", 0)`). Tap the reading or the name for the sheet.
- **Status line:** the countdown (`Sets in 4h 35m`), its own cue; with none, the area. In the sheet, the area before it.
- **Featured and sheet:** today's path (`sunDay`, drawn as `sunPathDrawing`), the day from midnight to midnight on its horizon, worked out from the home's latitude and longitude: the day so far in ink and the rest of it lighter, as the calendar draws its hours ahead; the night a fainter line, never dashed, since dashed means unavailable; today's sunrise and sunset ticked on the horizon and timed under it; now the accent's stick, as the Today strip's now is, and the sun a ring on its path, a readout, not a button. Its heading says today's daylight (`Daylight 10h 46m`, `No daylight today`). The sheet keeps the readout in its slot, the time at a figure's 40 px and up or down all day at the 30 px every card's word takes there (orb.md → Readout type), then lists **Next**: every time to come in the order they come, the one the card leads with first in ink (`Sunset 20:30`, `Dusk 21:04`, `Dawn Tomorrow 04:25`; on 12 hours `Dawn Tomorrow 4:25 AM`). Its small print says when it last updated, then where the sun is (`Elevation 38° · Azimuth 241°`).
- **Compact:** the icon, the name, the countdown under it, and what comes next on the right (`20:30`). Under 320 px the line says both (`Sets in 4h 35m · 20:30`).
- **Unavailable:** the dashed slot with when it was last seen; the path stays, since it is the place's, but neither now nor the sun is drawn, its heading `Unavailable since 08:20`; no list.
- **Home Assistant:** `HaSunTile` takes the sun. Today's path comes from Home Assistant's own location (`get_config`), or the `latitude` and `longitude` options; without either there is no path, and `loadHistory={false}` (YAML `history: false`) leaves it out.

## Using the dyson card

One Dyson purifier fan, as either custom integration adds it: [hass-dyson](https://github.com/cmgrayb/hass-dyson) (`hass_dyson`) or [ha-dyson](https://github.com/libdyson-wg/ha-dyson) (`dyson_local`); a Pure Cool, Hot+Cool, Humidify+Cool or Pure Cool Link. A composed model: its `fan.*` (the fan card's model, its presets read as Auto or not) with the entities on its device, each named after the fan, the first name that exists winning (`dysonCompanionIds`): the air readings (`sensor.<fan>_pm_2_5` or `_pm2_5`, `_pm_10` or `_pm10`, `_volatile_organic_compounds_index` or `_voc`, `_nitrogen_dioxide_index` or `_no2`, `_hcho` or `_formaldehyde`; hass-dyson's VOC in mg/m³ and NO₂ in µg/m³ are read back on Dyson's 0-10 index, as its app shows them), the room's `_temperature` and `_humidity`, the filters' life (`_hepa_filter_life`, `_carbon_filter_life`, or one `_filter_life`, read only in percent, a Pure Cool Link's `_filter_life_percentage` where its `_filter_life` is in hours), night mode (`switch.<fan>_night_mode`), the oscillation (hass-dyson's angle sliders, `number.<fan>_oscillation_center_angle`, `_oscillation_angle` its width, `_oscillation_low_angle` and `_high_angle`; a Humidify+Cool's oscillation select, `select.<fan>_oscillation_mode` or `_oscillation`; or ha-dyson's fan `angle_low` and `angle_high`) and a Hot+Cool's heater (`climate.<fan>`). `companions` names any of them otherwise, or `""` leaves one out (YAML `companions:`, spec/deploy.md).

```tsx
<DysonTile entity={entity} history={today} onToggle={toggle} onPercentageChange={setSpeed} onAutoChange={setAuto} onOscillateChange={oscillate}
  onOscillationModeChange={sweep} onDirectionChange={airflow} onNightModeChange={night} onHeatChange={heat} onHeatTargetChange={heatTo} />
<HaDysonTile entityId="fan.bedroom" />
```

- **Switching and speed:** the orb toggles it; the slot is the fan's groove, counted in its ten speeds (`Speed 4`). In Auto the fan chooses its own speed and Home Assistant reports none, so the groove is empty and says Auto (heard "Auto, choosing its own speed"); dragging it sets a speed, which leaves Auto, and turns the fan on while it is off.
- **Colour:** a state, the accent with no glow, as the fan's: moving and cleaning air is not light or heat. While its heater is heating (`hvac_action: heating`), it claims the energy bloom, as the climate card does (attention-budget skill).
- **Status line:** the room, then what it runs as (`Heat 23°`, `Auto`, `Night`, `Sweeps 90°`, `Oscillating`, the first that holds), else how the air is (`Air good`, `Air fair`). Under 260 px, and in a compact row, the room alone.
- **The air:** each reading in Dyson's own bands, Good, Fair, Poor and Very poor (`entities/dyson/air.ts`: PM2.5 to 35, 53 and 70 µg/m³; PM10 to 50, 75 and 100 µg/m³; VOC and NO₂ on Dyson's 0-10 index to 3, 6 and 8; formaldehyde to 0.099, 0.299 and 0.499 mg/m³); the air overall is its worst reading's band, the first listed on a tie.
- **Warnings:** poor or very poor air first (`Poor air`, `Very poor air`, heard `Warning: Purifier: Poor air: Fine particles 62 µg/m³`), then a filter at or under 10% (`Change filter`, heard with each filter's life). Both **advisory** (`dysonSeverity`), Orb's card writing it as `data-level="advisory"`: the purifier is already cleaning the air, and a heating Hot+Cool that warns keeps its warm colour without its glow, since a card with a level never glows. The word leads the status line behind the warn marker, the room after it, and a compact row's value line, the state word after it.
- **Where it points:** a Pure Cool or Hot+Cool turns round its own base, its integration counting the angles (hass-dyson 0-350° with 175° ahead, ha-dyson 5-355° with 180°; ahead is straight out of the front of the base, opposite its cable, and a lower angle turns it to its left seen from behind, checked on a hass-dyson Pure Cool). It holds still at one angle, or sweeps at least 30° round where it points. It reports no live position, so the card draws what it was set to. The status line says `Points 58° right` while it holds still (`aimWords`).
- **Sheet:** press and hold the orb, or tap the name: the groove; **Mode** (Auto, Manual); **Oscillation**: on a Pure Cool or Hot+Cool, Off, Still, 45°, 90°, 180° and 350°, a width kept round where it points, then, while it oscillates, **Points**, a dial seen from above with ahead at the top, so its left is on the left: a ring of ticks every 5° it can turn to, lit in the accent where it sweeps (a few either side while still), its base and cable fixed at the back, its head, a stem and a ring knob turned to where it aims. It is Orb's `Dial` part, the fan's base, cable and head the card's own drawing in its middle: a drag anywhere on it aims it, the width kept, sent once when let go (`useDial`); the arrow keys turn it 5° at a time; a new aim eases round, at once under reduced motion. Field draws the same on its own `Dial` (field.md → Dyson). A Humidify+Cool's own ranges, `Breeze` among them, or Off and On where it has none; **Airflow** (Front, Back: the fan's direction, which `dyson_local` reads as its front airflow); **Night mode** (Off, On); a Hot+Cool's **Heat** (Off, On) and, while heat is on, its target on the stepper (`Heat to`), inside the heater's limits and on its step; then **Air quality**, every reading with its band (a poor one in the warn ink), the room's temperature and humidity; **Filters**, each one's life; today's on/off history; and what it can do (`10 speeds, auto, oscillates 45°, 90°, 180°, 350°, front or back airflow, night mode, heats`). Each only where the device has it. A reading the device has but hasn't sent says `No reading yet`.
- **Unavailable:** the dashed slot with when it was last seen; no controls, readings or filters.
- **Home Assistant:** `createDysonHandlers` takes the fan's own services from the fan's handlers (`fan.toggle`, `fan.set_percentage`, `fan.oscillate`, `fan.set_direction`), `fan.set_preset_mode` with `Auto` or its other preset (`Manual`, `Normal`) for Auto, and each companion's on its own entity: where it points (`onAimChange`) and how widely it sweeps (`onSpreadChange`, 0 to hold still) on hass-dyson's centre and width sliders (`number.set_value`, each keeping the other), or with `dyson_local.set_angle` round the new centre inside its range; `select.select_option` on a Humidify+Cool's select; `switch.turn_on` and `turn_off` for night mode; `climate.set_hvac_mode` (`heat`, or for heat off, the fan running on, ha-dyson's `cool` or hass-dyson's `fan_only`) and `climate.set_temperature` for the heater. What the device doesn't have is reported as unsupported, never sent; a range it doesn't list as `invalid_input`. `DYSON_ACTIONS` declares them. It shares `fan` with the fan card, so it is never the domain's default: YAML picks it with `card: dyson`, and the automatic layouts pick it for a fan with the night-mode switch and a filter-life sensor named after it (`dysonFans`, `@dashhaus/core/lovelace/layout`), leaving a Hot+Cool's heater out of the rows, since this card draws it.

### Field dyson module

`DysonModule` is the same normalized Dyson in the Field skin; `HaDysonModule` is its connected container, on the same `useHaDyson` hook as `HaDysonTile`, so it takes the same handlers, its fader counts the same ten speeds and its warnings are core's. See [field.md](field.md#dyson).

<!-- new-card: cards -->

### Field media player module

`MediaPlayerModule` is the same normalized media player entity in the Field skin; `HaMediaPlayerModule` is its connected container, on the same `useHaMediaPlayer` hook as `HaMediaPlayerTile`, taking the same handlers. See [field.md](field.md#media-player).

```tsx
<HaMediaPlayerModule entityId="media_player.kitchen" />
```

### Field vacuum module

`VacuumModule` is the same normalized vacuum entity in the Field skin; `HaVacuumModule` is its connected container, on the same `useHaVacuum` hook as `HaVacuumTile`, taking the same handlers. See [field.md](field.md#vacuum).

```tsx
<HaVacuumModule entityId="vacuum.robot_vacuum" />
```

### Field calendar module

`CalendarModule` is the same normalized calendar entity in the Field skin; `HaCalendarModule` is its connected container, on the same `useHaCalendar` hook as `HaCalendarTile`, taking the same `calendarEntityIds` and `days`. See [field.md](field.md#calendar).

```tsx
<HaCalendarModule entityId="calendar.family" calendarEntityIds={["calendar.school"]} />
```

### Field sun module

`SunModule` is the same normalized sun entity, its words and today's path in the Field skin; `HaSunModule` is its connected container, on the same `useHaSun` hook as `HaSunTile`, taking the same `latitude` and `longitude`. See [field.md](field.md#sun).

```tsx
<HaSunModule entityId="sun.sun" />
```

### Field dyson module

`DysonModule` is the same normalized dyson entity in the Field skin; `HaDysonModule` is its connected container, on the same `useHaDyson` hook as `HaDysonTile`. See [field.md](field.md#dyson).

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
  - `hourCycle` forces 12 or 24 hours. 24-hour clocks pad the hour ("09:05"), and AM/PM is set small. It is the page's clock: `DashboardPage` puts every card under it on the same cycle (`HourCycleProvider`), and given none the header takes the one around it, else its `locale`'s, else the browser's.
  - `timeZone` shows Home Assistant's time zone when the device is elsewhere.
  - `locale` sets the language.
  - `now` freezes it for stories.
