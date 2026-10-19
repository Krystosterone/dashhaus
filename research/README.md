# Research

Deep-web research behind the dashboard's design decisions. Each note carries the decision, load-bearing evidence, the design contract, limits, and a one-line provenance. Status and codified locations are tracked here; component gaps the contracts imply live in [mechanism-backlog.md](mechanism-backlog.md).

| Note | Decision | Codified | Open validation |
| --- | --- | --- | --- |
| [01 Composition model](01-composition-model.md) | Keep the hybrid: importance-first on phone/tablet, room-first on the wall | README → Composing for a glance | Three-task-path test (tap depth, empty states) |
| [02 Attention budget](02-attention-budget.md) | Retune damping: urgency decides emphasis, not position | `attention-budget` skill + README + AGENTS.md | Scan-task comparison (damping vs urgency) |
| [03 Dense list identity](03-dense-list-identity.md) | Keep the thin-row shell; fix per-row identity content | `row-identity` skill + README + AGENTS.md | Visual QA pass on Controls rows |
| [04 Colour restraint](04-colour-restraint.md) | Keep one slot, one accent; subtract before adding hues | README → One palette | Max-density usability comparison |
