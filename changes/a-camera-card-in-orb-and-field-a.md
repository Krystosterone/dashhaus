---
type: feature
---
A camera card in Orb and Field: a doorbell's or a nursery's camera, its state in words and its still, which loads only while the card is on screen and refreshes only then (every 10 seconds, or the card's refresh), and never shows a past frame while the camera is unavailable. The name and the still open Home Assistant's own live stream; a compact row shows no still. YAML takes a camera's still: false and refresh, and a dashboard's stills: false (no still fetched anywhere) and quiet (a still holds until the panel wakes and says when it is from), now in Orb too; Orb's automatic layout puts every camera under Cameras. Its words are @dashhaus/core/entities/camera/words, its demo seeds @dashhaus/core/seeds/camera, and @dashhaus/core/lovelace/schema adds readCameraOptions.
