---
date: 2026-11-01T00:00:00+00:00
git_commit: 0710926
branch: docs/landing-redesign
repository: dashhaus
topic: "Entity domain coverage against hass-react: which domains become cards, and in what order"
tags: [research, home-assistant, entity-domains, cards, roadmap]
status: complete
last_updated: 2026-11-01
---

# Research: Entity domain coverage against `hass-react`

> **Scope.** `hass-react` 1.0.0's export surface and the 17 entity-domain hooks documented at `/docs/entities/<domain>`, observed on 2026-11-01, compared with Dashhaus at `0710926`: `packages/core/src/entities/`, `packages/core/src/ha/hooks/`, `src/skins/orb/cards/`, `src/skins/field/cards/` and both Lovelace kind tables. The 17 are `light`, `climate`, `sensor`, `binary_sensor`, `todo`, `switch`, `cover`, `fan`, `lock`, `media_player`, `camera`, `number`, `weather`, `vacuum`, `calendar`, `scene` and `alarm_control_panel`. `useDateTime` (a clock, which Dashhaus draws in its headers) and the generic `Entity` export are not domains; `humidifier`, `owlet` and `sound` are Dashhaus models outside `hass-react`'s set. This note decides coverage and order only: no card, issue or contract changes here.

## Research question

Which of `hass-react`'s 17 entity domains should Dashhaus draw as cards, which does it already cover, and in what order should the gaps be built?

## Decision

**Seven domains are covered, seven are gaps and three are not a fit as cards. The gap order is `fan`, `lock`, `binary_sensor`, `calendar`, `vacuum`, `media_player`, `camera`.**

- **Covered (7):** `light`, `climate`, `sensor`, `switch`, `cover`, `weather`, `alarm_control_panel` — each has an Orb card and a Field module today. The two skins carry the same 10 cards; the other three (`humidifier`, `owlet`, `sound`) are outside `hass-react`'s set.
- **Gaps (7, ranked below):** `fan`, `lock`, `binary_sensor`, `calendar`, `vacuum`, `media_player`, `camera`.
- **Not a fit as a card (3):** `todo`, `number`, `scene`.
- **The next four cards are `fan`, `lock`, `binary_sensor` and `calendar`.** `vacuum` and `media_player` follow when a page wants them; `camera` is deferred until a skin owns a still surface.
- **Every gap gets its own model, mapper and actions.** `hass-react`'s domain logic is not copied: an absent reading becomes zero, capability is inferred from a possibly stale attribute, RGB is the only colour, and a feature gate throws from the handler (see [09](09-community-prior-art-and-patterns.md) → What not to take). The normalized model, absent-reading rules and non-throwing `serviceRunner()` handlers are Dashhaus's own.

## Verdicts

Covered first, then the gaps in build order, then the domains that should stay without a card.

| Domain | Verdict | Why |
| --- | --- | --- |
| `light` | Covered | Orb and Field light cards: on/off, brightness, colour temperature and colour, today's on-minutes. |
| `climate` | Covered | Orb and Field climate cards: mode, action, current and target or range setpoints, preset and fan modes, today's running minutes. |
| `sensor` | Covered | Environmental reading: temperature and humidity composed with battery. A generic numeric sensor is a reading variant, not a domain gap; see Limits. |
| `switch` | Covered | The toggle card draws `switch.*` and `input_boolean.*` with on/off, duration options and history; a sound machine's switch takes the `sound` card instead. |
| `cover` | Covered | Open, close and stop, position and tilt, today's openness. |
| `weather` | Covered | Conditions, readings, hourly and daily forecasts, with AQI and sun companions. |
| `alarm_control_panel` | Covered | Modes, keypad, exit and entry delays, open sensors, today's armed minutes. |
| `fan` | Gap | The common controllable device with no card; speed, presets, oscillation and direction reuse the light card's groove. |
| `lock` | Gap | Front-door state with one deliberate action; no card and no safe unlock path yet. |
| `binary_sensor` | Gap | Door, window, leak and smoke states have no card, though the alarm card's `open_sensors` already points at them. |
| `calendar` | Gap | The next event is a wall-panel glance; no card and no ranged event read. |
| `vacuum` | Gap | Robot state, battery and one action; no card. |
| `media_player` | Gap | Now playing, transport and volume; the widest service matrix of any gap. |
| `camera` | Gap | A still or a stream needs an image lifecycle the core does not own. |
| `todo` | Not a fit | An editable, variable-length list is the content; fixed footprints and one-model cards would hide it. |
| `number` | Not a fit | A raw setpoint belongs to the device card — sound already composes its volume `number.*` — so a slider card would duplicate it. |
| `scene` | Not a fit | No state to draw; activation is a one-shot button, which the card vocabulary keeps a native button, not a card. |

