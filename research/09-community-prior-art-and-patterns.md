---
date: 2026-10-31T00:00:00+00:00
git_commit: 7f6a1e9
branch: main
repository: home-dashboard
topic: "Community prior art and reusable patterns for the headless React foundation"
tags: [research, home-assistant, react, headless, auth, prior-art]
status: complete
last_updated: 2026-10-31
---

# Research: Community prior art and reusable patterns

> **Scope.** Public GitHub, npm and Home Assistant community sources surveyed on 2026-10-31. Star and download counts are snapshots, not endorsements. “Not found” means not found in the searched public surface, not universal absence. This note consolidates the community landscape and the `hass-react` / `@hakit/core` deep dives. The transport/store seam is recorded in `spec/home-assistant.md` and `packages/core/src/ha/`; this note adds the broader prior art, auth, dual surfaces and the concrete next steps.

## Research question

What already exists in the Home Assistant community that overlaps with Dashhaus — headless React components and hooks, multi-skin dashboards, automatic layouts, Storybook verification, deploy tooling and scaffolding — and which patterns should this monorepo adopt, adapt or reject?

## Decision

**Keep the skin-first architecture. Almost every individual part exists in the community, but no single project combines the same set.**

- Closest React + Storybook component library: **HAKit** (`@hakit/core` + `@hakit/components`).
- Closest multi-skin Lovelace product: **Skins-Pro**.
- Closest headless React entity layer: **`hass-react`**.
- Closest automatic dashboard: native Home Assistant dashboard strategies, **Dwains Dashboard Next**, **simon42**.
- Closest dashboards-as-code tooling: **`hab`**, **`hadsync`** and HACS.

Take five developer-facing patterns (plus a peer-range decision and one future option):

1. Dev-only entity contract checks (format and domain).
2. Machine-readable action-error metadata (category and retryability).
3. Registry hooks for areas, devices and floors.
4. A documented core contract, including the host-owned auth boundary and external-transport security.
5. Test and mock ergonomics: entity patching, a demo-store convenience, and all-domain headless parity.

Reject four categories:

1. Domain mappers and capability inference from `hass-react` (weaker than our normalized models).
2. Presentation enrichment in core from HAKit (colours, relative time, icons, image URLs).
3. Generated entity/service types, locale sync and the service Proxy now (build coupling without a demonstrated consumer need).
4. Auth implementation in core (OAuth, token storage, refresh, login UI) and automatic service retries.

Keep our advantages: normalized skin-free models, injected transport with connection generations, `transport_unknown` outcomes, sanitized action errors, interaction primitives, conformance tests, fine-grained subpaths and optional peers.

## Landscape

### Whole dashboards and card ecosystems

