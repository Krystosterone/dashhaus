---
date: 2026-11-02T00:00:00+00:00
git_commit: c395afa
branch: main
repository: dashhaus
topic: "Publishing for web agents: the Marketplace/HACS install, the agent-first install page and the catalog gates"
tags: [research, home-assistant, marketplace, hacs, distribution, agents, docs]
status: complete
last_updated: 2026-11-02
---

# Research: Web-agent onboarding and the Marketplace install

> **Scope.** The Home Assistant Marketplace and HACS as documented on 2026-11-02, compared with the Dashhaus tree at
> `c395afa`: `README.md`, `docs/src/content/docs/start/`, `docs/dist/llms.txt`, `docs/astro.config.js`,
> `research/11-in-ha-setup-card.md` and `TODOS.md`. This note decides the distribution and agent-onboarding surface.
> The setup card's implementation is still [note 11](11-in-ha-setup-card.md); this note does not change it.

## Research question

What must be true before a web agent, with no repository knowledge and no terminal, can install Dashhaus and end up
with a working dashboard, and which parts of that path are packaging, which are docs and which are product?

## Decision

**Make the no-terminal Marketplace/HACS path primary and keep the CLI as the advanced path.** One release serves both
stores: the same `hacs.json`, the same release asset and the same catalog. Publish a `hacs_repository` My link, write an
agent-first install page whose three steps are also in `llms.txt`, and ship `custom:dashhaus-setup` so the install ends
with dashboards rather than instructions.

- **HACS is not a second target.** From Home Assistant 2026.11 the Marketplace is HACS brought into core, with the same
  catalog, `hacs.json` and HACS action. HACS the custom integration is blocked on 2026.11 and later.
- **The Marketplace installs files, not dashboards.** It copies the JS to `www/community/dashhaus/` and registers the
  resource. `custom:dashhaus-setup` remains the dashboard-creation half (note 11).
- **One My link reaches both eras.** `hacs_repository` opens HACS before 2026.11 and the Marketplace after, and offers
  to add the repository as a custom one when its category is named. It works before the catalog merge.
- **No companion integration.** One repository holds one item of one type; a config flow that creates dashboards would
  be a second public repository, Python and Home Assistant's internal Lovelace collections.
- **No agent token path.** A browser agent should use the user's authenticated Home Assistant session through the setup
  card, not a long-lived access token handed to a model.

## The paths

| Path | Who it serves | What it needs | Today |
| --- | --- | --- | --- |
| Marketplace/HACS → setup card | Browser agent, non-technical human | Public repo, a release, the My link, an admin | Setup card is not implemented; repo is private and unreleased |
| `npx dashhaus-deploy` | Terminal agent, CI | Node, an admin token, HA reachability and SSH/Samba for `www` | Works from a clone; npm release pending |
| Chat-only agent | Any chat model | A short install page it can quote verbatim | `start/deploy.mdx` is Node/SSH-first; the README is developer-first |
| `npm install @dashhaus/*` | React and skin developers | Published packages | `0.2.0` release pending |

A chat-only agent cannot touch the Home Assistant instance. A browser agent cannot run npm or SSH. The Marketplace path
is the only one that works for both a browser agent and a non-technical human.

## Why HACS is nearly free

The Marketplace and HACS share the distribution contract:

- `hacs.json` in the repository root with at least `name`. No `filename` is needed because the repository is `dashhaus`
  and the release asset is `dashhaus.js`.
- A `.js` file named after the repository, in the latest release, the root or `dist/`. `dist/` is gitignored, so the
  release asset is the artifact. Do not commit `dist/` to satisfy the other locations.
- The HACS action with `category: plugin`, passing without ignored checks.
- The catalog at `hacs/default`, file `plugin`, alphabetical. The Marketplace and HACS read the same catalog, and the
  review takes months.
- A `hacs_repository` My link reaches users before the catalog merge. The newer `marketplace_repository` link only
  works on 2026.11 and later, so the old link is the one to publish.

The only HACS-specific friction is on pre-2026.11 users, who must install HACS first. The setup card works there too
because it ships in the same bundle.

## What already exists

- `@dashhaus/bundle` builds one ES module, `dist/dashhaus.js`; the repository and asset names already match.
- `docs/astro.config.js` runs `starlight-llms-txt`, and `docs/dist/llms.txt`, `llms-small.txt` and `llms-full.txt` are
  generated.
- `research/11-in-ha-setup-card.md` decides the setup card and lists the distribution gates.
- `TODOS.md` tracks the setup card, the Pages gate and the npm release.

## Gaps

### 1. Distribution gates

| Gate | Current state | Required |
| --- | --- | --- |
| Public repository | Private | Public; the Marketplace and HACS read only public GitHub |
| License | No `LICENSE`; README says `UNLICENSED` | An OSI license the catalog check recognizes; MIT or Apache-2.0 |
| `hacs.json` | Absent | Root file with `name`; `filename` unnecessary |
| Release | No tag and no GitHub release | A full release; the Marketplace uses its tag as the version |
| Built asset | `dist/` is gitignored | Attach `dashhaus.js` to the release |
| README | Developer setup, no screenshot | Install-first, with a screenshot; catalog checks images |
| Repository metadata | Description and topics empty | Description, topics and issues on |
| HACS action | Absent | `hacs/action` with `category: plugin` |
| Pages | Not enabled | Source **GitHub Actions**, before the repo goes public |
| Catalog | Not submitted | PR to `hacs/default` → `plugin`, after the gates |

### 2. The setup card

