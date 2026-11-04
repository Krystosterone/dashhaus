/**
 * The seven public packages, their release manifest, and the rules a packed manifest must satisfy.
 *
 * The workspace resolves package source through the `source` export condition. A packed tarball ships only the built
 * output, so the release pack strips that condition (and `private`) from a staged copy; the package manifests in the
 * workspace may keep both. `verify/release-packages.test.ts` holds the same rules.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The repo root: beside this file when Node loads it, or the test runner's cwd when Vite rewrites import.meta.url. */
export const root = (() => {
  try {
    return fileURLToPath(new URL("../../", import.meta.url));
  } catch {
    return `${process.cwd()}/`;
  }
})();

/** What each public package ships: built `dist` or the CLI's runnable sources, plus the package README. */
export const publicPackages = [
  { key: "core", name: "@dashhaus/core", dir: "packages/core", ship: ["dist", "README.md"] },
  { key: "dashboard", name: "@dashhaus/dashboard", dir: "packages/dashboard", ship: ["dist", "README.md"] },
  { key: "deploy", name: "@dashhaus/deploy", dir: "packages/deploy", ship: ["bin.js", "src/*.js", "src/*.d.ts", "README.md"] },
  { key: "orb", name: "@dashhaus/orb", dir: "src/skins/orb", ship: ["dist", "README.md"] },
  { key: "field", name: "@dashhaus/field", dir: "src/skins/field", ship: ["dist", "README.md"] },
  { key: "bundle", name: "@dashhaus/bundle", dir: "packages/bundle", ship: ["dist", "README.md", "THIRD_PARTY_NOTICES.md"] },
  { key: "scaffold", name: "create-dashhaus-skin", dir: "packages/create-dashhaus-skin", ship: ["dist", "bin.js", "README.md"] },
];

export const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
/** Every public package declares this license, and its tarball ships the root LICENSE. */
export const LICENSE = "MIT";
const DEPENDENCY_FIELDS = ["dependencies", "peerDependencies", "optionalDependencies"];

export async function readManifest(dir) {
  return JSON.parse(await readFile(join(root, dir, "package.json"), "utf8"));
}

/** Drop the workspace-only `source` condition from an exports value, recursively. */
function withoutSource(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) || value === null || typeof value !== "object") return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (key !== "source") result[key] = withoutSource(child);
  }
  return result;
}

/**
 * The manifest `npm pack` sees for a public package: no `private`, no `source` condition, and internal ranges pinned
 * to the released version. Throws before packing when a rule is broken.
 */
export function publishManifest(manifest) {
  if (!SEMVER.test(manifest.version) || manifest.version === "0.0.0") {
    throw new Error(`${manifest.name}: release version must be a real semver, not ${manifest.version}; run npm run release:version -- <version>`);
  }
  if (manifest.license !== LICENSE) throw new Error(`${manifest.name}: package.json must declare "license": "${LICENSE}"`);
  // What its npm page shows and links back to, and what provenance checks the repository against.
  for (const field of ["description", "homepage", "author"]) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) throw new Error(`${manifest.name}: package.json must declare "${field}"`);
  }
  const dir = publicPackages.find((pkg) => pkg.name === manifest.name)?.dir;
  if (!manifest.repository?.url || (dir && manifest.repository.directory !== dir)) {
    throw new Error(`${manifest.name}: package.json must declare "repository" with its url and "directory": "${dir}"`);
  }
  if (!manifest.bugs?.url) throw new Error(`${manifest.name}: package.json must declare "bugs" with its url`);
  if (manifest.name.startsWith("@") && manifest.publishConfig?.access !== "public") {
    throw new Error(`${manifest.name}: a scoped package must declare "publishConfig": { "access": "public" }, or npm publishes it restricted`);
  }
  const next = structuredClone(manifest);
  delete next.private;
  next.exports = withoutSource(next.exports);
  if (JSON.stringify(next.exports).includes('"source"')) throw new Error(`${manifest.name}: the packed exports still declare a source condition`);
  if (next.source !== undefined) throw new Error(`${manifest.name}: drop the top-level source field before packing`);
  if (next.name !== "@dashhaus/deploy") {
    const targets = Object.values(next.exports).flatMap((target) => typeof target === "string" ? [target] : Object.values(target));
    const bad = targets.filter((target) => !target.startsWith("./dist/") || target.endsWith(".tsx") || (target.endsWith(".ts") && !target.endsWith(".d.ts")));
    if (bad.length) throw new Error(`${manifest.name}: export targets must be built dist files: ${bad.join(", ")}`);
  } else {
    const targets = Object.values(next.exports).flatMap((target) => typeof target === "string" ? [target] : Object.values(target));
    const bad = targets.filter((target) => target.endsWith(".ts") && !target.endsWith(".d.ts") || target.endsWith(".tsx"));
    if (bad.length) throw new Error(`${manifest.name}: the packed exports reach a TypeScript implementation file: ${bad.join(", ")}`);
  }

  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, range] of Object.entries(next[field] ?? {})) {
      if (name.startsWith("@dashhaus/")) {
        const expected = `^${next.version}`;
        if (range !== expected) throw new Error(`${manifest.name}: ${field}["${name}"] is "${range}", expected "${expected}"`);
      } else if (range.includes("*")) {
        throw new Error(`${manifest.name}: ${field}["${name}"] uses the wildcard range "${range}"`);
      }
    }
  }

  if (!Array.isArray(next.files) || next.files.length === 0) throw new Error(`${manifest.name}: add a files allowlist`);
  if (!next.files.includes("README.md")) throw new Error(`${manifest.name}: ship a README.md in files`);
  const stylesheetSideEffects = Array.isArray(next.sideEffects)
    && next.sideEffects.every((pattern) => typeof pattern === "string")
    && Object.values(next.exports).some((target) => JSON.stringify(target).includes(".css"));
  if (next.sideEffects !== false && next.name !== "@dashhaus/deploy" && !stylesheetSideEffects) {
    throw new Error(`${manifest.name}: sideEffects must stay false, or name its stylesheets`);
  }
  if (next.name === "@dashhaus/deploy" && (!next.bin?.["dashhaus-deploy"] || !next.engines?.node)) {
    throw new Error(`${manifest.name}: keep the dashhaus-deploy bin and its engines.node floor`);
  }
  return next;
}
