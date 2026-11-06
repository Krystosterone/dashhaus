// Orb's resource as a path, for a Node script such as a deploy config: `files: [resourceFile]`. This is the
// workspace's copy, beside `dist/orb-dashboard.js`, which `npm run build:ha` writes; the packed package ships its own,
// `dist/resource.js`, beside the file it names (scripts/build-resources.js).
import { fileURLToPath } from "node:url";

/** The absolute path of `orb-dashboard.js`: Orb's card, its stylesheet and its dashboard strategy, in one ES module. */
export const resourceFile = fileURLToPath(new URL("./dist/orb-dashboard.js", import.meta.url));