This is the only missing product capability. Without it, every Marketplace install ends with creating a storage
dashboard, making it a panel view and adding the Dashhaus card by hand. With it, the install ends with adding one card
once and pressing Create. The contract is in note 11: bundle-only, admin-only, storage-mode, create-only, idempotent,
one checkbox per dashboard, never overwrite, roll back a failed save.

The card should be a button, not an effect on attach: auto-creating dashboards is surprising and hard to undo. Its card
picker label should be unambiguous, and its YAML-mode message should say to create the dashboard manually rather than
fail generically.

### 3. The agent-first install page

Add `docs/src/content/docs/start/install.mdx` with no Node, no token and no repository paths:

1. Check the Home Assistant version: 2026.11+ has the Marketplace; older versions need HACS first.
2. Open the My link:
   `https://my.home-assistant.io/redirect/hacs_repository/?owner=Krystosterone&repository=dashhaus&category=plugin`.
   It opens HACS before 2026.11 and the Marketplace after; if the repository is unknown, it offers to add it as a
   custom repository.
3. Install, then reload the browser.
4. Add the **Dashhaus setup** card to Overview once, press Create, and open the new dashboards. In YAML mode, create the
   dashboard manually and paste the provided configuration.

Put the same steps in a copy-paste prompt block, so a chat agent can quote them verbatim. Make the page the first item
under **Start here** and demote `start/deploy.mdx` to **Deploy with the CLI**.

### 4. README and `llms.txt`

The Marketplace shows the README; agents read it first. Lead with the install badge, a screenshot and the four steps,
and move the monorepo and npm content below. The current opening — "It is a component library, not a runnable app" —
describes the repository, not what a user gets.

`llms.txt` currently lists only documentation sets. `starlight-llms-txt` supports `description` and `details`; put the
same install steps and the My link there, so an agent that fetches only `llms.txt` still gets the task. `llms-full.txt`
then carries the page.

A separate root `SETUP.md` is optional. It helps an agent that reads the repository root but adds a second surface to
keep in sync; prefer the README and the install page unless a fresh-agent run shows the README is not enough.

### 5. Catalog

Submit after the gates and a green HACS action: PR to `hacs/default`, `plugin` file, alphabetical, with the release and
the passing action run. The My link works before the merge, so catalog review is a discovery improvement, not a launch
blocker.

## Design calls

- **Setup card, not integration.** Accept one card placement; keep one repository and one release.
- **Button, not auto-run.** Create-only, idempotent, never overwrite.
- **One link.** `hacs_repository` covers both sides of 2026.11; do not make users choose.
- **CLI secondary.** It is the CI, automation and YAML-mode path. Docs must say to pick one path, because installing
  both the Marketplace plugin and the CLI bundle loads two copies.
- **No agent credentials.** Do not design an "agent API" around `lovelace/dashboards/create` with a long-lived token.
- **License is a product decision.** MIT is the low-friction HA-card default; Apache-2.0 adds a patent grant.

## Verification

- A fresh-agent dry run: give an agent only the install page URL and a browser; it completes install, setup card and
  dashboard creation without repository knowledge.
- A live Marketplace install on a scratch Home Assistant 2026.11, and a pre-2026.11 HACS install, both from the
  `hacs_repository` link.
- A green HACS action and a passing catalog checklist.
- `npm run build:docs`, then inspect `llms.txt` and `llms-full.txt` for the install steps and the link.
- The setup card's fake-connection test, dx/browser journey, non-admin and YAML-mode cases, and idempotent second run
  from note 11.

## Limits

- A chat-only agent can only quote instructions or write YAML; it cannot install anything.
- One card placement remains unless a companion integration is built, which the one-item-per-repository rule makes a
  separate product.
- Admin and storage-mode only; YAML-managed dashboards need the manual fallback.
- The catalog review takes months, and catalog inclusion is what removes the custom-repository and GitHub-connection
  friction.
- Installing both the Marketplace plugin and the CLI bundle loads two copies; the docs must say to pick one.
- Discovery is not solved by `llms.txt` alone. Agents find the project through the catalog, README, topics, npm and
  search; a chat model's training data lags a new release.

## Sources

- How the Marketplace works: <https://contributors.home-assistant.io/marketplace/how-it-works/>
- Dashboard cards and plugins: <https://contributors.home-assistant.io/marketplace/guides/dashboard/>
- Repository structure: <https://contributors.home-assistant.io/marketplace/reference/repository-structure/>
- Get into the catalog, and the repository link: <https://contributors.home-assistant.io/marketplace/guides/catalog/>
- `hacs.json` reference: <https://contributors.home-assistant.io/marketplace/reference/hacs-json/>
- HACS plugin requirements: <https://www.hacs.xyz/docs/publish/plugin/>
- My link: <https://contributors.home-assistant.io/glossary/my-link/>
- My Home Assistant redirect: <https://my.home-assistant.io/redirect/hacs_repository>
- Home Assistant 2026.11 beta, the Marketplace: <https://rc.home-assistant.io/blog/2026/10/28/release-202611/>

## Provenance

Desk research, 2026-11-02: the Home Assistant contributors and HACS documentation above, the generated
`docs/dist/llms.txt`, `docs/astro.config.js`, `README.md`, `TODOS.md` and `research/11-in-ha-setup-card.md`, and the
current repository state (`c395afa`, no `hacs.json`, no `LICENSE`, `dist/` ignored). No code was changed. The install
page, README rewrite, packaging and catalog submission are recommendations; the setup card remains the product gap.
