/**
 * Prepare a release PR: `npm run release [-- <x.y.z>] [--dry-run]` (spec/release.md → Releasing).
 *
 * 1. Read the change notes in `changes/`, pack the current code and compare its API with the latest version on npm.
 * 2. Take the version given, or suggest one from the notes and the API comparison (`suggestVersion`).
 * 3. Apply it (`release:version`, then the lockfile), pack again, and record the files' SHA-256 in
 *    `spec/releases/<version>.sha256`.
 * 4. Write `spec/releases/<version>.md` from the notes and the comparison, with a TODO wherever only a person can
 *    finish it: the release page's lines, the live smoke, and any API break no note owns. Delete the collected notes.
 *
 * Everything but the TODOs is computed from the repository and the registry, so two runs on one commit write the same
 * files. `--dry-run` stops after step 2 and changes nothing.
 */
import { execFileSync } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { apiMarkdown, apiOfTarballs, apiWorkDir, compareVersions, diffApi, suggestVersion } from "./api.js";
import { digestsPath, formatDigests, packedDigests, recordPath } from "./candidate.js";
import { CHANGES_DIR, readChanges } from "./changes.js";
import { readManifest, root, SEMVER } from "./manifest.js";
import { pack } from "./pack.js";
import { fetchFromRegistry } from "./registry.js";
import { applyVersion } from "./version.js";

const SECTIONS = [
  ["breaking", "Breaking changes"],
  ["feature", "New"],
  ["fix", "Fixed"],
];

const bullet = (body) => `- ${body.split("\n").map((line, i) => (i === 0 || !line ? line : `  ${line}`)).join("\n")}`;

/** The release record a release PR commits. Pure: the same inputs write the same file. */
export function renderRecord({ version, from, notes, diff, repository }) {
  const repo = repository.replace(/^git\+/, "").replace(/\.git$/, "");
  const listed = SECTIONS.flatMap(([type, title]) => {
    const own = notes.filter((note) => note.type === type);
    return own.length ? [`### ${title}`, "", ...own.map((note) => bullet(note.body)), ""] : [];
  });
  const internal = notes.filter((note) => note.type === "internal").length;
  const unowned = diff.breaking && !notes.some((note) => note.type === "breaking");
  return [
    `# Dashhaus ${version}`,
    "",
    `Status: written in its release PR, at the commit whose files [${version}.sha256](${version}.sha256) records. It`,
    `shipped when [v${version}](${repo}/releases/tag/v${version}) exists.`,
    "",
    "## Release page",
    "",
    "TODO: two or three lines for the GitHub release, for someone deciding whether to install or upgrade.",
    "",
    `## What changed since ${from}`,
    "",
    ...(listed.length ? listed : ["Nothing a consumer notices.", ""]),
    ...(internal ? [`Internal changes, left out: ${internal}.`, ""] : []),
    `## API changes since ${from}`,
    "",
    `Read from the packed type declarations (\`npm run release:api\`). A removed entry or export, or a changed`,
    "declaration, is breaking until a person says otherwise.",
    "",
    apiMarkdown(diff, from),
    "",
    ...(unowned
      ? ["TODO: the API changes above can break a consumer, but no change note says breaking. Add the breaking note, or say here why it isn't one.", ""]
      : []),
    "## Live Home Assistant smoke",
    "",
    "TODO: run it at this commit, as spec/release.md → Live Home Assistant smoke describes, and record the six observations, or write \"unrun\" and why.",
    "",
  ].join("\n");
}

const npmText = (args) => execFileSync("npm", args, { cwd: root, encoding: "utf8" }).trim();

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const asked = args.find((arg) => !arg.startsWith("--"))?.replace(/^v/, "");
  if (asked !== undefined && !SEMVER.test(asked)) {
    console.error("usage: npm run release [-- <x.y.z>] [--dry-run]");
    process.exit(1);
  }

  const notes = await readChanges();
  if (!notes.length) {
    console.error(`✗ no change notes in ${CHANGES_DIR}/: nothing to release. Pull requests add them with npm run change.`);
    process.exit(1);
  }
  const from = npmText(["view", "@dashhaus/core", "version"]);
  const current = (await readManifest("packages/core")).version;

  console.log(`→ packing the current code to compare its API with ${from} on npm`);
  const work = await apiWorkDir(root);
  await pack(join(root, "release"));
  const problems = await fetchFromRegistry(from, join(work, "registry"));
  if (problems.length) throw new Error(problems.join("\n"));
  const diff = diffApi(await apiOfTarballs(join(work, "registry"), from, work), await apiOfTarballs(join(root, "release"), current, work));

  const breaking = diff.breaking || notes.some((note) => note.type === "breaking");
  const feature = diff.additive || notes.some((note) => note.type === "feature");
  const suggested = suggestVersion(from, { breaking, feature });
  const version = asked ?? suggested;
  console.log(`\n${notes.length} change notes; API against ${from}: ${diff.removed.length + diff.removedSubpaths.length} removed, ${diff.changed.length} changed, ${diff.added.length + diff.addedSubpaths.length} added`);
  console.log(`suggested version: ${suggested}${asked ? `; releasing ${asked} as asked` : ""}`);
  if (compareVersions(version, from) <= 0) {
    console.error(`✗ ${version} is not after ${from}, the latest on npm`);
    process.exit(1);
  }
  if (asked && compareVersions(asked, suggested) < 0) console.warn(`! ${asked} is below the suggested ${suggested}: the notes or the API say this release is ${breaking ? "breaking" : "a feature"}`);
  if (dryRun) process.exit(0);

  console.log(`\n→ applying ${version}`);
  await applyVersion(version);
  execFileSync("npm", ["install", "--package-lock-only", "--no-audit", "--no-fund"], { cwd: root, stdio: "inherit" });
  console.log(`→ packing ${version}`);
  await pack(join(root, "release"));
  await writeFile(digestsPath(version), formatDigests(await packedDigests(version)));
  const repository = (await readManifest("packages/bundle")).repository.url;
  await writeFile(recordPath(version), renderRecord({ version, from, notes, diff, repository }));
  for (const note of notes) await rm(join(root, note.file));

  console.log(`
wrote spec/releases/${version}.md and spec/releases/${version}.sha256, and collected ${notes.length} notes.

Next:
  1. Commit everything on a branch (release/v${version}) and open the pull request.
  2. Finish every TODO in spec/releases/${version}.md, the live Home Assistant smoke among them; CI is red until then.
  3. Merge it. The Release workflow tags v${version}, publishes the packages and the GitHub release.`);
}
