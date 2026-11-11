---
type: breaking
---
In @dashhaus/core, createAlarmHandlers rejects with the sanitized HaActionError when an arm or a disarm doesn't go through, instead of Home Assistant's raw error: read the error's code and translationKey rather than its message.
