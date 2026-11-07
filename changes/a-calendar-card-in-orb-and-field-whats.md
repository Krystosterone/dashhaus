---
type: feature
---
A calendar card in Orb and Field: what's next and when, the next event and the time until it (`In 2h 6m`, `Until 12:15`, `Tomorrow 09:30`, or `Free` with nothing ahead), with today's events and what's coming in its details, its events read with `calendar.get_events` and any other calendars merged in. A calendar in YAML takes `calendars`, `days` (how far ahead, default 7) and `events`, and `history: false` hides today's plan; Orb's automatic layout puts every calendar under Calendar, and Field's gives every calendar a module. `@dashhaus/core` adds `useHaCalendar` (with `loadHistory`) and `HaCalendar`, the calendar's words and agenda (`eventWhen`, `calendarAgenda`) for your own markup, and `readCalendarOptions` in `@dashhaus/core/lovelace/schema`.
