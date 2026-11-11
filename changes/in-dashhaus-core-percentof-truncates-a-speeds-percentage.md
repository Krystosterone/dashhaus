---
type: breaking
---
In `@dashhaus/core`, `percentOf` truncates a speed's percentage as Home Assistant does (`percentOf(2, 3)` is 66, not 67), `useHaFan`'s `onPercentageChange` sends a fractional percentage truncated, and `speedOf` reads a percentage a speed sends exactly as that speed. For the old percentage, use `Math.round((speed / count) * 100)`; for the old speed, `Math.round((percent / 100) * count)`, clamped to 1 to count.
