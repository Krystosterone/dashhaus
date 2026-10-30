/**
 * Apply the fixed version across the three public packages: `npm run release:version -- 0.2.0`.
 *
 * The policy is one version for `@dashhaus/core`, `@dashhaus/dashboard` and `@dashhaus/deploy`; `@dashhaus/dashboard`'s dependency
 * on `@dashhaus/core` moves with it. The workspace manifests keep `private: true`; the release pack drops it from the
 * tarball. Run `npm install --package-lock-only` afterwards so the lockfile records the new versions.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { publicPackages, root, SEMVER } from "./manifest.mjs";

const version = process.argv[2];
if (!version || !SEMVER.test(version) || version === "0.0.0") {
  console.error("usage: npm run release:version -- <x.y.z>");
  process.exit(1);
}

for (const pkg of publicPackages) {
  const file = join(root, pkg.dir, "package.json");
  const manifest = JSON.parse(await readFile(file, "utf8"));
  manifest.version = version;
  if (manifest.dependencies?.["@dashhaus/core"]) manifest.dependencies["@dashhaus/core"] = `^${version}`;
  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`${manifest.name}@${manifest.version}`);
}
