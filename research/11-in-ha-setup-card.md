---
date: 2026-11-01T00:00:00+00:00
git_commit: e4bec8d
branch: docs/landing-redesign
repository: dashhaus
topic: "In-Home-Assistant setup: a setup card that creates the dashboards a Marketplace install needs"
tags: [research, home-assistant, hacs, marketplace, deploy, lovelace]
status: complete
last_updated: 2026-11-01
---

# Research: In-Home-Assistant setup for the Marketplace bundle

> **Scope.** HACS and the Home Assistant Marketplace as documented on 2026-11-01 (Home Assistant 2026.11 ships the
> Marketplace; HACS the custom integration is blocked on 2026.11 and later), compared with the Dashhaus tree at
> `e4bec8d`: `packages/deploy/src/deploy.js`, `packages/deploy/src/load.js`, `dashboard.config.mjs`,
> `apps/lovelace/entry.ts`, `packages/dashboard/src/element.tsx` and `src/skins/orb/lovelace/auto.ts`. This note decides
> the setup mechanism and records the distribution gates; it does not design the setup card's visual language and does
> not change the deploy CLI.

## Research question

HACS and the Marketplace install a dashboard plugin's files and register its resource, but they do not create
dashboards. What is the smallest in-Home-Assistant mechanism that replaces `npm run deploy`'s dashboard creation for a
Marketplace-installed bundle, and what must the repository do before that path reaches users?

## Decision

**Ship `custom:dashhaus-setup` in the same bundle.** It is a bundle-only, plain custom element that uses the
frontend's authenticated `hass.connection` to create the missing dashboards and save their panel views. It is
admin-only, storage-mode only, create-only and idempotent, and it rolls back a dashboard it created when saving its
layout fails.

- **The Marketplace does the install.** It copies the released `dashhaus.js` to `www/community/dashhaus/` and adds
  the module resource at `/local/community/dashhaus/dashhaus.js?v=<version>` when resources are managed in storage.
- **The setup card does the one remaining step.** It creates `dashhaus-orb`, `dashhaus-field` and any generated
  skin's dashboard, exactly as `reconcileDashboards()` does, then never touches their layouts again.
- **Keep `npm run deploy`.** It remains the CI, automation and YAML-mode path, and the repo's own deploy. The setup
  card is for a Marketplace install, not a replacement for the CLI.
- **No companion integration.** One repository holds one item of one type, so an integration would be a second
  public repo, Python, a config flow and Home Assistant's internal Lovelace collections. The setup card reaches the
  same result from the bundle that is already installed.