## Ranked shortlist

| # | Domain | Model and interaction | Companions | Skins | What a dashboard gains | What it costs |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `fan` | Direct; control. `fan.*`: on/off, percentage, preset modes, oscillating, direction, support flags. Tap toggles, the groove sets speed, the sheet holds presets and direction. | None. | Orb, Field. | Bedroom and ceiling fans stop falling back to Home Assistant's generic tile; speed is the light card's groove, so the page reads the same. | A model and mapper, a demo and the standard stories; five capability-gated services (`toggle`, `set_percentage`, `set_preset_mode`, `oscillate`, `set_direction`); on-minutes from the existing `onOffHistoryFromHass`; no new primitive. |
| 2 | `lock` | Composed; control. `lock.*`: locked, unlocked, locking, unlocking, jammed, unavailable; `supportsOpen`, `codeFormat`, changed-by. Tap locks; the sheet confirms an unlock or takes the code; optional open. | An optional battery `sensor.*` from the same device. | Orb, Field. | Front-door state at a glance and one deliberate unlock; the security row now has both the alarm and the door. | A model and mapper, a demo and stories; `lock`, `unlock` and an optional `open`; an unlock confirmation in the sheet, because a stray tap must not open a door and hold already opens details in Orb; last-change only, no hourly history. |
| 3 | `binary_sensor` | Composed; reading. `binary_sensor.*`: on/off/unavailable, device class, last changed. State words follow the class. | An optional battery `sensor.*` from the same device. | Orb, Field. | The safety glance — front door, window, leak, smoke — and the open sensors the alarm sheet lists finally have a card of their own. | A model and mapper with per-class words (moisture `on` is wet, door `on` is open), a demo and stories; no actions; open-minutes reused from `onOffHistoryFromHass` if history is wanted; the cheapest gap. |
| 4 | `calendar` | Composed; reading. A primary `calendar.*` plus its events read over a fixed horizon; optional additional calendars. Next event and time until; today's events in the sheet. | Additional calendars (optional); its events are its own ranged read. | Orb, Field. | What is next and when — the wall panel's most common question besides the weather. | A model and mapper, a demo and stories; a ranged `calendar.get_events` read through `useHaRequest`/`store.query` (as forecasts use), event and all-day formatting; no actions; no hourly history. |
| 5 | `vacuum` | Direct; control. `vacuum.*`: cleaning, docked, returning, paused, idle, error; battery level, fan speed, status. Start or pause, dock, locate. | None; battery is an attribute. | Orb, Field. | A robot vacuum's state and one action without Home Assistant's generic tile. | A model and mapper, a demo and stories; `start`, `pause`, `return_to_base` and `locate`, gated; history optional, from the same parser; state names vary by integration. |
| 6 | `media_player` | Direct; control. `media_player.*`: playback state, title and artist, duration and position, volume, mute, source, feature flags. Play or pause, previous or next, volume; source in the sheet. | None. | Orb, Field. | Now playing on a kitchen or wall panel, with the volume surface the sound card already uses; Field's screen has the shape. | A model and mapper, a demo and stories; the widest service matrix (play/pause, previous/next, volume, mute, source, power), gated; a ticking position and optional artwork; no hourly history. |
| 7 | `camera` | Direct; reading. `camera.*`: state and a still. A still in the card; a press opens a stream. | None. | Orb first; Field once its plate has a media surface. | A doorbell or nursery still on the dashboard. | A model and mapper, a demo and stories; no actions; no history; a refreshable signed image (`entity_picture`) or a proxy read, and HLS for a stream — a lifecycle `@dashhaus/core` does not own — plus the privacy and frame cost of a moving picture on a wall panel. Deferred. |

