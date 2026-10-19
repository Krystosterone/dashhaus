# Composition model

**Status:** complete · 2026-10-18 · **Codified:** README → "Composing for a glance" (commit `9849aa4`).

**Decision:** Keep the hybrid composition. Do not switch the whole dashboard to room-first.

## Evidence

- **Apple Home** documents Home-tab sections: Categories, Cameras, Scenes, Favorites, Rooms. Categories show "all related accessories on one screen, organized by room"; "Add to Favorites the accessories you use most often"; "Accessories are organized by room." Sections are reorderable, so this is not a fixed hierarchy to copy. [Intro to Home on iPhone](https://support.apple.com/en-ca/guide/iphone/iph22d98bbca/ios)
- **Google Home** lists "Device dashboards: At the top" with Favorites, All devices, Cameras, Lighting, Climate, Smoke & CO, Wifi. Favorites gives "quick access to devices, automations, and more"; "All devices" is "organized by room." No source establishes that Favorites comes before room inventory. [Meet the Google Home app](https://support.google.com/googlehome/answer/7071794?co=GENIE.Platform%3DAndroid&hl=en#zippy=%2Chome)
- **Home Assistant** calls the dashboard "an at-a-glance view of your home" and supports "a focused dashboard for the kitchen tablet." Its built-in Home dashboard is "an entry point to open other built-in dashboards based on areas or topics"; views and sections are authored and can be shown or hidden by condition. It does not say alerts must lead. [Dashboards](https://www.home-assistant.io/dashboards/), [views](https://www.home-assistant.io/dashboards/views/), [sections](https://www.home-assistant.io/dashboards/sections/)
- **Mushroom** defines itself as "a collection of cards for Home Assistant Dashboard UI" — card/editor scope, no top-level ordering model. Cards are vocabulary; hierarchy belongs to the dashboard composition layer. [Mushroom README](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/README.md)

## Design contract

1. Keep the hybrid: importance-first on phone/tablet, room/place-first on the wall panel.
2. Room access on phone/tablet stays one step away — our acceptance criterion, not a vendor tap-count.
3. Treat alert placement as an implementation inference; the conditional alert row is worth testing, not vendor precedent.
4. The wall panel's room/place lead follows Home Assistant's area-oriented default; no first-party Apple or Google wall-panel surface was established.
5. Keep hierarchy out of Mushroom: ordering belongs to the dashboard composition layer.

## Limits

- No reviewed source fixes a universal relative order between favorites/categories and room inventory.
- No source gives a tap-count threshold for cross-room versus room-first tasks.
- No first-party Apple or Mushroom wall-panel UI was established.
- No source shows Home Assistant's System Alerts example as conditionally rendered or that alerts must lead.

## Next action

Test the hybrid rule against three task paths — cross-room quick control, single-room lookup, actionable alert — recording tap depth and empty states.

## Sources

- [Apple: Intro to Home on iPhone](https://support.apple.com/en-ca/guide/iphone/iph22d98bbca/ios)
- [Google: Meet the Google Home app](https://support.google.com/googlehome/answer/7071794)
- [HA: Dashboards](https://www.home-assistant.io/dashboards/), [Multiple dashboards](https://www.home-assistant.io/dashboards/dashboards/), [Views](https://www.home-assistant.io/dashboards/views/), [Sections](https://www.home-assistant.io/dashboards/sections/)
- [Mushroom README](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/README.md)

**Provenance:** 7 load-bearing URLs parent-verified; fresh review passed with no findings.
