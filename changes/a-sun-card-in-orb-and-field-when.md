---
type: feature
---
A sun card in Orb and Field: when the sun next sets or rises on the 24-hour clock, counting down to it (`Sets in 4h 35m`, `Rises in 9m`, or `Up all day` where none comes), with today's path of the sun worked out from Home Assistant's own location: Orb's featured card and sheet draw it as a line with the sun on it, Field's meter as the sun's height by hour. Its details list every time to come (dawn, sunrise, noon, sunset, dusk) and where the sun is. Orb's automatic layout puts the sun beside the weather under Outside. `@dashhaus/core` adds `useHaSun` and `HaSun`, the sun's words (`sunNext`, `sunWhen`), its solar position and today's path (`sunPosition`, `sunDay`, `sunPathDrawing`) for your own markup, and its demo seeds in `@dashhaus/core/seeds/sun`.
