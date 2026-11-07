# The core contract

`@dashhaus/core` is the headless foundation under every skin. This page freezes what a consumer may rely on, what is
internal, the error metadata, the transport lifecycle, and the auth and external-transport security boundary. A skin,
a standalone host and a kiosk gateway are all hosts of the same core; none of them gets credentials or a login surface
from this package.

## Stable surface

A consumer may rely on these. Until 1.0 a breaking change is allowed, but it has to be a change to this page and the
release notes; an additive change is a minor one.

| Entry | Stable |
| --- | --- |
| `.` | The transport and store contracts, `HaProvider` and its selectors, the `useHa<Name>` hooks, the matching `Ha<Name>` headless components, registry hooks, history and request hooks, `useHaPicture` and `useHaMoreInfo`, mappers and action factories |
| `./entities`, `./entities/*` | The normalized, skin-free entity models and their pure logic. Raw Home Assistant state never enters them. |
| `./primitives` | The headless interaction hooks: press, slider, range slider, sheet, keypad |
| `./hooks` | UI-free hooks: `useNow`, `useDelayLeft`, `useScrollSpy`, `useHashPage`, `usePicture`, `useDemoClimate` |
| `./seeds/*` | Every skin's demo seeds, one module per domain: `<NAME>_SEEDS`, `<NAME>_WORST_CASE`, their types and the domain's `useDemo<Name>` |
| `./perf` | The opt-in marks; documented in [performance.md](performance.md) |
| `./websocket` | The one module that imports `home-assistant-js-websocket`, plus `connectHomeAssistant(auth)` |

The package also carries the Lovelace framework a skin's card draws on, under `./lovelace` and its subpaths; what of it
is frozen is [contract.md](contract.md), not this page. It sits in core so that a skin author installs one package, and
it stays apart from the entries above: none of them reaches `./lovelace` or `react-dom`
(`verify/core-package.test.ts`), so a React app that only uses the hooks needs neither.

React 18.3+ and React 19 are both supported peers; the repo's own suites run React 18, and a clean consumer install,
typecheck and build on React 19 holds the wider range.

`./seeds/*`, `./demo`, `./testing` and `./fixtures/*` are for Storybook and tests. They are additive conveniences, not a production
surface: their seeds and rendered output may change without a breaking release.

Internal, and free to change without notice:

- Every file and folder under `packages/core/src/` that no declared subpath exports.
- The shared request cache's keys, eviction and effect ordering, the store's internal subscription bookkeeping, and the
  number of network commands a background read issues, beyond the documented caching rule.
- An `HaActionError`'s `message`, and the wording of a development warning. Use `code` and the metadata below.
- Action payload construction beyond the service names and fields the [Home Assistant rules](home-assistant.md) state.

### Raw state, mapped entities and actions

`HaTransport` is the injected seam:

- `subscribeEntities(listener)` delivers the complete entity map now and after every change, keeping unchanged
  entities' object identity, and keeps the subscription alive across its own reconnects.
- `subscribeConnection(listener)` reports `connected`, `disconnected` and a terminal `error`.
- `callService(domain, service, data?, options?)` runs a Home Assistant service.
- `sendMessage(type, payload?)` is optional, for generic commands such as recorder history and the registries. A
  transport without it stays valid; the reads that need it resolve as unavailable.
- `resolveUrl(path)` is optional: an entity's picture path as a URL the page can load, or nothing ([Pictures](#pictures)).
  Without it a path stays relative to the page.

`createHaStore(transport, initialEntities?)` turns one transport into a `HaStore`. `HaProvider` owns its lifecycle at
the application boundary; a card never connects or disconnects the store itself.

The `useHa<Name>` hooks return `{ entity, history, actions }`; a read-only domain returns `{ entity, history }` (weather
also returns `hourly` and `daily`). `entity` is the normalized model, `history` is today's parsed slice, and `actions`
is the domain's handlers (a lock has no history: its day is its last change). The hook accepts the options its
`Ha<Name>Options` type declares; `name`, `loadHistory={false}` and `onActionError` are the common ones.

