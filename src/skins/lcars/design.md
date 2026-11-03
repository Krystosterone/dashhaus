# LCARS skin: design rules

The skin is after the look of LCARS, the Star Trek: The Next Generation computer consoles. It is built from flat
blocks of pastel colour: bars, pills and "elbows", where a vertical rail curves into a horizontal bar. Words are
condensed capitals, in black on the colour or in colour on the page. There are no shadows, gradients, outlines or
icons, and colour, shape and words carry all the meaning. A home dashboard should read like a starship status
display, while still working like a dashboard: every reading is legible at a glance, every control is a real
44 px+ button, and nothing important depends on colour alone. The skin lives in `lcars/`. The rules below describe it
as it is there now. Its own `AGENTS.md` covers the mechanics (the build loop, `npm test` and deploying).

## Palette

Every colour is a token in `lcars/styles/tokens.css`. No other CSS file may contain a colour literal; `npm test`
enforces this. There are three token blocks, all on `:root`, which the bundle turns into the card's host. The first
is the light theme. The other two are the same dark theme, applied when the host has `data-lcars-theme="dark"` or,
without that attribute, when the system prefers dark. Home Assistant's dark mode sets the attribute, through
`lovelace/card.tsx`.

**Two themes, one look.**
- **Dark** is the canonical console: a black page, the classic TNG pastels, and warm cream text.
- **Light** is a "daylight" console, our own invention with no on-screen reference: a warm off-white page (`#f2ede3`),
  each hue a step deeper so black text on it stays readable, and darker text-only hues for coloured words on the page.

**Page and words**

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `--lcars-page` | the page, and the gaps that cut bars into segments | `#f2ede3` | `#000000` |
| `--lcars-card` | a card's inner window (the same as the page, on purpose) | `#f2ede3` | `#000000` |
| `--lcars-card-muted` | unlit segments of a meter | `#e4ddd0` | `#14121c` |
| `--lcars-ink` | text on the page; focus outlines | `#17130f` | `#ffdcb0` |
| `--lcars-ink-muted` | secondary text: state words, readout labels, dates | `#5a5068` | `#a9a3d6` |
| `--lcars-line` | the outline of the empty dashboard (dashed) and of a config error (solid) | `#b9afc4` | `#4a4766` |
| `--lcars-accent` | a pressed card title | `#d97a00` | `#ff9900` |
| `--lcars-warn` | the headline of a rejected command | `#b3260f` | `#ff5a3c` |
| `--lcars-backdrop` | behind the details dialog | 55% warm black | 72% black |

**Bars.** Black text (`--lcars-on-bar`, `#000000` in both themes) sits on every one of these.

| Token | Used for | Light | Dark |
| --- | --- | --- | --- |
| `--lcars-orange` | a light that is on, a pressed Toggle, the body elbow, the dialog's name bar | `#e08300` | `#ff9900` |
| `--lcars-off` | a light that is off, an unpressed button | `#9f98c4` | `#8f8fc7` |
| `--lcars-ice` | sensor cards, every fourth section | `#6aa5dc` | `#99ccff` |
| `--lcars-lilac` | the header elbow, the dialog's body bracket, every third nav button | `#b67fb6` | `#cc99cc` |
| `--lcars-violet` | nav buttons, every second section | `#a77fe0` | `#cc99ff` |
| `--lcars-blue` | nav buttons, the rail's foot, every third section | `#7f7fe6` | `#9999ff` |
| `--lcars-peach` | bar segments, the dialog's Close pill, every first section, hover on a pressed button | `#e8875a` | `#ff9966` |
| `--lcars-sunflower` | bar segments, the current nav item, hover and press on buttons | `#e8a860` | `#ffcc99` |
| `--lcars-tan` | the rail's long filler block | `#c8a27c` | `#d9b28c` |
| `--lcars-red` | the "Alert" cap and border of a rejected command | `#d4553f` | `#ee5544` |
| `--lcars-dim` | anything unavailable: stripes, disabled buttons | `#a39cae` | `#55526b` |

**Coloured words on the page.** Big readings, section names, the header title and fact labels use these, never a
bar token. In dark mode they equal the bar hues. In light mode they are much darker, because a pastel on cream fails
contrast.

| Token | Light | Dark |
| --- | --- | --- |
| `--lcars-text-orange` | `#9e4c00` | `#ff9900` |
| `--lcars-text-blue` | `#3f3fa8` | `#9999ff` |
| `--lcars-text-lilac` | `#7a3f7a` | `#cc99cc` |
| `--lcars-text-ice` | `#1d5c91` | `#99ccff` |

**Rules.**
- **Never put coloured text on a bar.** Text on a bar is always `--lcars-on-bar`.
- **Use a text hue for coloured words on the page.** A new bar hue that will also colour words needs a matching
  `--lcars-text-*` token in all three blocks.
- **Unused template tokens:** `--lcars-shadow` (set to fully transparent, since LCARS has no shadows) and
  `--lcars-accent-ink` are left over from the template and drawn by nothing. Leave them, or remove them along with
  any reference.

