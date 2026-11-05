/**
 * Change notes: one file per pull request in `changes/`, written while the change is fresh and reviewed in its diff.
 * `npm run release` collects them into the release record and deletes them (spec/release.md → Change notes).
 *
 *   npm run change -- <breaking|feature|fix|internal> "<what a consumer notices>"   write a note
 *   node scripts/release/changes.js check-pr [--base <ref>]                        CI: a PR that ships needs one
 *
 * A note is a little front matter and a body, the sentence someone deciding whether to upgrade reads:
 *
 *   ---
 *   type: fix
 *   ---
 *   Orb's lock card asks for the code again after a wrong one, instead of locking.
 *
 * `check-pr` diffs the pull request (CI checks out its merge commit, so the default base is its first parent) and fails
 * when it changes a file that can change what ships (`shipsFrom`) without adding or editing a note. A release PR, the
 * one that adds `spec/releases/<version>.sha256`, collects the notes instead.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { publicPackages, root } from "./manifest.js";

export const CHANGES_DIR = "changes";
/** In the order a release record lists them; `internal` is counted, never listed. */
export const CHANGE_TYPES = ["breaking", "feature", "fix", "internal"];

/** Outside the public package folders, the files a tarball or the bundle is built from. */
const BUILT_FROM = [
  "apps/lovelace/",
  "package-lock.json",
  "LICENSE",
  "config/vite.lovelace.config.ts",
  "config/tsconfig.base.json",
  "scripts/build-bundle.js",
  "scripts/build-packages.js",
  "scripts/release/manifest.js",
];

/** Whether a changed path can change what a release ships. Tests, stories and the package READMEs' prose don't. */
export function shipsFrom(path) {
  if (/\.(?:test|stories)\.[cm]?[jt]sx?$/.test(path) || /\.test-d\.ts$/.test(path) || path.includes("/__snapshots__/")) return false;
  if (BUILT_FROM.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry))) return true;
  return publicPackages.some(({ dir }) => path.startsWith(`${dir}/`) && !path.endsWith("/README.md"));
}

const isNote = (path) => path.startsWith(`${CHANGES_DIR}/`) && path.endsWith(".md") && path !== `${CHANGES_DIR}/README.md`;

/** A note's type and body; throws, naming the file, when it isn't one. */
export function parseChange(text, file = "note") {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`${file}: a change note starts with front matter: ---, type: <${CHANGE_TYPES.join("|")}>, ---`);
  const fields = Object.fromEntries(match[1].split(/\r?\n/).filter(Boolean).map((line) => {
    const [key, ...value] = line.split(":");
    return [key.trim(), value.join(":").trim()];
  }));
  if (!CHANGE_TYPES.includes(fields.type)) throw new Error(`${file}: type must be one of ${CHANGE_TYPES.join(", ")}, not "${fields.type ?? ""}"`);
  const body = match[2].trim();
  if (!body) throw new Error(`${file}: say what changed, for someone deciding whether to upgrade`);
  return { type: fields.type, body, file };
}

/** Every note in `changes/`, by file name. */
export async function readChanges(dir = join(root, CHANGES_DIR)) {
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter((file) => file.endsWith(".md") && file !== "README.md").sort();
  return Promise.all(files.map(async (file) => parseChange(await readFile(join(dir, file), "utf8"), `${CHANGES_DIR}/${file}`)));
}

/**
 * What a pull request's diff (`git diff --name-status` lines as `{ status, path }`) owes: undefined when it is fine,
 * or the problem. Notes it adds are parsed by the caller.
 */
export function pullRequestProblem(entries) {
  if (entries.some(({ status, path }) => status === "A" && /^spec\/releases\/[^/]+\.sha256$/.test(path))) return undefined;
  if (entries.some(({ status, path }) => status !== "D" && isNote(path))) return undefined;
  const shipped = entries.filter(({ path }) => shipsFrom(path)).map(({ path }) => path);
  if (!shipped.length) return undefined;
  const shown = shipped.slice(0, 5).join(", ") + (shipped.length > 5 ? `, and ${shipped.length - 5} more` : "");
  return `this pull request changes what a release ships (${shown}) but adds no change note. Run npm run change -- <${CHANGE_TYPES.join("|")}> "<what a consumer notices>" (internal for a change no consumer notices) and commit the file.`;
}

/** `changes/<slug>.md` for a note's first words, numbered when the name is taken. */
export function noteFileName(body, taken) {
  const slug = body.toLowerCase().replace(/[`'’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").split("-").slice(0, 8).join("-") || "change";
  let name = `${slug}.md`;
  for (let n = 2; taken.has(name); n++) name = `${slug}-${n}.md`;
  return name;
}

export const formatChange = (type, body) => `---\ntype: ${type}\n---\n${body.trim()}\n`;

function diffEntries(base) {
  const out = execFileSync("git", ["diff", "--name-status", "--no-renames", `${base}...HEAD`], { cwd: root, encoding: "utf8" });
  return out.split("\n").filter(Boolean).map((line) => {
    const [status, path] = line.split("\t");
    return { status: status[0], path };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "add") {
    const [type, ...words] = args;
    const body = words.join(" ");
    try {
      parseChange(formatChange(type ?? "", body));
    } catch (error) {
      console.error(`${error instanceof Error ? error.message.replace(/^note: /, "") : error}\nusage: npm run change -- <${CHANGE_TYPES.join("|")}> "<what a consumer notices>"`);
      process.exit(1);
    }
    const dir = join(root, CHANGES_DIR);
    const name = noteFileName(body, new Set(existsSync(dir) ? await readdir(dir) : []));
    await writeFile(join(dir, name), formatChange(type, body));
    console.log(`${CHANGES_DIR}/${name}`);
  } else if (command === "check-pr") {
    const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "HEAD^1";
    const entries = diffEntries(base);
    const problems = [];
    for (const { status, path } of entries) {
      if (status === "D" || !isNote(path)) continue;
      try {
        parseChange(await readFile(join(root, path), "utf8"), path);
      } catch (error) {
        problems.push(error instanceof Error ? error.message : String(error));
      }
    }
    const owed = pullRequestProblem(entries);
    if (owed) problems.push(owed);
    for (const problem of problems) console.error(`✗ ${problem}`);
    if (problems.length) process.exit(1);
    console.log(`change notes: fine (${entries.length} changed files against ${base})`);
  } else {
    console.error("usage: node scripts/release/changes.js add <type> <text> | check-pr [--base <ref>]");
    process.exit(1);
  }
}
