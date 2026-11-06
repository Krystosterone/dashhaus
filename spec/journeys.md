# Journeys

Dashhaus has four kinds of user. Each has a way in on the documentation site, a set of packages, a proof that the
way in works and a promise about what stays stable. A way in counts only when its proof runs: a journey with no proof is
not one the project offers. `verify/journeys.test.ts` reads the table below and fails when a row's page, sidebar
entry, proof or CI step is missing, or when a `verify/dx/` driver belongs to no row.

They are not equal, and the site's order says so: the user first, then the author, then the developer, then the
contributor. The order follows how many people take each path and how little they should need to know to take it.

| Journey | Who | Way in | Installs | Proof | Promise |
| --- | --- | --- | --- | --- | --- |
| User: Orb | Wants Orb on their Home Assistant and has no terminal | `orb` | `orb-dashboard.js`, the release asset of `Krystosterone/orb-dashboard`, which mirrors it from `@dashhaus/orb`, through the Marketplace (HACS before 2026.11) | `verify/dx/skin.js` | Orb's card, its YAML keys and its `custom:orb-dashboard` strategy ([deploy.md](deploy.md)) |
| User: Field | Wants Field on their Home Assistant and has no terminal | `field` | `field-dashboard.js`, the release asset of `Krystosterone/field-dashboard`, which mirrors it from `@dashhaus/field`, through the Marketplace (HACS before 2026.11) | `verify/dx/skin.js` | Field's card, its YAML keys and its `custom:field-dashboard` strategy ([deploy.md](deploy.md)) |
| User, from the command line | Scripts the same install, deploys from CI, keeps resources in YAML, or writes a dashboard from scratch | `start/deploy` | `@dashhaus/orb` or `@dashhaus/field`, with `@dashhaus/deploy` | `verify/dx/user.js` | The same, plus the CLI's options and `.env` keys ([deploy.md](deploy.md)) |
| Author | Builds a skin of their own, from the scaffolder and its domain generator, often by asking an agent to | `start/build-a-skin` | `create-dashhaus-skin`, which writes a project on `@dashhaus/core` and `@dashhaus/deploy` | `verify/dx/author.js` | The skin-author contract and its conformance check ([contract.md](contract.md)) |
| Developer | Uses the entity models and hooks in a React app of their own, with no skin and no generator | `start/getting-started` | `@dashhaus/core` | `verify/dx/developer.js` | The core contract ([core.md](core.md)) |
| Contributor | Changes Dashhaus itself: Orb or Field, a domain for both, an in-repository skin, the packages | `develop/monorepo` | A clone of the repository | `npm run check` | The rules in `AGENTS.md` and this spec |

## The user

The front door, and the only journey whose reader may never open a second page. The user arrives at a skin, not at
Dashhaus: Orb and Field are each a product of their own, with a landing page (`docs/src/content/docs/orb.mdx`,
`field.mdx`), a Marketplace repository (`Krystosterone/orb-dashboard`, `Krystosterone/field-dashboard`;
[release.md → The skin repositories](release.md#the-skin-repositories)) and a dashboard strategy that Home Assistant's
Add dashboard dialog lists under the skin's own name ([deploy.md → The skins' dashboard strategies](deploy.md#the-skins-dashboard-strategies)).
It assumes no Node, no token and no file copy: the Marketplace installs the skin's file and registers it, and the
person makes the dashboard from Add dashboard. The landing page is the whole journey: what the skin looks like, live,
its three install steps, its settings and its help.

Neither the page, nor the repository's README (the page the Marketplace shows), nor what Home Assistant shows pitches
Dashhaus or the hooks under the skin. Each has one quiet way to them, for a curious reader: on the site, the landing
page's foot ("drawn on Dashhaus"), and in Home Assistant, the README's foot in the Marketplace, saying the same. Add
dashboard, the card picker and the skin's file name nothing called Dashhaus; the strategy's documentation link leads
to the landing page. `verify/skin-repositories.test.ts` holds the README to it, and `verify/dx/skin.js` holds Add
dashboard and the card picker to it: one entry each, the skin's.

Each page is written so a browser agent can follow it alone and quotes its steps as a prompt; `llms.txt` carries the
same steps.

The combined Dashhaus install, one download carrying both looks in one dashboard, had its last release and is no
journey any more: its people stay on that release, which keeps working and says how to move; the site's page for the
move stays under Set up ([release.md → The combined install's sunset](release.md#the-combined-installs-sunset)). The command-line row is the
same person with a terminal, or a machine, and the one way to deploy a dashboard written from scratch: the skin's card
with their own rows. It is the advanced page of the same section, never a second front door. Each page says to pick
one way per skin: each registers its own copy.

## The author

The project's distinctive offer: a whole look of one's own on the same hooks, scaffolded with
`npm create dashhaus-skin` and grown with its `add <domain>`. The author never clones this repository. Their skin's
own test runs the conformance preset; the contract is what that preset checks.

Many authors won't write the code themselves: they show an agent a picture or describe a look. So the page leads with
that, for a reader with no terminal experience: what they need, one prompt to paste, and the Home Assistant clicks the
deploy needs (the token, and the Terminal & SSH add-on with the key the agent makes). The hand-written steps follow, as
what the agent does.

Making a skin and installing it are split, because only the install has to reach Home Assistant. Any agent that runs
commands can make one, in the browser (Claude Code on the web) as well as on the person's computer; one in the cloud
can't reach a Home Assistant on a home network, so it installs nothing. It follows the scaffold's **Install by hand**
instead: it hands over the built file and the project, and walks the person through File editor, **Resources** and a
new dashboard, with no token, no SSH and no terminal, at the address `npm run deploy` would use. Declined for now: a
setup card that registers an uploaded skin, and a skin installed from the Marketplace through a GitHub repository of
its own; both would add a contract for a reader that doesn't yet exist, and the hand route needs neither. The prompt hands the agent to the scaffold's `AGENTS.md`, which carries everything else, so the
page never repeats it; `llms.txt` carries the same route. `verify/dx/author.js` proves the commands, and the hand install from what the guide hands over; an agent run
(`verify/dx/agent-runs.md`, or a study) proves an agent can take them from the packages alone.

## The developer

Reference-shaped and reached in one click, never from the home page's first screen. `@dashhaus/core` alone must be
enough: no skin, no Lovelace framework (core's `./lovelace` subpaths stay out of its graph), no stylesheet. The proof installs only the packed core with React,
typechecks the site's first headless sample (`docs/examples/start/`) against the installed types, and draws, presses
and redraws its light on the demo house, so the sample can't name an entity the demo house lacks.

## The contributor

Works in this repository with the generators `new-card` and `new-skin`, Storybook and the spec. Their way in is the
documentation's **Contribute** section and `AGENTS.md`; nothing on the rest of the site names a repository path. An
in-repository skin started with `new-skin` is a contributor's skin; a skin outside the repository is an author's.
