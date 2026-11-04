/**
 * Fetch the seven public packages back from npm and check them: `npm run release:registry -- <x.y.z> [--out registry]
 * [--compare release]`.
 *
 * Each `<name>@<version>` is packed from the registry into `--out` (default `registry/`), and its SHA-1 must equal the
 * registry's `dist.shasum`. With `--compare <dir>`, it must also equal the tarball of the same name in that directory:
 * what npm serves is byte for byte what the tag packed. The Release workflow runs it after publishing, then the
 * clean-room journeys with `--tarballs registry` (spec/release.md → Publishing); an operator can run it the same way.
 * A version that was only just published may take a moment to reach every registry mirror, so each lookup retries.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { publicPackages, SEMVER, tarballName } from "./manifest.js";

const ATTEMPTS = 6;

const sha1 = async (file) => createHash("sha1").update(await readFile(file)).digest("hex");

/** `fn`, retried with a growing pause while the registry has not caught up. */
async function retried(what, fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return fn();
    } catch (error) {
      if (attempt === ATTEMPTS) throw new Error(`${what}: ${error instanceof Error ? error.message : error}`);
      console.log(`  ${what}: not there yet, retrying (${attempt}/${ATTEMPTS - 1})`);
      await sleep(5000 * attempt);
    }
  }
}

const npm = (args, cwd) => execFileSync("npm", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** Pack every public package at `version` from the registry into `outDir`, checking each one; returns the problems. */
export async function fetchFromRegistry(version, outDir, compareDir) {
  await mkdir(outDir, { recursive: true });
  for (const file of await readdir(outDir)) {
    if (file.endsWith(".tgz")) await rm(join(outDir, file), { force: true });
  }
  const problems = [];
  for (const { name } of publicPackages) {
    const spec = `${name}@${version}`;
    const shasum = await retried(spec, () => {
      const found = npm(["view", spec, "dist.shasum"], outDir);
      if (!found) throw new Error("no such version on the registry");
      return found;
    });
    const file = join(outDir, tarballName(name, version));
    await retried(`${spec} tarball`, () => npm(["pack", spec, "--pack-destination", outDir, "--silent"], outDir));
    const fetched = await sha1(file);
    if (fetched !== shasum) problems.push(`${spec}: the downloaded tarball's SHA-1 ${fetched} is not the registry's dist.shasum ${shasum}`);
    if (compareDir) {
      const packed = join(compareDir, tarballName(name, version));
      if (!existsSync(packed)) problems.push(`${spec}: ${packed} is missing, so there is nothing to compare it with`);
      else if ((await sha1(packed)) !== fetched) problems.push(`${spec}: npm holds ${fetched}, but the tag packs ${await sha1(packed)}`);
    }
    console.log(`${spec} → ${file} (sha1 ${fetched})`);
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
