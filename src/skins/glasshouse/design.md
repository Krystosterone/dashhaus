# Glasshouse: design rules

Glasshouse (`glasshouse/`, the Lovelace card `custom:dashhaus-glasshouse`) is a house seen at night through tinted
glass, after `reference.png`: a near-black teal page lit by a cyan glow from the top right, smoked-glass panels with
a hairline edge and a faint top sheen, big light numerals in Plus Jakarta Sans, and **one** cyan accent that glows
where something is on: a lit lamp's switch and glyph, the thermostat's dial, a locked door's shield, today's bars.
Everything else is ink, muted ink and glass. Glow is never the only signal: every lit thing also says so in words
(On, 55%, Heating, Locked), and a warning carries a `!` marker and a word, not just the warm edge.

What it keeps from the skin rules: colours only from `styles/tokens.css`; the theme on `data-glasshouse-theme`; a
card's height is its footprint's alone (236 px standard, 76 px compact), never its state's; motion only on
`transform`, `opacity` and colours with the `--glasshouse-ease-*` tokens; hover only under the fine-pointer media
query; every control on `usePress`/`useSlider` with `touch-action: manipulation`, no selection and press feedback on
`:active`; unavailable reads as a dashed edge, a dash and the word "Unavailable".

## Palette

All in `styles/tokens.css`, by role. Dark is the look; light is the same glasshouse by day.

| Token | Dark | Light | Role |
| --- | --- | --- | --- |
| `--glasshouse-page`, `-page-deep` | `#040b0d`, `#071517` | `#dde9ea`, `#c9dcde` | the page, deepening upward |
| `--glasshouse-glow-a`, `-glow-b` | cyan 26 %, blue 22 % | cyan 30 %, blue 16 % | the page's light: radial glows, never on a card |
| `--glasshouse-card` | teal glass 66 % | frosted white 62 % | a panel, over `backdrop-filter: blur(20px)` |
| `--glasshouse-card-solid` | `#0d1b1e` | `#f3f9f9` | the details dialog and the status row (must stay legible) |
| `--glasshouse-card-muted` | 7 % ink | 7 % ink | insets: glyph chips, buttons, forecast tiles |
| `--glasshouse-edge`, `-sheen` | 15 % cyan-white, 7 % white | 85 %, 70 % white | the hairline edge and the top-of-panel sheen |
| `--glasshouse-ink`, `-ink-muted`, `-ink-faint` | `#ebf7f7`, `#93abae`, `#5e7477` | `#0b2125`, `#4a666a`, `#7f979a` | figures and names; labels; axes and dashes |
| `--glasshouse-line`, `-track` | 13 %, 14 % | 15 %, 14 % | dividers; recessed grooves (switch off, bars ahead) |
| `--glasshouse-accent`, `-accent-2` | `#34dbec`, `#1f8fe6` | `#0896aa`, `#1d63cf` | on; the cyan-to-blue of bars, dial and slider |
| `--glasshouse-accent-ink`, `-knob` | `#022126`, `#f4fdfe` | white, white | ink on accent; knobs and thumbs |
| `--glasshouse-glow` | cyan 42 % | cyan 28 % | the halo around anything on |
| `--glasshouse-good`, `-warm`, `-warn` | `#5be38f`, `#ffb054`, `#ff7a6b` | darker versions | "Good" air; a sun, a jammed lock, gusts; hazardous air, a failed command |

There is one strength of accent. Warm is for attention and the sun, never for "on".

## Parts

All in `shared/ui.tsx` and `shared/ui.css`; restyle them there, not per card.

- **GlasshouseCardFrame**: the glass panel. A head (round glyph chip, the name that opens the details, `area · state`
  and an optional control at its end), then the card's own `face` and a foot of `actions` in standard; the head alone
  in compact, with the `summary` value before the control. `lit` fades in a cyan glow from the glyph's corner (opacity
  only) and lights the glyph; `alert` gives a warm edge and the `!` marker. Its details are a native dialog on smoked
  solid glass, a bottom sheet under 600 px, holding guarded actions' question or keypad.
- **GlasshouseSwitch**: the reference's pill toggle. A recessed track; on, it fills cyan with a halo and its knob slides
  over on `transform`. A latching button (`aria-pressed`) with a 44 px hit area.
- **GlasshouseStep**: round − and + buttons for a setpoint.
- **GlasshouseSlider**: a recessed groove with a cyan-to-blue fill and a glowing thumb, on `useSlider` (brightness).
- **GlasshouseAction**: a raised glass pill button; latched or primary ones fill cyan.
- **GlasshouseBars**: the reference's energy chart: today as 24 hourly bars, cyan to blue, hours ahead as faint stubs,
  unavailable hours as dashed stubs, the current hour with a halo, an axis at 00/06/12/18.
