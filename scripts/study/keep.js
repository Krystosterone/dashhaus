#!/usr/bin/env node
/**
 * Keep a study run: npm run study:keep -- <name>
 *
 * Copies what the agent made in the sandbox into studies/<name>/ (spec/skins.md → Studies): the skin as a standalone
 * project pinned to the version it was built against (no node_modules, build, lockfile or .env), the agent's REPORT.md,
 * the reference, its preview snapshots and a screenshot of the dashboard it deployed, the fake Home Assistant's final
 * state, and study.json. Run it while `npm run study` is still serving, so the screenshot can be taken.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { screenshotDashboard } from "../../verify/dx/harness.js";
import { root } from "../packages.js";
import { REPORT_SECTIONS, STUDIES, pinnedManifest, sandbox, studyName } from "./lib.js";

const fail = (message) => {
  console.error(`study:keep: ${message}`);
  process.exit(1);
};
let name;
try {
  name = studyName(process.argv[2]);
} catch (error) {
  fail(`${error.message}\nusage: npm run study:keep -- <name>`);
}
const box = sandbox(name);
if (!existsSync(box.run)) fail(`no study run at ${box.dir}; start one with npm run study -- ${name} …`);
const run = JSON.parse(readFileSync(box.run, "utf8"));
const target = join(root, STUDIES, name);
if (existsSync(target)) fail(`${relative(root, target)} already exists`);

// The skin the agent made: the one folder in the sandbox holding a scaffolded skin's manifest.
const skins = readdirSync(box.agent, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(box.agent, entry.name, "package.json")))
  .map((entry) => entry.name)
  .filter((dir) => /^dashhaus-skin-/.test(JSON.parse(readFileSync(join(box.agent, dir, "package.json"), "utf8")).name ?? ""));
if (skins.length !== 1) fail(`expected one scaffolded skin in ${box.agent}, found ${skins.length ? skins.join(", ") : "none"}`);
const skinDir = join(box.agent, skins[0]);
const report = join(box.agent, "REPORT.md");
if (!existsSync(report)) fail(`the agent left no REPORT.md in ${box.agent}; ask it for one (FRICTION and RESULT) before keeping the run`);
const reportText = readFileSync(report, "utf8");
const missing = REPORT_SECTIONS.filter((heading) => !reportText.includes(heading));
if (missing.length) fail(`REPORT.md has no ${missing.join(" or ")} section`);

const SKIPPED = new Set(["node_modules", "dist", ".env", "package-lock.json", "snapshots"]);
mkdirSync(join(target, "captures"), { recursive: true });
cpSync(skinDir, join(target, "skin"), { recursive: true, filter: (source) => !SKIPPED.has(source.split(/[\\/]/).at(-1)) });
const manifest = JSON.parse(readFileSync(join(skinDir, "package.json"), "utf8"));
writeFileSync(join(target, "skin", "package.json"), `${JSON.stringify(pinnedManifest(manifest, run.version), null, 2)}\n`);
cpSync(report, join(target, "REPORT.md"));
if (run.reference.kind === "image") cpSync(join(box.agent, run.reference.file), join(target, run.reference.file));
if (existsSync(box.state)) cpSync(box.state, join(target, "home-assistant.json"));

const captures = [];
const snapshots = join(skinDir, "preview", "snapshots");
if (existsSync(snapshots)) {
  for (const file of readdirSync(snapshots).filter((file) => file.endsWith(".png"))) {
    cpSync(join(snapshots, file), join(target, "captures", file));
    captures.push(file);
  }
}
const skin = manifest.name.replace(/^dashhaus-skin-/, "");
try {
  await screenshotDashboard(`${run.haUrl}/dashhaus-${skin}`, join(target, "captures", "deployed.png"));
  captures.push("deployed.png");
} catch (error) {
  console.warn(`! no screenshot of the deployed dashboard: ${error.message.split("\n")[0]}`);
}

const study = { name, skin, kept: new Date().toISOString().slice(0, 10), version: run.version, commit: run.commit, reference: run.reference, captures, task: run.task };
writeFileSync(join(target, "study.json"), `${JSON.stringify(study, null, 2)}\n`);
const look = run.reference.kind === "image" ? `the picture in [${run.reference.file}](${run.reference.file})` : `this description: "${run.reference.text}"`;
writeFileSync(join(target, "README.md"), `# ${name}, a study

This is a **study**: a skin a fresh agent built from the Dashhaus release tarballs and ${look}, the way someone
outside the Dashhaus repository would, then deployed to a simulated Home Assistant. It is not finished or polished,
and it doesn't ship. Use it, take ideas from it, or build on it; contributions back are welcome.

- [\`skin/\`](skin/) is the project as the agent left it, pinned to \`@dashhaus\` ${run.version}. Copy the folder,
  \`npm install\`, then \`npm run preview\`, or deploy it as its \`AGENTS.md\` says.
- [\`REPORT.md\`](REPORT.md) is the agent's own account: its FRICTION (every guess, retry and dead end) and its RESULT.
- [\`captures/\`](captures/) holds its preview snapshots and \`deployed.png\`, the dashboard it deployed.
- [\`study.json\`](study.json) records the run: the version and commit it was built against, and the task it was given.
`);

console.log(`Kept the ${name} study in ${relative(root, target)}: the skin, REPORT.md and ${captures.length} capture(s).`);
if (!captures.length) console.warn("! no captures: the agent ran no snapshot and the deployed dashboard couldn't be screenshotted.");
