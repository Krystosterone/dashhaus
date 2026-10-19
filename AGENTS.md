# AGENTS.md

React + TypeScript widgets for a custom Home Assistant dashboard, developed and shown in Storybook. This is a component library, not a runnable app: there is no test suite and no linter. The spec is split: `README.md` (design and composition rules) and `docs/widgets.md` (per-widget behaviour) — consult both before changing widget behaviour. Research decisions and evidence live in `research/README.md` and the `research/` notes; component gaps in `research/mechanism-backlog.md`.

## Commands

- `npm install`
- `npm run storybook` — dev server at http://localhost:6006
- `npm run build-storybook` — static build in `storybook-static/`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — `eslint .` (flat config in `eslint.config.js`)
- `npm run test` — `vitest run`; unit tests live next to their module as `*.test.{ts,tsx}`
- `npm run check` — typecheck + lint + test, the one-shot gate. Run it before every change is finished.

## Verifying changes

1. `npm run check` — typecheck, lint, and unit tests.
2. `npm run storybook` — open the affected widget's story, check each size and density, and the Demo / Worst case toggle under Foundations.

Unit tests cover pure logic and shared hooks (kelvin, track position, formatting, alarm mapping, `useNow`, `useLongPress`, `useTrack`); stories are the documentation and the visual check. New pure logic gets a `*.test.ts` beside it. Do not add another test runner or linter.

## Layout

- `src/widgets/<name>/` — one widget per folder: component, CSS, entity type, `demo/`, and `<Name>.stories.tsx` titled `Widgets/<Name>`.
- `src/shared/` — the card system and shared hooks (`card.css`, `ui.tsx`, `useTrack`, `useLongPress`, `useNow`).
- `src/styles/tokens.css` — the only source of colour and design tokens.
- `src/bundles/` — `JoinedBundle` and `LeadBundle`.
- `src/dashboards/` — `DashboardPage`, `Section`, `Columns`, `Cell`, and the dashboard stories.
- `src/index.ts` — public exports. Every new widget must be exported here.
- `src/stories/` — Foundations stories: colour temperature, worst-case data, thin rows.

## Hard rules

- One widget, one entity.
- Never use a colour literal in widget CSS. Colours come from tokens in `src/styles/tokens.css`; the accent is `--brand-c` / `--brand-h`.
- A card's height never changes with state. Size comes from the container via container queries, never the viewport.
- No expanding cards: more detail opens in a sheet, from the circle arrow button or a press and hold.
- Prefix each widget's CSS classes with its widget code: `hh-` header, `lw-` light, `cw-` climate, `sw-` sensor, `al-` alarm, `cv-` cover, `tw-` toggle, `hw-` home, `hb-` bundles; `hd-` is the shared card system.
- Animate only `transform`, `opacity`, `clip-path` and colour changes; never layout properties. Easing only from the `--ease-*` tokens; hover styles only under `@media (hover: hover) and (pointer: fine)`.
- Attention follows the README glow contract and the `attention-budget` skill: glow is never the only state channel, damping follows semantic urgency not card position, and urgent states get a warn marker rather than more brightness.
- Every thin row carries a domain icon, primary identity and one state/action cue; colour never defines a row.
- Controls are not selectable: no selection or tap highlight, `touch-action: manipulation`, press feedback on `:active`.

## Design review

When design or visual quality is at stake, use these authorities, all committed under `.agents/` (Claude Code sees the skills through the `.claude/skills/` symlinks):

- **Design phase:** run design decisions through the UX Researcher and UI Designer roles in `.agents/design/`.
- **After building:** run Impeccable's `critique`, `audit`, and `polish` on the widget's story (`/impeccable …`; skill at `.agents/skills/impeccable/`).
- **Motion and worst-case data:** apply Emil Kowalski's skills in `.agents/skills/` — `review-animations`, `animation-performance`, `mobile-native`, `break-ui`. They are the source of the motion rules in README.md.
- **Attention and glow:** follow the repo's own `attention-budget` skill (`.agents/skills/attention-budget/`); it carries the README glow contract and the evidence in `research/02-attention-budget.md`.
- **Row identity:** apply the repo's own `row-identity` skill when building or editing thin-row widgets or reviewing the Controls column; evidence in `research/03-dense-list-identity.md`.
- **Not used:** taste-skill and third-party DESIGN.md files. If a DESIGN.md is ever needed, generate it from this codebase (Impeccable `document`), never import one.
- **Updating:** `npx skills update` for Emil's skills, `npx impeccable update` for Impeccable; review the diff before committing.

## Adding a widget

1. Create `src/widgets/<name>/`: component, CSS with the widget's class prefix, entity type, `demo/` folder, stories titled `Widgets/<Name>`.
2. Build it from the shared card system: an `hd` article inside an `hd-c` container, an `hd-head` with an `Orb`, title and `CircleButton`, one `hd-slot`, and the sheet blocks. Spread `paint(role, glow, own, prop)` from `src/shared/ui.tsx` onto the article for its colour role, glow and colour slot. Sizes, thin density, and the sheet come for free.
3. Export it from `src/index.ts`.
4. Add it to `src/dashboards/Dashboards.stories.tsx`.

Then verify per the section above.