- **The distribution gates are prerequisites, not part of the card.** The repository is private, has no license and
  no release, and `dist/` is ignored; none of that changes by writing the setup card. The gates are in
  [Distribution prerequisites](#distribution-prerequisites).

## What the Marketplace replaces

| Step today (`npm run deploy`) | After a Marketplace install | Setup card |
| --- | --- | --- |
| Build `dist/dashhaus.js` | CI builds the bundle and attaches it to the release; the Marketplace never builds | — |
| Copy the bundle to `/config/www` | Installed to `www/community/dashhaus/` | — |
| Register `/local/dashhaus/dashhaus.js?v=<hash>` | Resource added at `/local/community/dashhaus/dashhaus.js?v=<version>`; with YAML-managed resources the install dialog shows the line | — |
| Create `dashhaus-orb` and `dashhaus-field` | Not done | `lovelace/dashboards/create` |
| Save each panel view | Not done | `lovelace/config/save` |
| Fetch the file back to prove what is served | Not done; the Marketplace owns the installed file | — |

The missing capability is only dashboard provisioning. It is also optional: a user can create a dashboard in Home
Assistant and add **Dashhaus** from the picker, whose `getStubConfig` already spells out Orb's generated layout and
whose Field card lays the house out itself. The setup card removes those manual steps; it does not unlock a card that
cannot otherwise be used.

## Options considered

| Option | What it costs | Why not the default |
| --- | --- | --- |
| Add the card from the picker | No code; already works once the resource is registered | Two dashboards, their paths, icons and panel views are created by hand; a first-time user has to know to use a Panel view |
| **Setup card in the same bundle** | One bundle-only element and a reconciler test; no new package, repo or Python | Needs one card placement and an admin; storage-mode only |
| Companion integration | A second public repo, config flow, Python, `frontend.add_extra_js_url` or resource registration, and Home Assistant's internal dashboard collections | One item of one type per repository; a separate release to maintain for a step the card can do; uses internals the CLI does not need |

## The setup card

### Where it lives

`src/setup.tsx` exports `defineSetupCard(dashboards)`, a plain custom element with no React, no store and no skin
tokens. `apps/lovelace/entry.ts` imports it and registers it beside `defineDashhausCard` and `defineFieldCard`, passing
the dashboard descriptors. It stays in the bundle and is not exported from a public package: `apps/lovelace` is
already the one file outside `src/` that ties the skins together, and a setup tool is not part of the skin-author
contract.

`new-skin` adds its dashboard descriptor next to the card definition it already registers in the entry, under a new
`// new-skin: setup dashboards` marker.

`src/setup.test.tsx` runs in the existing root Vitest project (`src/**/*.test.{ts,tsx}`), so no project or pinned
include changes. The card gets no Storybook story: a story would need a mocked WebSocket connection and would prove
less than the reconciler test.

### Destinations

The descriptors mirror `dashboard.config.mjs`:

```ts
{ path, title, icon, card(hass) }
```

- `dashhaus-orb` / Home (Orb) / `mdi:home-variant`: `autoDashboard({ states, entities, devices, areas })`, the same
  snapshot the CLI takes, so the new dashboard is editable and stops changing once created.
- `dashhaus-field` / Home (Field) / `mdi:knob`: `{ type: "custom:dashhaus-field", title: "Home" }`, which lays the
  house out on every draw.
- A generated skin: its own path and card type, added by `new-skin`.

The setup card renders one checkbox per destination, checked by default, so a user who wants only Orb does not get a
Field dashboard.

### Flow

1. Check `hass.user?.is_admin`; a non-admin sees "Only an administrator can create dashboards" and no calls are made.
   `LovelaceHass` gains `user?: { is_admin?: boolean }`.
2. `lovelace/dashboards/list`.
3. For each checked destination whose `url_path` is absent: `lovelace/dashboards/create` with `url_path`, `title`,
   `icon`, `mode: "storage"`, `show_in_sidebar: true`, `require_admin: false`.
4. `lovelace/config/save` with
   `{ views: [{ title: "Home", path: "home", type: "panel", cards: [card] }] }`.
5. Existing dashboards are skipped and never saved, renamed or deleted.
6. If `config/save` fails after a create in this run, `lovelace/dashboards/delete` that dashboard before reporting, so
   a retry does not leave an empty dashboard behind.

After success, the card links to each created dashboard and says to reload if the sidebar has not updated. It is safe
to remove.

### Idempotence and failure

- A second press lists the dashboards, finds every path and makes no calls.
- A partial failure is reported per destination; the others continue.
- `unauthorized` maps to the admin message; a missing or unsupported command in YAML mode maps to "This Home Assistant
  manages its dashboards in YAML; create the dashboard yourself and add the Dashhaus card." The CLI has the same
  storage-mode limitation.
- The button is disabled and `aria-busy` is set while the sequence runs; status uses `role="status"` and errors
  `role="alert"`.
- No token, no fetch, no `.storage` write and no arbitrary URL: only the websocket commands the CLI already uses.

`panelView` is three lines in `packages/deploy/src/load.js` (`{ views: [{ title, path, type: "panel", cards }] }`).
The setup card defines its own copy rather than importing it: `@dashhaus/deploy` must not depend on
`@dashhaus/dashboard`, and a shared module for three lines would be a new seam with no second consumer.

## Distribution prerequisites

These are separate from the setup card and block reaching users. Observed on 2026-11-01.

| Gate | Current state | Required |
| --- | --- | --- |
| Public repository | `Krystosterone/dashhaus` is private | Public; HACS and the Marketplace read only public GitHub |
| License | No `LICENSE`; README says `UNLICENSED`; GitHub reports no license | An OSI-approved license the catalog check recognizes |
| `hacs.json` | Absent | Root file with at least `name`; `filename` only if the asset is not named after the repo |
| Release | No tags and no GitHub releases | A published release; the Marketplace uses its tag as the version |
| Built asset | `dist/dashhaus.js` is gitignored and not released | Attach `dashhaus.js` to the release (or commit `dist/`); the repo and file names already match |
| README | Developer setup, one CI badge, no screenshot | Install steps and a dashboard screenshot; the catalog checks for images |
| Repository metadata | Description and topics empty | Description, topics and issues enabled |
| HACS action | Not configured | `hacs/action` with `category: plugin`, passing on push and pull request |
| Catalog | Not submitted | A PR to `hacs/default` → `plugin`, alphabetical; months to review |
| Docs | `docs/src/content/docs/start/deploy.mdx` is Node/SSH-first | Marketplace install as the primary path; the CLI as the advanced path |

Custom-repository installs work before the catalog PR and are the first release vehicle. The repository being private
and unlicensed blocks even that.

## Verification

- `src/setup.test.tsx` with a fake `connection.sendMessagePromise`: creates only missing paths, saves one panel view
  each, skips existing dashboards without saving, honors unchecked destinations, rolls back a failed save, makes no
  calls for a non-admin, and is idempotent on a second run.
- `verify/dx/fake-ha.js` already implements `lovelace/dashboards/list`, `dashboards/create`, `dashboards/update` and
  `config/save`; add `dashboards/delete` for the rollback. A browser journey against `verify/dx/fake-ha-server.js`
  loads a dashboard holding `custom:dashhaus-setup`, presses the button, and asserts `/api/fake/state` has both
  dashboards and their saved configs. This is the closest proof to a Marketplace install without a live instance.
- Live, on a scratch Home Assistant 2026.11: install the bundle as a custom repository, add the setup card to
  Overview, run it, confirm both dashboards appear in the sidebar and draw, edit one layout, run it again and confirm
  nothing was overwritten, then repeat as a non-admin and with Lovelace in YAML mode. Record it in
  `spec/releases/<version>.md` as `spec/release.md` requires.

## Limits

- Not zero-click: the user must add the setup card once. A truly zero-placement path needs an integration, which the
  one-item-per-repository rule and the internal dashboard APIs make a separate product.
- Admin and storage-mode only; YAML-mode Lovelace cannot create dashboards through this API.
- The Orb dashboard is a snapshot, matching the CLI and the picker; deleting its `sections` returns it to the card's
  automatic layout.
- Installing both the Marketplace plugin and the CLI bundle loads two copies of the bundle. `registerCard()` guards
  the element definition, but the page pays for both; the docs must say to pick one.
- The websocket commands are Home Assistant internals, already relied on by the CLI. A rename would break both paths
  together, and the fake-HA journey would catch it before a release.

## Sources

- HACS ⇄ Marketplace transition: <https://www.hacs.xyz/docs/marketplace/>
- Marketplace dashboard plugin guide: <https://contributors.home-assistant.io/marketplace/guides/dashboard/>
- Marketplace repository structure: <https://contributors.home-assistant.io/marketplace/reference/repository-structure/>
- `hacs.json` reference: <https://contributors.home-assistant.io/marketplace/reference/hacs-json/>
- Marketplace releases: <https://contributors.home-assistant.io/marketplace/guides/releases/>
- Marketplace integration page: <https://next.home-assistant.io/integrations/marketplace/>
- HACS general and plugin requirements: <https://www.hacs.xyz/docs/publish/start/>, <https://www.hacs.xyz/docs/publish/plugin/>
- HACS action: <https://www.hacs.xyz/docs/publish/action/>
- Catalog list: <https://github.com/hacs/default/blob/master/plugin>
- Home Assistant dashboard data functions (`lovelace/dashboards/create`, `delete`, `config/save`):
  <https://github.com/home-assistant/frontend/blob/dev/src/data/lovelace/dashboard.ts>
- Home Assistant custom-card `hass` and the card picker: <https://contributors.home-assistant.io/frontend/custom-ui/card/>

## Provenance

Desk research, 2026-11-01: the HACS and Marketplace documentation above, the Home Assistant frontend's dashboard data
module, and the Dashhaus tree at `e4bec8d`. The distribution state was read with `gh repo view`, `git tag --list`,
`git check-ignore` and the root README; the CLI and card behaviour from `packages/deploy/src/deploy.js`,
`packages/deploy/src/load.js`, `dashboard.config.mjs`, `apps/lovelace/entry.ts` and
`src/skins/orb/lovelace/auto.ts`. No code was changed. The setup card and its gates are a recommendation; an
implemented card must pass `npm run check`, the dx journey, and the live Marketplace smoke before this note moves
into `spec/deploy.md` and the docs.
