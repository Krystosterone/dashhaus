# Composition model

**Status:** complete · 2026-10-18 · **Codified:** README → Dashboards → "Composing for a glance" (commit `9849aa4`).

**Decision:** Keep the hybrid composition. Normal order is frequent actions, household status, then the room/environment glance; do not switch the whole dashboard to room-first.

The priority order is a product decision from the 2026-10-24 dashboard critique, not a universal order established by the sources below.

## Evidence

- **Apple Home** documents Home-tab sections: Categories, Cameras, Scenes, Favorites, Rooms. Categories show "all related accessories on one screen, organized by room"; "Add to Favorites the accessories you use most often"; "Accessories are organized by room." The same page documents "Reorder Sections", so this is not a fixed hierarchy to copy. [Intro to Home on iPhone](https://support.apple.com/en-ca/guide/iphone/iph22d98bbca/ios)
- **Google Home** lists "Device dashboards: At the top" with Favorites, All devices, Cameras, Lighting, Climate, Smoke & CO, Wifi. Favorites gives "quick access to devices, automations, and more"; "All devices" is "organized by room." No source establishes that Favorites comes before room inventory; users can also create a set of Favorites specific to their Pixel Tablet. [Meet the Google Home app](https://support.google.com/googlehome/answer/7071794?co=GENIE.Platform%3DAndroid&hl=en#zippy=%2Chome)
- **Home Assistant** calls the dashboard "an at-a-glance view of your home" and supports "a focused dashboard for the kitchen tablet." Its built-in Home dashboard is "an entry point to open other built-in dashboards based on areas or topics"; views and sections are authored and can be shown or hidden by condition. It does not say alerts must lead. [Dashboards](https://www.home-assistant.io/dashboards/), [views](https://www.home-assistant.io/dashboards/views/), [sections](https://www.home-assistant.io/dashboards/sections/)
- **Mushroom** defines itself as "a collection of cards for Home Assistant Dashboard UI" — card/editor scope, no top-level ordering model. Cards are vocabulary; hierarchy belongs to the dashboard composition layer. [Mushroom README](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/README.md)

## Design contract

1. Keep the hybrid: importance-first on phone/tablet, room/place-first on the wall panel.
2. In normal state, order frequent actions before household status, then room/environment glance.
3. Automatic discovery cannot infer frequency; it orders all actionable sections first and leaves final pinning to the author.
4. Do not add a conditional alert region yet. Problem states stay in place with the shared warn marker.
5. Room access on phone/tablet stays one step away — our acceptance criterion, not a vendor tap-count.
6. The wall panel's room/place lead follows Home Assistant's area-oriented default; no first-party Apple or Google wall-panel surface was established.
7. Keep hierarchy out of Mushroom: ordering belongs to the dashboard composition layer.

## Limits

- No reviewed source fixes a universal relative order between favorites/categories and room inventory.
- No source gives a tap-count threshold for cross-room versus room-first tasks.
- No first-party Apple or Mushroom wall-panel UI was established.
- No source shows Home Assistant's System Alerts example as conditionally rendered or that alerts must lead.
- The Mushroom README does not justify the stronger claim that Mushroom has no hierarchy feature anywhere in its project.

## Validation result

Run 2026-10-24 against the Phone, Tablet, Wall panel, Ungrouped, and automatic-layout stories:

- **Cross-room quick control:** pass; phone and tablet lead with pinned quick actions, and automatic discovery puts every actionable section first.
- **Household and room glance:** pass for the current scope; household status precedes room/environment readings. Full room inventory/navigation remains outside the demonstrated phone and tablet surfaces.
- **Actionable alert:** deliberately remains in place. The open Garage door keeps its warning marker in Quick actions; no conditional alert region is reserved.
- **Wall constraint:** pass at 1280 × 800 with no horizontal or vertical overflow.
- **Identity and hierarchy:** pass at the target viewports; visible primary labels do not clip, section headings are `h2`, and cards inside sections are `h3`.

This refinement closes ordering and first-frame cohesion. Full room navigation remains a separate composition concern.

## Sources

- [Apple: Intro to Home on iPhone](https://support.apple.com/en-ca/guide/iphone/iph22d98bbca/ios)
- [Google: Meet the Google Home app](https://support.google.com/googlehome/answer/7071794)
- [HA: Dashboards](https://www.home-assistant.io/dashboards/), [Multiple dashboards](https://www.home-assistant.io/dashboards/dashboards/), [Views](https://www.home-assistant.io/dashboards/views/), [Sections](https://www.home-assistant.io/dashboards/sections/)
- [Mushroom README](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/README.md)

**Provenance:** 7 URLs parent-verified; reviewer: no findings.
