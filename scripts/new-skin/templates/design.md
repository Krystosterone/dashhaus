# __Section__ skin

A neutral generated skin under `src/skins/__skin__/`. It is deliberately usable rather than distinctive: entity models, Home Assistant hooks, accessibility, fixed footprints, Dashboard composition and Lovelace lifecycle are wired; its visual language is the work that starts here.

## Baseline design

- **Parts:** a Card frame, identity, title, state, readout, actions, and a native details dialog. Replace these with a coherent skin-specific system before bespoke Card work.
- **Footprints:** `standard` is 176 px; `compact` is 72 px. State and entity type never change height.
- **Unavailable:** dashed Card outline, explicit `Unavailable`, no fabricated reading, and controls remain focusable with `aria-disabled`.
- **Tokens:** every colour lives in `styles/tokens.css`; every custom property and class uses the `__skin__-` namespace.
- **Motion:** only transform, opacity, and colour change; easing comes from `--__skin__-ease-*`; reduced motion removes press movement.
- **Touch:** controls use the shared primitives, 44 px minimum targets, `touch-action: manipulation`, no selection or tap highlight.
- **Theme:** dark values apply under `data-__skin__-theme` (the skin's own attribute, set by the Lovelace host and Storybook's __Section__ theme toolbar), or the system's scheme when it is absent.
- **Fonts:** `shared/surface.ts` names the web font once; the Lovelace card and Storybook both link it.
- **Rejected commands:** `__Skin__ActionStatus` says what Home Assistant refused, once for the page, with Retry when safe and Dismiss.

## Dashboards

`__Skin__Page`, `__Skin__Section`, `__Skin__Columns`, `__Skin__Cell`, `__Skin__Header`, and `__Skin__NavBar` compose phone, tablet, and wall-panel pages. The Lovelace card is `custom:dashhaus-__skin__`; without explicit Cards or sections, it groups every supported entity by Home Assistant area.

Add a domain with:

```sh
npm run new-card -- light --skin __skin__
```
