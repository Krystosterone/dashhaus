---
type: breaking
---
A garage door, door or gate no longer opens or closes on one press: Orb's tap and Field's press open the details on the question, as the lock's Unlock does, and Field's cover no longer acts on a press and hold, which opens its panel as on every module. `COVER_ACTIONS` says so with an optional `when` on `asks` (a reader that ignores it asks before every cover moves), and `npm run add -- cover` asks for the same three. A skin of your own that reads `COVER_ACTIONS` itself: read its new `when` (ask only for the device classes it lists), or every cover asks before it moves.
