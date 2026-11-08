# Orb skin

Orb (`src/skins/orb/`) is the dashboard's primary skin: React + TypeScript cards for Home Assistant entities, on the same entity models and Home Assistant hooks as Field, with its own card system, bundles and dashboard furniture. Its Lovelace card is `custom:dashhaus-orb`, drawing a whole dashboard from YAML. Stories are under **Orb** in Storybook, where **Foundations → Design rules** draws this file with live stories after its sections (edit it here, not the page); Palette, Parts, Color temperature, Compact rows and Worst case show the rules across cards, and **Dashboards** composes example pages.

The attention, row identity and Home Assistant integration rules here have operational forms in `.agents/skills/`; where wording differs, the skill named by the rule wins. Field's distinct hardware language is in [field.md](field.md); per-card behaviour is in [cards.md](cards.md); deploy and YAML are in [deploy.md](deploy.md).

## Orb design rules

- **One card, one model.** A direct model is one Home Assistant entity; a composed model is a primary entity plus companions its hook composes (a sensor's device readings, a sound machine's volume, the weather's air quality and sun, an Owlet sock's sensors). Composition never reaches the card or the page: every card takes one `entity` prop and one footprint, and joining cards into one surface is the bundle's job.
- **One modular footprint system.** Every card type and both bundle types use the same 60 px unit and 8 px gap: `compact` is 60 px, `standard` is 128 px, and `featured` is 264 px. In general, n units occupy n × 60 + (n − 1) × 8 pixels.
- **Height never changes with state, entity type or width.** Set `footprint="compact" | "standard" | "featured"` on any tile; the default is `standard`. Width may simplify the internal arrangement, but it never changes the footprint or promotes a standard card to featured.
- **Size from the container, not the viewport.** Container queries adapt the anatomy at 260 px and 440 px. Below 260 px a standard card keeps its orb, control and tappable name in the same places; a bare reading icon drops its empty orb-sized box so the name keeps its room. `featured` explicitly adds the Today strip and a large readout when that figure is not already printed on the control; below 260 px the readout yields to the orb. History remains in the sheet for smaller footprints.
- **No expanding cards.** More detail opens in a sheet (bottom sheet on phones, centered panel on wider screens), from a tap on the card's name (marked by a small chevron after it) or a press and hold on the main control. Below 186 px the chevron yields before the primary identity, but the name remains the same details button. The tap area spans the header (name and readout) under the orb; in compact rows it spans the title column, stopping 8 px short of the control, or the whole row when there is no control. No card spends a column on an open button; the only circle button is the sheet's close.
- **One UI language.** Every signal has one meaning: shape says what you can do, fill says state, a dashed outline says unavailable. **Orb / Foundations / Palette** shows each one, and **Orb / Foundations / Parts** each part across its states.
  - **Shape says what you can do.**
    - **Button** (`--btn`, raised): tap it. Orbs, toggle pills, the stepper's and open/close buttons, chips, keypad keys. A disabled button lies flat.
    - **Groove** (`--groove`, recessed): slide or set along it. Brightness, curtains and shades, the heat/cool range, the setpoint stepper, the alarm's mode switch, a countdown, a track's position.
    - **Readout** (no container): look at it. Sensor readings, today's temperatures, a view-only alarm. Nothing that can't be pressed looks pressable; tapping a readout still opens details. Having no edge of its own, a readout keeps the inset a pill gives its label, so it never meets a compact row's curved end; on a standard card its main figure takes the large-readout voice and fills the control row. Its other figures sit in the shared metric grid (`hd-bar`, each `hd-metric` a `hd-label` caption over its value), left-aligned in a proportional second track (`hd-bar--pair`: at least 0.325 of the row and 44 px, a step tighter under 260 px), so a column of readings lines its second figure up; a figure is never pinned to the card's right edge. **A readout's second figure is whole or gone whole.** It follows the first, so it is what gives way (cards.md → A warning's words fit a row): it takes the width it needs beside the first, and where the two don't fit whole side by side it goes whole, and the first takes the row (`Closed` alone on a 170 px door; since when is still the status line's last fallback and the sheet's small print), never cut and never past the card's edge. Only where the first is words rather than a figure, a calendar's event title, does the first give way instead, clipping so the second keeps its time and period whole (`Until 12:15 PM`). The Storybook run fails a readout figure past its card's edge.
  - **Values sit on their control.** Where a fill passes under a label, the label flips to `--on-accent`. No floating capsules.
  - **A groove that sets a loudness or an output fills only while it sounds** (cards.md → What every card shows → A level that is a loudness): the accent fills a volume's groove only while its output is active and unmuted. Unfilled, it is the empty groove with the reason before the value on it (`Off · 62%`, `Muted · 45%`, `Paused · 30%`), never a full groove beside silence, and setting it never switches the output on.
  - **A groove that runs on by itself** (a track's position, in a player's sheet) fills its played part with an ink tint, the alarm countdown's, never the accent: a position is a fact, not an "on", and the accent is already the orb's and the pill's. Its clock sits on it, the time played at its start and the length at its end; while a finger or a key is on it the time played is where it will play from, in the full ink, held still, and it is set once, when let go.