Beside its handlers each domain declares what its actions are, `<NAME>_ACTIONS: ActionKinds<<Name>Handlers, <Name>Entity>`
(`ha/actions/kinds.ts`): what a press gives the handler (`takes`: `nothing`, a `code`), or the value it sets, said as
what it is: a `level` the entity reports in `field` (a percent, or a range its `min` and `max` give as numbers or as
the entity's fields; `wakes` when setting it turns the entity on), a `choice` of the entity's own list (`options`, a
field) or a fixed one, the chosen one in `field`, or a `switch`, a boolean `field`; and a `value` none of these says.
`asks: true` marks an action that asks first. The type covers every handler, optional ones included, so a new one can't
go undeclared, and a value's `field` must be one of the entity's. The generators read it (`scripts/domains.js`) to draw a
tap as a button, an action that asks first or takes a code through the skin's Confirm and Keypad on
`useGuardedAction`, a level on the skin's level part (orb's `LevelBar`, field's `Fader`), a choice or a switch on its
chips or keys (`ChoiceChips`, a `KeyGroup`), and to leave the rest out; a skin's own card reads it when it wants to know
the same.

The words of a card's small print are `entities/facts.ts`, the same on every card and in every skin: `lastSeenFact`,
`unavailableSince`, `sinceFact`, `lastChangedFact` (with who changed it) and `updatedFact`. Today's summary is
`entities/today.ts`: `todaySummary(word, minutes)` says how long the entity spent in its state today ("On 2h 36m",
"Armed 1h", "Heating 35m") or that it never did ("Not on today"). An unavailable entity's summary stays the skin's own.

### Headless components and hooks

Every `useHa<Name>` entity hook has a matching `Ha<Name>` render-prop component in `.`:

```tsx
<HaLight entityId="light.desk">
  {(light) => <MyCard entity={light.entity} actions={light.actions} />}
</HaLight>
```

The component exists because a configured list cannot call hooks in a loop. It renders no markup of its own, takes the
hook's options as props, and is built by the one `headless()` factory. Do not hand-write a wrapper; a second
implementation drifts. The pairing rule:

1. Every per-entity `useHa<Name>` hook gets a component.
2. A collection hook gets a component only when a list needs per-item rendering.
3. Singleton selectors (`useHaStatus`, `useHaStore`, `useHaSnapshot`) and host, auth or config hooks stay hook-only:
   there is no per-item list for a singleton, and an auth component would own the host's lifecycle.
4. Components and hooks share one implementation.
5. The card generator registers both, and `packages/core/src/ha/headless.test.tsx` fails when a domain is missing.

## Pictures

A camera's still and a player's artwork are an entity's own picture, Home Assistant's `entity_picture`: a signed, usually
relative path (`/api/camera_proxy/camera.door?token=…`, `/api/media_player_proxy/…&cache=…`) whose token Home Assistant
rotates by rewriting the attribute, or an absolute URL for a player whose artwork is remotely accessible. It is the one
image core carries. Nothing else is read (no `camera/thumbnail`, no `auth/sign_path`), and no stream: no HLS, WebRTC or
MJPEG player, and no dependency for one.

- **Where it comes from.** A mapper never reads it: a picture isn't normalized state. A domain's `useHa<Name>` adds it
  to the model it returns from `useHaPicture(entityId)`, which reads the raw attribute, drops it while the entity is
  unavailable, unknown or missing (a past frame must never read as now), and resolves it through the store's
  `resolveUrl`. That asks the transport's (`HaTransport.resolveUrl`) and keeps only a URL a page may load as a picture:
  http(s), an inline `data:image/…` or a `blob:` (`resolvePicture`, `ha/picture.ts`). The websocket adapter resolves a
  path against the connection's `auth.data.hassUrl`, as the frontend's `hass.hassUrl()` does; a connection with no auth
  keeps it relative to the page, which inside Home Assistant is Home Assistant. A demo transport serves its `pictures`
  (a path, without its query, to a local inline picture from `./seeds/pictures`) and resolves any other path to
  nothing, so a demo never fetches the network.
- **How it loads: `usePicture(src, { refresh, paused })`** (`./hooks`, UI-free, so a presentational card calls it). Its
  `ref` goes on the picture's box. It loads only once that box is on screen (IntersectionObserver) and the page is
  visible; it refreshes every `refresh` milliseconds only while both stay true, never in the background, and at once on
  coming back late, each refresh asking for the source with `t=<now>` added so no cache answers (`refreshUrl`; an inline
  or blob URL is left alone). Each frame decodes off the page (`Image.decode()`) before it is drawn, so frames swap
  without a flash. The last good frame stays while the next loads and when a refresh fails (`stale`); a new source that
  fails clears it (`failed`), so the last track's cover never sits under the next track's title; no source clears it at
  once and cancels its load. `paused` (a `quiet` dashboard) takes a new frame only on first sight and when the page wakes.
  It returns `{ ref, src, status, at }`, `status` one of `none`, `loading`, `ready`, `stale`, `failed`, and `at` when the
  frame drawn loaded. Artwork passes no `refresh`: it changes when its URL does. Without its `ref` on a box it never
  loads, even where there is no IntersectionObserver (where there is none, a box that is there counts as on screen).
- **Asked for only where it is drawn.** A card passes `usePicture` a source only for a footprint that draws the
  picture, and nothing everywhere else (a compact row, a footprint with no well for it, stills switched off, the entity
  unavailable), so nothing is fetched for a box that isn't there.
- **Its words** are `entities/picture.ts`: `No picture` for a source with nothing to keep, `Still from 22:14`
  (`stillFrom(at)`) for a stale or paused still, said on the status line or a meta line, never over the picture,
  and `Open` for its press where the card names nothing better (`PICTURE_WORDS.open`), so a skin's `Picture` part
  writes no word of its own. What a card says when its picture fails depends on what the picture is for: where it is
  the content (a camera's still), it says `No picture`; where it is recognition only (a player's artwork, which the
  title already names), it says nothing and the well keeps the card's glyph.
- **The live stream is Home Assistant's.** `useHaMoreInfo(entityId)` opens the host's own dialog for the entity, from
  `HaProvider`'s `moreInfo`: the Lovelace card base fires `hass-more-info` from its element, and Home Assistant's
  more-info dialog plays a camera's stream with its own player. Where the host has none (Storybook, a demo, a standalone
  app), it returns nothing and a card opens its own details instead, never a control that opens nothing. That is the
  picture's own press; which press opens what is each skin's (orb.md → A picture is a readout, field.md → A picture is
  a window in the screen): the name opens the details on every card, whatever its picture's press does.
