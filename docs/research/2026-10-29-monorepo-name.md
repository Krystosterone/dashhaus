---
date: 2026-10-29T22:40:25-04:00
git_commit: bcd80cc9ffbdfe7af7ce20dc6824712409ad1003
branch: refactor/dashboard-card
repository: home-dashboard
topic: "name the evolving monorepo: the criteria the name must meet, the candidate checks, a recommendation, and the rename footprint. Naming only; no package or repository rename."
tags: [research, naming, monorepo, package-scope]
status: complete
last_updated: 2026-10-29
last_updated_note: "Initial naming research; recommendation Dashhaus, tracked in TODOS.md."
---

# Research: Monorepo name

## Research Question

What should the monorepo be called now that it is no longer one dashboard?

The monorepo-readiness research ([2026-10-29-monorepo-readiness.md](2026-10-29-monorepo-readiness.md)) replaced the single-package assumption with three public packages and a set of private reference skins:

| Member | What it is |
| --- | --- |
| `@scope/core` | The headless foundation: entities, primitives, hooks, Home Assistant store/provider/mappers/actions, demo transports and testing. |
| `@scope/dashboard` | The Lovelace framework: custom-element base, YAML, layout, card, schema, nav, conformance, Storybook and deploy subpaths. |
| `@scope/deploy` | The CLI that loads, builds and uploads a user's dashboard config. |
| `skins/orb`, `skins/field` | Private reference implementations, not products. |
| `apps/storybook`, `apps/lovelace`, `verify/` | Private repo tooling. |

`home-dashboard` names one artifact: the Lovelace card the browser loads. It does not name the headless core, the framework, the CLI or the set of skins. The research also fixes the external-consumer goals: build any Home Assistant React dashboard on the core, deploy any such dashboard, and build a new skin without repeating what exists. The name must cover that whole kit.

## Decision status

**Recommendation: `Dashhaus`.** The name is proposed, not applied. `TODOS.md` tracks the confirmation and the rename. No package name, import, repository name, Lovelace element or deploy path has been changed by this note.

## Naming criteria

A name had to pass all five:

1. **Cover the kit, not one part.** It must make sense for `core`, `dashboard` and `deploy` together, and for more than the two current skins. It must not be a skin name (`Orb`, `Field`), a card name (`Card`, `Tile`, `Module`) or the deployed artifact (`home-dashboard`).
2. **Not borrow Home Assistant's identity.** `Lovelace` and `Hass` are Home Assistant's terms. A name built from them implies affiliation, and `HassKit` also reads as "hassle" and sits next to existing projects such as `hakit`. The tagline can say "for Home Assistant"; the name should not.
3. **Work as the namespace.** It has to read well as `@name/core`, `@name/dashboard`, `@name/deploy`, as the CLI (`name deploy`) and as the repository (`name`). Lower-case, one word, no punctuation, easy to type.
4. **Be available and findable.** npm scope, bare package, GitHub handle and a plausible domain; no direct software or dashboard collision. A generic word with heavy search noise fails "findable" even when the scope is free.
5. **Be durable.** No trend word, no AI/web3 suffix, no pun that stops working when the design changes. The repo has two deliberately different skins; the parent name must not favour either.

A metaphor was preferred over a description. `home-dashboard-kit` or `home-dashboard-framework` would pass the literal test but keep the old artifact's name and make the monorepo sound like a rename rather than a platform.

## Method

The candidate pool was generated across six families: architectural frames and bases (lintel, plinth, architrave, wainscot, dormer, mantel, pilaster, tympanum, cartouche), card containers (cardhouse, cardhaus, cardfile, cardwall, cardgrid, cardcatalog, cardcabinet), home compounds (dashhaus, haushaus, hauskit, boardhaus, panelhaus, kartenwerk), craft/maker names (cardwright, boardwright, dashwright, skinwright), textile/skin metaphors (loom, weft, skinframe, faceplate, wainscot) and HA-adjacent names (hasskit, hassdeck, loveloom, lovelacekit). About 120 words and compounds were probed; the tables below are the ones that survived the criteria or explain why the obvious candidates failed.

Checks run on 2026-10-29:

```sh
# npm scope: "{}" means the scope exists; {"error":"Scope not found"} means it is unregistered.
curl -s https://registry.npmjs.org/-/org/<name>/user

# bare package
npm view <name> version

# GitHub handle
curl -s -o /dev/null -w '%{http_code}' https://api.github.com/users/<name>

# domain: 000 means no DNS response (likely unregistered, not confirmed with a registrar)
curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://<name>.dev
```

A web search for the exact name checked direct collisions. The search is evidence of a collision, not proof of no collision; none of this is trademark clearance.

## Finalists

