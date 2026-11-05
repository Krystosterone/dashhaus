/**
 * Apply the fixed version across the seven public packages: `npm run release:version -- 0.2.0`.
 *
 * The policy is one version for the public packages; every internal `@dashhaus` dependency moves with it, including
 * the scaffolder's template, which is what a new skin's `package.json` installs after scaffolding. The workspace
 * manifests keep `private: true`; the release pack drops it from the tarball. Run `npm install --package-lock-only`
 * afterwards so the lockfile records the new versions.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { publicPackages, root, SEMVER } from "./manifest.js";

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const scaffoldTemplate = join(root, "packages/create-dashhaus-skin/src/templates/standalone/package.json");

function pinInternalRanges(manifest, version) {
  for (const field of DEPENDENCY_FIELDS) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (publicPackages.some((other) => other.name === name)) manifest[field][name] = `^${version}`;
    }
  }
}

/** Set `version` in every public manifest and every internal range, the scaffolder's template included. */
export async function applyVersion(version, log = console.log) {
  for (const pkg of publicPackages) {
    const file = join(root, pkg.dir, "package.json");
    const manifest = JSON.parse(await readFile(file, "utf8"));
    manifest.version = version;
    pinInternalRanges(manifest, version);
    await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
    log(`${manifest.name}@${manifest.version}`);
  }

  const template = JSON.parse(await readFile(scaffoldTemplate, "utf8"));
  pinInternalRanges(template, version);
  // A skin runs `npm run add` from its own copy of the scaffolder, which moves with the other packages.
  if (template.devDependencies?.["create-dashhaus-skin"]) template.devDependencies["create-dashhaus-skin"] = `^${version}`;
  await writeFile(scaffoldTemplate, `${JSON.stringify(template, null, 2)}\n`);
  log(`create-dashhaus-skin template: @dashhaus ranges ^${version}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const version = process.argv[2];
  if (!version || !SEMVER.test(version) || version === "0.0.0") {
    console.error("usage: npm run release:version -- <x.y.z>");
    process.exit(1);
  }
  await applyVersion(version);
}
