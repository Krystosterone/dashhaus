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
| `.` | The transport and store contracts, `HaProvider` and its selectors, the `useHa<Name>` hooks, the matching `Ha<Name>` headless components, registry hooks, history and request hooks, mappers and action factories |
| `./entities`, `./entities/*` | The normalized, skin-free entity models and their pure logic. Raw Home Assistant state never enters them. |
| `./primitives` | The headless interaction hooks: press, slider, range slider, sheet, keypad |
| `./hooks` | UI-free hooks: `useNow`, `useDelayLeft`, `useScrollSpy`, `useHashPage`, `useDemoClimate` |
| `./perf` | The opt-in marks; documented in [performance.md](performance.md) |
| `./websocket` | The one module that imports `home-assistant-js-websocket`, plus `connectHomeAssistant(auth)` |

React 18.3+ and React 19 are both supported peers; the repo's own suites run React 18, and a clean consumer install,
typecheck and build on React 19 holds the wider range.

`./demo`, `./testing` and `./fixtures/*` are for Storybook and tests. They are additive conveniences, not a production
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

`createHaStore(transport, initialEntities?)` turns one transport into a `HaStore`. `HaProvider` owns its lifecycle at
the application boundary; a card never connects or disconnects the store itself.

The `useHa<Name>` hooks return `{ entity, history, actions }`; a read-only domain returns `{ entity, history }` (weather
also returns `hourly` and `daily`). `entity` is the normalized model, `history` is today's parsed slice, and `actions`
is the domain's handlers. The hook accepts the options its `Ha<Name>Options` type declares; `name`, `loadHistory={false}`
and `onActionError` are the common ones.

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
retains a call that contains an alarm code. A successful call means Home Assistant accepted the command; the next
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
  shares the Home Assistant frontend's authenticated socket, carries no credentials in the card or the bundle, and
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
  by Storybook.

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

## What is not stable

- The dashboard package's surface: [contract.md](contract.md) freezes that separately.