- **Privacy and cost** are the dashboard's: a still is fetched only while seen (above); a dashboard's `stills: false`, or
  a camera card's `still: false`, fetches none (the card passes no source rather than hiding a loaded one); `quiet`
  pauses refreshing. Each skin draws a picture with its own `Picture` part, a fixed box with no word over it, which
  takes no press while the entity is unavailable: a camera that is gone has no stream to open.

## Error metadata

A rejected action or background request settles as an `HaActionError`. It never carries the provider's message or
payload — those can echo an alarm code. The sanitized `translationKey` and `providerCode` string scalars remain, and
`code`, `domain`, `service` and `entityId` are stable.

Every code has one category and one retryability answer, from the single table in `packages/core/src/ha/types.ts`:

| `code` | `category` | `retryable` | Meaning |
| --- | --- | --- | --- |
| `not_connected` | `connection` | `true` | The request ran while the store was not connected; the command did not reach Home Assistant |
| `service_failed` | `rejected` | `true` | Home Assistant rejected the command; repeating the same call is safe |
| `transport_unknown` | `connection` | `false` | The connection changed during the call; the outcome is unknown, so a repeat could double-apply it |
| `unsupported` | `unsupported` | `false` | The transport or the entity cannot do what was asked |
| `invalid_input` | `invalid_input` | `false` | The request was malformed before it reached the transport |

`retryable` means "safe to repeat on the current connection", not "will succeed". The store applies the same rule: it
retains the latest failed non-sensitive action for `retryLastAction()` only when the error is retryable, and never
retains a call that contains a code, nor a lock's or an alarm's call, which asks first on its card. A retained call is
dropped once its entity changes, so Retry never undoes what happened since. A successful call means Home Assistant accepted the command; the next
entity snapshot is the readback boundary, not proof that the entity reached the requested state.

The store's `lastActionError` is the latest settled action failure. `clearActionError()` dismisses it, and
`canRetryLastAction()` reports whether a retry is available. Background reads through `query` and `callApi` never own
`lastActionError`.

## Transport lifecycle

`createHaStore` owns one connection generation counter and one snapshot:

- `status` is `idle` until the first `connect()`, then `connecting`, `connected`, `disconnected` or `error`.
- `generation` advances on connect, disconnect, loss, recovery and terminal failure. A read or action that settles
  under a different generation than it started under has an unknown outcome.
- Concurrent `connect()` callers share one attempt. A throwing subscription fails closed with a sanitized lifecycle
  error; the store does not retry by itself.
- Subscriber callback failures are isolated, and service input is validated before it reaches the transport.
- `disconnect()` stops the store's subscriptions and clears its entities. It never closes the transport: the host
  that opened the connection owns closing it.
- `createHaStore(transport, initialEntities)` may seed a complete snapshot the host already has, such as Lovelace's
  `hass.states`. The store is connected from the first frame; the live subscription still replaces the seed. A
  reconnect waits for the next live snapshot instead of reusing the seed.

`HaProvider` shares one store across its mounts with an ownership count and defers final cleanup by one microtask, so
React StrictMode's effect replay does not close and reopen the connection. The provider does not own auth and does not
close the transport.

