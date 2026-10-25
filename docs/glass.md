# The glass UI

A second, completely different UI over the same entities: translucent panels on a dark gradient, a bento grid, a room bar at the bottom. It runs on phones and tablets and ships as its own Lovelace card in the same bundle. The look comes from a reference mock; the decisions below are where it departs from the mock, and why.

It shares everything below the UI with the current dashboard: the entity models in `src/domains/`, and the live entities from `src/ha/` through the headless components (`<HaClimate entityId>{(climate) => …}</HaClimate>`). Glass cards in `src/glass/` are pure: they take an entity and its actions as props, so stories feed them demo and worst-case data. Only the glass Lovelace card in `src/ha/lovelace/glass/` connects them to Home Assistant: `custom:home-dashboard-glass` (YAML in [deploy.md](deploy.md#the-glass-dashboard)). It resolves each card's area from the frontend's registries, renders one headless component per card with no history read, and shows a rejected command as a notice above the room bar, worded by the same `actionMessage()` as the current card's.

## Research decisions

The research behind the current UI ([research/](../research/README.md)) is about the people and the screens, not the look, so it still applies.

- **Importance first, rooms as filters.** [01](../research/01-composition-model.md) found importance-first composition best on phones and tablets; the mock is room-first. The room bar keeps its place, but its first entry is **Home**: every card, in importance order (the weather, climate, modes, then lights and switches). A room narrows the grid to that area. Home does not hide what is off: a card that vanished the moment you switched it off would move every card after it.
- **Every card names itself.** [03](../research/03-dense-list-identity.md): a domain icon, the entity's name and one state or area line, in that order, on every card. The room bar shows room names, not bare icons: the mock's icon-only rooms fail the same test.
- **One accent.** [04](../research/04-colour-restraint.md): subtract hues before adding them. The mock's green status dots and violet dial become one accent, `--gl-accent`, for every *on* and every set value. Album art and camera frames are content, not palette.
- **Colour is never the only channel.** On is a filled dot and a ringed power button; off is a hollow dot and a plain button; unavailable is a dashed ring, the same meaning as in the current UI. A screen reader hears the state from `aria-pressed`.
- **Urgency gets a marker, not brightness.** [02](../research/02-attention-budget.md): a triggered alarm or an Owlet alert shows `--gl-warn` with words. Glass has no glow.

## Visual system

- **Tokens.** `src/glass/tokens.css` is glass's only source of colour, scoped to `.gl-page` so it never touches the current UI's `:root` tokens. Motion reuses the shared `--ease-*` and `--press` tokens.
- **Dark only.** The mock's look depends on light text over a dark field, so glass sets `color-scheme: dark` and has no light theme.
- **The background is a gradient, not a photo**: warm lamp light from the top left, cool window light on the right, on a deep brown. It sits on a fixed layer behind the page, so scrolling never repaints it.
- **Panels** are translucent white over the blurred gradient with a hairline edge, a top highlight and a soft shadow, 28 px corners.
- **Panels blur what is behind them.** `backdrop-filter` lets the warm and cool light through each panel; it held up on a phone (2026-10-25). It re-blurs every panel on every scroll frame, so `.gl-panel` is the only blurred surface: a blur nested inside a panel would blur it twice (`src/styles/rules.test.ts`). Nothing animates a blurred panel's size.
- **Type** is the dashboard's family. The header greets in a light, large title; card names are medium weight; readouts are light.

## Layout

- **The grid is a bento on a fixed row unit.** A card's size is one of four, and its height comes from its size alone, never its state: `s` 1 × 2 rows, `m` 2 × 2, `l` 2 × 4, `xl` 2 × 4 that widens to 3 columns when there are 6. Columns follow the page's width through container queries: 2 on a phone, 4 from 600 px, 6 from 1000 px.
- **The room bar** docks at the bottom inside the safe area: sticky, so it centres on the page's own width even beside Home Assistant's sidebar. It scrolls sideways when the rooms don't fit, fading at its ends, and marks the current room as pressed and filled. A rejected command's notice docks above it.
- **The page** fills the dynamic viewport (`100dvh`; in Home Assistant, the height under its header), pads by the safe-area insets, and pushes the dock to the bottom of a short page.
- **Dropped from the mock:** the top navigation (search, calendar, automations, notifications, energy) and the members row's add button: neither has a job here yet. The TV, speaker and music cards wait for media player support, and the camera card for camera support.

## Touch and motion

Every control is at least 44 px, answers on `:active` with a 0.97 scale over `--press`, uses `touch-action: manipulation`, and is not selectable. Hover lives under `(hover: hover) and (pointer: fine)`. Only `transform`, `opacity` and colours animate; nothing animates over a blurred panel's size. Reduced motion drops the scale.

## Building blocks

`src/glass/ui.tsx`: `GlassPage` (tokens and gradient), `GlassHeader` (greeting and title), `GlassGrid`, `GlassCard` (size, icon with status dot, name, subtitle, power button, body; dashed when unavailable), `PowerButton`, `StatusDot` and `RoomBar`. `src/glass/controls.tsx`: `GlassTrack`, `GlassDial`, `GlassPick` and `GlassSegments`. Classes are prefixed `gl-`.

The controls draw glass on behaviour both UIs share, from `src/hooks/`: `useTrack` (a horizontal track: a mouse jumps on press, a touch on a tap or the first sideways move, so a scroll that starts on it still scrolls), `useDial` (a circular setpoint, below) and the value math both share in `range.ts`. Each control also carries a native input, a range or a select, for the keyboard and the screen reader.

## Cards

Each card takes an entity and the callbacks the `useHa<Kind>` hook's `actions` return, so a renderer spreads one into the other. Stories: *Glass/Cards*, and *Glass/Foundations* for a page of them.

- **Climate** (`l`). The setpoint on a 240° dial with the unit's action and the room's temperature in its middle. Only the thumb takes a drag, so a scroll across the dial still scrolls; a drag keeps where the finger landed on the thumb (a press that never moves changes nothing), shows its value and sends it once, on release, since a thermostat should not get a command, and often beep, for every degree passed. A tap on the ring jumps there; −/+ in the dial's opening step it. A heat/cool range shows both ends in the middle, and the one pressed is the one the dial edits. Mode, fan and preset are native pickers, a phone's own. Off keeps the room's temperature and drops the setpoint. No timer: Home Assistant's climate has no timer service.
- **Light** (`m`). Brightness on a track; colour (Home Assistant's hue) and warmth (Kelvin, at the lamp's own hues) on their own tracks when the lamp has them, one at a time under segments. The level is on the subtitle beside the area. Moving a track turns an off light on, as `turn_on` does; an off light's track stays neutral.
- **Toggle** (`s`). Its icon as the card's picture, and since when it is on or off, or until when.
- **Weather** (`xl`). The temperature and sky, the date, humidity and wind, then up to four days (five when the card is 420 px wide). Today is the highlighted day. No dot and no button: weather is neither on nor off. Units are the entity's own.
