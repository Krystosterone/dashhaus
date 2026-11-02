# Futura skin

Futura draws the house as a dark instrument console lit by two neon signals: every card is a bezelled panel led by a
ring gauge, with a mono readout and today as a segmented level meter. It lives in `src/skins/futura/`
(`@dashhaus/futura`), was created by `npm run new-skin -- futura`, and keeps every generated contract: the shared
entity models and `useHa<Name>` hooks, the card frame from `@dashhaus/dashboard/card`, fixed footprints, the
skin-local Card registry and `custom:dashhaus-futura`. The rules every skin keeps ([skins.md](skins.md#rules-every-skin-keeps))
hold; this page adds Futura's names and numbers.

## Direction

The reference is a control surface at night: a near-black navy panel, round dials ringed with ticks and lit arcs,
rounded bezels whose edges catch a glow, segment bar meters, and small technical labels. Futura takes from it:

- **Palette:** a deep navy-black console and two signals, cyan and amber, each with one meaning (below).
- **Type:** the system sans for names and words; the system mono for every figure, label and key, in tracked
  capitals at 9.5-11 px for labels, as the reference's panel legends.
- **Part shapes:** the ring dial (a 270° gauge with 24 hour ticks), the bezel (a raised rounded panel with an index
  tick on its top edge), the 24-segment meter, raised bezel keys and a sunk groove.
- **Page:** a faint 24 px instrument grid under a glow from the top, sections ruled by hairlines that start at a lit
  cyan index tick, a glowing mono clock, and a docked glass nav bar.

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

- **Dial** (`FuturaDial`): every card leads with one. Ticks round the rim, a 270° groove open at the bottom, the arc
  for the card's level on it (brightness, setpoint across the unit's range, humidity), and the domain glyph in a
  raised core. Lit, the arc and glyph glow; unlit, the arc stays at half strength; unavailable, the groove and core
  break into dashes and no arc is drawn.
- **Dial key** (`FuturaDialKey`): the dial as the card's switch, on `usePress`: latched with `aria-pressed`, named
  `Power, <name>`, pressed to 93 %, focusable and inert (`aria-disabled`) when unavailable.
- **Readout** (`FuturaReadout`): the figure in mono at 28 px (20 px compact, 44 px in details) with its unit small
  and muted beside it; a lit card's figure takes its tone with a halo.
- **Meter** (`FuturaMeter`): today in 24 segments with a label and a caption. Lit hours are tone bars at their
  strength, empty hours a faint stub, hours ahead dim stubs, an unavailable hour a dotted gap, and the current hour
  marked (a glow if lit, a full muted bar if not).
- **Key** (`FuturaAction`): a raised bezel key, mono capitals or a glyph; latched, it fills with its tone's dim and
  takes its tone; unavailable, it turns dashed and faint. **Stepper** (`FuturaStepper`): two glyph keys round the
  value they set.
- **Level** (`FuturaLevel`): a 24 px sunk groove inside a 44 px target, on `useSlider`, with ten floor ticks, a tone
  fill clipped to the value and a needle. Off, the fill and needle stay unlit at the last level; a tap turns the
  light on there (`reportUnchanged`).
- **Telemetry** (`FuturaStats`): mono caps labels over values. In the footer they sit in a row; in details
  (`facts`) they are a hairline grid of sunk cells.
- **Bezel** (`FuturaCardFrame`): the card. A raised panel with a sheen on its top edge and an index tick at its top
  left; its face is a grid of the dial, the area kicker, the name (which opens details), the state line and the
  readout, then the meter, then a 44 px footer of keys or telemetry.

## Glow

Glow means "giving off its signal now" and nothing else: a lamp lit, a thermostat actually heating or cooling, a
switch on. Readings (sensor, weather) never glow; their arc sits at half strength. Glow is never the only cue: the
state line says it in words, the dial key carries `aria-pressed`, and the arc and readout change too. A lit card
fades in a tone edge and halo on an `::after` layer (opacity only) and lights its index tick; a compact row keeps
the lit edge but only a close halo, so a room of lit rows stays readable. Urgency is said in alert ink, never with
more glow.

## Footprints

- **Standard:** 176 px. Rows: the 56 px dial with name and readout, today's meter, and the 44 px footer.
- **Compact:** 72 px. One row: the 44 px dial (still the switch), the name, the state line and the readout; the
  area, meter and footer drop out.
- **Narrow:** under 250 px of card width, a standard card puts the readout beside the dial, keeps the name, state and
  footer, and leaves the meter and area to the details.

State, value length and availability never change a height; heights never come from the viewport.

## Details

The name opens a console dialog (`CardDialog`): the area kicker and name with a mono **Close** key in a sticky head,
then a hero of the dial at 132 px (104 px on a phone) beside the 44 px readout and state, today's meter, the card's
own controls, and the telemetry grid with the entity id. On a phone it is a bottom sheet that drags down to close.

## Unavailable

A dashed bezel without its shadow, a broken dial without an arc, the readout `—`, the word `Unavailable` as the
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
tablet and wall-panel pages. The header puts the date or subtitle as a mono kicker over the title and the clock in
glowing cyan mono on the right, over a hairline. A section head is a cyan index tick, its title in mono capitals, a
hairline to the right and its note in muted mono. The nav bar is a glass strip of mono capitals; the current item
turns cyan with a glowing underline that scales in. The Lovelace card is `custom:dashhaus-futura`; without explicit
Cards or sections, it groups every supported entity by Home Assistant area.

Add a domain with:

```sh
npm run new-card -- light --skin futura
```

## Light

An amber dial key switches the light; its arc is the brightness. The readout is the brightness in percent, or `ON`
or `OFF` for a light that only switches; the state line adds the warmth in kelvin (or `Colour`), or the last
brightness while off. The footer is the brightness level when the light dims (it turns the light on from off),
otherwise warmth, time lit today and when it changed. Details: the brightness level, and brightness, warmth, warmth
range, colour, time lit today, last change and entity.

## Climate

The dial key switches the thermostat; its arc is the setpoint across the unit's range, its glyph the mode (flame,
snowflake, drop, fan or thermostat). It is amber in heat (or heating in heat/cool) and cyan otherwise, and glows
only while the unit is actually heating, cooling, drying or running its fan. The readout is the room temperature;
the state line the action and setpoint (`Heating · to 21.5°`, `Idle · holding 19–24°`). The footer is the target
stepper for a single setpoint, or low, high and humidity for a range, or mode, humidity and last change while off.
Details: the target stepper or the low and high steppers, the mode keys, and room, target, mode, action, humidity,
preset, fan, range, last change and entity.

## Toggle

A cyan dial key with the mode's own glyph (power, moon, bell off, volume off, guest, away, waves) switches it; the
readout is `ON` or `OFF`; the state line says until when. The footer is time on today, until and last change.
Details: what the mode does, and its state, until, how long it was set for, time on today, last change and entity.

## Sensor

A reading: the dial's arc is the humidity, the readout the temperature (or the humidity alone), the state line the
trend and comfort (`Rising · Comfortable`, `Steady · Outdoor`). It never glows. Today's meter scales the day's
temperatures between its low and high, which the caption states. The footer is humidity, battery (`8% · low` in
alert ink at 15 % or under) and last update. Details: today's humidity meter, and temperature, humidity, battery,
placement, last update and entity.

## Weather

A reading: the dial carries the sky, amber while the sun is up and out and cyan otherwise, its arc the humidity; the
readout is the temperature in whole degrees and the state line the condition. Today's meter is the day's temperature
with its low and high. The footer is feels-like, wind with its compass point (alert ink in strong gusts) and
humidity. Details: temperature, feels like, dew point, humidity, pressure, wind, gusts, UV and air quality (alert
ink past their warning levels), last update and entity.
