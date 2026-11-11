---
type: fix
---
In @dashhaus/core, createAlarmHandlers rejects with the sanitized HaActionError instead of Home Assistant's raw error, and refuses to arm or disarm an unavailable alarm, as every other card's actions do.
