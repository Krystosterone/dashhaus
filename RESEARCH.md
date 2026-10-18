# Research prompts

Four deep-web-research prompts for open decisions in the dashboard composition and
attention budget. Completed prompts link to their research notes below; keep this
file as the decision index while the remaining prompts are open.

## 1. Composition model — DONE

**Status:** Complete (2026-10-18)

**Decision:** Keep a hybrid composition: function/importance-oriented quick access on phone/tablet, room/place context on the wall panel, with both room inventory and quick access available on every surface.

**Research note:** [Composition model research](RESEARCH-1-composition-model.md)

Our React widget library composes Home Assistant dashboards three ways: phone and tablet group sections by importance (alert row → hero card → glance strip → controls), a wall panel groups by room/place. Which composition model do Apple Home, Google Home, and Home Assistant's Mushroom cards actually use — room/place-first or function/importance-first — and what sits at the top of their screens? Decision: keep our importance-based phone/tablet grouping or switch to place-based. Shape: verdict on the model, 2–3 load-bearing facts per app with the page quoted, no template.

## 2. Attention budget precedent — DONE

- **Status:** complete; documented in [`research/attention-budget-precedent.md`](research/attention-budget-precedent.md).
- **Decision:** retune the glow treatment; do not redesign the semantic attention hierarchy.
- **Finding:** Apple and independent smart-home guidance support urgency-matched prominence, bounded attention, restrained updates, and quiet static states. They do not establish the exact `100% / 50% / 0%` values or a universal simultaneous-signal cap.
- **Next action:** run a local scan-task comparison of current damping versus semantic-urgency retuning.

Original prompt: Our dashboard widgets use a "glow budget": in a one-column section the first glowing card glows full and later ones render at half strength, and thin/mini rows never glow. Is there established precedent for capping simultaneous attention signals in glanceable UIs — watchOS complications, Dynamic Island / Live Activities, HomeKit tile states? Specifically: how do those surfaces rank alert > activity > static, and how many simultaneous color/glow/motion signals do they permit per screen? Decision: keep, retune, or redesign our glow damping mechanism. Shape: verdict with per-surface evidence, quoted, plus the specific numbers or limits any of them state.

## 3. Dense list identity

Our dashboard has a controls section: 8 thin rows (climate, covers, lights) that are visually near-identical — same shape, same pill, on-state reduced to role tone. How do Apple HIG lists and Home Assistant Mushroom-card dashboards keep dense, same-shaped control rows distinguishable at a glance — icon language, color, typography, grouping? Decision: fix the Controls column's per-row identity or accept it as-is. Shape: verdict, 2–3 concrete patterns each with source quoted, no template.

## 4. Color restraint in status dashboards

Our widget system restricts color to one "slot" element per tile (a small orb) and uses one accent hue for all energy states; everything else is neutrals. Is "one colored element per tile" a recognized pattern in data-dense status dashboards, and at what tile count does per-tile color become noise — Tufte's data-ink/small multiples, dashboard design guides, status-board postmortems? Decision: whether our color-slot rules need further tightening (muting at more densities, fewer hues). Shape: verdict, the load-bearing studies or guides quoted, any published thresholds on hue count or tile count.
