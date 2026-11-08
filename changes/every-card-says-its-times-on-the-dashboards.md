---
type: feature
---
Every card says its times on the dashboard's hour cycle, the header's: with `hour_cycle: h12`, Orb's and Field's cards say `Since 2:05 PM` and `Tomorrow 9:30 AM`, and Field's screens keep their four places (`2:00`) with the period beside them. In your own page, `HourCycleProvider` and `useHourCycle` from `@dashhaus/core/hooks` put every card and `useHa<Name>` hook on one clock, and core's time words take the cycle as their last argument.