- **One palette.** Colour is the exception, not the state. The one question colour answers is "is it on?".
  - **Neutrals** for everything by default. Off is the plain surface: a raised button, or a groove with nothing in it.
  - **The accent** (one token, `--brand-c` / `--brand-h` in `tokens.css`, Crextio yellow by default) is solid and means on, whatever the role: a lit light, a mode switched on, an armed alarm, an open cover, a thermostat that's on, a chosen chip or mode. It's the only solid fill, the glow and the "now" stick. The page wash stays neutral-warm, so colour is not present before a state earns it.
    - **On is the model's active set** (cards.md → What every card shows → One active signal): the accent and the pressed orb follow it and nothing else, the same set Field's LED and bright figure follow. A transient state between two active ones (a player buffering between tracks) keeps the accent, so it doesn't flicker; a powered on with nothing playing (a TV showing an input) is the accent, as a light that is on is.
    - Energy (`data-role="energy"`: lit, heating or cooling running, daylight let in by a cover) adds the orb's bloom and, on standard and larger cards, the glow. It never changes the fill, so on always looks the same.
    - To re-colour active state across the dashboard, change those two numbers; Storybook's Accent toolbar tries a few. Never recycle the accent for an unrelated meaning on the same surface.
  - **Dashed** means unavailable: a dashed outline and muted text, on the orb and the control alike. Nothing else is dashed, so off and unavailable never look alike. Unknown, a light or cover Home Assistant can reach and drive but that hasn't said where it is, isn't dashed either: it is drawn as not on, says Unknown in words, and its controls act.
  - **No disc** means a reading: read-only cards (sensors, weather) show a bare icon where controls have an orb, so a reading never looks like a control switched off. On cards the bare icon is only as wide as its glyph, so its edge meets the content edge as a disc's does; compact rows keep the orb's box so every row's icon shares one column. A reading's large figure is its slot, so a featured reading keeps it there instead of repeating it in the header.
  - **A picture is a readout** (`Picture`): a camera's still or a player's artwork, all colour and no token, so it is contained rather than coloured: a neutral well of a fixed size, the frame in it, never a word over it (how old a still is goes on the status line), never a glow or the state's colour, never inside an orb (the orb's fill is its state), never in a compact row. Unavailable is the dashed well with no frame at all, and takes no press or focus; a card whose well is a column beside its words drops the column instead, so its slot keeps `Unavailable · Last seen 08:20` whole. Pressed, it opens the live stream or the details; the card's name still opens the details, as on every card. Its lifecycle is core's (core.md → Pictures).
  - **Inverse** (`--inv-bg` / `--inv-fg`) is for the one urgent action (Stop, Disarm, Cancel, the keypad's Enter), never a state. In dark mode it is near-white, so as a state it would outshine the accent.
  - **Warn orange**, text only, for problems. The one exception is an alarm that has gone off, which fills: a triggered security alarm, or a baby monitor's vitals alert (low oxygen, heart rate). Each level a card's model ranks (cards.md → What every card says) has one place: an **urgent** or **advisory** warning leads the status line behind the warn marker (`AlertStatus`), and the readout keeps its own ink, so the figure is never a second warn channel; an **alarm** fills the slot with `AlarmPill`, its alert on the left and its value or time on the right, in compact rows too (on a card under 180 px the value goes, so the alert keeps the pill; the readout and the sheet still say it), and the status line keeps its plain words under it. The marker's label names the card first, `Warning: <name>: <what>`, or `Alert: <name>: <what>` for an alarm (`Warning: Porch: Battery 12%, replace soon`, `Alert: Hallway smoke: Smoke detected`), in every footprint and in the sheet, so a screen reader moving through a page of cards hears whose warning it is before what it says; the card puts the name before core's words (`src/skins/orb/cards/alerts.test.tsx` draws every card's seeds and holds each label).
  - **Every state reads without colour.** Text, icon, shape or position carries it; colour only reinforces. The review is a design check with colour removed, not a WCAG colour-only conformance claim for the palette.
  - **Subtraction first.** At the densest layouts, mute decorative colour, fills, glows and unnecessary markers before adding a hue. No source establishes a hue-count or tile-count limit; do not invent one. No direct study validates the one-colour-orb pattern, and the muted-colour maximum-density comparison is unrun, so no palette or density rule changes on that evidence.
  - **Contrast, both themes.** Semantic colour — the orb and warn states — must clear the applicable WCAG thresholds (4.5:1 text, 3:1 large text and graphics) against adjacent backgrounds in light and dark themes.
  - **No card has a colour of its own.** Every orb that is on is the accent, and the accent is the dashboard's, set once for all of its cards (the Lovelace card's `accent`, or `--brand-c` / `--brand-h`); there is no per-card colour to pass. Heat or cool is told by the mode icon and the words Heating / Cooling; a lamp's warmth or colour is named on its status line ("Office · Cool daylight", "Nursery · Amber"), and its hue is drawn only in its sheet, on the warmth ruler or the colour chips' swatches. Cards declare `data-role` (energy, state or reading) through `paint()` in `shared/ui.tsx`.
- **Compact cards carry their own identity.** Every compact card shows a stable domain icon in its orb (thermostat, window, bulb), a concise primary identity, and one state/action cue — climate: mode and setpoint; covers: position or travel; lights: on/off and brightness. The area line carries the room, or the climate's current temperature and action; under a titled bundle's lid, which names the room once, a part's area line carries its own detail instead. Colour reinforces the state; it never defines the row. Icon size, stroke weight, text slots and action placement stay stable across card types.
- **One state vocabulary.** A state word appears once: simple toggles carry it on the control; climate and humidifiers carry their action on the status line and use **Turn on** as the off-state control. Each domain has one pair: On / Off (lights, modes), Open / Closed (covers), Armed home… / Disarmed (alarm), Locked / Unlocked (lock), Heating · Cooling · Idle / Off (climate). Transitions use the verb: Opening, Closing, Arming, Disarming, Locking, Unlocking. A card that can't be reached says **Unavailable** everywhere (slot, status line, "Unavailable since …" in the Today strip); controls keep their room on the status line, and readings say "Unavailable" on the status line in place of the room as well as in place of the reading. Otherwise the status line falls back in one order on every card, saying the first it has: the warning (behind the warn marker), then the card's own cue (what is playing, a lamp's colour, a sound's volume), then the area, then since when (`Since 08:16`, from its `lastChanged`), then nothing. It never repeats the slot's word: the state is said once, on the control or as the value, so a status line with nothing of its own to say is blank rather than say it again.
- **Readout type.** The large readout says a figure or a word, and its size follows which. A figure (a temperature, a level, a volume) takes the number's size, up to 44 px on a card and 40 px in the sheet. A word (On, Locked, Armed home, a fan's named speed, Smoke, Idle) is marked as one (the frame's `readout.word`, `hd-num--word`) and set a step smaller and a little looser: up to 38 px on a card, and 30 px in the sheet on every card. A word an integration may name its own way (a vacuum's Emptying the bin, a player's Muted) is a step smaller again on the card and cut with an ellipsis (`hd-num--long`), and the same 30 px in the sheet. The sheet's 30 px is one rule in `shared/card.css` for both, and a card never sets its own size for a word.
- **The status line keeps its type.** It is `--type-status` on every card at every width (`--type-status-compact` in a compact row), and the warn marker before a warning keeps its `--type-cue` size: a line too long for its card clips after its word, never steps its type down. Its sizes are `shared/card.css`'s alone, and a card never sets its own (`styles/rules.test.ts`).
- **Light and dark themes** come from the tokens in `src/skins/orb/styles/tokens.css`, keyed on Orb's own `data-orb-theme` (`shared/surface.ts`): the Lovelace card sets it on its host from its YAML `theme`, and the Theme toolbar sets it on `<html>` in Storybook. Never use a colour literal in a card's CSS.

## Motion and touch rules

Applied from Emil Kowalski's design-engineering skills (emil-design-eng, review-animations, animation-performance, mobile-native, break-ui).

- **Easing tokens only:** `--ease-out` for anything entering, exiting or answering a press, `--ease-in-out` for movement on screen, `--ease-drawer` for the phone sheet. Never `ease-in`, never `transition: all`.
- **Durations:** presses take `--press` (160 ms). Fades and jumps take 160 to 300 ms. The phone sheet takes 380 ms in and 240 ms out. Exits are always faster than entries.
- **Only `transform`, `opacity`, `clip-path` and colour changes animate.** Never layout properties: `width`, `height`, `padding`, `margin`, `top`, `left`. The glow is its own layer that fades with opacity. Bar fills use clip-path. Knobs and markers ride layers moved with transform. State colours fade on `background-color`, `color` and `box-shadow`.
- **Not everything animates.** Keyboard steps and drags never animate: the value follows the finger. Only a tap that jumps a track animates; the slider primitive (`packages/core/src/primitives/slider.ts`) sets `data-anim` for that. A control kind entering after an entity state change may use one `--press` opacity/scale handoff; reduced motion keeps opacity only.
- **A clock runs on by itself** (cards.md → What every card shows). Something that moves with time while it is shown (a player's position) is worked out once from what Home Assistant reported and then left to CSS: a linear `clip-path` fill as long as what it measures, and a clock whose places are strips of digits stepped through by their own linear animations, as a segment turns, never `steps()`. Nothing re-renders every second; held with `animation-play-state` while paused, and drawn again (a new `key`) when what it was worked out from changes. Seeking it (the sheet's position groove) switches its animations off while held (`data-held`), so the values drawn under them show the target, and draws them again from where it was let go; nothing remounts as it moves.
  - **It cuts, never slides:** a hard cut between stops, the stops written to four decimals, so the slowest place's cut is never a visible slide.
  - **It stops at the end** of what it measures: the fill holds its end (`forwards`), and each place turns only as many times as there is left (a finite `animation-iteration-count`, its end held), so it never counts past the length.
  - **It starts from the fractional position:** the fill and each place start where it is, a negative delay of the seconds into their turn, fractions included, so a place turns when the fill says it should.
  - **Reduced motion keeps it:** a fill growing by a pixel every few seconds and a digit that turns are a clock, and a hard cut is not motion.
  - **A dashboard's `quiet` draws none:** no fill and no clock, since a held one would lie and a running one changes by itself (the media player card's `quiet`, from the Lovelace card's YAML).
- **Sheet motion uses CSS transitions plus `@starting-style`**, so closing mid-open reverses smoothly.
  - A flick (0.4 px/ms over the last 100 ms) or a drag past 30% of its height (capped at 140 px) dismisses it.
  - Dragging up meets growing friction.
  - Only one pointer at a time.
- **Every control gives press feedback on `:active`.** Scales are 0.92 to 0.98: small buttons go lower, wide pills stay near 1.
- **Hover styles live under `@media (hover: hover) and (pointer: fine)`.**
- **Reduced motion means gentler, not none.** Fades and color changes stay; scaling and sliding go.
- **Tracks** (brightness, volume, cover position, warmth, heat/cool range) are one part, `Track` in `src/skins/orb/shared/ui.tsx`, and take pointer input on its hit layer with `touch-action: pan-y`. Each card brings only its fill. The heat/cool range's two-thumb wiring (`useRangeSlider` into `Track`) is the one exception, in `cards/climate/RangeBar.tsx`: it becomes a part when a second card has a range, not before.
  - Touch values change on a tap or a sideways drag, so a vertical scroll that starts on a track changes nothing.
  - A hidden range input stays for keyboard and screen readers. A native iOS range input only moves when you grab its thumb.
- **Controls aren't selectable.** No selection, callout or tap highlight, and `touch-action: manipulation` is on. Visible compact controls keep a 44 px hit dimension; crowded alarm modes move to the sheet instead of shrinking their targets.
- **Host page baseline.** The page that hosts a dashboard needs:
  - `viewport-fit=cover`, so the bottom sheet's `env(safe-area-inset-bottom)` padding works.
  - A `theme-color` per scheme.
  - Zoom left enabled.
  - `body.ha-surface`, which also stops pull-to-refresh on the page.
  - See `.storybook/preview-head.html`.
- **Worst-case data:** **Orb / Foundations / Worst case** runs every card at narrow, medium and wide standard widths plus featured and compact footprints against realistic bad values.
  - The values: long and compound names, missing areas, raw floats, readings near zero or far past comfort, no reading yet, handles that meet, and every mode, preset and fan option.
  - A Demo / Worst case toggle switches the data. Check it after any change.
  - Every card is on it, its `<NAME>_WORST_CASE` from `@dashhaus/core/seeds/<name>`: `verify/storybook.test.ts` fails while one is missing, and `new-card` adds a new card's row. **Field / Foundations / Worst case** draws the same seeds on Field's modules.
- **Compact cards without a control.** Every card accepts `showControl={false}` when `footprint="compact"` (default true). The card then has no pill, bar, stepper or switch: the value replaces it, and tapping the row opens the detail sheet. An actionable orb keeps its tap (switch) and hold (details). This works in bundles because bundles use the same tile contract. **Foundations / Compact rows** shows every card both ways.
  - The value is short where the status line already says the rest: the thermostat shows its mode and setpoint ("Heat · 21.5°"), a mode "On", the home row its temperature.
  - Under 320 px a compact card already gives up its inline control for the value under the name; only the row tap differs when `showControl={false}`.

## Bundles

Bundles use the same footprint matrix as standalone cards. Members are ordinary tiles with their own tap, long-press and sheet behavior; the bundle owns their footprints and draws one outer card.

**Joined** — equal compact members side by side, with no extra header. Any card type is valid.

```tsx
<JoinedBundle label="Sleep">
  <ToggleTile {...novaSleepMode} />
  <ToggleTile {...doNotDisturb} />
</JoinedBundle>
```

- The bundle forces every member to `compact`; caller-provided footprints cannot create mixed density inside it.
- One horizontal row is 60 px. When members stack, total height follows the same formula: two are 128 px, three 196 px, four 264 px.
- Members stack once each would get less than about 170 px (two under 340 px wide; three under 510 px; four stack under 450 px and go two by two through 599 px).

**Lead and rows** — one standard card followed by compact cards.

```tsx
<LeadBundle lead={<ClimateTile {...secondFloor} />}>
  <ClimateTile {...dysonHeater} />
</LeadBundle>
```

- The bundle forces the lead to `standard` and every row to `compact`, regardless of caller props.
- The same 8 px gap separates members. A lead plus one row is always 196 px.
- Row orbs line up with the lead. Tap a row's name, or hold its orb, for its details.
- The lead's history remains in its sheet. The sheet lists rows under "Also in this bundle", live; opening a row's sheet stacks it above the lead sheet.
- Keep state above the bundle (as with Home Assistant, where it lives in `hass`): rows appear in the card and the lead's sheet, and both copies must show the same entity. `src/skins/orb/bundles/demo/DemoBundle.tsx` shows the demo-hook version.

`SheetExtra` (in `shared/ui.tsx`) supplies the lead sheet's live rows.

**Titled** — the parts of one thing, usually one device split into several entities, under a lid that names it and its room once.

```tsx
<TitledBundle title="Sound machine" area="Baby Room">
  <ToggleTile {...power} />
  <LightTile {...nightLight} />
  <SoundTile {...whiteNoise} />
</TitledBundle>
```

- The lid is one 60 px unit: the title, and the room on the line under it, the same two lines a card's name and status make. Every member is forced to `compact`, so a lid and three parts are 264 px, the featured height.
- The lid sits above every part, so what it says covers them all. Name each part for what it is on the thing ("Power", "Night light", "White noise"), never "Sound machine power".
- A part in the lid's room drops the room from its card (`useCard` resolves it through `BundleLid`) and its status line says its own detail instead: since when (a toggle), its warmth or colour (a light), its volume (a sound). A part somewhere else keeps its room.
- The lid is a heading, not a card: it opens nothing, since a sheet of the same rows would only repeat the bundle. Each part opens its own sheet, which, seen without the lid, says whose part it is: "Sound machine · Baby Room".
- Use it when the members make up one named thing. A lead bundle is for one member that matters most with related rows hanging off it.

## Dashboards

`DashboardPage`, `CardGrid`, `Section`, `Columns` and `Cell` are optional composition helpers for hand-composed pages; the footprint contract does not depend on them. The Lovelace card draws its YAML rows on a grid of footprint units instead (`dash-row`: 60 px rows with the 8 px gap, so a compact card is one unit, a standard two, a featured four, and a bundle the units its members make), each card on the grid lines the shared placement gives it (spec/deploy.md → The format → Placement). Mixing footprints in a row therefore leaves no hole the YAML didn't ask for, a sidebar of a standard and a compact card stands beside a featured hero, and `align: bottom` moves whole stacks by whole units, never off the rhythm. `CardGrid` is the section-free primitive. Tiles can be mixed directly in it or any CSS grid, grouped by room, urgency, workflow or no semantic concern at all. Every tile brings the same internal density and modular height.

**Composing for a glance.**

- **One hero per screen.** Use `featured` only for a deliberate hero or history-bearing card. Width alone never upgrades a card.
- **Glow follows urgency, not position.** In a one-column `Section`, later routine glows are damped, but a genuinely urgent state can outrank them. The `100% / 50% / 0%` damping is a local heuristic, not an external standard.
- **Keep the hybrid.** Importance-first on phone and tablet, room/place-first on the wall panel; do not switch the whole dashboard to room-first. No reviewed source fixes a universal relative order between frequent actions and room inventory, or gives a tap-count threshold for cross-room versus room-first work: the order below is our product decision, and room access stays one step away — a section pill or a page, never a filter inside the page.
- **Normal order: frequent actions, household status, then room/environment glance.** Phone and tablet pin actual frequent controls first; the automatic layout cannot infer frequency, so it puts all actionable rows first for the person to refine, then its status bands, the most pressing first (spec/deploy.md → The automatic layout's order). There is no conditional alert region for now; no reviewed source shows alerts must lead. Problems stay in their ordinary section with the shared warn marker rather than moving the layout or becoming brighter.
- **Never glow alone.** Every important state has a non-colour cue: text, icon, position, or meaningful state motion.
- **Use compact rows when alignment matters.** Stack them with the shared 8 px gap. Below 320 px of dashboard content, multi-column grids become one column so primary identity survives; inside a compact card below 320 px, the inline control yields to name and value while the orb keeps its independent action.
- **Compact stays quiet.** Compact cards never glow and their orbs never bloom. Glow belongs to standard, featured and sheet surfaces.
- **Mixing concerns is valid.** Room-first, importance-first and task-first layouts use the same cards; no `Section` or bundle is needed to normalize them.
- **One wall, one column per place** remains the example wall-panel composition, not a requirement of the card system. Its room lead follows Home Assistant's area-oriented default; no first-party Apple or Mushroom wall-panel surface establishes it.
- **Navigate without hiding.** A page can dock a bottom nav (`DashboardPage`'s `nav`, drawn by `NavBar`, its own stories under **Orb / Dashboards / Nav bar**): one raised pill per section, page or other dashboard, the current one in the solid accent, as a chosen chip is. A section pill scrolls there and stays lit while that section is read, so the page keeps its importance-first order; rooms that deserve their own page get one rather than a filter. The Lovelace card's `nav` and `pages` are in `spec/deploy.md` → Navigation.
- **Set type for the viewing distance, not the width.** A wall panel read from across the room takes `viewing="far"` (YAML `viewing: far`): status lines, captions and warn cues grow and readouts gain a weight step, through the `--type-*` role tokens in `tokens.css`. Width can't tell a wall panel from a tablet in the hand, so it is never inferred, and card heights don't move.