| Project | What it is | Overlap with Dashhaus | Difference |
| --- | --- | --- | --- |
| **HAKit** (`shannonhochkins/ha-component-kit`) | React 19 component library: `@hakit/core` hooks/store, `@hakit/components`, `create-hakit`, Storybook docs, HA add-on. ~1.3k stars; active 2026. | Headless data layer, prebuilt cards, Storybook, generator, deploy path | Standalone React app/add-on, one component set, no Lovelace card, no skin packages |
| **`hass-react`** (`dlwiest/hass-react`) | MIT headless React hooks and render-prop components for 17 entity domains; provider, auth, mock mode, external transport. v1.0.0, 37 stars, ~12 weekly downloads. | Entity hooks + headless components, provider/store, mock transports, tests | App-level, one surface, no Lovelace, no primitives, no skins; small adoption |
| **Skins-Pro** (`ha-china/Skins-Pro`) | A Lovelace card with a multi-skin architecture and a built-in skin store (modern, AEON, visionOS, Minecraft). Lit, HACS, ~80 stars. | Multi-skin product, skin store, area-based dashboard | Skins are downloadable theme/asset packs inside one card; no shared headless core, no independent skin packages, no Storybook |
| **Dwains Dashboard Next** | Auto-generated dashboard from areas, devices, entities and floors; JavaScript dashboard resource, HACS, Lit, Vitest. ~103 stars, v1.12.2. | Whole-dashboard generation, area-based layout, deck/room navigation | One design, no React, no skins, no component-library contract |
| **simon42 dashboard strategy** | Configurable dashboard strategy generating views from areas, devices and entity metadata. ~278 stars. | Automatic views, area/domain grouping, editor | One design, no skins, no React component library |
| **Native HA dashboard strategies** | Dashboard, view and section strategies that generate configuration from `hass`. | Whole-dashboard generation and automatic layout | Native, no third-party component system |
| **Mushroom** | Collection of ~20 Lit cards with a coherent design language. ~5.2k stars. | Cohesive card set, cards for many domains, editor | One visual language; explicitly not a deep-customisation framework |
| **Bubble Card** | Lit card collection with pop-ups, modules and a module store. ~4.7k stars. | Cohesive card set, pop-up details, community modules | One design; no headless core or skin boundary |
| **UI Lovelace Minimalist** | YAML templates over `button-card`, installed as a “theme”. ~2.1k stars; seeking maintainers. | Dashboard composition, card templates | YAML/templating, not a React component library; maintenance risk |
| **Pastel UI** | 103 coordinated phone-friendly cards in one HACS dashboard repository; new (2026). | Coordinated design across domains | One collection; not a framework |
| **Home Assistant Dashboard Studio** | React/JSX dashboards inside HA, in-browser editor, SDK (`@ha`, `@ha/ui`, `@ha/layout`, `@ha/format`), panels and a Lovelace card. Early, ~3 stars. | Pro-code React dashboards, hooks/widgets, multi-dashboard | Panel-first, in-HA editor; early, not a skin/component library |
| **Glance** | React 19 + TypeScript + Vite dashboard add-on; drag-and-drop tiles, detail flyouts. Beta. | React cards, WebSocket state, add-on deployment | Standalone app; one design |
| **Tunet** | React dashboard with drag-and-drop layout and add-on. ~314 stars. | React cards, WebSocket, add-on | Standalone app; one design |
| **Magic Frame** | Self-hosted React/Next.js display with Home Assistant integration. ~512 stars. | React dashboard, wall display | Product app; one design |
| **home-assistant-react/dashboard** | React dashboard monorepo with private `hooks`, `providers`, `ui`, `types` packages. ~22 stars, under development. | Provider/hook/UI decomposition | Private `0.0.1` packages; app, not a publishable library |

### Storybook, galleries and design systems

