# Futura skin

> **A study.** Futura is a skin an agent built with the generators, kept to learn from and build on: not finished
> or polished, and not shipped in the Lovelace bundle or the deploy config. Its [README](README.md) says what that
> means and how to take it further ([skins.md → Studies](../../../spec/skins.md#studies)).

Futura draws the house as a dark instrument console lit by two neon signals: every card is a bezelled panel led by a
ring gauge, with a mono readout and today as a segmented level meter. It lives in `src/skins/futura/`
(`@dashhaus/futura`), was created by `npm run new-skin -- futura`, and keeps every generated contract: the shared
entity models and `useHa<Name>` hooks, the card frame from `@dashhaus/dashboard/card`, fixed footprints, the
skin-local Card registry and `custom:dashhaus-futura`. The rules every skin keeps ([skins.md](../../../spec/skins.md#rules-every-skin-keeps))
hold; this page adds Futura's names and numbers.

## Direction

The reference is a control surface at night: a near-black navy panel, round dials ringed with ticks and lit arcs,
rounded bezels whose edges catch a glow, segment bar meters, and small technical labels. Futura takes from it:

- **Palette:** a deep navy-black console and two signals, cyan and amber, each with one meaning (below).
- **Type:** Barlow, a low-contrast grotesk drawn after road and instrument lettering, for names and words;
  JetBrains Mono for every figure, label and key, in tracked capitals at 9.5-11 px for labels, as the reference's
  panel legends. Both come from Google Fonts (`shared/fonts.ts`): the Lovelace card links them as its `fontHref`,
  `.storybook/preview.tsx` links them for Futura's stories (the setup's `fontHref`), and the token stacks fall back to system faces offline.
- **Part shapes:** the ring dial (a 270° gauge on a scale of 25 ticks, major every sixth), the bezel (a raised rounded
  panel with an index tick on its top edge), the segment-ladder meter and the waveform trace, raised bezel keys and a
  sunk groove.
- **Page:** a faint 24 px instrument grid under a glow from the top, sections ruled by hairlines that start at a lit
  cyan index tick, a glowing mono clock, and a docked nav strip.

## Palette

Every colour is a `--futura-*` token in `styles/tokens.css`; no other file holds a colour.

- **Console:** `--futura-page`, `--futura-panel`, `--futura-panel-raised`, `--futura-panel-sunk`, `--futura-edge`,
  `--futura-edge-bright`, `--futura-sheen` (the top-edge highlight), `--futura-grid` and `--futura-page-glow`.
- **Ink:** `--futura-ink` for names and figures, `--futura-ink-muted` for labels and secondary words,
  `--futura-ink-faint` for ticks and empty hours only, never text.
- **Signals:** `--futura-cyan` is **live**: a switch that is on, cooling, a reading, the page's own clock and current
  nav item. `--futura-amber` is **energy**: something giving off light or heat (a lamp that is on, heat going in,
  the sun out). `--futura-alert` is a warning in words (a low battery, strong gusts), never a state and never a glow.
  Each signal has `-dim` (fills), `-glow` (halos) and `-ink` (text on a solid fill) companions.
- **Themes:** the console (dark) is Futura's default, on `:root` and `.futura-surface`, whatever the system scheme.
  The daylight values apply under `data-futura-theme="light"`, which the Lovelace card sets on its host from Home
  Assistant's light theme and Storybook's **Futura theme** toolbar sets on `<html>`. The attribute is Futura's own,
  so another skin's theme toolbar never re-colours it.

## Parts

All in `shared/ui.tsx` and `shared/ui.css`, on the `@dashhaus/core/primitives` hooks. A part takes a `tone`
(`cyan` or `amber`) and resolves it to `--futura-tone*` from tokens.

- **Dial** (`FuturaDial`): every card leads with one. A scale of 25 ticks over the 270° sweep (every sixth major), a
  groove open at the bottom, the arc for the card's level on it with the ticks under it lit in its tone, an optional
  needle for a second value on the same scale, and the domain glyph in a raised core. The arc always follows the
  card's figure: a lamp's brightness, a thermostat's setpoint (the needle its room), a reading's place between
  today's low and high. Lit, the arc, its ticks and the glyph glow; unlit, they stay at half strength; unavailable,
  the groove and core break into dashes and no arc or needle is drawn.
- **Dial key** (`FuturaDialKey`): the dial as the card's switch, on `usePress`: latched with `aria-pressed`, named
  `Power, <name>`, pressed to 93 %, focusable and inert (`aria-disabled`) when unavailable; a press and hold opens
  the card's details.
- **Readout** (`FuturaReadout`): the figure in mono at 28 px (20 px compact, 44 px in details) with its unit small
  and muted beside it; a lit card's figure takes its tone with a halo.
- **Meter** (`FuturaMeter`): today in 24 hours with a label and a caption, drawn two ways so they never read alike.
  `segments`, for time running (a lamp, a heater, a mode): each hour a ladder of 2 px cells lit to its strength
  (clip-path), empty hours a faint stub, hours ahead dim stubs, an unavailable hour a dotted gap, and the current
  hour full strength, or a hollow cell when idle, never a filled bar. `trace`, for a value over the day (a reading):
  a stepped line between the day's low and high, broken and dotted at gaps, with a dashed cursor at the current hour.
- **Key** (`FuturaAction`): a raised bezel key, mono capitals or a glyph; latched, it fills with its tone's dim and
  takes its tone; unavailable, it turns dashed with muted ink; at the end of its range (`atLimit`), it keeps its solid
  bezel and dims. **Stepper** (`FuturaStepper`): two glyph keys round the value they set; unavailable, the value reads
  `—`.
- **Level** (`FuturaLevel`): a 24 px sunk groove inside a 44 px target, on `useSlider`, with ten floor ticks, a tone
  fill clipped to the value and a needle. Off, the fill and needle stay unlit at the last level; a tap turns the
  light on there (`reportUnchanged`).
- **Telemetry** (`FuturaStats`): mono caps labels over values. In the footer they sit in a row; in details
  (`facts`) they are a hairline grid of sunk cells.
- **Bezel** (`FuturaCardFrame`): the card. A raised panel with a sheen on its top edge and an index tick at its top
  left; its face is a grid of the dial, the name (which opens details), its area in mono capitals, the state line and the
  readout, then the meter, then a 44 px footer of keys or telemetry. The name's hit area covers the whole copy cell
  (name, area and state), so details open from a 44-56 px target; the name carries `aria-haspopup="dialog"` and
  names the article.

## Glow

Glow means "giving off its signal now" and nothing else: a lamp lit, a thermostat actually heating or cooling, a
switch on. Readings (sensor, weather) never glow; their arc sits at half strength. Glow is never the only cue: the
state line says it in words, the dial key carries `aria-pressed`, and the arc and readout change too. A lit card
fades in a tone edge and halo on an `::after` layer (opacity only) and lights its index tick; a compact row keeps
the lit edge and an inner glow but no halo, so a room of lit rows stays readable. The halo's strength follows the
signal's (`glow`, a lamp's brightness), so a 3 % night light barely glows beside a ceiling at 80 %. Urgency is said in
words in alert ink, never with more glow and never in colour alone.

## Footprints

- **Standard:** 176 px. Rows: the 56 px dial with name and readout, today's meter, and the 44 px footer.
- **Compact:** 72 px. One row: the 44 px dial (still the switch), the name, the state line and the readout; the
  area, meter and footer drop out.
- **Narrow:** under 250 px of card width, a standard card puts the readout beside the dial, keeps the name, state and
  footer, and leaves the meter and area to the details.
- **Wide:** from 380 px of card width (a wall panel's column), the readout grows to 34 px, the name to 17 px and the
  state to 13 px, in the same rows, so it reads from across the room.

State, value length and availability never change a height; heights never come from the viewport.

## Details

The name (or a hold on the dial) opens a console dialog (`CardDialog`): the name over its area in mono capitals,
with a mono **Close** key in a sticky head,
then a hero of the dial at 132 px (104 px on a phone) beside the 44 px readout and state, today's meter, the card's
own controls, and the telemetry grid with the entity id. On a phone it is a bottom sheet with a grab handle that
drags down to close.

## Unavailable

A dashed bezel in the bright edge without its shadow, a broken dial without an arc, the readout `—`, the word `Unavailable` as the
state, and keys dashed, faint, focusable and inert. Today's meter keeps the hours seen before the gap and draws the
gap dotted; nothing is fabricated.

## Motion and touch

Only `transform`, `opacity`, `clip-path` and colours move, on `--futura-ease-out` and `--futura-ease-in-out` with
`--futura-press` (120 ms), `--futura-glow-in` (260 ms) and `--futura-close` (220 ms). Keys and the dial key shrink
on `:active`; the glow fades in; a level jump slides its fill and needle; the details rise and fade. Reduced motion
keeps every change and drops the movement. Hover lives only under `@media (hover: hover) and (pointer: fine)`.
Every control is at least 44 px, has `touch-action: manipulation` (the level `pan-y`, so a scroll never sets it),
no selection and no tap highlight.

## Dashboards

`FuturaPage`, `FuturaSection`, `FuturaColumns`, `FuturaCell`, `FuturaHeader` and `FuturaNavBar` compose phone,
tablet and wall-panel pages. The header puts the title over the date or subtitle in mono capitals, the clock in
glowing cyan mono on the right, over a hairline. A section head is a cyan index tick, its title in mono capitals, a
hairline to the right and its note in muted mono. The nav bar is a docked panel strip of mono capitals; the current item
turns cyan with a glowing underline that scales in. The Lovelace card is `custom:dashhaus-futura`; without explicit
Cards or sections, it groups every supported entity by Home Assistant area.

A rejected command rides the dock above the nav bar (or ends the page when there is none): a console panel with an
`--futura-alert` rule on its left, the failure in alert mono capitals and what to do in muted words, with Retry when
repeating the call is safe and Dismiss as Futura actions (`FuturaActionStatus`, on `useActionStatus`).

Add a domain with:

```sh
npm run new-card -- light --skin futura
```

## Light

An amber dial key switches the light; its arc is the brightness, and its halo is as strong as the light is bright. The readout is the brightness in percent, or `ON`
or `OFF` for a light that only switches; the state line adds the warmth in kelvin (or `Colour`), or the last
brightness while off. The footer is the brightness level when the light dims (it turns the light on from off),
otherwise warmth, time lit today and when it changed. Details: the brightness level, and brightness, warmth, warmth
range, colour, time lit today, last change and entity.

## Climate

The dial key switches the thermostat; its arc is the setpoint across the unit's range, its needle the room on the
same scale, its glyph the mode (flame,
snowflake, drop, fan or thermostat). It is amber in heat (or heating in heat/cool) and cyan otherwise, and glows
only while the unit is actually heating, cooling, drying or running its fan. The readout is the room temperature;
the state line the action and setpoint (`Heating · to 21.5°`, `Idle · holding 19–24°`). The footer is the target
stepper for a single setpoint, or low, high and humidity for a range, or mode, humidity and last change while off.
Details: the target stepper or the low and high steppers, the mode keys, and room, target, mode, action, humidity,
preset, fan, range, last change and entity.

## Toggle

A cyan dial key with the mode's own glyph (power, moon, bell off, volume off, guest, away, waves) switches it; the
readout is `ON` or `OFF`; the state line says until when, or since when. The footer is time on today, until and last change.
Details: what the mode does, and its state, until, how long it was set for, time on today, last change and entity.

## Sensor

A reading: the readout is the temperature (or the humidity alone), the dial's arc where it sits between today's low
and high, the state line the trend and comfort (`Rising · Comfortable`, `Steady · Outdoor`), or `No reading yet`. It
never glows. Today's trace steps through the day's temperatures between that low and high, which the caption states.
The footer is humidity, battery (`8% · low` in alert ink at 15 % or under) and last update. Details: today's humidity trace, and temperature, humidity, battery,
placement, last update and entity.

## Weather

A reading: the dial carries the sky, amber while the sun is up and out and cyan otherwise, its arc where the
temperature sits in today's range; the readout is the temperature in whole degrees and the state line the condition.
Today's trace is the day's temperature with its low and high. The footer is feels-like, wind with its compass point
(`· gusty`, in alert ink, in strong gusts) and humidity.
Details: temperature, feels like, dew point, humidity, pressure, wind, gusts, UV and air quality (alert
ink past their warning levels), last update and entity.
