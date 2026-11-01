# Research

Open work only. A decision that is implemented lives in the doc, skill or code that owns it, not here; git history
holds the notes it came from. Component-level gaps the implemented contracts still imply are in
[mechanism-backlog.md](mechanism-backlog.md).

| Open item | Status | What is open | Gate | Where it lands |
| --- | --- | --- | --- | --- |
| [09 Community prior art and reusable patterns](09-community-prior-art-and-patterns.md) | open | Keep the skin-first architecture; adopt dev entity checks, error metadata, registry hooks, a core contract and headless parity; reject auth-in-core, generated types, presentation enrichment and action auto-retry | Desk research 2026-10-31; no runtime adoption yet | This note → Next steps |
| [Mechanism backlog item 1](mechanism-backlog.md) | open | Give cards an urgency input to glow damping without changing the default values | Participant scan comparison: missed-urgent rate and target-finding time | `src/skins/orb/dashboards/layout.css`, `src/skins/orb/shared/ui.tsx` |
| Live, iOS Safari and screen-reader validation | open | The contracts are verified on injected transports and Chromium only | A real authenticated connection, a service action, reconnect and state readback; a sheet drag and a track scroll in iOS Safari; press/latch, range and keypad with screen readers | `spec/home-assistant.md` for the live boundary; the affected skill's Verify for the rest |

No note here is a second source of truth: an implemented decision is `spec/orb.md`, `spec/field.md`,
`spec/home-assistant.md`, a skill under `.agents/skills/`, or the code.
