/**
 * Build the resources (scripts/resources.js): each one ES module Home Assistant loads, a skin's card, stylesheet and
 * dashboard strategy with React inside.
 *
 * `npm run build:ha` writes every one to the repo's `dist/` (`orb-dashboard.js`, `field-dashboard.js`, a generated
 * skin's `dashhaus-<skin>.js`), and Orb's and Field's again into their packages' `dist/`,
 * where the workspace's `@dashhaus/orb/resource` names it, so the repo deploys the file a skin's package ships.
 * `release:pack` builds each package's file straight into its staging root, with the module and declarations its
 * `./resource` export resolves to and the notice for the React it carries.
 */
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { NOTICE, RESOURCES, SKIN_RESOURCES, resource } from "./resources.js";

/** The repo root: beside this file when Node loads it, or the build root a release check passes. */
export const root = (() => {
  try {
    return fileURLToPath(new URL("../", import.meta.url));
  } catch {
    return `${process.cwd()}/`;
  }
})();

/** What a packed skin's `./resource` export resolves to: the path of the file beside it, not under `dist/` again. */
const packedModule = (file) => `import { fileURLToPath } from "node:url";

/** The absolute path of \`${file}\`: the skin's card, its stylesheet and its dashboard strategy, in one ES module. */
export const resourceFile = fileURLToPath(new URL("./${file}", import.meta.url));
`;

const packedTypes = (file) => `/** The absolute path of \`${file}\`: the skin's card, its stylesheet and its dashboard strategy, in one ES module. */
export declare const resourceFile: string;
`;

/** Vite's build of one resource into `outDir/<file>`, in this process. */
async function viteBuild(id, outDir) {
  process.env.DASHHAUS_RESOURCE = id;
  await build({
    configFile: join(root, "config/vite.lovelace.config.ts"),
    build: { outDir, emptyOutDir: false },
    logLevel: "warn",
  });
  return join(outDir, resource(id).file);
}

/**
 * One resource into `outDir/<file>`, in a Node process of its own. Vite's bundler, Rolldown, checks the config it is
 * handed against its own process's built-ins (a `RegExp`, a plugin object), so a caller in a VM context, as the test
 * suite's `vmForks` pool is, can't build in-process: `release:pack` and the checks that call it build here instead.
 */
export async function buildResourceFile(id, outDir) {
  execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--resource", id, "--out", outDir], { stdio: "inherit" });
  return join(outDir, resource(id).file);
}

/** A skin package's `dist/` additions: its resource, the module and declarations naming it, and React's notice. */
async function writeSkinDist(entry, dist, built) {
  await mkdir(dist, { recursive: true });
  if (built !== join(dist, entry.file)) await copyFile(built, join(dist, entry.file));
  await writeFile(join(dist, "resource.js"), packedModule(entry.file));
  await writeFile(join(dist, "resource.d.ts"), packedTypes(entry.file));
  await copyFile(join(root, NOTICE), join(dist, "THIRD_PARTY_NOTICES.md"));
}

/** Orb's and Field's resources into their packages' `dist/` under `outRoot`, after `build:packages` wrote the rest. */
export async function buildSkinResources(outRoot = root) {
  for (const entry of SKIN_RESOURCES) {
    const dist = join(outRoot, entry.dir, "dist");
    await mkdir(dist, { recursive: true });
    await writeSkinDist(entry, dist, await buildResourceFile(entry.id, dist));
  }
}

const cli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (cli && process.argv[2] === "--resource") {
  await viteBuild(process.argv[3], process.argv[5]);
} else if (cli) {
  const dist = join(root, "dist");
  await mkdir(dist, { recursive: true });
  for (const entry of RESOURCES) {
    const file = await viteBuild(entry.id, dist);
    if (entry.dir) await writeSkinDist(entry, join(root, entry.dir, "dist"), file);
  }
  // The workspace's own `resource.js` (the `source` condition) names `dist/<file>`; the packed one is written above.
  console.log(`resources: ${RESOURCES.map((entry) => `dist/${entry.file}`).join(", ")}; ${SKIN_RESOURCES.map((entry) => `${entry.dir}/dist/${entry.file}`).join(", ")}`);
}