- **HAKit** uses Storybook as its documentation site, with per-hook MDX pages, live examples and a fake HA connection. This is the closest community analogue to our Storybook-first workflow.
- **Home Assistant’s own frontend** uses a first-party [`gallery/`](https://contributors.home-assistant.io/frontend/development/gallery-and-demo/) that renders components, dashboard cards and more-info views in every state — on, off, unavailable, loading, light/dark, RTL. It is not Storybook and is not for third-party cards, but it validates the state-matrix idea.
- **`custom-card-helpers`** is the common Lit/TypeScript helper layer for custom cards: `handle-action`, `handle-click`, `has-double-click`, `haptic`, icon/state formatting. It is a DOM helper library, not React components or primitives.
- Home Assistant’s own components are Lit `ha-*` elements (`ha-card`, `ha-icon`, etc.). There is no official React package; [`@lit/react`](https://lit.dev/docs/frameworks/react) can wrap them, but the result is still styled UI, not a headless layer.

### Tooling, deploy and scaffolding

| Project | What it is | Overlap | Difference |
| --- | --- | --- | --- |
| **HACS** | Install/update frontend cards and integrations | Distribution | Install-only; no build, resource registration or dashboard creation |
| **`hab`** (balloob/home-assistant-build-cli) | Go CLI for HA configuration and dashboard CRUD/patch, designed for LLMs. ~59 stars. | Dashboard create/patch, API automation | Generic HA CLI; not tied to a bundle or skin |
| **`hadsync`** | Python CLI to pull, diff, validate and push Lovelace YAML as code. ~57 weekly downloads. | Dashboards as code, validation, git workflow | YAML sync, not a component build/deploy pipeline |
| **HAKit `create-hakit`** | React/Vite scaffold plus `npm run deploy` to copy a built dashboard into `config/www`; add-on serves it. | Scaffold + deploy | Standalone dashboard, not a Lovelace bundle; deploy is a folder copy |
| **`boilerplate-card`** | Lit 3 + TypeScript + Rollup custom-card template. ~257 stars. | Card scaffold, action handler, editor, tests | Lit, one card; no React, no Storybook |
| **`create-react-hass-card`** | React wrapper for a Lovelace card. `0.0.1-beta.84`, ~4 weekly downloads, three years old. | React-in-Lovelace bridge | Small, beta; no component library |
| **`react-ha-lovelace-connector`** | Starter project mounting React inside a Lovelace custom element. ~5 stars. | React-in-Lovelace bridge | Starter, not a maintained library |
| **`hadsync` / `hab`** | See above | Dashboard CRUD and YAML sync | No bundle upload/resource registration |

**Landscape conclusion:** card collections and automatic dashboards are crowded; React dashboards are a real category; React + Storybook is rare but exists (HAKit); multi-skin is rare but exists (Skins-Pro); a multi-skin Lovelace component library with a headless core, Storybook verification and generators was not found.

## Deep dive: `hass-react`

### What it is

A single MIT package, `hass-react`, exposing headless React hooks and render-prop components for Home Assistant. It self-describes as “headless components and hooks” and ships no styles. Latest `1.0.0`, 37 stars, ~12 weekly downloads, last push 2026-08-10.

Observed surface (`src/index.ts`):

- 17 domain hooks: light, climate, sensor, binary sensor, todo, switch, cover, fan, lock, media player, camera, number, weather, vacuum, calendar, scene, alarm control panel.
- List hooks for most domains (`useLights`, `useSensors`, …), `useEntity`, `useEntityGroup`, `useServiceCall`.
- Render-prop components for every domain (`Light`, `Climate`, …) plus `Entity`, `DateTime`.
- `HAProvider`, `useHAConnection`, `useAuth`, `useCurrentUser`.
- Error classes, feature enums, mock mode and an external transport.

### Mechanisms worth studying

- **Entity store:** Zustand `Map` of entities, subscription bookkeeping outside the public store, one `state_changed` subscription, per-entity listener sets, batched initial `get_states`, in-flight registration deduplication, connection generations, and stale-result rejection (`src/services/entityStore.ts`).
- **Provider:** a reducer-based connection state machine (`idle` / `connecting` / `connected` / `disconnected` / `error`), reconnect backoff, token refresh on an interval and on visibility change, and cleanup that removes listeners before closing (`src/providers/HAProvider.tsx`).
- **Auth:** OAuth 2.0 authorization-code flow with state verification, long-lived token auth, auto-detection, external transport, mock mode. OAuth tokens are stored in `localStorage` per HA URL; OAuth state is in `sessionStorage` (`src/services/auth.ts`, `src/services/tokenStorage.ts`).
- **Errors:** `HomeAssistantError` with `code`, `userMessage`, `recoverable`, `retryAction`, `context`; subclasses for feature support, invalid parameters, unavailable entities, connection and service calls; `ErrorCategory` and `isRetryableError` (`src/utils/errors.ts`).
- **Dev diagnostics:** entity-ID format validation and a delayed missing-entity warning (`src/utils/entityValidation.ts`).
- **Headless components:** hand-written wrappers such as [`Light.tsx`](https://github.com/dlwiest/hass-react/blob/master/src/components/Light.tsx), each rendering `children(hookResult)` with no markup or options beyond `entityId`.
- **Mock mode:** `mockMode`, `mockData`, simulated service calls and state transitions; docs include testing patterns and three example dashboards (vanilla, shadcn/Radix, MUI).

### Limits and anti-patterns

- Its headless components are **entity data providers**, not interaction primitives. A render prop gives you `toggle`/`setBrightness`; you still build the button, slider, sheet and keypad.
- Its domain logic is weaker than ours:
  - `brightness = attributes.brightness || 0`, conflating an absent reading with zero.
  - `supportsBrightness` falls back to `attributes.brightness !== undefined`, inferring capability from a possibly stale reading.
  - The light API is RGB-only; our model uses HA `hs_color` and keeps colour-temperature and colour modes distinct.
  - Zod validation throws raw `ZodError`; feature gates throw `FeatureNotSupportedError` from handlers.
  - Service calls auto-retry with backoff.
  - `ServiceCallError` includes the raw provider message in its technical message.
- `useAuth` maintains its own token-storage-derived state while `HAProvider` runs a separate connection state machine; `login()` is effectively a no-op because the provider drives the redirect. Two auth surfaces, one lifecycle.
- No Lovelace card, no skins, no Storybook, no primitives, no conformance suite.
- Adoption is small: 37 stars, ~12 weekly downloads.

### Take from `hass-react`

1. **Dev-only entity contract checks** — format and domain validation at hook entry, no runtime throw.
2. **Machine-readable error metadata** — category and retryability, not user copy and not raw provider messages.
3. **External transport security language** — the gateway security boundary is well written and directly applicable.
4. **Mock/demo ergonomics** — one-line setup and entity patching are better than manual store wiring.
5. **Hook/component parity as an invariant** — every entity hook has a headless counterpart.

### Do not take from `hass-react`

- Domain mappers or capability inference.
- Automatic service retries.
- OAuth/token storage/refresh inside core.
- The split `useAuth` / provider state.
- Hand-written component wrappers.
- Raw provider messages in errors.
- Snapshot-first hook testing.

## Deep dive: `@hakit/core`

### What it is

The headless core of HAKit: React hooks and helpers for the Home Assistant WebSocket API, published alongside a styled component package and `create-hakit`. `@hakit/core` 6.1.0, ~471 weekly downloads; `@hakit/components` 6.0.2; ~1.3k stars for the repo. React ≥19. Storybook is the documentation site.

Observed surface:

- ~25 hooks: `useEntity`, `useEntities`, `useAreas`, `useFloors`, `useDevice`, `useHistory`, `useHass`, `useHaStatus`, `useService`, `useSubscribeEntity`, `useConfig`, `useCamera`, `useDishwasher`, `useLightBrightness`, `useLightColor`, `useLightTemperature`, `useLocale`, `useLocaleData`, `useLogs`, `useLowDevices`, `useRegistryData`, `useTemplate`, `useUser`, `useUsers`, `useWeather`.
- `HassConnect` / `HassProvider`: auth, connection, entity/registry/config/service/user/locale subscriptions, suspend/resume.
- `useHass`: selector access to a Zustand store containing entities, registries, services, config, user, locale, helpers and connection status.
- `useEntity`: selects one entity and adds a service proxy, history, icon/colour/time helpers and a `custom` presentation block.
- `useAreas`: enriched areas with devices, entities, floor and resolved picture URL.
- `useService`: typed domain service proxy generated from entity/service types.
- Generated types and locales: `hakit-sync-types` bin, `sync-ha-user-types`, `sync-locales`, `@hakit/core/sync`, `./registry` and `./constants` subpaths.

### Mechanisms worth studying

- **Single store, selector hooks:** one Zustand store for auth, user, connection, registries, services and entities; `useHass` exposes selectors. This is the right shape for shared connection state.
- **Registry breadth:** areas, floors, devices and entity registry display are first-class subscriptions, not ad-hoc fetches.
- **Auth sources:** inherited `window.top.hassConnection` (iframe/panel), saved tokens, provided long-lived token, or OAuth; `HassConnect` shows a loader/error wrapper and `useHass` exposes auth/user/status. Tokens live in `localStorage` under `hassTokens`.
- **Lifecycle:** suspend/resume when the page is hidden, connection status, explicit `ready`, and cleanup of named subscriptions.
- **Docs:** per-hook MDX pages, examples and live Storybook stories. This is the strongest community example of documenting a headless layer beside runnable examples.
- **Domain model tests:** e.g. `useDishwasher/model.test.ts` and `useDishwasher.test.tsx` show a domain hook with explicit semantics and tests.

### Limits and anti-patterns

- **Presentation in core:** `useEntity` adds colours, relative time and icons; `useAreas` joins image URLs and returns live entity objects. That is skin work, not headless work.
- **`useAreas` recomputation:** it depends on the whole `entities` map, so it recomputes on every state change (O(areas × entities)). A core registry hook should depend only on registry data and return entity IDs.
- **Generated types/locales:** the `hakit-sync-types` CLI and service Proxy are excellent developer experience but couple the package to a live HA instance and generated service signatures. They conflict with our hand-normalized, skin-free models.
- **One-entry core and large peer list:** a single `.` entry plus `./sync`, `./registry`, `./constants`; peers include Emotion, lodash, iconify, React 19, websocket, `use-debounce`, `ws`, `yargs`, `zustand`. Our subpaths and optional peers are cleaner.
- **Broad provider:** `HassConnect` owns auth, data subscriptions, locale, registries, user, services and suspend/resume. Powerful, but not a small boundary; a module-level attempted-URL guard can also make remount/retry surprising (`spec/home-assistant.md` records the seam's host lifecycle).
- **No headless component counterparts:** the headless surface is hooks; the component package is styled. HAKit does not answer the “components and hooks” question for entity data.

### Take from `@hakit/core`

1. **Registry breadth** — areas, devices and floors as typed, shared data.
2. **Single-store auth shape** — if auth state ever enters core, one store plus selectors.
3. **Docs beside examples** — hook pages with runnable examples, not a separate prose manual.
4. **Domain model tests** — a model module plus a hook test per domain.
5. **Typed service idea, as a future option** — only if a consumer need and a safe generation strategy appear.

### Do not take from `@hakit/core`

- Presentation enrichment in core.
- The `useAreas` entity-map dependency.
- Generated entity/service types, locale sync and the service Proxy now.
- The one-entry/huge-peer/React-19-only packaging.
- The broad provider as our auth boundary.
- The module-level attempted-URL guard without its host assumptions.

## Auth

| | `hass-react` | `@hakit/core` | Dashhaus today |
| --- | --- | --- | --- |
| Entry | `HAProvider` drives OAuth/token/external transport; `useAuth` reports auth state | `HassConnect` drives OAuth/token/inherited auth; `useHass` selects state | `HaProvider` owns the store lifecycle only; the host owns `Auth` |
| Auth paths | OAuth code flow, long-lived token, external transport, mock | Inherited `window.top.hassConnection`, saved tokens, provided token, OAuth redirect | Lovelace shares `hass.connection`; standalone passes `Auth` to `connectHomeAssistant` |
| Token storage | `localStorage` per HA URL; OAuth state in `sessionStorage` | `localStorage` under `hassTokens` | None |
| Refresh | Periodic + visibility refresh, retries | Delegated to `home-assistant-js-websocket` / HA frontend | Delegated to the host / HA frontend |
| State model | Provider connection machine + separate `useAuth` state | One Zustand store (`auth`, `user`, status, error) | One snapshot store; `useHaStatus` selector |
| UI | No login form; auto-redirect | Styled loader/error wrapper | None |

### Decision

**Auth is a host concern. Do not add an auth provider, auth hook, login component, token storage or token refresh to `@dashhaus/core`.**

Reasons:

- The deployed card inherits `hass.connection` from the Home Assistant frontend. There is no token to manage, refresh or store.
- The standalone path already takes an authenticated `Auth` and converts it with `connectHomeAssistant(auth)`. The host that obtains the `Auth` owns its lifecycle and closing the transport.
- Adding OAuth/token storage to core duplicates `home-assistant-js-websocket` and the HA frontend, expands the security surface, and is irrelevant to the Lovelace deployment.
- `HaProvider` already owns the store lifecycle; a second auth provider would create two lifecycle owners.

### Auth shape to follow if state ever enters core

- One store, selectors on top. HAKit’s `HassConnect` + `useHass` is the correct shape: one auth/connection state machine, one store, narrow selectors.
- Do not copy hass-react’s split: `HAProvider` runs the connection state machine while `useAuth` independently inspects token storage; `login()` is a no-op. That is two sources of truth.

### Auth boundary to document

Add a core/auth section to the docs:

- **Lovelace:** inherits `hass.connection`; no credentials in the card or bundle; the element never closes the frontend connection.
- **Standalone app:** the host obtains `Auth` (OAuth via `home-assistant-js-websocket` or a long-lived token) and calls `connectHomeAssistant(auth)`; the host closes the transport.
- **Kiosk/wall panel:** prefer an external transport gateway. Keep HA credentials server-side, allowlist entity IDs, commands and service fields, sanitize events, enforce limits, and do not log tokens. This is the security boundary `hass-react` documents.
- **Never:** store a long-lived token in a skin, a bundle or `@dashhaus/core`; add a login form to core; auto-refresh tokens in core.

If a skin needs user or config metadata, add read-only `useHaUser` / `useHaConfig` request slices over the existing store. Keep them hook-only; there is no useful headless component for a singleton.

## Headless as both components and hooks

| | `hass-react` | `@hakit/core` | Dashhaus today |
| --- | --- | --- | --- |
| Hook | `useLight`, `useClimate`, … | `useEntity`, `useSubscribeEntity`, helpers | `useHaLight`, `useHaClimate`, … |
| Component | Hand-written render-prop wrapper per domain | None; component package is styled | Generic `headless()` factory |
| Options | Component accepts only `entityId` and `children` | n/a | `HeadlessProps<H>` derives every hook option |
| Drift risk | 17 manual wrappers | n/a | One factory; generator updates exports |
| Tests | Per-hook and per-component | Per-hook; no headless components | `headless.test.tsx` covers two domains |

**No HA-specific headless interaction-primitive library was found.** The community pattern is a headless entity/data layer plus a general UI kit: Radix, Base UI, React Aria or Headless UI for controls, with Home Assistant action wiring by hand. `custom-card-helpers` supplies Lit/DOM action helpers; HAKit composes `use-long-press` and `@use-gesture/react` inside its styled components; `hass-react` leaves the button, slider, sheet and keypad to the app. This is the least-covered layer, and the one our `packages/core/src/primitives/` occupies.

### Decision

**Keep the component + hook pairing for per-entity hooks. Do not extend it to auth, store or singleton selectors.**

The component exists for one concrete reason: a config list cannot call hooks in a loop. It renders nothing of its own and is an adapter for the same hook. Our `headless()` factory is the better implementation: type-derived props, one code path, no hand-written wrappers.

Rules to document in `spec/core.md`:

1. Every `useHa<Name>` entity hook gets a `Ha<Name>` render-prop component.
2. Collection hooks get a component only when a list needs per-item rendering.
3. Singleton selectors (`useHaStatus`, `useHaStore`, `useHaSnapshot`) and host/auth/config hooks stay hook-only.
4. The component and hook must share one implementation; never hand-write the wrapper.
5. The generator updates both; a parity test catches a missed registration.

### Improvements

- **All-domain parity test.** Extend `packages/core/src/ha/headless.test.tsx` from `HaLight`/`HaToggle` to every domain with a minimal fixture; assert the child receives `entity`/`history`/`actions` and that required options pass through (`name`, `loadHistory={false}`, `onActionError`).
- **Do not add `HaAuth` / `HaUser` / `HaLogin`.** Auth has no per-item list; a headless auth component would either render UI (not core) or duplicate the host’s lifecycle.
- **Do not add a second headless surface for the same data.** Hooks are the primitive; components are the loop-friendly adapter.

## What to take, with file-level next steps

| # | Change | Files | Acceptance gate |
| --- | --- | --- | --- |
| 1 | **Core contract and auth boundary** — stable vs internal core surface, error codes, transport lifecycle, host-owned auth, external-transport security | `spec/core.md` (new); `spec/home-assistant.md` auth section; link from `packages/core/README.md` | Docs review; no runtime change |
| 2 | **Dev-only entity contract checks** — malformed ID and wrong domain; warn once, non-production, never throw; no missing-entity warning by default | `packages/core/src/ha/dev.ts` (new); call from `packages/core/src/ha/hooks/*.ts`; `dev.test.ts` | `npm run check`; console-warn spy tests; valid IDs silent; production silent |
| 3 | **Machine-readable error metadata** — `category` and `retryable` on `HaActionError` or exported helpers; store uses the same rule; keep sanitization and skin-owned copy | `packages/core/src/ha/types.ts`, `packages/core/src/ha/store.ts`, tests | `npm run check`; code-to-metadata table; existing retry behavior unchanged |
| 4 | **Registry hooks** — `useHaRegistry` returning typed areas, devices, floors and entity-registry display; pure `areaMembership`; `useHaAreas` returning area + entity IDs; refactor `useHaArea` onto it | `packages/core/src/ha/registry.ts`, `registry.test.tsx`, `packages/core/src/index.ts` | Fixtures; one cached read per generation; no recompute when entity state changes |
| 5 | **Test and mock ergonomics** — `fakeTransport.emitEntity(id, patch)` and typed `calls`; `createDemoStore()` in `./demo`; all-domain headless parity | `packages/core/src/testing.tsx`, `packages/core/src/demo/index.ts`, `packages/core/src/ha/headless.test.tsx` | `npm run check`; parity table passes; consumer example in docs |
| 6 | **React peer range decision** — test React 19 before freezing; optionally widen `^18.3 || ^19`; do not copy HAKit’s large peer list | `packages/core/package.json`, `packages/dashboard/package.json`, release checks | Clean consumer install/typecheck/build on React 19; existing React 18 suites pass |
| 7 | **Future only** — `useHaUser` / `useHaConfig` if a skin needs identity; generated types/locales/service Proxy only on demonstrated demand | Core hooks / generation tooling | A named consumer need and a safe generation strategy |

### Suggested order

1. Write `spec/core.md` and the auth/transport security section first; it freezes the decision and prevents auth code from drifting into core.
2. Add dev contract checks; they are local, non-breaking and catch the most common third-party skin bug.
3. Add error metadata; it unifies the store’s retry rule with what skins can display.
4. Add registry hooks; this is the only functional gap in the core surface.
5. Add test/mock helpers and all-domain headless parity.
6. Decide the React 19 peer range after a clean consumer test.
7. Revisit generated types/locales only when a consumer asks.

### Verification for the next steps

- Code changes: `npm run check`.
- Storybook-visible changes: `npm run test-storybook`.
- Core-only changes: unit tests beside the module; no live Home Assistant required.
- Auth docs: no runtime; a security review is required before any implementation.
- React 19: a clean consumer install, typecheck and build, plus the existing React 18 suites.
- Registry hooks: fixture-based tests for the three registry commands, cache-per-generation, and no entity-state dependency.

## What not to take

- **`hass-react` domain mappers and capability inference.** `brightness || 0`, brightness support inferred from a stale attribute, RGB-only colour, raw Zod errors, feature errors thrown from handlers. Our normalized models, absent-reading rules and non-throwing action handlers are safer.
- **Automatic service retries.** A timeout does not prove the command failed; a toggle may have succeeded. Our generation/`transport_unknown` outcome and explicit retry action are the safer contract.
- **Raw provider messages in errors.** `hass-react`’s `ServiceCallError` includes the original message; ours keeps only sanitized `translationKey`/`providerCode` scalars, never alarm codes.
- **Auth implementation in core.** OAuth, token storage, refresh, login UI and `useAuth` duplication. Keep auth at the host boundary.
- **HAKit presentation enrichment.** Colours, relative time, icons and image URLs belong in a skin, not the headless core.
- **HAKit’s `useAreas` dependency on the whole entity map.** It recomputes on every state change; registry hooks should depend only on registry data.
- **Generated entity/service types, locale sync and the service Proxy now.** They conflict with our hand-normalized models and add a live-HA build dependency. Revisit only on demand.
- **HAKit’s one-entry/huge-peer/React-19-only packaging.** Our subpaths, optional peers and React 18 baseline are better for a skin foundation.
- **Hand-written headless wrappers.** They drift; keep the generic `headless()` factory.
- **Snapshot tests as the primary hook strategy.** Behaviour tests are already stronger here.
- **A second auth surface.** One lifecycle owner; selectors everywhere else.

## Limits and open questions

- The survey is a public-surface sample, not exhaustive. Star and download counts are snapshots from 2026-10-31.
- No live Home Assistant auth flow, token refresh or readback was exercised; the auth recommendation is architectural and security-based, not runtime-verified.
- The exact registry-hook shape is not decided. The preference is raw typed registries plus entity IDs; an enriched area object with devices/entities can be derived in a skin or a separate helper.
- No security review of OAuth/token storage has been done; do not implement auth in core before one.
- React 19 compatibility is untested.
- Generated types/locales/service proxies are rejected for now, not forever.
- This note records research and next steps; it does not change code or contracts.

## External sources

### Prior art and comparison

- [HAKit / ha-component-kit](https://github.com/shannonhochkins/ha-component-kit)
- [HAKit Storybook](https://shannonhochkins.github.io/ha-component-kit/)
- [hass-react](https://github.com/dlwiest/hass-react) · [docs](https://hass-react.com/)
- [Skins-Pro](https://github.com/ha-china/Skins-Pro)
- [Dwains Dashboard Next](https://github.com/dwainscheeren/dwains-dashboard-next)
- [simon42 dashboard strategy](https://github.com/TheRealSimon42/simon42-dashboard-strategy)
- [Home Assistant custom strategies](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-strategy)
- [Mushroom](https://github.com/piitaya/lovelace-mushroom)
- [Bubble Card](https://github.com/Clooos/Bubble-Card)
- [UI Lovelace Minimalist](https://github.com/UI-Lovelace-Minimalist/UI)
- [Pastel UI announcement](https://community.home-assistant.io/t/pastel-ui-103-coordinated-phone-friendly-cards-for-home-assistant/1030634)
- [Home Assistant Dashboard Studio](https://github.com/leofleischmann/Home-Assistant-Dashboard-Studio)
- [Glance announcement](https://community.home-assistant.io/t/glance-a-polished-fully-editable-react-dashboard-for-home-assistant-runs-as-an-add-on/1012606)
- [Tunet](https://github.com/oyvhov/Tunet)
- [Magic Frame](https://github.com/jeremiaa/magic-frame)
- [home-assistant-react/dashboard](https://github.com/home-assistant-react/dashboard)
- [HAKit create-hakit](https://github.com/shannonhochkins/ha-component-kit/tree/master/packages/create-hakit)
- [boilerplate-card](https://github.com/custom-cards/boilerplate-card)
- [create-react-hass-card](https://www.npmjs.com/package/create-react-hass-card)
- [react-ha-lovelace-connector](https://github.com/iva-stolnik/react-ha-lovelace-connector)
- [`hadsync`](https://github.com/gevgev/hadsync)
- [`hab`](https://github.com/balloob/home-assistant-build-cli)
- [HACS](https://hacs.xyz)

### Headless, auth and UI references

- [`hass-react` auth service](https://github.com/dlwiest/hass-react/blob/master/src/services/auth.ts)
- [`hass-react` useAuth](https://github.com/dlwiest/hass-react/blob/master/src/hooks/useAuth.ts)
- [`hass-react` errors](https://github.com/dlwiest/hass-react/blob/master/src/utils/errors.ts)
- [`hass-react` entity validation](https://github.com/dlwiest/hass-react/blob/master/src/utils/entityValidation.ts)
- [`hass-react` external transports](https://hass-react.com/docs/advanced/external-transports)
- [`@hakit/core` useAreas](https://github.com/shannonhochkins/ha-component-kit/blob/master/packages/core/src/hooks/useAreas/index.ts)
- [`@hakit/core` useEntity](https://github.com/shannonhochkins/ha-component-kit/blob/master/packages/core/src/hooks/useEntity/index.ts)
- [`@hakit/core` useService](https://github.com/shannonhochkins/ha-component-kit/blob/master/packages/core/src/hooks/useService/index.ts)
- [`@hakit/core` HassConnect provider](https://github.com/shannonhochkins/ha-component-kit/blob/master/packages/core/src/HassConnect/Provider.tsx)
- [`@hakit/core` tryConnection](https://github.com/shannonhochkins/ha-component-kit/blob/master/packages/core/src/HassConnect/tryConnection.ts)
- [Home Assistant frontend gallery](https://contributors.home-assistant.io/frontend/development/gallery-and-demo/)
- [Home Assistant frontend components and Lit](https://contributors.home-assistant.io/frontend/architecture/components)
- [custom-card-helpers](https://github.com/custom-cards/custom-card-helpers)
- [Lit React wrappers](https://lit.dev/docs/frameworks/react)
- [Radix UI](https://www.radix-ui.com/) · [Base UI](https://base-ui.com/) · [React Aria](https://react-spectrum.adobe.com/react-aria/) · [Headless UI](https://headlessui.com/)

## Local code references

- `packages/core/src/ha/types.ts` — `HaTransport`, `HaActionError`, `HaStore`, generation.
- `packages/core/src/ha/store.ts` — connection lifecycle, action retry, sanitized errors, request cache.
- `packages/core/src/ha/provider.tsx` — `HaProvider`, `useHaEntity`, `useHaEntities`, `useHaStatus`.
- `packages/core/src/ha/headless.tsx` — generic `headless()` factory and components.
- `packages/core/src/ha/headless.test.tsx` — current two-domain headless coverage.
- `packages/core/src/ha/registry.ts` — area-name resolution only.
- `packages/core/src/ha/registry.test.tsx` — registry fixtures and cache tests.
- `packages/core/src/ha/hooks/*.ts` — per-domain `useHa<Name>` hooks.
- `packages/core/src/entities/*` — normalized skin-free models.
- `packages/core/src/primitives/*` — press, slider, range slider, sheet, keypad.
- `packages/core/src/testing.tsx` — fake transport and connected render.
- `packages/core/src/demo/*` — per-domain demo transports and the house.
- `packages/core/src/websocket.ts` — official websocket adapter and `connectHomeAssistant`.
- `packages/dashboard/src/element.tsx` — Lovelace element uses `hass.connection`.
- `spec/contract.md` — frozen dashboard package contract; does not yet freeze core.
- `spec/home-assistant.md` — data boundary and integration rules.
- `packages/core/README.md` — core install/use/subpaths; thin on stability and auth.

## Provenance

Desk research, 2026-10-31: public GitHub repositories, npm registry metadata and search, Home Assistant developer/contributor documentation, and Home Assistant community posts. No code was changed by this note. The next steps are recommendations, not an adopted contract; any implementation must go through the normal `npm run check` / `npm run test-storybook` gates and, for auth, a security review.
