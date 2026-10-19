# Research

Deep-web research behind the dashboard's design decisions. Each note carries the decision, decisive evidence, the design contract (with an implementation boundary where the research gave one), limits, and a one-line provenance. Status and codified locations are tracked here; component gaps the contracts imply live in [mechanism-backlog.md](mechanism-backlog.md).

| Note | Status | Decision | Codified | Validation status |
| --- | --- | --- | --- | --- |
| [01 Composition model](01-composition-model.md) | complete | Keep the hybrid: importance-first on phone/tablet, room-first on the wall | README → Dashboards → Composing for a glance | Run 2026-10-18: quick control passed; room lookup failed; alert path was partial, then gained a conditional experiment |
| [02 Attention budget](02-attention-budget.md) | complete | Retune damping: urgency decides emphasis, not position | `attention-budget` skill + README + AGENTS.md | Blocked: participant scan metrics required; no damping change authorized |
| [03 Dense list identity](03-dense-list-identity.md) | complete | Keep the thin-row shell; fix per-row identity content | `row-identity` skill + README + AGENTS.md | Passed after fixes 2026-10-18: stable climate/cover identity, shared warning cue, 56 px rows |
| [04 Colour restraint](04-colour-restraint.md) | complete | Keep one slot, one accent; subtract before adding hues | README → One palette | Blocked: participant timing and a defined muted-colour fixture required |
