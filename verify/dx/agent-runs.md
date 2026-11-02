# Agent runs

The two drivers prove the journeys a script can take. An agent run proves the one the packages are designed for: a
fresh agent with only the release tarballs and a one-line task finishes it against a Home Assistant, without help.
Run one when the consumer surface changes (READMEs, the scaffold and its `AGENTS.md`, the deploy CLI's help and
errors).

## Set up

```sh
npm run release:pack
mkdir -p /tmp/run/user/tarballs /tmp/run/user-www && cp release/*.tgz /tmp/run/user/tarballs/
npx fake-home-assistant --port 8801 --www /tmp/run/user-www --state /tmp/run/user-ha.json
```

The server prints `HA_URL`, `HA_TOKEN` and `HA_WWW`. It speaks Home Assistant's websocket API (auth,
`subscribe_entities`, `call_service`, the lovelace and registry commands) on a small house, serves `/local/` from the
www folder, and draws each deployed dashboard at `/<path>` (registered resources loaded, the saved card configured,
presses toggling the house). `/api/fake/state` and `--state` show what a deploy left behind.

For the author path, put a reference image (or nothing, for a description) beside the tarballs instead.

## Run

Start the agent in the run folder, outside this repository, so it loads no project instructions. Give it no web
access, which also keeps the repository's GitHub pages out of reach. The task is one line plus what a person
would know:

> Deploy a dashboard to this Home Assistant. *(or: Build and deploy a Dashhaus skin that looks like ./inspiration.png.)*
> Home Assistant runs at http://127.0.0.1:8801; a long-lived token for an admin: fake-ha-token; its /config/www is
> mounted at /tmp/run/user-www. The packages aren't on npm yet; their release tarballs are in ./tarballs.
> Work only in this folder; don't ask questions. End with FRICTION (every guess, retry, workaround, or doc that
> pointed somewhere you couldn't reach) and RESULT (what is deployed and how you know).

Its FRICTION list is the finding. Judge the result from the fake Home Assistant, not from the agent's word. Render a
deployed dashboard with `--screenshot <dir>` on a driver, or open `http://127.0.0.1:8801/<path>` in a browser.
