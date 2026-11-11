---
type: breaking
---
In @dashhaus/core, when the callService you pass createAlarmHandlers rejects an arm or a disarm with something other than an HaActionError, the handler rejects with a sanitized HaActionError instead, keeping only Home Assistant's translation_key and code (as translationKey and providerCode): read those rather than the original error. A wrong code resolves false only when it carries Home Assistant's translation_key "invalid_code", or translationKey on an HaActionError, so reject with one of those to keep the keypad's wrong-code answer.
