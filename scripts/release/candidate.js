/**
 * The release candidate a release PR commits, and the checks that hold it true (spec/release.md → Determinism):
 *
 *   node scripts/release/candidate.js write            after release:pack, record the files' SHA-256 for the version
 *   node scripts/release/candidate.js check [--always] the record is finished and this commit packs those files
 *   node scripts/release/candidate.js body             the record's Release page section, for the GitHub release
 *   npm run release:digests                            pack, then write: refresh a release PR whose code moved
 *
 * `spec/releases/<version>.sha256` lists the seven tarballs and `dashhaus.js`, in `sha256sum` format. `check` runs in
 * CI after `release:pack` while `v<version>` is not yet tagged, so a release PR is green only when its files are the
 * ones it records and its record has no `TODO` left; the Release workflow runs it with `--always` before shipping.
 * Once the tag exists the candidate has shipped, and the check stands down until the next version.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { publicPackages, readManifest, root, tarballName } from "./manifest.js";

export const recordPath = (version) => join(root, "spec/releases", `${version}.md`);
export const digestsPath = (version) => join(root, "spec/releases", `${version}.sha256`);

/** The files a version ships, by the name its digests use: the tarballs in publish order, then the Marketplace asset. */
export function candidateFiles(version, releaseDir = join(root, "release")) {
  return [
    ...publicPackages.map(({ name }) => ({ name: tarballName(name, version), path: join(releaseDir, tarballName(name, version)) })),
    { name: "dashhaus.js", path: join(root, "packages/bundle/dist/dashhaus.js") },
  ];
}

const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

/** `sha256sum` lines for `{ name, hash }`. */
export const formatDigests = (entries) => entries.map(({ name, hash }) => `${hash}  ${name}\n`).join("");

export function parseDigests(text) {
  return text.split("\n").filter(Boolean).map((line) => {
    const match = /^([0-9a-f]{64}) {2}(\S+)$/.exec(line);
    if (!match) throw new Error(`not a sha256sum line: ${line}`);
    return { hash: match[1], name: match[2] };
  });
}

/** Where the recorded and the packed files differ, as sentences. */
export function digestProblems(recorded, packed) {
  const problems = [];
  const byName = new Map(recorded.map((entry) => [entry.name, entry.hash]));
  for (const { name, hash } of packed) {
    if (!byName.has(name)) problems.push(`${name} is packed but not recorded`);
    else if (byName.get(name) !== hash) problems.push(`${name} packs ${hash.slice(0, 12)}…, the record says ${byName.get(name).slice(0, 12)}…`);
    byName.delete(name);
  }
  for (const name of byName.keys()) problems.push(`${name} is recorded but not packed`);
  return problems;
}

/** The lines of a release record still marked TODO. */
export const unfinished = (record) => record.split("\n").filter((line) => line.includes("TODO")).map((line) => line.trim());

/** The record's `## Release page` section, and a link to the whole record at the tag. */
export function releaseBody(record, version, repositoryUrl) {
  const match = /^## Release page\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(record);
  if (!match || !match[1].trim()) throw new Error(`spec/releases/${version}.md has no "## Release page" section to publish`);
  const repo = repositoryUrl.replace(/^git\+/, "").replace(/\.git$/, "");
  return `${match[1].trim()}\n\nFull notes: [spec/releases/${version}.md](${repo}/blob/v${version}/spec/releases/${version}.md)\n`;
}

/** The SHA-256 of each file `version` ships, as packed now. */
export async function packedDigests(version) {
  const files = candidateFiles(version);
  const missing = files.filter(({ path }) => !existsSync(path)).map(({ name }) => name);
  if (missing.length) throw new Error(`run npm run release:pack first; missing ${missing.join(", ")}`);
  return Promise.all(files.map(async ({ name, path }) => ({ name, hash: await sha256(path) })));
}

/** Whether `v<version>` is already a tag on origin; undefined when origin can't be asked. */
function tagged(version) {
  try {
    return execFileSync("git", ["ls-remote", "--tags", "origin", `refs/tags/v${version}`], { cwd: root, encoding: "utf8" }).trim() !== "";
  } catch {
    return undefined;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, ...args] = process.argv.slice(2);
  const bundle = await readManifest("packages/bundle");
  const { version } = bundle;
  if (command === "write") {
    await writeFile(digestsPath(version), formatDigests(await packedDigests(version)));
    console.log(`spec/releases/${version}.sha256`);
  } else if (command === "check") {
    if (!existsSync(digestsPath(version))) {
      console.log(`no candidate recorded for ${version} (spec/releases/${version}.sha256); nothing to check`);
      process.exit(0);
    }
    if (!args.includes("--always") && tagged(version)) {
      console.log(`v${version} is tagged: its candidate has shipped; nothing to check`);
      process.exit(0);
    }
    const problems = digestProblems(parseDigests(await readFile(digestsPath(version), "utf8")), await packedDigests(version));
    if (problems.length) problems.push(`this commit doesn't pack the files spec/releases/${version}.sha256 records; run npm run release:digests and commit it`);
    if (!existsSync(recordPath(version))) problems.push(`spec/releases/${version}.md is missing`);
    else for (const line of unfinished(await readFile(recordPath(version), "utf8"))) problems.push(`spec/releases/${version}.md is unfinished: ${line}`);
    for (const problem of problems) console.error(`✗ ${problem}`);
    if (problems.length) process.exit(1);
    console.log(`candidate ${version}: the record is finished and this commit packs the ${publicPackages.length + 1} files it records`);
  } else if (command === "body") {
    process.stdout.write(releaseBody(await readFile(recordPath(version), "utf8"), version, bundle.repository.url));
  } else {
    console.error("usage: node scripts/release/candidate.js write | check [--always] | body");
    process.exit(1);
  }
}