## Auth is host-owned

`@dashhaus/core` has no auth provider, auth hook, login component, token storage or token refresh, and will not grow
one: the deployed card already inherits the frontend's authenticated connection, and a second lifecycle owner would
duplicate the host's.

- **Lovelace card.** The element builds a transport from `hass.connection` with `createHomeAssistantTransport`. It
  shares the Home Assistant frontend's authenticated socket, carries no credentials in the card or its resource, and
  never closes the frontend's connection.
- **Standalone app.** The host obtains an `Auth` — OAuth through `home-assistant-js-websocket`, or a long-lived token
  the host manages — and calls `connectHomeAssistant(auth)`. The host owns the returned transport and calls
  `transport.close()` when it is done. `@dashhaus/core/websocket` is the only module that reaches the client.
- **Kiosk or wall panel.** Prefer an external transport gateway instead of putting HA credentials in the browser
  page. Keep them server-side, allowlist the entity IDs, commands and service fields the display may use, sanitize
  incoming events, enforce size and rate limits, and never log tokens.

Never store a long-lived token in a skin, a bundle or `@dashhaus/core`; never add a login form to core; never
auto-refresh a token in core. Two auth surfaces with one lifecycle is the failure mode to avoid: if auth state ever
enters core, it is one store with narrow selectors, never a provider state machine beside an independent auth hook.

An external transport has the security boundary of the gateway, not of Home Assistant. The transport contract is
deliberately narrow: a full entity map, connection events, `callService` and an optional generic command. A gateway
must enforce the rest before it answers. Keep service fields allowlisted per domain, reject unknown commands rather
than forwarding them, strip credentials and alarm codes from errors and events, and cap the entity map and request
rate.

## Testing and demo helpers

- `./testing` exports `fakeTransport(entities)` and `renderConnected(ui, entities)`. The fake serves the map, records
  typed service calls in `calls`, and can emit a whole map or patch one entity (`emitEntity(id, patch)`).
- `./demo` exports `createDemoStore()`, the demo house behind the real store, and the per-domain demo transports used
  by Storybook. Each is `createDemoTransport({ seed, services })`: the helper holds the entities, delivers them,
  routes a call by `domain.service` to its target, refuses any other, stamps `last_updated` on every change and
  `last_changed` when the state changes, and answers the registries and history; a domain's transport is its seed and
  its service table alone (`onOffServices` for switching), and the mixed `createDemoHaTransport` composes the
  domains' tables.
- `./seeds/pictures` is the demo pictures every skin's camera and media stories share and the demo transports serve:
  local inline SVG stills and sleeves, so no story fetches the network.
- `./seeds/<name>` is one domain's demo seeds for every skin's card stories: its examples (`<NAME>_SEEDS`, with an
  unavailable one), its worst cases (`<NAME>_WORST_CASE`), their types, and `useDemo<Name>`, local state that behaves
  like the entity for a story to press. A card's stories draw on them, so every skin shows the same examples; a skin
  never keeps a copy, and the generators import them rather than write one. Unlike `./demo`, they reach no Home
  Assistant layer, so a card folder may import them.

```tsx
import { HaProvider } from "@dashhaus/core";
import { createDemoStore } from "@dashhaus/core/demo";

const store = createDemoStore(); // the whole house; pass a focused demo transport if a story needs one domain
<HaProvider store={store}><MyDashboard /></HaProvider>;
```

A connected-card test patches one entity without rebuilding the room:

```ts
const fake = fakeTransport(entities);
fake.emitEntity("light.desk", { state: "on", attributes: { brightness: 180 } });
expect(fake.calls).toContainEqual({ domain: "light", service: "toggle", data: { entity_id: "light.desk" } });
```

Both are additive: a test may use them, and their seeds can change.

## Interaction primitives

`./primitives` holds the headless interaction primitives every skin draws its controls on: behaviour and semantics, never markup or styles. Each is a hook whose result a skin spreads onto its own elements.