**Type.** The font is Antonio from Google Fonts (`LCARS_FONT_HREF` in `shared/surface.ts`). It is the closest freely
available face to the condensed lettering on the show. The fallbacks are Arial Narrow and Roboto Condensed.
Everything is uppercase with positive letter-spacing: about 0.03em on large type, 0.06–0.14em on small labels.
Numbers use tabular figures so readings don't shift as they change.

**Motion.** Only colours and `transform` animate (`--lcars-press` 120 ms, `--lcars-close` 220 ms, on the two easing
tokens). Under `prefers-reduced-motion`, everything drops to 1 ms and press scaling is off.

## Parts

All in `lcars/shared/ui.tsx` and `ui.css`. Restyle them there, never per card.

**The card frame (`LcarsCardFrame`): a bracket.**
- **The shape.** The `<article>` is the coloured shape: a rail down the left (40 px), a bar along the top (24 px) and
  a thinner one along the bottom (10 px), with a 34 px outer curve on the left. Inside it, `.lcars-card-panel` is the
  window, in the page colour, with a 20 px inner curve. The right side is open, as LCARS brackets are.
- **The slits.** Two page-coloured slits (`::before` on the top bar, `::after` on the bottom) cut the bars into
  segments.
- **The hue.** It comes from a local `--lcars-hue` (bar colour) and `--lcars-hue-text` (big reading colour), set by
  `data-card` and `data-state` on the article. A new card sets both for its states in its own CSS.
- **On the bars.** The area name sits on the top bar in black capitals, near the right end (`.lcars-card-tag`). A
  decorative panel number such as `52-295` sits low on the rail (`.lcars-card-code`); `lcarsCode()` derives it from
  the name. Both are `aria-hidden`. The real area for screen readers is the visually hidden `.lcars-area` in the panel.
- **In the window.** It has three rows:
  - the name (a 22 px button that opens the details) and the state word under it, with the big reading
    (`.lcars-summary`, 42 px) on the right;
  - an optional `extra` readout, which spans the width;
  - the action pills, right-aligned.
- **The height never changes.** A standard card is 176 px and a compact one 72 px, whatever its state or whether it
  draws an `extra`.
- **Unavailable reads without colour.** The bracket is struck with diagonal `--lcars-dim` and page stripes, the state
  word reads "Unavailable", and the reading is a dash. The card omits its `extra` and the frame hides the panel
  number. The area tag gets a solid dim backing so it stays legible over the stripes.
- **Compact footprint.** The rail shrinks to 22 px and the bars to 8 px. Only the name, the area (now shown under
  the name) and a 30 px reading remain. Actions, readouts, state word, tag and number are hidden.

**Actions (`LcarsAction`): the LCARS button.**
- **Shape and label.** A flat pill at least 112 × 44 px, with black capitals in its bottom-right corner (as on the
  consoles, not centred).
- **States.**
  - Unpressed: `--lcars-off`.
  - Pressed (`aria-pressed="true"`): `--lcars-orange`.
  - Being pressed: `--lcars-sunflower` and a 0.96 scale.
  - Disabled or unavailable: `--lcars-dim` at 70% opacity.
- **Input.** Hover colours only under `(hover: hover) and (pointer: fine)`. Focus is a 3 px ink outline. Build any
  new control on `usePress` so it gets `touch-action`, no text selection and no tap highlight.

**Readouts.** These are the small facts on a card's face.
- **On the card face:** a muted uppercase label (13 px, wide tracking) beside a value. Light uses this pattern in its
  meter; the sensor's version (`.lcars-sensor-readouts`) gives the value 22 px, in ink.
- **In the details:** `.lcars-facts`, a two-column `<dl>` with labels in `--lcars-text-blue` and values in ink. A
  trailing `.lcars-facts-note` holds one muted line about history.
- **No new data.** Details show only what the card's model already holds.

**The details dialog.**
- **The head.** The native dialog from `CardDialog`, in page colour with no border. Its head is two blocks side by
  side:
  - an orange name bar with a 30 px top-left curve, holding the name (24 px) and the area in black;
  - a peach Close pill rounded on its right end.
- **The body.** A bracket: a 28 px lilac rail down the left curving into a 10 px bar along the bottom. Inside, the
  state is the headline (30 px, `--lcars-text-orange`), followed by the card's facts. The dialog does not repeat the
  state as a fact row.
- **On a phone** (≤ 600 px) it becomes a bottom sheet that slides down to close.

## Dashboards

`lcars/dashboards/`: the page is a console made of two elbows stacked 8 px apart.
- **How an elbow is drawn.**
  - The outer curve is a border radius on the vertical block.
  - The inner, concave curve is a fillet: a square in the opposite colour's corner, painted with a `radial-gradient`
    (transparent inside the circle, the elbow hue outside).
  - Bars are four flex segments split by 6 px page-coloured gaps. The first and last match the elbow, the middle two
    are peach and sunflower, and the last ends rounded.
