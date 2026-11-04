# Journeys

Dashhaus has four kinds of user. Each has one way in on the documentation site, a set of packages, a proof that the
way in works and a promise about what stays stable. A way in counts only when its proof runs: a journey with no proof is
not one the project offers. `verify/journeys.test.ts` reads the table below and fails when a row's page, sidebar
entry, proof or CI step is missing, or when a `verify/dx/` driver belongs to no row.

They are not equal, and the site's order says so: the user first, then the author, then the developer, then the
contributor. The order follows how many people take each path and how little they should need to know to take it.

| Journey | Who | Way in | Installs | Proof | Promise |
| --- | --- | --- | --- | --- | --- |
| User | Wants Orb or Field on their Home Assistant and has no terminal | `start/install` | The release asset `dashhaus.js`, through the Marketplace (HACS before 2026.11) | `verify/dx/marketplace.js` | The cards, the YAML keys and the setup card's create-only rule ([deploy.md](deploy.md)) |
| User, from the command line | Scripts the same install, deploys from CI, or keeps resources in YAML | `start/deploy` | `@dashhaus/bundle`, `@dashhaus/deploy` | `verify/dx/user.js` | The same, plus the CLI's options and `.env` keys ([deploy.md](deploy.md)) |
| Author | Builds a skin of their own, from the scaffolder and its domain generator | `start/build-a-skin` | `create-dashhaus-skin`, which writes a project on `@dashhaus/core`, `@dashhaus/dashboard` and `@dashhaus/deploy` | `verify/dx/author.js` | The skin-author contract and its conformance check ([contract.md](contract.md)) |
| Developer | Uses the entity models and hooks in a React app of their own, with no skin and no generator | `start/getting-started` | `@dashhaus/core` | `verify/dx/developer.js` | The core contract ([core.md](core.md)) |
| Contributor | Changes Dashhaus itself: Orb or Field, a domain for both, an in-repository skin, the packages | `develop/monorepo` | A clone of the repository | `npm run check` | The rules in `AGENTS.md` and this spec |

## The user

The front door, and the only journey whose reader may never open a second page. It assumes no Node, no token and no
file copy: the Marketplace installs the bundle and registers it, and the setup card (`custom:dashhaus-setup`,
[deploy.md → The setup card](deploy.md#the-setup-card)) creates the dashboards from the person's own signed-in session.
Its page is written so a browser agent can follow it alone and quotes its steps as a prompt; `llms.txt` carries the
same steps.

The command-line row is the same person with a terminal, or a machine. It is the advanced page of the same section,
never a second front door, and both pages say to pick one: each way registers its own copy of the bundle.

## The author

The project's distinctive offer: a whole look of one's own on the same hooks, scaffolded with
`npm create dashhaus-skin` and grown with its `add <domain>`. The author never clones this repository. Their skin's
own test runs the conformance preset; the contract is what that preset checks.

## The developer

Reference-shaped and reached in one click, never from the home page's first screen. `@dashhaus/core` alone must be
enough: no skin, no `@dashhaus/dashboard`, no stylesheet. The proof installs only the packed core with React,
typechecks the site's first headless sample (`docs/examples/start/`) against the installed types, and draws, presses
and redraws its light on the demo house, so the sample can't name an entity the demo house lacks.

## The contributor

Works in this repository with the generators `new-card` and `new-skin`, Storybook and the spec. Their way in is the
documentation's **Contribute** section and `AGENTS.md`; nothing on the rest of the site names a repository path. An
in-repository skin started with `new-skin` is a contributor's skin; a skin outside the repository is an author's.
