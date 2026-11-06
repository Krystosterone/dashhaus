---
type: internal
---
The Release workflow waits for npm to serve a just-published version, up to ten minutes, reading only addresses npm's CDN can't serve stale, instead of failing after a minute.
