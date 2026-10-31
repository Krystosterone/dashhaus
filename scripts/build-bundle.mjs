/**
 * Build the one-file Lovelace bundle, `dashhaus.js`: both skins, React and every stylesheet in one ES module.
 *
 * `npm run build:ha` writes the repo's `dist/dashhaus.js` and the same bytes to `packages/bundle/dist/dashhaus.js`
 * (what `@dashhaus/bundle` resolves), so the repo deploys the artifact a bundle consumer installs. `release:pack`
 * builds the package output directly into its staging root.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

/** The repo root: beside this file when Node loads it, or the build root a release check passes. */
export const root = (() => {
  try {
    return fileURLToPath(new URL("../", import.meta.url));
  } catch {
    return `${process.cwd()}/`;
  }
})();

/** What a packed install imports: the bundle sits beside this module, not under `dist/` again. */
const PACKED_MODULE = `/** The prebuilt Lovelace bundle as a file URL: both skins, one ES module, no second file. */
export const bundlePath = new URL("./dashhaus.js", import.meta.url);
`;

const PACKED_TYPES = `/** The prebuilt Lovelace bundle as a file URL. */
export declare const bundlePath: URL;
`;

/** Vite's build of `apps/lovelace/entry.ts` into `outDir/dashhaus.js`. */
export async function buildBundleFile(outDir) {
  await build({
    configFile: join(root, "config/vite.lovelace.config.ts"),
    build: { outDir, emptyOutDir: true },
  });
  return join(outDir, "dashhaus.js");
}

/** The package's dist: the bundle plus the module and declarations that name it. */
export async function buildBundlePackage(outRoot = root) {
  const dist = join(outRoot, "packages/bundle/dist");
  await mkdir(dist, { recursive: true });
  await buildBundleFile(dist);
  await writeFile(join(dist, "index.js"), PACKED_MODULE);
  await writeFile(join(dist, "index.d.ts"), PACKED_TYPES);
  return dist;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dist = join(root, "dist");
  const file = await buildBundleFile(dist);
  const bundled = join(root, "packages/bundle/dist");
  await mkdir(bundled, { recursive: true });
  await copyFile(file, join(bundled, "dashhaus.js"));
  await writeFile(join(bundled, "index.js"), PACKED_MODULE);
  await writeFile(join(bundled, "index.d.ts"), PACKED_TYPES);
  console.log(`bundle: dist/dashhaus.js and packages/bundle/dist/dashhaus.js`);
}