- `usePress` (`press.ts`) is a button: tap, optional press and hold (the click that ends a hold doesn't also press), optional latch (`aria-pressed`), and unavailable (`aria-disabled`, still focusable) or disabled. Every latching or holding control goes through it; a plain one-shot button stays a native `<button>`.
- `useSlider` and `useRangeSlider` (`slider.ts`) are a horizontal track: pointer input on a hit layer (mouse jumps on press, touch on a tap or the first sideways move, so a scroll never sets a value; `data-anim` only on a jump), and a hidden native range input for keyboard and screen readers, with its value text. A range keeps its reported ends: pointer steps count from `min`, keys step from the value, and the hidden input keeps its native `step` only while `min`, `max` and the value sit on the step's grid (otherwise `step="any"`, or the browser rounds the value it shows).
- `useSheet` (`sheet.ts`) is a native modal `<dialog>`: mount, show, scroll lock, `data-closing` exit, Escape and backdrop close, and drag down to close on phones.
- `useKeypad` (`keypad.ts`) is a code keypad: the code typed so far, digits, delete and enter from its keys or a physical keyboard, and the answer (busy, a wrong code cleared, a failed call kept for another try).
- `useGuardedAction` (`guarded.ts`) is an action that asks first (a lock's unlock, an alarm's disarm): the action waiting on its answer, answered by a question (`confirm`) or a code (`submit`, shaped for `useKeypad`), busy and failed, a refused code moving the question to the keypad, `attempt` for a tap that runs at once unless the entity wants a code, and the question closing when the entity gets there by itself (`settled`). A card on the dashboard hands the action to its details (`askElsewhere`); the details surface holds it. Each skin draws it with its own `Confirm` and `Keypad` parts, whose question guards its press with `useSettled`.

A primitive used in a list goes in a small skin component (`Chip`, `Segment`), not a hand-written `aria-pressed` per item. A one-of-several group of latching keys (`ChoiceChips`, alarm segments, Field's mode keys) uses `usePress` per key, not a radiogroup primitive: roving focus and radio semantics would be new behaviour and a restyle of the chosen key. Radix was weighed and not adopted: its slider sets a value on a touch press and its dialog's focus trap fails in the card's shadow root, so each primitive is the repo's own hook. Add one only when a skin needs it.

Primitives have no Storybook stories. A primitive is behaviour without markup, so a story would have to invent markup and styles that belong to no skin, and what it showed would be wrong in the ways that matter: a track's scroll-or-set on touch depends on the skin's `touch-action: pan-y`, a press on its `:active` feedback, the sheet's motion on its CSS. That story would pass axe and still prove nothing about either skin. The contracts are pinned by the unit tests beside each hook (`press.test.tsx`, `slider.test.tsx`, `sheet.test.tsx`, `keypad.test.tsx`, `guarded.test.tsx`), and every skin exercises them in its card stories: `usePress` on any card's orb or key, `useSlider` on Light → Sizes, `useRangeSlider` on Climate → Heat/cool range (orb) or Auto range (field), `useSheet` on any card's Details, phone, `useKeypad` on Alarm → Details, keypad, `useGuardedAction` on Lock → Details, unlock and Details, code. Feel a primitive there, on a phone. If a third skin ever wants to try one before it has cards, revisit this.

## Decided against

Weighed against the community's Home Assistant React libraries (`hass-react`, HAKit's `@hakit/core`, 2026-10-31) and
not taken. Each is a decision, not an oversight; reopen one only with the need it lacked.

- **Their domain logic.** An absent reading as zero, capability inferred from a possibly stale attribute, RGB-only
  colour, raw validation errors, feature errors thrown from handlers. The normalized models, absent-reading rules and
  non-throwing `serviceRunner()` handlers are safer.
- **Automatic service retries.** A timeout doesn't prove a command failed (a toggle may have gone through), so a
  retry can act twice. The store's generations, the `transport_unknown` outcome and an explicit retry are the contract.
- **Provider messages in errors.** An `HaActionError` keeps only sanitized scalars (Error metadata, above), never the
  provider's text or an alarm code.
- **Auth in core**: OAuth, token storage, refresh, a login form, a `useAuth`, or a second auth surface beside the
  store (Auth is host-owned, above). Before any of it, a security review.
- **Presentation in core**: colours, relative times, icons and image URLs chosen for display belong to a skin. The one
  image core carries is an entity's own `entity_picture`, resolved by the connection that serves it ([Pictures](#pictures)),
  since only the connection knows Home Assistant's base URL.
- **An areas hook over the entity map.** It recomputes on every state change; the registry hooks read registry data
  once per generation.
- **Generated entity and service types, locale sync and a service proxy.** Build coupling to a live Home Assistant
  with no consumer asking; hand-normalized models stay the source. Rejected for now, not forever.
- **One entry with a large peer list, React 19 only.** Subpaths, optional peers and a React 18 baseline suit a skin
  foundation better.
- **Hand-written headless wrappers, and snapshot-first hook tests.** One `headless()` factory, and behaviour tests.

`useHaUser` and `useHaConfig` (read-only, hook-only) wait for a skin that needs the person or the config.

## What is not stable

- The Lovelace framework's surface, `./lovelace/*`: [contract.md](contract.md) freezes that separately.