| Name | Story | Availability at check time | Limit |
| --- | --- | --- | --- |
| **Dashhaus** | A house of dashboards: `core` is the foundation, `dashboard` the frame, `deploy` the keys, Orb and Field the interiors. | npm scope unregistered; no bare package; GitHub handle 404; `.dev`, `.io`, `.app`, `.co` no DNS response; `.com` parked. No exact software hit; nearest are `Das Haus` / `Dashaus` (different spelling) and `Dashwright` (a Playwright-report dashboard, different name). | The nearest names are close in spelling; the tagline has to carry "Home Assistant" and "skins". Not legal clearance. |
| **Cardfile** | A card file of the home: one card per entity, indexed into a dashboard. Plain, physical, card-centric. | npm scope free; no bare package; GitHub handle free. | Generic term with many small cardfile apps (`cardfile.it`, azzCardfile, Microsoft Cardfile); weak search ownership; archival rather than live. |
| **Kartenwerk** | German for card work / card workshop. Cards as craft, with the Werkstatt/Bauhaus design lineage. | npm scope free; no bare package; GitHub user exists. | German, card-specific and longer to type; an existing German card shop and map series use the word; no direct software collision found. |
| **Wainscot** | The wood paneling a wall wears: a skin applied to a structural frame. The most literal skin-on-frame metaphor found. | npm scope free; bare `wainscot@0.0.1` exists. | Obscure and hard to spell; `wainscot.ai` and Wainscot Media exist in software/agency space. |

`Dashhaus` is the recommendation because it is the only finalist that is both brandable and available without a direct software collision, and because its metaphor scales across all three packages. `Cardfile` is the fallback if a plain English name matters more than a distinctive one; it has the cleanest availability but the weakest ownership.

## Obvious candidates rejected

These are the names most likely to be suggested first. Each has a direct collision, so adopting it would mean sharing a search result with an existing product.

| Name | Collision |
| --- | --- |
| Cardhouse / Cardhaus | CardHaus is a business-card scanner (`cardhaus.app`); Cardhaus Games is a board-game retailer (`cardhaus.com`); GitHub user `cardhouse` is active. |
| Cardwall | `cardwall.ai`; CardWall secure card storage; CardWall card-storage app. |
| Faceplate | npm `faceplate@0.6.0` (Heroku Facebook auth wrapper); `faceplate.io` (industrial AI). |
| Cardwright | Cardwright card-printing/proxy tools (`cardwright.defimagic.io`, GitHub `Boffo90/cardwright`, `cyberdeliaAI/Cardwright`). |
| Dashwright | npm scope taken; `dashwright.com` is a Playwright-report dashboard. |
| Loomkit | `loomkit.vercel.app` and PyPI `loomkit`: a swappable LLM orchestration core. |
| Dashloom | `dashloom.dev`: a product/revenue/traffic dashboard. |
| Skinset | `skin-set.com` (CS2 skins) and `skinset.com` (skincare). |
| Kithaus | kitHAUS is a prefab-home company (`kithaus.com`) whose own product line is called Modules. |
| Hauswerk | HausWerk prefab houses (`hauswerk.pl`), `hauswerk.io` design, Hauswerk law (`hauswerk.ca`). |
| Architrave | Architrave GmbH is real-estate document software (`architrave.de`). |
| Dormer | Dormer is a home-records app (`dormer.arkheholdings.com`) and Dormer Pramet is a tooling brand. |
| Roomboard | RoomBoard clinic boards (`theroomboard.com`), Roomboard real estate, and a Home Assistant room-board app. |
| Cardea | npm scope taken; package `cardea@1.0.3`; multiple Cardine/Cardea AI and CRM companies. |
| Loomery | Loomery is a digital product agency (`loomery.com`). |
| Heimwerk | HeimWerk AI is a home-improvement app (`heimwerk.ai`); HeimWerk shop and restaurant also exist. |
| Boardhaus | Boardhaus surf/skate progression (`boardhaus.co`); BoardHaus smart locks. |
| Panelhaus | Panel Haus wall panels (`panelhaus.com`, `panelhaus.co.uk`) and Panelhaus AI Comic Studio (`panelhaus.app`). |

## Long tail

The remaining candidates were either free but failed criteria 1, 4 or 5, or already taken and failed criterion 4: architecture terms that are too obscure or hard to spell (`Pilaster`, `Tympanum`, `Cartouche`, `Pelmet`, `Glazing`, `Balustrade`, `Cyclorama`), museum/display terms that do not describe a kit (`Plinth` — taken, `Pedestal` — taken, `Diorama`, `Vignette`, `Bindery`, `Mantel`, `Armoire`, `Étagère`), Japanese spatial terms with a steep pronunciation cost (`Byobu`, `Genkan`, `Engawa`), German/Nordic workshop words (`Werkraum`, `Werkstatt` — taken, `Verkstad`, `Leitstand`, `Hjem`, `Stue`) and maker names that read as surnames or homebuilders (`Boardwright`, `Hauswright`, `Homesmith`). They were not taken to the finalist stage because a monorepo name has to be typed, searched and explained more often than it has to be clever.

## Why Dashhaus

