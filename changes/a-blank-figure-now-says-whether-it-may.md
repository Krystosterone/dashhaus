---
type: fix
---
A blank figure now says whether it may never come: Field says "No reading yet" where a device reports a figure but hasn't sent it (a thermostat's room temperature, a lamp's warmth, a ceiling fan's direction, an Owlet's heart rate) and "Not reported" where a thermostat has no room temperature at all, in place of each module's own words ("No room temperature", "No warmth", "Direction not reported"), and leaves out a panel's channel for a figure the device doesn't report; Orb's climate card says "No reading yet" in the room temperature's place before its first. `@dashhaus/core` adds `NO_READING_YET` and `NOT_REPORTED` to its facts, the climate model's `reportsCurrentTemperature` and `roomTemperatureBlank`.
