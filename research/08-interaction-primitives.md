---
date: 2026-10-27
git_commit: 7ad69d7
branch: headless-primitives
repository: home-dashboard
topic: "Headless interaction primitives: Radix or the repo's own"
tags: [research, primitives, radix, accessibility, shadow-dom, pointer]
status: complete
last_updated: 2026-10-27
---

# Research: headless interaction primitives

## Research question

Both skins draw buttons, tracks and sheets over behaviour hooks in `src/hooks/` (`useTrack`, `useLongPress`, `useSheet`). Should a shared layer of headless primitives replace them, and should that layer be Radix (preferred) or the repo's own code? Which interactions do the skins actually need?

## Decision

**A primitive layer in `src/primitives/`, built on the repo's own code. Radix is not adopted for any primitive.** Three primitives, each a hook whose result a skin spreads onto its own markup:

| Primitive | Replaces | Consumers | Why Radix doesn't take it |
| --- | --- | --- | --- |
| `usePress` (button/switch, with hold) | `useLongPress` + every hand-written `aria-pressed` button | Orb: `Orb`, `TogglePill`, `Chip` (`ChoiceChips`, light colour chips), alarm mode `Segment`. Field: `Key` | Radix Toggle is `aria-pressed` + `data-state` + toggle-on-click and nothing else; it has no hold, no `aria-disabled` "unavailable" state, and would bring a second (component/`asChild`) convention for two attributes the skins already write. Radix has no long-press primitive. |
| `useSlider`, `useRangeSlider` | `useTrack`, `useOrderedRangeTrack`, `trackPos`/`rangeKeyValue` at call sites | Orb: `BrightnessBar`, `WarmthRuler`, `PositionBar`, `VolumeBar`, climate `RangeBar`. Field: `Fader`, `RangeFader` | Radix Slider sets the value on `pointerdown` for every pointer type, so a scroll that starts on a track changes it (measured below); maps pointer to value linearly over the full box, so it can't express the curtain's mirrored track or a thumb-inset track; and only reports a value that changed, so a tap can't turn an off light on at its current level. |
| `useSheet` | `useSheet` (moved; now takes the dialog's label) | Orb: `Sheet`. Field: `Panel` | Radix Dialog portals a `div` and re-implements modality in JS (focus trap, `aria-hidden` on siblings, scroll lock). Inside the Lovelace card's shadow root its focus trap does not hold (measured below). It also has no drag to dismiss. The native `<dialog>` the repo uses gets modality from the platform. |

Long-press is not a primitive of its own: its only consumers are buttons (`Orb`, `Key`), and as a separate hook every caller had to remember to call `consumeLongPress()` in its click handler. It is `usePress`'s `onHold` option instead, and the click guard is no longer the caller's job. Split it out only when something that isn't a button needs a hold.

## Evidence

### Radix source (npm tarballs, read from `dist/index.mjs`)

Versions: `@radix-ui/react-slider` 1.6.1, `react-dialog` 1.3.1, `react-toggle` 1.2.1, `react-toggle-group` 1.2.1, `react-switch` 1.4.1, `react-dismissable-layer` 1.2.1, `react-focus-scope` 1.3.1, `react-portal` 1.2.0, `react-context-menu` 2.4.1. All accept React 18 (`peerDependencies`), so compatibility was not the blocker.

- **Slider, press sets the value:** `SliderImpl`'s `onPointerDown` calls `setPointerCapture`, `preventDefault()` and then `onSlideStart(event)` whenever the target isn't a thumb (lines 385-394). No pointer-type branch.
- **Slider, linear over the full box:** `getValueFromPointer` is `linearScale([0, rect.width], [min, max])` (lines 238-244). The thumb's in-bounds offset (`getThumbInBoundsOffset`, 662-667) only moves the drawn thumb; it doesn't change the mapping.
- **Slider, unchanged values aren't reported:** `updateValues` returns `prevValues` when `!hasChanged`, and `onValueCommit` fires only `if (next.hasChanged && commit)` (lines 128-140).
- **Slider, overlapping thumbs:** `getClosestValueIndex` takes the first of equal distances (655-660), with no regard for tap side or drag direction, which the climate range needs.
- **Dialog, portal target:** `Portal` renders into `containerProp || document.body` (portal line 16), which is outside the card's shadow root and its styles unless every skin passes a container.
- **Dialog, JS modality:** `hideOthers(content)` from `aria-hidden` (dialog line 165), `RemoveScroll` from `react-remove-scroll` (line 23), `FocusScope` with `trapped` (lines 238-252); 15 runtime dependencies in `package.json`.
- **FocusScope, document-level trap:** `document.addEventListener("focusin" | "focusout")` with `container.contains(event.target)` (focus-scope lines 33-38, 50-79). Shadow DOM retargets those events to the host element, which the container doesn't contain.
- **Toggle:** the whole component is `type="button"`, `aria-pressed`, `data-state`, `data-disabled`, and a click that flips state unless `disabled` (toggle lines 11-35).
- **ToggleGroup (single):** becomes `role="radiogroup"` with roving focus (toggle-group line 28), a different contract from the skins' `aria-pressed` groups.
- **No long-press:** the only hold in Radix is ContextMenu's, a fixed 700 ms timer for non-mouse pointers that opens a menu (context-menu lines 104, 261).

### Chromium probe

A throwaway page (React 18.3.1, the Radix packages above, bundled with esbuild, driven by Playwright 1.64.1 in Chromium 156.0.8078.4) mounted a Radix `Dialog` with `Portal container` set inside a shadow root, as `LovelaceDashboardElement` renders, beside a native `<dialog>` opened with `showModal()` in the same shadow root, and a Radix `Slider` (0-100, value 50, 400 px).

| Check | Radix Dialog | Native `<dialog>` |
| --- | --- | --- |
| Focus after open | the content | first button |
| Tab ×8 from there | `a, b, c, (focus-guard SPAN), (BODY), (SPAN), radix-open, native-open`: **escapes to page content behind the modal** | `b, c, (browser chrome), a, b, c, (browser chrome), a`: stays in the dialog |
| Click inside, Escape | stays open; Escape closes | stays open; Escape closes |

Slider: a `touchStart` alone at x = 360 px moved the value **50 → 90**; the vertical move and `touchEnd` that followed (a scroll) left it at 90. The repo's slider sets nothing on a touch press (`src/primitives/slider.test.tsx`, "sets nothing on a touch press").

## Audit of the skins' interactions

| Interaction | Where | Outcome |
| --- | --- | --- |
| Latching or holding button | Orb orb, toggle pill, choice and colour chips, alarm segments; Field key | `usePress` |
| One-value track | Orb brightness, warmth, cover position (shade and curtain), volume; Field fader | `useSlider` |
| Two-thumb track | Orb climate range; Field range fader | `useRangeSlider` |
| Modal sheet | Orb sheet; Field panel | `useSheet` |
| One-of-several group | Orb `ChoiceChips`, alarm segments; Field mode, preset and colour keys | No primitive. The only shared behaviour is each item's latch, which `usePress` owns. Roving focus or radio semantics would be new behaviour and a restyle of Field's choice keys (they mark the current option `disabled`), so they're out of scope. |
| Stepper (−/+) and fine range | Orb `Stepper`, `RangeFine`; Field fine range keys | No primitive: two one-shot buttons, no shared behaviour. Field's are `Key`s, so they already use `usePress`. |
| One-shot buttons (close, open details, retry) | Both skins | Native `<button>`: no behaviour to share. |
| Page nav (scroll spy, hash page) | Orb dashboards only | Stays in `src/hooks/` (`useScrollSpy`, `useHashPage`): page-level, not a control, and Field has no consumer. |

## Contract

- A primitive owns behaviour and semantics (`type`, `aria-pressed`, `aria-disabled`, `aria-valuetext`, native range `step`, dialog name and modality) and never markup, class names or styles. ESLint keeps `src/primitives/` free of skins, CSS and Home Assistant.
- One convention: each primitive is a `use*` hook returning props to spread. A primitive used in a list goes in a small component (`Chip`, `Segment`).
- Sliders keep a range's reported ends: pointer steps count from `min`, keys step from the value, and the hidden input keeps its native `step` only while `min`, `max` and the value sit on the step's grid (otherwise `step="any"`, or the browser would round the value it shows). Commit `99048ef` introduced the first two rules for climate; every track now follows all three.
- Sheets stay native modal `<dialog>`s. Don't move them to a portal.

## Limits

- The probe is one Chromium build on macOS. iOS Safari, the main touch target, and screen readers were not run. The shadow-DOM focus finding follows from FocusScope's `document`-level listeners in any engine that retargets events, but only Chromium was observed.
- Radix was assessed as of the versions above; a later FocusScope that looks through `composedPath()` would remove the dialog blocker. The slider's press-to-set and linear mapping are design choices, not bugs, so they're unlikely to change.
- Where a range's ends and value are on the grid, native `step` moves AT increments from `"any"` to the real step. That is reasoned from the HTML spec's step base; no assistive tech was run.

Provenance: Radix tarballs via `npm pack` and a Playwright probe in the session scratchpad (not committed), 2026-10-27, against `7ad69d7`.
