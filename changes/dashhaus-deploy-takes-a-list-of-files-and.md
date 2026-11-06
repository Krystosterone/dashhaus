---
type: breaking
---
@dashhaus/deploy takes a list of files and two kinds of dashboard. A dashboard can name a skin's strategy, strategy: { type: "custom:orb-dashboard" }, and follow the skin as it updates, or give its card config directly instead of a card() factory. bundle: still works for one file. If you call the package from code: resolveBundle is now resolveFiles, which returns one target per file, and deploy() returns { resources, dashboards } instead of { version, resource, dashboards }.
