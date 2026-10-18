# Composition model research

**Status:** Complete
**Research date:** 2026-10-18
**Decision:** Keep a hybrid composition. Do not switch the whole dashboard to room-first.

## Bottom line

The vendor evidence does not support choosing one global model. It supports two layers that coexist:

- **Quick access / importance:** favorites, categories, device dashboards, scenes, and actionable exceptions.
- **Spatial inventory:** rooms, areas, and all-device views organized by room.

Apply that split by surface:

- **Phone/tablet:** keep the existing function/importance-oriented landing intent, with room access explicit and one step away.
- **Wall panel:** use the room/place frame as the primary context, with local quick actions and exceptions. This is an implementation inference, not a vendor-documented wall-panel pattern.
- **Alerts:** a conditional alert row is worth testing, but it is not vendor precedent.
- **Mushroom:** use it as card/component vocabulary; the dashboard composition layer owns hierarchy and breakpoint variants.

## Evidence by candidate

### Apple Home

- Apple documents Home-tab sections of **Categories, Cameras, Scenes, Favorites, and Rooms**.
- Categories provide cross-room access while preserving spatial context: **“show all related accessories on one screen, organized by room.”** Favorites and Rooms remain separate paths: **“Add to Favorites the accessories you use most often”** and **“Accessories are organized by room.”**
- Apple's figure describes an illustrative top-to-bottom composition of categories, scenes, cameras, then one room's status. The same page documents **“Reorder Sections”**, so this is not a fixed hierarchy to copy.

Source: [Apple Support — Intro to Home on iPhone](https://support.apple.com/en-ca/guide/iphone/iph22d98bbca/ios)

### Google Home

- Google documents **“Device dashboards: At the top”** and lists Favorites, All devices, Cameras, Lighting, Climate, Smoke & CO, and Wifi.
- Favorites provides **“quick access to devices, automations, and more”** while **“All devices”** is **“organized by room.”**
- Google supports device-specific composition: users can create a set of Favorites specific to their **Pixel Tablet**.

Google does **not** establish that Favorites comes before room inventory. The defensible conclusion is coexistence of quick access and spatial inventory, not a fixed relative order.

Source: [Google Home and Nest Help — Meet the Google Home app](https://support.google.com/googlehome/answer/7071794?co=GENIE.Platform%3DAndroid&hl=en#zippy=%2Chome)

### Home Assistant

- Home Assistant calls the dashboard the **“at-a-glance view of your home”** and explicitly supports **“a focused dashboard for the kitchen tablet.”**
- Its built-in Home dashboard is **“an entry point to open other built-in dashboards based on areas or topics such as lights, climate, or media players”**; the first view shows areas and entities.
- Its view/section model supports authored grouping. The documentation shows separate **System Alerts** and **Status & Info** sections and says sections can be shown or hidden based on conditions. It does not say alerts must lead or that the example is conditionally rendered.

Sources: [Dashboards](https://www.home-assistant.io/dashboards/), [Multiple dashboards](https://www.home-assistant.io/dashboards/dashboards/), [Dashboard views](https://www.home-assistant.io/dashboards/views/), [Sections](https://www.home-assistant.io/dashboards/sections/)

### Mushroom

- Mushroom's maintained README defines it as **“a collection of cards for Home Assistant Dashboard UI”** whose mission is to provide easy-to-use components.
- The read source describes card/editor scope; it does not specify a top-level ordering model. That is a limit of the source, not proof that Mushroom has no hierarchy feature anywhere in the project.

Source: [Mushroom README](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/README.md)

## Design decision

1. **Keep the hybrid intent.** Do not replace phone/tablet with a room directory.
2. **Keep room access parallel and explicit.** “One step away” is a project acceptance criterion, not a verified vendor tap-count threshold.
3. **Treat alert placement as an implementation inference.** A conditional alert row is worth testing because the platform supports authored and conditionally visible sections, but it must not be presented as a vendor standard.
4. **Use device-context framing.** The wall-panel room/place lead follows from Home Assistant's area-oriented default and device-specific dashboard guidance; no first-party Apple/Google wall-panel surface was established.
5. **Keep hierarchy out of Mushroom.** Cards are primitives for this decision; ordering belongs to the dashboard composition layer.

## What this research does not establish

- No reviewed source establishes a universal relative ordering between favorites/categories and room inventory.
- No reviewed source gives a tap-count threshold for cross-room versus room-first tasks.
- No first-party Apple Home or Mushroom wall-panel UI was established.
- No source establishes that Home Assistant's System Alerts example is conditionally rendered or that alerts must lead.
- The Mushroom README does not justify the stronger universal claim that Mushroom has no hierarchy feature anywhere in its project.

## Provenance and verification

- Primary-source stream: 4 discovery calls, 10 page reads.
- Independent classification stream: 6 discovery calls, 4 page reads.
- Parent verification: 7 load-bearing URLs re-read; expandable Apple/Google content was checked in the rendered browser page.
- Fresh evidence review: **pass**, with no findings.
- No code, Storybook story, repository behavior, or Home Assistant configuration was changed by this research.

## Next action

If implementation is authorized later, test the hybrid rule against three task paths—cross-room quick control, single-room lookup, and an actionable alert—and record tap depth plus empty-state behavior.
