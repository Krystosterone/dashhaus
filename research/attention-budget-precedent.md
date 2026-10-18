# Attention-budget precedent

**Decision:** Retune the dashboard's attention treatment; do not redesign the hierarchy.

**Research date:** 2026-10-18 (UTC)

**Research run:** `home-dashboard-attention-budget-closeout-20261018T164540Z-1015288`

**Question:** Is there established precedent for capping simultaneous attention signals in glanceable UIs, and should the dashboard keep, retune, or redesign its glow damping mechanism?

## Decision

Keep the current semantic structure:

- one dominant attention claim in a one-column section;
- later active cards visibly subordinate;
- ordinary thin and mini rows without glow;
- a distinct treatment for urgent or problem states;
- non-color cues for important state changes.

Retune the contract so that **semantic urgency**, not card position alone, determines emphasis. The existing `100% / 50% / 0%` values are a local product heuristic. They are not an Apple-prescribed ratio, a documented universal rule, or a validated simultaneous-signal threshold.

The recommendation changes only if a local scan-task comparison shows that the current damping causes missed urgent states or materially slows target finding.

## Scope and method

The research covered:

- Apple watchOS Complications guidance;
- Apple Dynamic Island and Live Activities guidance;
- ActivityKit maximum and ordering documentation;
- independent smart-home notification guidance from Nielsen Norman Group.

The run was bounded and read-only. Three research streams and one fresh reviewer were used. The parent reread the six load-bearing URLs used in the final report. The source ledger registered ten URLs: six were parent-verified and four remained discovery-only. Discovery-only URLs were not used for load-bearing claims.

The reviewer returned `concerns`, not `fail`. The parent corrected the two artifact issues identified by review: an invalid evidence-matrix classification and the absence of one explicit next-action section. The remaining extraction limits are recorded below.

## Observed evidence

### 1. Dynamic Island and Live Activities

Apple documents two different maximum conditions:

