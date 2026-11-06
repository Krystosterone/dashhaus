/**
 * Build the one-file Lovelace bundles: the combined `dashhaus.js` (both skins, React and every stylesheet in one ES
 * module), and each skin's own, `<repository>.js` (scripts/skin-repositories.js), the same with that skin alone.
 *
 * `npm run build:ha` writes the repo's `dist/dashhaus.js` and the same bytes to `packages/bundle/dist/dashhaus.js`
 * (what `@dashhaus/bundle` resolves), so the repo deploys the artifact a bundle consumer installs, then each skin's
 * file to `dist/`. `release:pack` builds the package output directly into its staging root, and the skins' files
 * beside the tarballs, where the release record reads their digests. No package ships a skin's file: its repository's
 * release does (spec/release.md → The skin repositories).
 */
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { SKIN_REPOSITORIES, assetName, entryPath } from "./skin-repositories.js";

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

/** The combined bundle: every skin, and the `custom:dashhaus` strategy. */
export const COMBINED = { entry: "apps/lovelace/entry.ts", file: "dashhaus.js" };

/** Each skin's own bundle, its repository's release asset. */
export const SKIN_BUNDLES = SKIN_REPOSITORIES.map((entry) => ({ entry: entryPath(entry), file: assetName(entry) }));

/**
 * Vite's build of one bundle's entry into `outDir/<file>`, in this process. Only the combined build empties `outDir`
 * first; a skin's is written beside what is there.
 */
async function viteBuild(outDir, bundle = COMBINED) {
  await build({
    configFile: join(root, "config/vite.lovelace.config.ts"),
    build: { outDir, emptyOutDir: bundle === COMBINED, lib: { entry: join(root, bundle.entry), fileName: () => bundle.file } },
  });
  return join(outDir, bundle.file);
}

/**
 * Vite's build of `apps/lovelace/entry.ts` into `outDir/dashhaus.js`, in a Node process of its own. Vite's bundler,
 * Rolldown, checks the config it is handed against its own process's built-ins (a `RegExp`, a plugin object), so a
 * caller in a VM context, as the test suite's `vmForks` pool is, can't build in-process: `release:pack` and the
 * checks that call it build here instead.
 */
export async function buildBundleFile(outDir, bundle = COMBINED) {
  execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--out", outDir, "--entry", bundle.entry], { stdio: "inherit" });
  return join(outDir, bundle.file);
}

/** Each skin's own bundle into `outDir`, in a process of its own as `buildBundleFile`; their paths. */
export async function buildSkinFiles(outDir) {
  await mkdir(outDir, { recursive: true });
  const files = [];
  for (const bundle of SKIN_BUNDLES) files.push(await buildBundleFile(outDir, bundle));
  return files;
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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv[2] === "--out") {
  const entry = process.argv[4] === "--entry" ? process.argv[5] : COMBINED.entry;
  const bundle = [COMBINED, ...SKIN_BUNDLES].find((candidate) => candidate.entry === entry);
  if (!bundle) throw new Error(`no bundle has the entry ${entry}`);
  await viteBuild(process.argv[3], bundle);
} else if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dist = join(root, "dist");
  const file = await viteBuild(dist);
  const bundled = join(root, "packages/bundle/dist");
  await mkdir(bundled, { recursive: true });
  await copyFile(file, join(bundled, "dashhaus.js"));
  await writeFile(join(bundled, "index.js"), PACKED_MODULE);
  await writeFile(join(bundled, "index.d.ts"), PACKED_TYPES);
  for (const bundle of SKIN_BUNDLES) await viteBuild(dist, bundle);
  console.log(`bundle: dist/dashhaus.js and packages/bundle/dist/dashhaus.js; ${SKIN_BUNDLES.map((bundle) => `dist/${bundle.file}`).join(", ")}`);
}