- **GlasshouseChip**, **GlasshouseStat**, **GlasshouseFacts**: a small tag ("47 %"), a label over a figure, and the
  details' term/value list.
- **GlasshouseConfirm**, **GlasshouseKeypad**: the guarded action's question and code pad, in the details.

## Dashboards

`dashboards/`: the page glows from two radial lights over a teal-black gradient. The header is a top bar, the
dashboard's title as an uppercase tracked wordmark with a glass-house mark (one lit pane), and the nav as glass pills
with a glyph picked from each destination's words (house, thermometer, bulb, shield, bolt); the current pill is a lit
pane. Under it, a greeting for the time of day ("Good evening") over "Welcome home · <date>" (or the YAML's
`subtitle`). The rejected-command row floats in a dock at the foot of the view.

The automatic layout (`lovelace/auto.ts` → `glassRows`) is by function, as the reference is, not by area:
**Overview** (the weather two tracks wide, then thermostats and locks), **Rooms** (one air card per room), **Devices**
(every light and switch as a compact row with its switch, ordered by area). A kind with no row of its own gets a row
per area after them. Rows are on 260 px tracks, four at most, one column on a phone. YAML `rows`/`cards` work as in
any Dashhaus skin. YAML `theme: auto | dark | light` (default `auto`, Home Assistant's mode); the deploy config sets
`dark`, the reference's look. Without a `title` the page is called "Home".

To look at it: `npm run snapshot` (the sample house), `node preview/gallery-shot.js <dir>` (every card on
`@dashhaus/core`'s seeds and worst cases, at their fixed clock, dark, light and phone; also `npm run preview` then
`/gallery.html`), and `node preview/deployed.js <url> <dir>` (the deployed dashboard and three details dialogs).
On this machine set `CHROMIUM_PATH=/opt/pw-browsers/chromium`.

## Weather

The reference's welcome panel. The sky drawn big (a warm glowing sun, a moon, a frosted cloud, cyan rain or snow, a
warm bolt), the temperature as the page's biggest numeral with today's range under it; with two tracks, the next five
hours as small glass tiles, or the condition and "feels like" right-aligned when there is no forecast. A row of stats:
humidity, wind with its compass point, and air quality in green ("Good") or warn when it is poor (or "feels like"
without an AQI sensor). A weather warning (gusts, air, UV) gives the warm edge and the `!`. Details: the five-day
forecast and every reading. Read-only: why it leads the Overview is that it is what you check first, as in the
reference.

## Climate

The reference's dial: a half ring of 41 ticks lit cyan-to-blue up to the room's temperature between the unit's min and
max, a glowing knob at the setpoint, and the room's temperature big in the middle over "Current temperature". Under
it, "Set to 21.5°" between − and + (a step of the unit's own size; a range or no setpoint shows the words only). The
power switch at the head. Lit while it actually heats, cools, dries or fans, not merely while on, so the glow means
energy is being spent. Sub line: what it is doing ("Heating") or its mode. Details: a bigger dial, the steps, the mode
buttons (the current one latched), today's running hours as bars, and the facts.

## Light

The reference's favourite-devices row: in compact, glyph, name, `area · state`, the brightness and the pill switch.
Standard: the brightness big over a glowing level line and "On since 10:31 · 5h 54m today". Lit while on. Details:
the brightness slider (dragging to 0 turns it off), today's hours on as bars, and the facts. A light without
brightness shows On/Off.

## Lock

The reference's security panel: a shield in a glass tile that glows cyan while locked (a check), dim while unlocked
(a bar), warm while jammed; beside it the state in big words and "Door secured / Door not secured / Check the door"
with when. Only the action that changes the state is offered: Lock when it is not locked, "Unlock…" when it is (it
always asks first, or opens the keypad when the lock wants a code), and "Open…" for a lock that unlatches. The battery
is a chip at the head, warn at 15 % or less.

## Sensor

The reference's energy panel, for a room's air: the temperature big, the humidity as a cyan chip with a drop, today's
low and high, and today's temperature as 24 glowing bars filling the rest of the card. A humidity-only sensor shows
its humidity in the same place. Read-only, so its head has no switch. Details: the figure, bigger bars, humidity,
battery and when it last reported.

## Toggle

A switch or a mode (`switch.*`, `input_boolean.*`): a power glyph, the pill switch at the head, On or Off big with
since when (or "On until 07:00"), and today's hours on as bars. Lit while on. In compact it sits in Devices beside the
lights, because in the reference a fan and a lamp are both just favourite devices with a switch.
