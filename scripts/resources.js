/**
 * The resources this repository builds: each a one-file ES module Home Assistant loads from Settings → Dashboards →
 * Resources, carrying a skin's Lovelace card, its stylesheet and its dashboard strategy, and React with them.
 *
 * - Orb's and Field's ship in their packages (`@dashhaus/orb/resource`, `@dashhaus/field/resource`), named after the
 *   Marketplace repository that mirrors them (`<repository>.js`, the asset HACS looks for), so a deploy, a mirror and
 *   an install name the same file.
 * - A skin `npm run new-skin` made gets `dashhaus-<skin>.js`, for this repository's own deploy; it ships nowhere.
 * - `dashhaus.js` is the combined Marketplace install's last file: both skins and the `custom:dashhaus` strategy, with
 *   the notice that Orb and Field now install on their own (spec/release.md → The combined install's sunset).
 *
 * Plain data, read by `config/vite.lovelace.config.ts`, `scripts/build-resources.js`, the release and the checks.
 */
import { GENERATED_SKINS } from "./generated-skins.js";

/**
 * @typedef {object} Resource
 * @property {string} id the skin's id (`orb`), or `dashhaus` for the combined file
 * @property {string} entry the module the build starts from, from the repository's root
 * @property {string} file the file it writes
 * @property {string} version the package whose version names the build in its console line
 * @property {string} [dir] the skin package that ships it in its `dist/`, beside a `resource.js` naming it
 * @property {string} [repository] the Marketplace repository that mirrors it: `Krystosterone/<repository>`
 */

/** @type {Resource[]} Orb's and Field's, which their packages ship and their repositories mirror. */
export const SKIN_RESOURCES = [
  { id: "orb", entry: "src/skins/orb/lovelace/resource.ts", file: "orb-dashboard.js", version: "src/skins/orb", dir: "src/skins/orb", repository: "orb-dashboard" },
  { id: "field", entry: "src/skins/field/lovelace/resource.ts", file: "field-dashboard.js", version: "src/skins/field", dir: "src/skins/field", repository: "field-dashboard" },
];

/** @type {Resource[]} One per skin `npm run new-skin` registered, for this repository's deploy. */
export const GENERATED_RESOURCES = GENERATED_SKINS.map(({ id }) => ({
  id,
  entry: `src/skins/${id}/lovelace/resource.ts`,
  file: `dashhaus-${id}.js`,
  version: `src/skins/${id}`,
}));

/** @type {Resource} The combined Marketplace install's last file. */
export const COMBINED = { id: "dashhaus", entry: "apps/lovelace/entry.ts", file: "dashhaus.js", version: "packages/core" };

/** @type {Resource[]} Everything `npm run build:ha` writes to `dist/`. */
export const RESOURCES = [...SKIN_RESOURCES, ...GENERATED_RESOURCES, COMBINED];

/** The resource by its id, or a thrown error naming the ones there are. */
export function resource(id) {
  const found = RESOURCES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no resource "${id}": ${RESOURCES.map((candidate) => candidate.id).join(", ")}`);
  return found;
}

/** The notice for the React and ReactDOM every resource carries: its banner, and a file beside it in a package. */
export const NOTICE = "config/THIRD_PARTY_NOTICES.md";