- **Header (`Header.tsx`): an "L" in lilac.**
  - The cap fills the left column and curves (64 px) into the bar under the title. On desktop, the cap shows a
    decorative stardate in black: years since 1946 in thousands, plus the year's progress, for example `80837.9`.
  - Right of the cap, the title is right-aligned in `--lcars-text-orange` at 40–84 px. On its left are the date (muted,
    16 px) and, when `showTime` is set, the clock in `--lcars-text-blue`.
  - The header is drawn only when the dashboard has a title.
- **Body (`layout.tsx`): a "Γ" in orange.**
  - A bar runs along the top and curves (64 px outer, 34 px inner) down into the rail. The cards sit in the window
    those make.
  - The rail is a column of blocks with 6 px gaps: the orange cap labelled "LCARS", then the nav, then a tan filler
    that grows to the page's height (labelled "Online"), then a blue foot.
  - Labels sit in the bottom-right of each block, the LCARS convention.
- **Nav (`NavBar.tsx`), desktop.**
  - The nav lives in the rail: full-width blocks at least 52 px tall, cycling violet, blue and lilac.
  - The current destination turns sunflower and gets a page-coloured notch on its left edge, so it reads without
    relying on colour.
  - The rail is not sticky, so on a long page the nav scrolls away with it.
- **Rejected-command alert (`lovelace/LcarsActionStatus`).** The rail is too narrow for it, so it sits as the last
  block of the main area, sticky to the bottom of the view. It has a red pill cap reading "Alert", a red border, an
  uppercase headline in `--lcars-warn`, and Retry and Dismiss as buttons with the `lcars-action` class, so they look like the action pills.
- **Sections.**
  - Each opens with a bar that has its name cut in: a rounded-left cap, the name (28 px, uppercase), then a bar that
    runs to a rounded right end. A section note goes to the far right.
  - Colours cycle per section: peach, violet, blue, ice, each with its matching text hue.
  - A section without a title is labelled "Other", so the console never has an unlabelled bar.
  - The card grid fits columns of at least 280 px with 10 px gaps. The YAML's `columns:` is a most, and each card's
    `width:` and `column:` place it on those tracks (the shared layout).
- **Phone vs desktop.** Under 640 px:
  - The rail narrows from 168 px to 26 px and becomes pure decoration (labels and stardate hidden).
  - The elbows shrink (30 px outer, 18 px inner, 14 px bars).
  - The header stacks the title above the date, right-aligned.
  - Sections and grids collapse to one column.
  - The nav leaves the rail and docks along the bottom of the viewport: a strip of 48 px pills on the page colour,
    under a 6 px orange rule, scrolling sideways. The current pill is marked with a 3 px underline instead of the
    notch.
  - The page gets bottom padding, and the alert lifts 84 px, to clear the dock.

## Light

`lcars/cards/light/`. A light's question is "is it on, and how bright?", so the card answers that first and in the
console's own idiom.

- **The hue is the state.** On is orange, the console's "active" colour. Off is the cool periwinkle `--lcars-off`.
  Unavailable is the striped dim. You can scan a room's lights by colour alone, but the state word and the reading say
  the same thing in text.
- **The big reading** is the brightness when on (`55%`). A light that reports no brightness shows `ON`, and an off
  light shows `OFF`. A percentage is the one number people act on.
- **The intensity meter** (the `extra`) is a 12-segment LCARS bar graph labelled "Intensity". Segments light in the
  card's hue up to the brightness; an on light always lights at least one segment, and one with no brightness reading
  lights all twelve. Off, every segment is unlit. It's the console way to show a level, and it reads faster than the
  number from across a room. It has `role="img"` and an aria-label such as "Intensity 55%".
- **The action** is one Toggle pill, pressed (orange) when on. It is shown only when the adapter passes `onToggle`.
- **The details** show intensity, colour temperature, last change, last contact and the entity id (labelled
  "Designation"), each only when the model has it. When today's history is loaded, a note adds "Active N min today".

## Sensor

`lcars/cards/sensor/`. A room's air: the card shows how warm it is and how humid, the two facts that decide whether
to act.

- **The hue is constant ice blue** whenever the sensor reports, because a sensor has no on or off. It changes only
  to the striped dim when unavailable. "Ok" is shown as the state word "Nominal", the console's word for it, and
  goes on the article as `data-state="nominal"`.
- **The big reading** is the temperature with its unit (`21.8°C`). A sensor with no temperature shows a dash.
- **The readouts** (the `extra`) are Humidity, always shown (a dash when there's none), and Power, the battery, when
  reported. These are companion entities on the same device. The automatic layout finds them with `roomSensors()`
  and passes them through `lovelace/auto.ts` and `registry.tsx` to `useHaSensor`. A YAML `cards:` list can't set
  them yet.
- **No actions:** a sensor is read-only, so the bottom row of the window stays empty and the height is unchanged.
- **The details** show temperature, humidity, power cell, last reading, last contact and the designation. When
  history is loaded, a note says hourly telemetry is logged. The card does not draw that history yet.