- [`targetMaximumExceeded`](https://developer.apple.com/documentation/activitykit/activityauthorizationerror/targetmaximumexceeded): “The app has already started the maximum number of concurrent Live Activities.”
- [`globalMaximumExceeded`](https://developer.apple.com/documentation/activitykit/activityauthorizationerror/globalmaximumexceeded): “The device reached the maximum number of ongoing Live Activities.”

These pages establish that app-scoped and device-scoped maximums exist. The public pages read in this run do **not** expose the numeric ceilings. That is a bounded finding about the searched pages, not a claim that no number exists anywhere in Apple's documentation or across every OS release.

Apple's [Live Activities Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/live-activities) provide qualitative and presentation constraints:

- When multiple Live Activities are active, the minimal presentation displays **up to three** in the Dynamic Island.
- “Don’t add elements to your app that draw attention to the Dynamic Island.”
- “Update a Live Activity only when new content is available.” If the underlying content or status is unchanged, maintain the same display.
- “Alert people only for essential updates that require their attention.”
- System and custom animations have a **maximum duration of two seconds**.
- Compact and minimal presentations should fit within a **28pt-diameter circle** in limited-width contexts.

These are not a dashboard-wide glow budget. The important precedent is the separation between ordinary live state, essential alerts, and attention-drawing presentation.

### 2. ActivityKit priority ordering

Apple's [`relevanceScore`](https://developer.apple.com/documentation/activitykit/activitycontent/relevancescore) documentation says:

> “A score you assign that determines the order in which your Live Activities appear when you start several Live Activities for your app.”

The parent-verified page also states that the highest relevance score appears in the Dynamic Island, equal scores use start order, and the score determines Lock Screen order.

This is an ordering and selection precedent. It is **not** a documented opacity, glow, color, or percentage-damping schedule. Treating it as one would be a product inference.

### 3. watchOS complications

Apple's [Complications Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/complications) say:

> “Identify essential, dynamic content that people want to view at a glance.”

They also say that a static complication without meaningful data may be less likely to remain prominent on the watch face, advise designers to carefully consider update timing, and state:

> “Avoid using color as the only way to communicate important information.”

The precedent is semantic: meaningful, changing information deserves glanceable prominence; static or redundant content can recede. Color and glow cannot be the only state channel.

### 4. Smart-home notification guidance

Nielsen Norman Group's [Designing Useful Smart Home Notifications](https://www.nngroup.com/articles/smart-home-notifications/) reports that:

> “People value alerts that are timely, relevant, and specific in the information they’re conveying; based on their urgency and goal, notifications should also have the right intensity and frequency and be delivered through appropriate channels.”

It also states:

> “If all alerts look the same, users will struggle to prioritize them and may treat them as if they had the same urgency level.”

The page includes participant reports of notification overload and contextual examples such as 50% versus 20% battery alerts. Those figures are examples, not universal thresholds and not evidence for a dashboard signal cap.

## Synthesis by surface

### watchOS complications

**Supports:** keeping the hierarchy, keeping static rows quiet, and preserving non-color state cues.

**Does not support:** an exact glow ratio or a universal cap on simultaneous color or motion.

### Dynamic Island and Live Activities

**Supports:** priority ordering, one dominant attention claim, restrained updates, essential-only alerts, bounded animation, and limiting competing presentations.

**Does not support:** interpreting `relevanceScore`, “up to three,” or the two-second animation rule as a universal dashboard opacity or glow formula.

### Smart-home notifications

**Supports:** matching intensity and frequency to urgency rather than presenting every state with equal prominence.

**Does not support:** treating participant counts, battery examples, or notification cadence examples as general numeric limits.

## Design contract for the dashboard

1. The first glow is the **primary attention claim**, not simply the first card rendered.
2. Later active cards are subordinate by default, but their treatment follows semantic urgency rather than a fixed 50% promise.
3. Thin and mini rows stay glow-free for ordinary states.
4. Urgent or problem states receive a distinct semantic marker rather than making every active state brighter.
5. Every important state has a non-color cue: text, icon, position, or meaningful state motion.
6. `100% / 50% / 0%` may remain an initial local tuning heuristic, but it must not be documented as an external standard.

## What remains unresolved

- No numeric Apple concurrency ceiling was exposed by the two maximum-error pages.
- No fresh source supplied a universal maximum for simultaneous glow, color, motion, or attention signals.
- The exact damping values still need product validation in the dashboard's own scan context.
- The local scan-task comparison was not run in this read-only research phase.

These are bounded gaps, not reasons to restart broad web research.

## Next action

Run a local scan-task comparison of the current damping versus semantic-urgency retuning. Compare missed urgent-state rate and target-finding time; do not search for a universal percentage.

## Sources

- [Apple Complications HIG](https://developer.apple.com/design/human-interface-guidelines/complications)
- [Apple Live Activities HIG](https://developer.apple.com/design/human-interface-guidelines/live-activities)
- [ActivityKit: targetMaximumExceeded](https://developer.apple.com/documentation/activitykit/activityauthorizationerror/targetmaximumexceeded)
- [ActivityKit: globalMaximumExceeded](https://developer.apple.com/documentation/activitykit/activityauthorizationerror/globalmaximumexceeded)
- [ActivityKit: relevanceScore](https://developer.apple.com/documentation/activitykit/activitycontent/relevancescore)
- [NN/G: Designing Useful Smart Home Notifications](https://www.nngroup.com/articles/smart-home-notifications/)

## Provenance and limits

The final parent ledger contains ten registered URLs. Six are verified and cited above; four discovery-only URLs were excluded from load-bearing claims. The reviewer directly reread four Apple URLs within its four-page cap, but did not reread the Complications or NN/G pages in that reviewer pass. Some dynamic Apple passages were omitted by the reviewer's extraction route; the parent browser rereads and ledger remain the authority for those quoted passages. No implementation, visual test, or repository behavior change was part of the research phase.
