# Titan: design rules

Titan draws a Home Assistant dashboard as a starship console, after `reference.png`: a black page held in a slate
frame of **elbows** (a thick vertical bar that bends into a horizontal one through a wide outer curve and a tight inner
curve) and **bars**. Inside it, everything is a flat rectangle: **keys** with their words in condensed capitals at the
bottom right and a small square marker at the top left, **ruled bars** with a tick scale over a recessed well, and the
**dot strip**, a run of white and grey dots in a dark segment. Colour is scarce and means something. Salmon is what
is on or running, teal is what is read or cooled, slate is at rest, and red is an alert and nothing else. Nothing is
rounded except the elbows, section caps and fader thumbs. There are no shadows, gradients, icons or card boxes. A card
is its own small elbow, open on the page.

The skin is in `titan/`. Every colour is a token in `titan/styles/tokens.css`. The parts are in `titan/shared/`, the
page is in `titan/dashboards/` and each card is in `titan/cards/<domain>/`.

## Palette

Dark mode is the reference. Light mode is the same console on a pale bulkhead. Every value below is sampled from the
reference unless noted.

| Token | Dark | Light | Role |
| --- | --- | --- | --- |
| `--titan-page` | `#000000` | `#dfe1e7` | the page, and the gap between blocks |
| `--titan-frame` | `#52596e` | same | elbows and bars, a resting card's elbow |
| `--titan-frame-deep` | `#2f3749` | same | the rail's run, section bars, fact labels |
| `--titan-key` | `#6d748c` | same | an idle key, a gauge's label block |
| `--titan-key-soft` | `#9aa0b4` | same | a key's lighter step: hover, a `frame` key that is lit |
| `--titan-key-off` | `#1e2229` | `#b4b8c6` | a key that can't act (unavailable) |
| `--titan-coal` | `#1e2229` | `#c4c8d4` | recessed segments: the dot strip, a gauge's well, count blocks |
| `--titan-on` | `#ff977b` | same | **on**: a light, a switch, heating, an unlocked door, the current destination |
| `--titan-on-dim` | `#955747` | same | rust, kept for an hour partly on (unused by the cards so far) |
| `--titan-cool` | `#2a7193` | same | **read**: sensors, weather, cooling |
| `--titan-datum` / `-ink` | `#1c3c55` / `#5fb6dc` | `#c6d6e0` / `#164a63` | a reading's data block (the reference's "82-549") |
| `--titan-alert` | `#e7442a` | `#d63a22` | **alert**: jammed, poor air, a rejected command; always with words |
| `--titan-title` | `#ff977b` | `#a8462e` | the salmon headline; darkened in light mode so it reads on pale |
| `--titan-ink` / `-muted` | `#e4e5ea` / `#8a90a4` | `#11131a` / `#4b5163` | words on the page |
| `--titan-dot` / `-mid` / `-dim` | white / grey / dark | inverted | the dot strip's lit, part and dark hours |
| `--titan-thumb` | `#9b9da2` | `#f4f4f6` | a fader's oval |

The four colour roles are `on`, `read`, `idle` and `alert`, plus `gone` for unavailable. They reach a card as
`data-tone` and become `--tone`, `--tone-ink` and `--tone-text` (`shared/ui.css`). A card picks a role and never a
colour. Salmon is never used for decoration. A key that is lit but at rest (a lock's LOCK while locked, a switch's OFF
while off) lights pale (`--titan-key-soft`), not salmon, so "on" keeps one meaning.

**Type** is Antonio, a condensed grotesque (SIL OFL 1.1), set in capitals throughout. Its Lovelace card carries its own
woff2 files, inlined from `@fontsource/antonio`, and hands them to the page as a blob stylesheet (`shared/surface.ts`).
It needs no Google Fonts and no network, because Home Assistant is often on a home network with no route out. Big
figures use tabular numerals.

**Motion**: only transforms, opacity and colours, at `--titan-press` (110 ms) for keys and `--titan-close` (220 ms) for
state changes, eased by `--titan-ease-*`. Keys scale to 0.96 on `:active`. Fills grow on `scaleX`. The lock's bolt
slides on `translateX`. Hover is only under `(hover: hover) and (pointer: fine)`. Reduced motion cuts every transition
to 1 ms.

## Parts

All of them are in `shared/ui.tsx` and `shared/ui.css`. Restyle them there, never per card.

