/**
 * The skins that install on their own, each from a Marketplace (HACS) repository of its own: what the person finds,
 * downloads and picks in Add dashboard is the skin, under its own name, not Dashhaus (spec/release.md → The skin
 * repositories). One entry per skin, read by the build (`npm run build:ha`, `release:pack`), each skin's bundle entry
 * (`apps/lovelace/<skin>.ts`), the release record, `verify/dx/skin.js` and the site.
 *
 * - `repository` is the GitHub repository under `OWNER` and the asset's name, `<repository>.js`: with no `filename` in
 *   its `hacs.json`, that is the file the Marketplace looks for. It is also the strategy's type,
 *   `custom:<repository>`, so two community strategies can't share it.
 * - `hacs/<repository>/` holds what the repository carries: its `hacs.json`, README and workflows.
 * - `page` is its landing page on the site, `docs/src/content/docs/<page>.mdx`.
 */
export const OWNER = "Krystosterone";

export const SKIN_REPOSITORIES = [
  {
    skin: "orb",
    name: "Orb",
    repository: "orb-dashboard",
    page: "orb",
    icon: "mdi:circle-double",
    description: "Soft, round cards read at a glance: every supported device in a room-by-room page, laid out for you and kept up to date.",
  },
  {
    skin: "field",
    name: "Field",
    repository: "field-dashboard",
    page: "field",
    icon: "mdi:tune-vertical-variant",
    description: "A hardware panel of keys, faders and dark screens: every supported device in a room-by-room page, laid out for you and kept up to date.",
  },
];

/** The site's address, where each skin's landing page lives. */
export const SITE = "https://krystosterone.github.io/dashhaus";

/** The file a skin's repository releases, and the Marketplace installs. */
export const assetName = (entry) => `${entry.repository}.js`;

/** A skin's bundle entry, beside the combined one. */
export const entryPath = (entry) => `apps/lovelace/${entry.skin}.ts`;

/** A skin's landing page. */
export const pageUrl = (entry) => `${SITE}/${entry.page}/`;

/** The My link that opens a skin's repository in the Marketplace, or in HACS before 2026.11. */
export const myLink = (entry) =>
  `https://my.home-assistant.io/redirect/hacs_repository/?owner=${OWNER}&repository=${entry.repository}&category=plugin`;
