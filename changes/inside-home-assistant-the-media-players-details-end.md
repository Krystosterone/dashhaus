---
type: feature
---
Inside Home Assistant, the media player's details end with Open in Home Assistant, which opens Home Assistant's own player for what the card leaves to it, such as browsing media and grouping speakers: a raised pill last in Orb's sheet, a wide Open key under a Home Assistant legend last in Field's panel, and nothing where there is no host to open it, as in a standalone app. `HaMediaPlayerTile` and `HaMediaPlayerModule` wire it with `useHaMoreInfo`, `MediaPlayerTile`, `MediaPlayerCard` and `MediaPlayerModule` take it as `onOpenMore`, and `@dashhaus/core/entities/mediaPlayer/words` adds its words, `OPEN_IN_HOME_ASSISTANT` and `openInHomeAssistantSaid`.
