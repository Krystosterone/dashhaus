# The glass UI

A second, completely different UI over the same entities: translucent panels on a dark gradient, a bento grid, a room bar at the bottom. It runs on phones and tablets and ships as its own Lovelace card in the same bundle. The look comes from a reference mock; the decisions below are where it departs from the mock, and why.

It shares everything below the UI with the current dashboard: the entity models in `src/domains/`, and the live entities from `src/ha/` through the headless components (`<HaClimate entityId>{(climate) => …}</HaClimate>`). Glass cards in `src/glass/` are pure: they take an entity and its actions as props, so stories feed them demo and worst-case data. Only the glass Lovelace renderer in `src/ha/lovelace/` (step 6 of the plan, not built yet) will connect them to Home Assistant.

## Research decisions

The research behind the current UI ([research/](../research/README.md)) is about the people and the screens, not the look, so it still applies.

- **Importance first, rooms as filters.** [01](../research/01-composition-model.md) found importance-first composition best on phones and tablets; the mock is room-first. The room bar keeps its place, but its first entry is **Home**: the cards that matter now (climate, weather, the alarm, anything playing or on). A room narrows the grid to that area.
- **Every card names itself.** [03](../research/03-dense-list-identity.md): a domain icon, the entity's name and one state or area line, in that order, on every card. The room bar shows room names, not bare icons: the mock's icon-only rooms fail the same test.
- **One accent.** [04](../research/04-colour-restraint.md): subtract hues before adding them. The mock's green status dots and violet dial become one accent, `--gl-accent`, for every *on* and every set value. Album art and camera frames are content, not palette.
- **Colour is never the only channel.** On is a filled dot and a ringed power button; off is a hollow dot and a plain button; unavailable is a dashed ring, the same meaning as in the current UI. A screen reader hears the state from `aria-pressed`.
- **Urgency gets a marker, not brightness.** [02](../research/02-attention-budget.md): a triggered alarm or an Owlet alert shows `--gl-warn` with words. Glass has no glow.

## Visual system

- **Tokens.** `src/glass/tokens.css` is glass's only source of colour, scoped to `.gl-page` so it never touches the current UI's `:root` tokens. Motion reuses the shared `--ease-*` and `--press` tokens.
- **Dark only.** The mock's look depends on light text over a dark field, so glass sets `color-scheme: dark` and has no light theme.
- **The background is a gradient, not a photo**: warm lamp light from the top left, cool window light on the right, on a deep brown. It sits on a fixed layer behind the page, so scrolling never repaints it.
- **Panels** are translucent white over the gradient with a hairline edge, a top highlight and a soft shadow, 28 px corners.
- **Blur is opt-in.** Blurring a smooth gradient changes almost nothing you can see, and `backdrop-filter` re-blurs every panel on every scroll frame. `data-glass="flat"` (the default) draws more opaque panels with no filter; `data-glass="blur"` adds the live blur. The *Glass/Foundations → Blur* and *Flat* stories are the comparison to judge on a mid-range phone. Only rules under `[data-glass="blur"]` may use `backdrop-filter` (`src/styles/rules.test.ts`).
- **Type** is the dashboard's family. The header greets in a light, large title; card names are medium weight; readouts are light.

## Layout

- **The grid is a bento on a fixed row unit.** A card's size is one of four, and its height comes from its size alone, never its state: `s` 1 × 2 rows, `m` 2 × 2, `l` 2 × 4, `xl` 2 × 4 that widens to 3 columns when there are 6. Columns follow the page's width through container queries: 2 on a phone, 4 from 600 px, 6 from 1000 px.
- **The room bar** is fixed at the bottom inside the safe area, scrolls sideways when the rooms don't fit, and marks the current room as pressed and filled.
- **The page** fills the dynamic viewport (`100dvh`), pads by the safe-area insets, and leaves room at the bottom for the bar.
- **Dropped from the mock:** the top navigation (search, calendar, automations, notifications, energy) and the members row's add button: neither has a job here yet. Camera talk-back and recording wait for camera support.

## Touch and motion

Every control is at least 44 px, answers on `:active` with a 0.97 scale over `--press`, uses `touch-action: manipulation`, and is not selectable. Hover lives under `(hover: hover) and (pointer: fine)`. Only `transform`, `opacity` and colours animate; nothing animates over a blurred panel's size. Reduced motion drops the scale.

## Building blocks

`src/glass/ui.tsx`: `GlassPage` (tokens, gradient, glass mode), `GlassHeader` (greeting and title), `GlassGrid`, `GlassCard` (size, icon or status dot, name, subtitle, power button, body), `PowerButton`, `StatusDot` and `RoomBar`. Classes are prefixed `gl-`.