- **The metaphor covers the whole research map.** A house has a foundation (`core`), a frame (`dashboard`), keys (`deploy`) and interiors (`skins`). Adding a skin is furnishing a room, not rebuilding the house. That is exactly the ownership split the readiness research describes.
- **It is not tied to one skin.** Orb is the soft, glowing interior; Field is the hardware interior. `Dashhaus` names the house, not either room. It does not use Orb's vocabulary (`orb`, `glow`, `tile`) or Field's (`module`, `key`, `fader`).
- **It is not tied to one deployed artifact.** The current Lovelace elements can keep their `custom:home-dashboard` names for compatibility while the monorepo becomes `Dashhaus`. The project name and the card type stop being the same decision.
- **It satisfies the namespace test.** `@dashhaus/core`, `@dashhaus/dashboard`, `@dashhaus/deploy`; `dashhaus deploy`; `dashhaus` in a repository URL. It is lower-case, one word and eight letters.
- **It is available enough to start.** The npm scope is unregistered, the bare package is unpublished, the GitHub handle is free, and the `.dev`/`.io`/`.app`/`.co` domains had no DNS response. The `.com` is parked, so a `.com` launch would require a purchase; the other TLDs are enough for a private project and can be revisited before publishing.
- **It has a design lineage without a design cliché.** `Haus` echoes Bauhaus/Werkstatt, a lineage that fits the repo's hardware-influenced Field skin, without using `Bauhaus` itself or a German word that has to be explained. The tagline does the explaining: "Dashhaus — the kit behind Home Assistant dashboards: one headless core, one Lovelace framework, one deploy CLI, and swappable skins."

The risk is honest: `Dashhaus` is one letter away from `Dashaus`/`Das Haus`, and a web search already contains interior-design, real-estate and music results for those spellings. The `.dev`/`.io` namespace and the exact spelling make it ownable, but the first line of every README should be the tagline, not the name alone. If that spelling risk is unacceptable, take `Cardfile`; it is less distinctive but has cleaner search ownership.

## Rename footprint

This note does not perform the rename. If `Dashhaus` is confirmed, the mechanical change is:

1. **Root and packages.** Root `package.json` `name`, `packages/core/package.json` `@scope/core` → `@dashhaus/core`, `packages/dashboard/package.json` `@scope/dashboard` → `@dashhaus/dashboard`, and the workspace dependency. Add `@dashhaus/deploy` when the CLI package lands.
2. **Imports and rules.** Every `@scope/core` and `@scope/dashboard` specifier in `src/`, `packages/`, `verify/`, `.storybook/`, `apps/` and the generator templates; `eslint.config.js` package restrictions; `verify/dashboard-package.test.ts` and the fixture registration test; `package-lock.json` by re-running `npm install`.
3. **Docs and scripts.** `README.md`, `AGENTS.md`, `docs/*.md`, `research/*.md` frontmatter, `docs/research/*.md`, `scripts/new-card`/`scripts/new-skin` anchors and generated docs, and the repository URL in the README.
4. **Repository and remote.** Rename the GitHub repository, update `origin`, and update the Issues link. This is a user action; the local commit can prepare the text first.
5. **Compatibility boundary.** Keep `custom:home-dashboard` and `custom:home-dashboard-field` as the deployed element names for now. Add `custom:dashhaus` and `custom:dashhaus-field` as aliases in a major, or keep the old names indefinitely: the monorepo name and the Lovelace card type do not have to match. The deploy artifact names (`dist/home-dashboard.js`, `www/home-dashboard/`, the HA dashboard paths) can also stay until a deliberate break; renaming them would invalidate existing resources and YAML for no user benefit.
6. **Verify.** `npm run check`, `npm run test-storybook`, and `npm run build:ha`; then inspect one Orb and one Field story and the deployed bundle path. The rename is mechanical, so the existing gates are the proof.

The one decision to make before the rename is whether `Dashhaus` is the brand or only the repository name. If it is the brand, the Lovelace aliases in step 5 eventually become the public names. If it is only the repository, the deployed cards keep `home-dashboard` and the monorepo name stays an internal/package-scope change.

## Limits

- Availability was checked on 2026-10-29. npm scopes, GitHub handles and domains can change; re-check immediately before creating the scope or repository.
- The npm scope probe distinguishes "scope exists" from "scope not found"; it does not prove the candidate can register the name, and it does not check npm policy or trademark.
- The collision check was an exact-phrase web search and package/repository lookups, not a trademark search. A public launch should get a legal review.
- The recommendation is based on the research's three-package map. If the final package set changes again, the name still has to cover the whole kit; `Dashhaus` is broad enough to survive another cut, `Cardfile` and `Kartenwerk` are not.

## References

- [Monorepo readiness](2026-10-29-monorepo-readiness.md) — the three-package map, the external-consumer goals and the C1-C6 cuts that motivate the name.
- [AGENTS.md](../../AGENTS.md) — the current package/vocabulary boundaries and the commands the rename must keep green.
- [docs/skins.md](../skins.md) — what a skin is, and why the parent name cannot be a skin name.
