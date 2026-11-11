/**
 * Fetch the five public packages back from npm and check them: `npm run release:registry -- <x.y.z> [--out registry]
 * [--compare release]`.
 *
 * Each `<name>@<version>` is downloaded from the registry into `--out` (default `registry/`), and its SHA-1 and SHA-512
 * must equal the registry's `dist.shasum` and `dist.integrity`. With `--compare <dir>`, it must also equal the tarball
 * of the same name in that directory: what npm serves is byte for byte what the tag packed. The Release workflow runs it
 * after publishing, then the clean-room journeys with `--tarballs registry` (spec/release.md → Publishing); an operator
 * can run it the same way.
 *
 * It reads only addresses no cache can hold stale: npm's document for the one version (`<registry>/<name>/<version>`)
 * and the tarball it names. Never the package's index, which npm's CDN serves for up to five minutes, so a version
 * published a moment ago is missing from it while every other address already has it. A version that was only just
 * published can still take minutes to appear at all, so it waits for one, until a deadline (`WAIT_MS`).
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { publicPackages, SEMVER, tarballName } from "./manifest.js";

/** How long a run waits for npm to serve a just-published version: npm has listed one more than two minutes late. */
export const WAIT_MS = 10 * 60_000;
/** The pause after the first miss; each one after doubles it, up to `MAX_PAUSE_MS`. */
const FIRST_PAUSE_MS = 2_000;
const MAX_PAUSE_MS = 30_000;

/** The registry npm itself uses: `npm run` passes its configuration on, and npm's own registry otherwise. */
export function registryUrl() {
  const url = process.env.npm_config_registry || "https://registry.npmjs.org/";
  return url.endsWith("/") ? url : `${url}/`;
}

const digest = (algorithm, bytes, encoding) => createHash(algorithm).update(bytes).digest(encoding);

async function get(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`${url} answered ${response.status} ${response.statusText}`);
  return response;
}

/** npm's document for `name` at `version` (its `dist` among it), or undefined while npm has no such version. */
export async function versionDocument(name, version, registry = registryUrl()) {
  const response = await get(new URL(`${name.replace("/", "%2f")}/${version}`, registry));
  return response && response.json();
}

/** Whether npm has `name` at `version`. */
export async function publishedAt(name, version, registry = registryUrl()) {
  return (await versionDocument(name, version, registry)) !== undefined;
}

/**
 * `attempt()`'s first result that isn't undefined. A miss or an error waits and tries again, the pause doubling up to
 * `MAX_PAUSE_MS`, until `deadline`; then it throws, saying what was still missing and why.
 */
export async function waitFor(what, attempt, { deadline = Date.now() + WAIT_MS, pause = FIRST_PAUSE_MS, log = console.log } = {}) {
  for (;;) {
    let why;
    try {
      const found = await attempt();
      if (found !== undefined) return found;
      why = "not on the registry yet";
    } catch (error) {
      why = error instanceof Error ? error.message : String(error);
    }
    const left = deadline - Date.now();
    if (left <= 0) throw new Error(`${what}: ${why}, and the wait is over`);
    const wait = Math.min(pause, left);
    log(`  ${what}: ${why}; trying again in ${Math.ceil(wait / 1000)}s`);
    await sleep(wait);
    pause = Math.min(pause * 2, MAX_PAUSE_MS);
  }
}

/**
 * Download each public package (or each of `names`) at `version` from the registry into `outDir`, checking each one;
 * returns the problems. Every package shares one deadline, `wait` milliseconds from the start.
 */
export async function fetchFromRegistry(version, outDir, compareDir, names = publicPackages.map(({ name }) => name), { registry = registryUrl(), wait = WAIT_MS, pause, log } = {}) {
  await mkdir(outDir, { recursive: true });
  for (const file of await readdir(outDir)) {
    if (file.endsWith(".tgz")) await rm(join(outDir, file), { force: true });
  }
  const timing = { deadline: Date.now() + wait, pause, log };
  const problems = [];
  for (const name of names) {
    const spec = `${name}@${version}`;
    const { dist } = await waitFor(spec, () => versionDocument(name, version, registry), timing);
    if (!dist?.tarball || !dist.shasum) {
      problems.push(`${spec}: npm's document for it names no tarball or shasum`);
      continue;
    }
    const bytes = await waitFor(`${spec} tarball`, async () => {
      const response = await get(dist.tarball);
      return response && Buffer.from(await response.arrayBuffer());
    }, timing);
    const file = join(outDir, tarballName(name, version));
    await writeFile(file, bytes);
    const fetched = digest("sha1", bytes, "hex");
    if (fetched !== dist.shasum) problems.push(`${spec}: the downloaded tarball's SHA-1 ${fetched} is not the registry's dist.shasum ${dist.shasum}`);
    const integrity = `sha512-${digest("sha512", bytes, "base64")}`;
    if (dist.integrity && dist.integrity !== integrity) problems.push(`${spec}: the downloaded tarball's ${integrity} is not the registry's dist.integrity ${dist.integrity}`);
    if (compareDir) {
      const packed = join(compareDir, tarballName(name, version));
      if (!existsSync(packed)) problems.push(`${spec}: ${packed} is missing, so there is nothing to compare it with`);
      else {
        const ours = digest("sha1", await readFile(packed), "hex");
        if (ours !== fetched) problems.push(`${spec}: npm holds ${fetched}, but the tag packs ${ours}`);
      }
    }
    (log ?? console.log)(`${spec} → ${file} (sha1 ${fetched})`);
  }
  return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const option = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const version = args[0]?.replace(/^v/, "");
  if (!version || !SEMVER.test(version)) {
    console.error("usage: npm run release:registry -- <x.y.z> [--out registry] [--compare release]");
    process.exit(1);
  }
  const compare = option("--compare");
  const problems = await fetchFromRegistry(version, resolve(option("--out") ?? "registry"), compare && resolve(compare));
  for (const problem of problems) console.error(`✗ ${problem}`);
  if (problems.length) process.exit(1);
  console.log(`all ${publicPackages.length} packages at ${version} match${compare ? ` the tarballs in ${compare}` : " the registry"}`);
}
