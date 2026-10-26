# Field skin

A second skin, `src/skins/field/`, drawn after Teenage Engineering's EP–133 K.O. II: a flat light-grey body, printed labels, flat-topped keys, a thin fader with a round thumb, and a dark segment-style screen. It sits on the same entity models and Home Assistant hooks as orb (`useHaLight` and the rest); only the drawing differs. Stories are under **Field** in Storybook, with a **Finish** toolbar (Auto, Alloy, Black).

Status: the light is the first and only widget, with its detail panel. There is no Lovelace card or dashboard yet.

## Design rules

The every-skin hard rules in AGENTS.md apply. `src/skins/field/styles/rules.test.ts` checks the ones below that CSS can show.

- **Three parts, one meaning each.**
  - **Key** (flat-topped, just raised): press it. A key that can't be pressed lies flat. Its glyph is the domain's (a bulb for a light), so the key is also the row's identity.
  - **Fader** (a printed legend with a rule out to its end, a thin dark slot, a dotted scale, a round thumb): slide or set along it. A tap jumps the thumb; a drag follows the finger (`useTrack`).
  - **Screen** (always dark, in both finishes): read it, never press it. A pictogram and a big thin figure on the left, up to two meta lines on the right.
- **A lit LED says on.** The LED in a key's corner is the one sign that something is on (`--fd-led-lit`); the screen agrees, with a lit pictogram and a bright figure, or `OFF` in the dim screen ink.
- **Colour names a parameter**, the way a knob's colour names what it sets on TE's devices. `--fd-param-a`, orange, is a module's first parameter (a light's brightness): its fader thumb, the lit part of its screen pictogram, and its history on the meter, and nothing else. `--fd-param-b`, blue, is the second (a light's warmth), on its own fader and its own pictogram, a sun.
- **The screen speaks in fixed places**, like a segment display. Numbers keep their digit count, and the leading digits are unlit segments (`080%`), drawn by CSS so screen readers hear "80%". A pictogram is always there unlit, and lights up to its level from the bottom; a light's bulb keeps its base lit while on, so 3% still reads lit. No reading reads as blank segments (`---`).
- **Details open in a panel**, never by growing the module: tap the name (it carries a small arrow) or press and hold the key. The panel is the module's plate grown into a dialog: a centred panel on wider screens, a bottom sheet on phones that its header drags down to close (`useSheet`, shared with orb). Its screen is taller and carries a second channel on its right. Under the controls come groups, each under a printed legend: quick-level keys with their names printed beneath, a second fader in its own parameter colour, today as a 24-hour meter on a strip of screen, then the facts in small print.
- **Unavailable** blanks the screen, says `UNAVAILABLE` and when it was last seen on the meta line, and lays the key and fader flat and disabled (a grey thumb).
- **Type** is Archivo, a geometric sans, set wide (`--fd-wide`), upper-case for printed labels and names, and light for the screen's figure. Names are upper-cased by CSS, so the accessible name keeps its case. Storybook loads Archivo in `.storybook/preview-head.html`; without it the stack falls back to the system sans.
- **Keys** latch or act once. A latching key (power, a colour) has an LED; a key that acts once (a quick level) has none, so a lit LED only ever means on: the lamp, or the colour it is showing.
- **A lamp's own colour is data, not a signal.** The `--fd-lamp-*` tokens appear only as swatches: a square on each colour key, and the lens pictogram on the screen while the lamp shows that colour. The names and the hue each covers are shared with orb (`src/domains/light/color.ts`); each skin draws its own swatches.
- **Footprints:** `standard` is a 160 px module (header, screen, a 44 px control row); `compact` is a 64 px row (key, name and area, a fixed-width screen). The height never changes with state or entity type. Container queries simplify the inside at narrow widths.
- **Scoped tokens.** Every custom property starts with `--fd-`, including the easings (`--fd-ease-out`, `--fd-ease-in-out`), so field and orb can share a page. No colour outside `styles/tokens.css`. The page is a plain body, with no pattern.
- **Motion:** presses take `--fd-press` (120 ms) on `transform` and `box-shadow`; a fader jump moves its rail with `transform`; the pictogram fills with `clip-path`; the LED fades its colour. Reduced motion keeps colour and fill changes and drops the movement. Hover only under `(hover: hover) and (pointer: fine)`.

## From the exploration and the references

Kept from the exploration (`ha_01_universal_home_assistant_field_console.html`): the alloy and black finishes, the module plate, keys with LEDs, the dark screen, orange.

Changed after looking at TE's own product photos (OP–1 field, OP–XY, TX–6, EP–133 K.O. II): monospace became a wide geometric sans; orange moved from "on" to naming a parameter; keys and plates lost most of their depth; the striped fader thumb became a round one in a thin slot; the screen gained a pictogram; the fader gained a printed legend; the perforated page became plain.

Left out: screws, scanlines, speaker grilles, entity ids as labels, blur crossfades and staggered entry, click sounds, and the console chrome (banks, patch bay, command bus).

## Light

- **Module:** the power key (bulb glyph, LED), the screen (a bulb pictogram filled with the brightness, its base lit whenever the lamp is on so 3% still reads lit; the figure; its warmth, or its colour's name; since when), and the brightness fader. On/off lamps: one wide key with its state word, no fader. Compact: key, name and area, screen.
- **Panel:** the screen with a second channel: the lamp's colour while it shows one (a lens in that colour and its name, "Amber"), otherwise its warmth (sun pictogram, kelvin, its name: "Warm white"). Then the power key and brightness fader; quick levels 5, 25, 50, 100 (Night, Dim, Half, Full); the warmth fader in blue, flat while the lamp is off; a colour lamp's seven colour keys (Red, Amber, Yellow, Green, Blue, Purple, White), the one it shows latched, and choosing one turns it on; today; last changed (or last seen) and what the lamp can do. A lamp with both shows a warmth or a colour, never both, as Home Assistant reports it.
