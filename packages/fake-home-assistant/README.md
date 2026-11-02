# @dashhaus/fake-home-assistant

A focused, in-memory Home Assistant for tests, CI and clean-room runs. It speaks enough of Home Assistant's websocket,
REST and `/local/` APIs for a Dashhaus deploy and a deployed dashboard to work without a real instance: auth,
`subscribe_entities`, `call_service`, the Lovelace resource/dashboard/config commands, the registry reads, the read-only
REST endpoints, and a page that loads a saved dashboard's resources and draws its first card.

It is a fake, not a Home Assistant emulator, and is not affiliated with or endorsed by the Home Assistant project.
Node 22 or later, no runtime dependencies, one ESM entry point.

## Install

```sh
npm install @dashhaus/fake-home-assistant
```

From a release tarball instead of the registry, install the `.tgz` that `npm pack` writes.

## Start a server

```js
import { startFakeHomeAssistant } from "@dashhaus/fake-home-assistant";

const { ha, settings, close } = await startFakeHomeAssistant({ port: 0, www: "./www" });
console.log(settings.HA_URL, settings.HA_TOKEN, settings.HA_WWW);

try {
  // Point a client at `settings`, or inspect ha.resources, ha.dashboards, ha.saved and ha.calls.
} finally {
  await close();
}
```

`port: 0` picks a free port. `www` is the folder served at `/local/` (a new temporary folder when omitted). `token`
defaults to `fake-ha-token` and `host` to `127.0.0.1`. `stateFile` writes the deploy log after every command.

`settings` is the `.env` a Dashhaus deploy reads:

| Key | Value |
| --- | --- |
| `HA_URL` | `http://<host>:<port>` |
| `HA_TOKEN` | the token clients authenticate with |
| `HA_WWW` | the folder served at `/local/` |

The returned `ha` is a `FakeHomeAssistant`: its `resources`, `dashboards`, `saved` and `calls` record what a deploy
did. The server's `close()` stops listening and closes open sockets, so a test does not hang on a client that is still
connected.

### CLI

```sh
npx fake-home-assistant --port 8801 --www /tmp/run/www --state /tmp/run/ha.json
```

| Option | Default |
| --- | --- |
| `--port <port>` | `8123`; `0` picks a free port |
| `--host <host>` | `127.0.0.1` |
| `--www <dir>` | a new temporary folder |
| `--token <token>` | `fake-ha-token` |
| `--state <file>` | none; when set, the JSON below is written after every command |
| `-h`, `--help` | prints the options |

It prints `HA_URL`, `HA_TOKEN` and `HA_WWW` once listening.

## What it serves

| Path | What |
| --- | --- |
| `/api/websocket` | auth, `subscribe_entities`, `call_service`, `get_states`, `ping`, `subscribe_events`, the Lovelace and registry commands |
| `/api/` | `{"message":"API running."}` and `/api/config` the version and unit system |
| `/api/states`, `/api/states/<entity_id>` | the house's states |
| `/api/fake/state` | resources, dashboards, saved layouts and the command log, as JSON |
| `/local/<path>` | files under `www`, refusing a path outside it |
| `/` | a sidebar listing the dashboards a deploy created |
| `/<url_path>` | a dashboard: its resources loaded as modules, its saved first card configured on the fake house |

The REST reads want `Authorization: Bearer <token>`. `/api/fake/state`, `/local/`, `/` and the dashboard pages are open.

### Websocket commands

`FakeHomeAssistant.send` answers:

- `lovelace/resources`, `lovelace/resources/create`, `lovelace/resources/update`
- `lovelace/dashboards/list`, `lovelace/dashboards/create`, `lovelace/dashboards/update`
- `lovelace/config`, `lovelace/config/save`
- `get_states`, `call_service`
- `config/entity_registry/list_for_display`, `config/device_registry/list`, `config/area_registry/list`

`subscribe_entities` sends the whole house once, then one event per changed state. `call_service` turns `light`,
`switch` and `input_boolean` entities on, off or over, and applies a light's `brightness` and `brightness_pct`; any
other service is accepted and leaves the state alone. An unknown entity or command gets a failed result with
`unknown_command`. Set `ha.failResources = true` to make `lovelace/resources` fail, for a deploy's YAML-mode path.

`subscribe_events`, `unsubscribe_events` and `ping` answer success (or `pong`) without emitting events.

## Use your own house

`states` and `registries` replace the sample house. They use Home Assistant's shapes:

```js
const states = [
  {
    entity_id: "light.desk",
    state: "on",
    attributes: { friendly_name: "Desk", supported_color_modes: ["brightness"], brightness: 128 },
  },
];
const registries = {
  entities: { "light.desk": { entity_id: "light.desk", area_id: "office", device_id: null } },
  devices: {},
  areas: { office: { area_id: "office", name: "Office" } },
};
await startFakeHomeAssistant({ port: 0, states, registries });
```

`last_changed`, `last_updated` and `context` are filled in when a state omits them. `houseStates()`,
`houseEntityRegistry()`, `houseDevices()`, `houseRegistries()` and `HOUSE_AREAS` build the default house and are a
useful starting point.

`FakeHomeAssistant` is exported on its own, and `connectTo(ha, seen)` turns one into a `connect(url, token)` callback
that records what a driver asked for, for a test that injects the fake instead of opening a socket.

## Known limits

- In memory and one process: no persistence, real Home Assistant configuration, recorder, history, automations,
  integrations or service calls beyond the ones above. `history/*` and `recorder/*` answer `{}` on the dashboard page
  only; the websocket server answers `unknown_command`.
- Auth is one long-lived token compared as a string; no users, refresh tokens or permissions.
- The websocket implementation handles text frames and client close/ping, not binary, compression or server pings.
- The dashboard page loads the saved first view's first card and serves `subscribe_entities`, light/switch
  `call_service` and empty history/recorder answers from the page.
- `/local/` serves files only; no directory listings, gzip or range requests. The REST API is read-only.
