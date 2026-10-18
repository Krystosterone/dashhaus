# Color restraint in status dashboards

**Status:** Complete
**Research date:** 2026-10-18
**Decision:** Keep one colour slot per tile and one accent hue family for energy states. Tighten through subtraction at higher density; do not introduce an unsupported hue-count or tile-density cutoff.

## Bottom line

The research supports the dashboard's restrained palette as a conservative local design rule, but it does not establish “one coloured element per tile” as a named universal status-dashboard pattern. It also found no universal point at which per-tile colour becomes noise.

Keep the current one-slot/one-accent system. At higher density, mute decorative colour, fills, glows, and unnecessary markers before adding hues. Every meaningful colour state must remain understandable through text, icon, shape, pattern, or a status label without relying on hue alone.

## Evidence

### Accessibility and semantic colour

- W3C says: **“Color is not the only way of distinguishing information”** and instructs authors to use information in addition to colour, such as shape or text.
- W3C's non-text guidance says a change of hue alone to convey a value or state is likely to fail the Use of Color criterion. Graphics required for understanding need sufficient contrast; aesthetic graphics do not carry the same requirement.
- Microsoft Power BI guidance warns that labels can become jumbled and that turning on all labels and markers can be distracting. It says to avoid colour as the only means of conveying information and to supplement or replace it with text or icons.

### Restrained palette precedent

- Carbon's first-party data-visualization palette explicitly includes a **“1-Color group”** and says monochromatic palettes are good for relationship and trend charts.
- Datawrapper's maintained guidance says the best approach is shades of a single hue in most charts and discusses reducing the number of colours by grouping categories or changing chart types.
- These sources support a small, coherent semantic palette. They do not prove that every tile should contain exactly one coloured element.

### Colour overload and attention

The Communications of the ACM eye-tracking article reports that overuse or misuse of colour can distract users and adversely affect decision making. It says unrelated contrasting colours can make viewers search for meaning that is not there, and reports:

> “This research shows dashboards with misuse and overuse of colors do not lead to poorer decision performance but rather decision makers using such dashboards taking longer to make a decision.”

This establishes a usability risk, not a universal tile-count rule. The practical test is whether a colour signal is task-relevant.

### Numeric thresholds: what not to import

- W3C publishes contrast thresholds — 4.5:1 for ordinary text and 3:1 for large text — and requires meaningful non-text graphics/states to be tested for contrast. These are accessibility thresholds, not hue-count or tile-density limits.
- ColorBrewer's original paper describes sequential, diverging, and qualitative schemes and reports scheme sets ranging from 3 to 12 classes. That range concerns map legends and data semantics. It is **not** evidence that a dashboard should use at most 12 hues, 7 hues, or any fixed number of coloured tiles.

## Design decision

1. Keep the current palette: neutrals by default, one documented accent family for energy, charcoal for non-energy on/selected states, hatching for absence, and one optional colour orb.
2. At the densest layout, suppress decorative colour, extra fills/glows, and unnecessary markers before introducing another hue.
3. Reserve the accent family for explicit energy/status meaning; do not recycle it for unrelated categories on the same surface.
4. Keep every meaningful state readable through a non-colour cue: text, icon, shape, hatching, or status label.
5. Check semantic orbs/states against adjacent backgrounds in both themes using the applicable WCAG contrast guidance.

These five points are project acceptance criteria. The claim that an additional fill or glow is decorative load when the tile's name, value, icon, and label already communicate the state is a local inference, not a directly observed rule from the sources.

## What this research does not establish

- No universal simultaneous-hue threshold.
- No universal tile-density threshold.
- No direct study validating the exact one-coloured-orb-per-tile pattern.
- No operational status-board postmortem was page-read; no incident-derived evidence is claimed.
- The ACM article's public page did not expose all sample details or effect sizes.
- ColorBrewer's 3–12 range must not become a dashboard cutoff.

## Sources

- [W3C — Understanding Success Criterion 1.4.1: Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [W3C — Understanding Success Criterion 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [W3C — Understanding Success Criterion 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Carbon Design System — Color Palettes](https://carbondesignsystem.com/data-visualization/color-palettes/)
- [Microsoft Learn — Design Power BI Reports for Accessibility](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports)
- [Harrower & Brewer — ColorBrewer.org: An Online Tool for Selecting Colour Schemes for Maps](https://www.cs.rpi.edu/~cutler/classes/visualization/S18/papers/colorbrewer.pdf)
- [Communications of the ACM — How Colors in Business Dashboards Affect Users' Decision Making](https://cacm.acm.org/research/how-colors-in-business-dashboards-affect-users-decision-making/)
- [PMC — Building color palettes in your data visualization style guides](https://pmc.ncbi.nlm.nih.gov/articles/PMC10797256/)
- [Datawrapper — A detailed guide to colors in data vis style guides](https://www.datawrapper.de/blog/colors-for-data-vis-style-guides)

## Provenance and verification

- Primary-source stream: 6 discovery calls, 10 page reads; complete.
- Independent-context stream: 6 discovery calls, 4 page reads; complete.
- Platform/edge-case stream: not dispatched because social/video or hard-to-index evidence was not material.
- Parent verification: 0 additional discovery calls, 10 page reads; all load-bearing sources used here were parent-reread.
- Parent-owned ledger: 14 URLs registered; 9 verified and cited, with unread/blocked entries excluded from evidence.
- Fresh review: **concerns**, not fail. The final report resolved the structural concerns by separating acceptance criteria from the single next action, labelling local inferences, and recording the exact ACM passage in the parent ledger.
- No code, Storybook story, repository behavior, Home Assistant configuration, or external system was changed by the research itself.

## Next action

Run one bounded usability comparison on the maximum-density layout: compare the current one-slot/one-accent rendering with a muted-colour variant, measuring time to find a requested state and time to identify an anomaly.
