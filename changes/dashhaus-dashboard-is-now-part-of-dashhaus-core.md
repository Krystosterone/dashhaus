---
type: breaking
---
@dashhaus/dashboard is now part of @dashhaus/core, under its ./lovelace subpaths. A skin drops @dashhaus/dashboard from its package.json and changes each import: @dashhaus/dashboard becomes @dashhaus/core/lovelace, and @dashhaus/dashboard/skin, /card, /schema, /layout and /conformance become @dashhaus/core/lovelace/skin, /card, /schema, /layout and /conformance. Nothing else changes, and an app that only uses core's hooks loads none of it.
