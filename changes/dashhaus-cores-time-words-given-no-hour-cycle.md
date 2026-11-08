---
type: breaking
---
`@dashhaus/core`'s time words given no hour cycle (the calendar's `clockTime`, `eventWhen`, `eventSpan` and the rest, the weather's `clock` and `precipitation`) now follow the browser locale's clock instead of always 24 hours, and `formatHaTime` says weekdays and dates in English. Pass `"h23"` as their last argument to keep 24 hours; cards and `useHa<Name>` hooks under `HourCycleProvider hourCycle="h23"` keep them too.
