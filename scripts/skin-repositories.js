/**
 * The skins that install on their own, each from a Marketplace (HACS) repository of its own: what the person finds,
 * downloads and picks in Add dashboard is the skin, under its own name, not Dashhaus (spec/release.md → The skin
 * repositories). One entry per skin's resource (scripts/resources.js → SKIN_RESOURCES), read by the site, the checks and
 * `verify/dx/skin.js`.
 *
 * - `repository` is the GitHub repository under `OWNER` and the asset's name, `<repository>.js`: with no `filename` in
 *   its `hacs.json`, that is the file the Marketplace looks for. It is also the strategy's type,
 *   `custom:<repository>`, so two community strategies can't share it.
 * - `package` is the npm package whose `dist/<repository>.js` the repository mirrors, checking its provenance.
 * - `hacs/<repository>/` holds what the repository carries: its `hacs.json`, README, mirror script and workflows.
 * - `page` is its landing page on the site, `docs/src/content/docs/<page>.mdx`.
 * - `name`, `icon` and `description` are what Add dashboard shows: the skin's strategy says the same
 *   (`src/skins/<skin>/lovelace/strategy.ts`, held to it by verify/skin-repositories.test.ts).
 */
import { SKIN_RESOURCES } from "./resources.js";

export const OWNER = "Krystosterone";

/** The words each skin's page, repository and Add dashboard entry share. */
const WORDS = {
  orb: {
    name: "Orb",
    icon: "mdi:home-variant",
    description: "Soft, round cards read at a glance: every supported device in a room-by-room page, laid out for you and kept up to date.",
  },
  field: {
    name: "Field",
    icon: "mdi:knob",
    description: "A hardware panel of keys, faders and dark screens: every supported device in a room-by-room page, laid out for you and kept up to date.",
  },
};

export const SKIN_REPOSITORIES = SKIN_RESOURCES.map((resource) => ({
  skin: resource.id,
  ...WORDS[resource.id],
  repository: resource.repository,
  package: `@dashhaus/${resource.id}`,
  page: resource.id,
}));

/** The site's address, where each skin's landing page lives. */
export const SITE = "https://krystosterone.github.io/dashhaus";

/** The file a skin's repository releases, and the Marketplace installs. */
export const assetName = (entry) => `${entry.repository}.js`;

/** A skin's landing page. */
export const pageUrl = (entry) => `${SITE}/${entry.page}/`;

/** A skin's own repository on GitHub, where its landing page's GitHub link leads. */
export const repositoryUrl = (entry) => `https://github.com/${OWNER}/${entry.repository}`;

/** The My link that opens a skin's repository in the Marketplace, or in HACS before 2026.11. */
export const myLink = (entry) =>
  `https://my.home-assistant.io/redirect/hacs_repository/?owner=${OWNER}&repository=${entry.repository}&category=plugin`;
