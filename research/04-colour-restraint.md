# Colour restraint in status dashboards

**Status:** complete · 2026-10-18 · **Codified:** README → "Design rules every widget follows" → "One palette" (commit `492e97d`).

**Decision:** Keep one colour slot per tile and one accent hue family for energy states. Tighten through subtraction at higher density; do not introduce an unsupported hue-count or tile-density cutoff.

## Evidence

- **W3C 1.4.1.** "Color is not the only way of distinguishing information" — supplement colour with shape or text. [Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- **W3C 1.4.11.** A change of hue alone to convey a value or state is likely to fail; meaningful graphics need contrast, aesthetic graphics do not carry the requirement. [Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- **Contrast thresholds.** 4.5:1 for ordinary text, 3:1 for large text — accessibility thresholds, not hue-count or tile-density limits. [Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- **Restrained palettes.** Carbon ships a "1-Color group" for monochromatic charts; Datawrapper recommends shades of a single hue in most charts and reducing colour count by grouping. [Carbon](https://carbondesignsystem.com/data-visualization/color-palettes/), [Datawrapper](https://www.datawrapper.de/blog/colors-for-data-vis-style-guides)
- **Power BI accessibility guidance** warns that labels can become jumbled and enabling all labels and markers is distracting; avoid colour as the only means of conveying information and supplement it with text or icons. [Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports)
- **Colour overload.** ACM eye-tracking: "This research shows dashboards with misuse and overuse of colors do not lead to poorer decision performance but rather decision makers using such dashboards taking longer to make a decision." A usability risk, not a universal tile-count rule. [Communications of the ACM](https://cacm.acm.org/research/how-colors-in-business-dashboards-affect-users-decision-making/)
- **What not to import.** ColourBrewer scheme sets range from 3 to 12 classes — map-legend semantics, not evidence for a dashboard hue or tile cutoff. [Harrower & Brewer](https://www.cs.rpi.edu/~cutler/classes/visualization/S18/papers/colorbrewer.pdf)

## Design contract

1. Keep the current palette: neutrals by default, one documented accent family for energy, charcoal for non-energy on/selected, hatching for absence, one optional colour orb.
2. At the densest layout, suppress decorative colour, fills, glows and unnecessary markers before introducing another hue.
3. Reserve the accent family for explicit energy/status meaning; do not recycle it for unrelated categories on the same surface.
4. Every meaningful state must read through a non-colour cue: text, icon, shape, hatching, or status label.
5. Check semantic orbs/states against adjacent backgrounds in both themes using the applicable WCAG contrast guidance.

## Limits

- No universal simultaneous-hue threshold; no universal tile-density threshold.
- No direct study validates the exact one-coloured-orb-per-tile pattern.
- No operational status-board postmortem was page-read; no incident-derived evidence is claimed.
- The ACM article's public page did not expose all sample details or effect sizes.
- ColourBrewer's 3–12 range must not become a dashboard cutoff.

## Validation status

Blocked 2026-10-18. Time to find a requested state and time to identify an anomaly require participant behaviour, and no participant dataset or defined muted-colour comparison fixture exists. Inventing either would invalidate the comparison; no palette or density rule changes are authorized.

## Next action

Define the bounded muted-colour fixture, then run it against the current maximum-density one-slot/one-accent rendering with participants and record both timing measures.

## Sources

- [W3C: Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [W3C: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [W3C: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Carbon: Color Palettes](https://carbondesignsystem.com/data-visualization/color-palettes/)
- [Microsoft: Design Power BI Reports for Accessibility](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports)
- [Harrower & Brewer: ColourBrewer paper](https://www.cs.rpi.edu/~cutler/classes/visualization/S18/papers/colorbrewer.pdf)
- [ACM: How Colors in Business Dashboards Affect Users' Decision Making](https://cacm.acm.org/research/how-colors-in-business-dashboards-affect-users-decision-making/)
- [PMC: Building color palettes in your data visualization style guides](https://pmc.ncbi.nlm.nih.gov/articles/PMC10797256/)
- [Datawrapper: A detailed guide to colors in data vis style guides](https://www.datawrapper.de/blog/colors-for-data-vis-style-guides)

**Provenance:** 14 URLs registered; 9 parent-verified and cited; reviewer: concerns, resolved.
