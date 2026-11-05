---
type: breaking
---
Orb's cards no longer take a colour of their own: the `color` YAML key and the cards' `color` prop are gone (with `COLORS`, `ColorProp`, `SlotColor` and `ColorName` from `@dashhaus/orb`), and every orb is on in the accent. Delete `color` from your Orb YAML, and set the dashboard's `accent` to change the one colour every card shares.
