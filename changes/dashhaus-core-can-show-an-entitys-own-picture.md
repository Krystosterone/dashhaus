---
type: feature
---
@dashhaus/core can show an entity's own picture, a camera's still or a player's artwork: useHaPicture resolves it against your Home Assistant and drops it while the entity is unavailable, usePicture (in @dashhaus/core/hooks) loads it only while it is on screen and the page is visible and refreshes a still only then, and useHaMoreInfo opens Home Assistant's own more-info dialog, which plays a camera's live stream, from inside any skin's Lovelace card. A transport may resolve picture paths with resolveUrl, and demo transports take pictures, served from the local demo pictures in @dashhaus/core/seeds/pictures.