- **Card frame** (`TitanCardFrame`) is a fixed 196 px high grid. It has a 52 px **elbow side** in the card's role
  colour, rounded at its outer corners and carrying the card's **plate**: its two-letter code and a stable registry
  number hashed from the entity id ("LT 67-997", the reference's "36-212" keys). The side bends into the **elbow bar**
  through an inner corner drawn with a radial gradient. The bar ends in the **dot strip**. Under the bar come the name
  (it opens the details) set right in capitals with the area below it, then the **readout**: a big figure with its
  unit set small, and the status line in the role's text colour. Below that sits the gauge row (22 px), and the
  bottom row of keys or data blocks (44 px). The height never changes with state. Unavailable turns the elbow into a
  dashed outline, the readout into a dash and the status into the word "Unavailable".
- **Compact** footprint (48 px): the reference's key pair. A value block in the card's role colour sits beside a lilac
  name key that opens the details.
- **Key** (`TitanAction`): a flat rectangle, its words at the bottom right, with a 6 px page-coloured marker top left
  that says "press me". Tones are `key` (lilac), `frame`, `cool` and `confirm` (salmon). `aria-pressed` lights it.
  It is at least 44 px tall and built on `usePress`, with no selection, no tap highlight and `touch-action: manipulation`.
- **Key group** (`TitanKeyGroup`): a dark label block, then one key per value with the current one lit. It is used for
  a thermostat's modes.
- **Data block** (`TitanDatum`): a reading in the key row. It has no marker because it can't be pressed. It is deep
  blue with cyan words, and red only when it is the alert.
- **Gauge** (`TitanGauge`) and **fader** (`TitanFader`): the reference's UPSILON/THETA bars. Each has a label block, a
  tick scale (every 10 %, minor every 2.5 %) over a coal well, a fill in the role colour and the value set right. The
  fader adds the grey oval thumb and is built on `useSlider`: tap anywhere, drag, or use the keys through a hidden
  range input. It leaves vertical swipes to the page.
- **Dot strip** (`TitanDots`): today, one dot an hour. A white dot ran hard, grey ran part way, a dark dot is nothing,
  a ring is unavailable and an hour still ahead has no dot. The current hour takes the card's colour. In the details
  it grows and gets an hour scale.
- **Facts** (`TitanFacts`): the details' key pairs, a dark label block set right and its value.
- **Confirm and keypad** (`TitanConfirm`, `TitanKeypad`): a guarded action's question or code, in the details, on
  `useGuardedAction` and `useKeypad`. Cancel is focused first. Typing the code is the confirmation.
- **Details** (`CardDialog`): a console panel. A full-height elbow in the card's colour carries the plate, its bar runs
  across the top, and the name is a salmon headline set right with CLOSE as a frame key. Then come the readout at
  64 px, the gauge, the keys, anything the card adds (the mode keys), today's strip with its summary, and the facts.
  On a phone it is a bottom sheet with a 28 px elbow.

## Dashboards

`dashboards/layout.tsx` and `dashboard.css` draw the reference's frame around the rows:

- The **top elbow** (136 px wide, 68 px outer bend) carries the day as a build stamp ("2026.NOV.05"). It turns into
  the **top bar**, which ends in a decorative dot pattern.
- The **headline** sits right under the bar: the title in salmon capitals set right ("EPS POWER DISTRIBUTION
  STATUS"), the date under it, and the time big at the left when `show_time` is on. The deploy config turns it on.
- The **rail** under the elbow holds the destinations as a column of keys (`NavBar.tsx`). The current one is salmon
  and the rest step through lilac, pale and slate, so the column reads as blocks. A dark run continues down to the
  **bottom elbow**, which turns into the **bottom bar**. The footer above the bar reads like the reference's "U.S.S.
  TITAN • NCC-80102-A" but says something true: "HOME · 4 SECTIONS · 14 CARDS".
- A **section** has a rounded cap, its title, a bar running across and a count block ("05"). Its cards sit on tracks
  at least 250 px wide, at most four across.
- At 900 px the rail narrows to 104 px. On a phone (≤ 640 px) it is a 22 px bar, the elbows tighten, the cards go to
  one column and the destinations dock at the bottom as a scrolling row of keys.
- The rejected-command row (`lovelace/TitanActionStatus.*`) docks at the bottom centre as an alert panel: a red
  block, the words, and Retry and Dismiss keys.

## Light

It shows the light's brightness as the big figure ("90 %"), or ON or OFF for a light without brightness, with "On
since 15:28" under it. The fader sets the brightness, and a tap on it while the light is off turns it on at that level,
because brightness is what you come to a light for. POWER latches it. The elbow is salmon while on and slate while off,
so a row of lights reads at a glance from across the room. The dot strip is the hours it was on today. Details add the
colour temperature or hue where it has one, and since when.

## Sensor

It shows a room's temperature as the big figure, comfort in words ("Comfortable") and humidity on the ruled gauge. A
reading has nothing to press, so its bottom row holds data blocks instead of keys: the trend over the last hour and the
battery, which turns red with "Battery low" at the warning marker. The elbow is teal because a reading is not a thing
that is on. The dot strip is today's temperature curve, brighter where it was warmer, and the details give today's
low and high.

## Climate

It shows the room temperature as the big figure and what the unit is doing towards what ("Heating · set 21.5°"). The
SET fader moves the setpoint in the unit's own steps and range. Below it come POWER and a humidity block where the unit
reports one. The elbow is salmon while heating, teal while cooling and slate while idle or off, and the words always
say which, so colour never carries it alone. The details add every HVAC mode as a key group, the preset, the fan mode,
and the hours it ran today on the dot strip.

## Lock

It shows the state as a big word (LOCKED, UNLOCKED, JAMMED) and a bolt drawn on the ruled bar. The bolt sits to the
right while locked, to the left while unlocked, and in the middle while moving or jammed. LOCK is a key that lights
pale while locked. UNLOCK… and OPEN… (where the lock can unlatch) ask first in the details, on the question or on the
keypad when the lock wants a code. They never act on one tap. Unlocked is salmon (active), not red, because an unlocked
door is a state, not an alarm. Jammed is the one red alert, with "Jammed" at the warning marker.

## Toggle

It is a switch or an `input_boolean` mode. It shows ON or OFF as the big word, a segmented rail that fills while on,
and two keys, OFF and ON, with the current one lit. A press on the other key switches it, so the key you press names
the state you get. The dot strip is the hours it was on today.

## Weather

It shows outside as a reading. The temperature is the big figure, the sky and "feels like" are in words, and humidity
is on the gauge. Wind (speed and compass) and air quality or UV are data blocks. The elbow is teal. When the weather is
worth acting on (poor air, strong gusts, high UV), the elbow turns red and the warning is printed at the marker. The
dot strip is today's temperature, and the details carry dew point, pressure, gusts and every warning.