### How the order was decided

The order weighs reused mechanism before new machinery, then what a glance changes. `fan` needs no new primitive, read or lifecycle. `lock` is the highest-value control and spends its cost on one deliberate interaction. `binary_sensor` is the cheapest reading and makes the alarm's open sensors visible. `calendar` needs one ranged read but answers the wall panel's most common question. `vacuum` and `media_player` are single-device controls whose cards are worth less than the devices already ranked; `media_player` also has the largest feature surface of any gap. `camera` is blocked on a mechanism, not on demand.

## Limits

- The per-domain capabilities were read from `hass-react`'s hook sources behind its docs pages; the rendered pages are client-side. The survey is version 1.0.0, the one in [09](09-community-prior-art-and-patterns.md).
- No live Home Assistant was involved. Service and attribute names are Home Assistant's; nothing was exercised against a device.
- A generic numeric `sensor.*` (CO2, power, energy) is not drawable by the environmental sensor card. That is a reading variant, not one of the 17 domains, so it is not ranked here; it would be the cheapest card after `fan` if a page needs one.
- The `camera` and `media_player` costs include image handling Dashhaus has never implemented; those estimates are architectural.
- This note changes no code. The TODOS item starts the build with `fan`; the verdicts and order close as each card lands in `spec/cards.md` and both skins.

## Sources

### `hass-react`

- Export surface, 17 domain hooks and their components: [src/index.ts](https://github.com/dlwiest/hass-react/blob/master/src/index.ts).
- Entity docs, one page per domain, e.g. [fan](https://hass-react.com/docs/entities/fan/); all 17 are listed in the [sitemap](https://hass-react.com/sitemap.xml).
- Gap-domain hooks read for capabilities: [Fan](https://github.com/dlwiest/hass-react/blob/master/src/hooks/useFan.ts), [Lock](https://github.com/dlwiest/hass-react/blob/master/src/hooks/useLock.ts), [MediaPlayer](https://github.com/dlwiest/hass-react/blob/master/src/hooks/useMediaPlayer.ts), [Camera](https://github.com/dlwiest/hass-react/blob/master/src/hooks/useCamera.ts), [Number](https://github.com/dlwiest/hass-react/blob/master/src/hooks/useNumber.ts), [Vacuum](https://github.com/dlwiest/hass-react/blob/master/src/hooks/useVacuum.ts), [Calendar](https://github.com/dlwiest/hass-react/blob/master/src/hooks/useCalendar.ts), [Scene](https://github.com/dlwiest/hass-react/blob/master/src/hooks/useScene.ts), [Todo](https://github.com/dlwiest/hass-react/blob/master/src/hooks/useTodo.ts), [BinarySensor](https://github.com/dlwiest/hass-react/blob/master/src/hooks/useBinarySensor.ts).

### Dashhaus

- `spec/cards.md` — direct and composed models, controls and readings, and each card's behaviour.
- `spec/home-assistant.md` — the hook, mapper and action boundary every gap would join.
- `research/09-community-prior-art-and-patterns.md` — the `hass-react` survey and the mapper warnings this note inherits.
- `packages/core/src/entities/` — the 10 models; `packages/core/src/ha/hooks/` — the 10 hooks; `packages/core/src/ha/actions/run.ts` — `serviceRunner()` and its gates.
- `src/skins/orb/cards/` and `src/skins/field/cards/` — the 10 cards per skin; `src/skins/orb/lovelace/config.ts` and `src/skins/field/lovelace/config.ts` — the domain-to-card tables.
- `packages/core/src/ha/history.ts` — `onOffHistoryFromHass`, reused by `fan` and `binary_sensor`.

## Provenance

Desk research, 2026-11-01: `hass-react`'s export surface, hook sources and docs sitemap, and the Dashhaus tree at `0710926`. No code was changed and no card was built. The verdicts and order are recommendations; an implemented card must pass `npm run check` and `npm run test-storybook` and finish its section in `spec/cards.md`.
