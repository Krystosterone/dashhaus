# Attention budget precedent

**Status:** complete · 2026-10-18 · **Codified:** `attention-budget` skill, README glow contract, AGENTS.md hard rule (commit `2d126c7`).

**Decision:** Keep the one-claim hierarchy; retune the damping so semantic urgency, not card position, decides emphasis. The `100% / 50% / 0%` values are a local heuristic, not an Apple-prescribed ratio.

## Evidence

- **Live Activities maximums.** ActivityKit documents `targetMaximumExceeded` ("The app has already started the maximum number of concurrent Live Activities") and `globalMaximumExceeded` (device-wide). The public pages read do not expose the numeric ceilings. [targetMaximumExceeded](https://developer.apple.com/documentation/activitykit/activityauthorizationerror/targetmaximumexceeded), [globalMaximumExceeded](https://developer.apple.com/documentation/activitykit/activityauthorizationerror/globalmaximumexceeded)
- **Live Activities HIG.** The minimal presentation displays up to three in the Dynamic Island; "Don't add elements to your app that draw attention to the Dynamic Island"; "Update a Live Activity only when new content is available"; "Alert people only for essential updates that require their attention"; animations max two seconds; compact presentations fit a 28pt-diameter circle. Presentation constraints, not a dashboard glow budget. [Live Activities HIG](https://developer.apple.com/design/human-interface-guidelines/live-activities)
- **ActivityKit ordering.** `relevanceScore` "determines the order in which your Live Activities appear"; the highest appears in the Dynamic Island, ties use start order. An ordering precedent, not an opacity, glow, or percentage-damping schedule. [relevanceScore](https://developer.apple.com/documentation/activitykit/activitycontent/relevancescore)
- **watchOS complications.** "Identify essential, dynamic content that people want to view at a glance"; "Avoid using color as the only way to communicate important information." Meaningful, changing information deserves glanceable prominence; colour and glow cannot be the only state channel. [Complications HIG](https://developer.apple.com/design/human-interface-guidelines/complications)
- **NN/G smart-home notifications.** "People value alerts that are timely, relevant, and specific"; "If all alerts look the same, users will struggle to prioritize them." Match intensity and frequency to urgency. Battery examples (50% vs 20%) are examples, not universal thresholds. [Designing Useful Smart Home Notifications](https://www.nngroup.com/articles/smart-home-notifications/)

## Design contract

1. The first glow is the primary attention claim, not merely the first card rendered.
2. Later active cards are subordinate by default, but treatment follows semantic urgency rather than a fixed 50% promise.
3. Thin and mini rows stay glow-free for ordinary states.
4. Urgent or problem states receive a distinct semantic marker rather than more brightness.
5. Every important state has a non-colour cue: text, icon, position, or meaningful state motion.
6. `100% / 50% / 0%` may remain an initial local tuning heuristic; it must not be documented as an external standard.

## Limits

- No numeric Apple concurrency ceiling was exposed by the two maximum-error pages.
- No source supplied a universal maximum for simultaneous glow, colour, motion, or attention signals.
- Apple's `relevanceScore`, "up to three", and the two-second rule are ordering and presentation precedents, not opacity formulas.
- The damping values still need product validation in this dashboard's scan context.

## Next action

Run a local scan-task comparison of the current damping versus semantic-urgency retuning: missed-urgent rate and target-finding time. Do not search for a universal percentage.

## Sources

- [Apple Complications HIG](https://developer.apple.com/design/human-interface-guidelines/complications)
- [Apple Live Activities HIG](https://developer.apple.com/design/human-interface-guidelines/live-activities)
- [ActivityKit: targetMaximumExceeded](https://developer.apple.com/documentation/activitykit/activityauthorizationerror/targetmaximumexceeded)
- [ActivityKit: globalMaximumExceeded](https://developer.apple.com/documentation/activitykit/activityauthorizationerror/globalmaximumexceeded)
- [ActivityKit: relevanceScore](https://developer.apple.com/documentation/activitykit/activitycontent/relevancescore)
- [NN/G: Designing Useful Smart Home Notifications](https://www.nngroup.com/articles/smart-home-notifications/)

**Provenance:** 10 URLs registered; 6 parent-verified and cited; reviewer returned concerns, corrected.
