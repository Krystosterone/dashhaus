---
type: feature
---
A binary sensor card in Orb and Field: a door, a window, a leak or smoke in its device class's words, with its battery; smoke, gas and carbon monoxide sound the card's alarm (Orb fills its slot in warn, Field inverts its screen), leaks are marked as warnings and a garage door left open as the cover card marks one, and the automatic layouts add every door, window, leak and smoke sensor (Orb's under Security). A binary sensor in YAML takes `battery`, and `@dashhaus/core/lovelace/layout` adds `safetySensors` and `SAFETY_CLASSES` (typed as `BinarySensorClass`) for a skin's own automatic layout. `@dashhaus/core/entities/binarySensor` says each warning in a few words (`alertText`: `Smoke alarm`, `Open since 18:30`) and whole for a screen reader (`alertSentence`).
