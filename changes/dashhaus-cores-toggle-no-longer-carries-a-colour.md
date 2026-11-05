---
type: breaking
---
`@dashhaus/core`'s toggle no longer carries a colour: `color` is gone from `useHaToggle`'s options, `toggleFromHass`'s options and the toggle model, and `@dashhaus/core/entities/color` (its `ColorName` type) is removed. Stop passing `color` to `useHaToggle` or `HaToggleTile`.
