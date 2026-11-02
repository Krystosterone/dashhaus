#!/usr/bin/env node
/**
 * Keep a study run: npm run study:keep -- <name>
 *
 * Brings what the agent made into this repository as a study (spec/skins.md → Studies), in the shape every study has:
 *
 *   1. a study's shell at src/skins/<skin>/ from `new-skin <skin> --study`, and `new-card <domain> --skin <skin>` for
 *      each of its cards: the stories, tests and Connected cards every skin here has, registered in Storybook only;
 *   2. the agent's skin laid over it, file for file, leaving behind what only a standalone skin needs (its package
 *      manifest, build, preview and guide), which the repository does itself;
 *   3. the run's own files: design.md (its DESIGN.md, drawn as Foundations → Design rules), REPORT.md, the reference,
 *      captures/ (its snapshots and a screenshot of what it deployed) and study.json; its README says how it was made.
 *
 * Then it installs, and runs the study's typecheck, lint and tests, printing what to fix before committing. Run it
 * while `npm run study` is still serving, so the deployed dashboard can be screenshotted.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { screenshotDashboard } from "../../verify/dx/harness.js";
import { domainsFile } from "../domains.js";
import { generated, root, skinTemplates, studies } from "../packages.js";
import { DESIGN_SECTIONS, REPORT_SECTIONS, RUN_FILES, fitDesignRules, headingsOf, madeByRun, sandbox, studyName } from "./lib.js";

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

// The skin the agent made: the one folder in the sandbox holding a scaffolded skin's manifest.
const skins = readdirSync(box.agent, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(box.agent, entry.name, "package.json")))
  .map((entry) => entry.name)
  .filter((dir) => /^dashhaus-skin-/.test(JSON.parse(readFileSync(join(box.agent, dir, "package.json"), "utf8")).name ?? ""));
if (skins.length !== 1) fail(`expected one scaffolded skin in ${box.agent}, found ${skins.length ? skins.join(", ") : "none"}`);
const from = join(box.agent, skins[0]);
const skin = JSON.parse(readFileSync(join(from, "package.json"), "utf8")).name.replace(/^dashhaus-skin-/, "");
const to = join(root, generated.dir(skin));
if (existsSync(to)) fail(`${relative(root, to)} already exists: the agent's skin is called ${skin}`);

const runFile = (file) => join(box.agent, file);
for (const file of Object.values(RUN_FILES)) if (!existsSync(runFile(file))) fail(`the agent left no ${file} in ${box.agent}; ask it for one (the task says what goes in it) before keeping the run`);
const report = readFileSync(runFile(RUN_FILES.report), "utf8");
const missingReport = REPORT_SECTIONS.filter((heading) => !report.includes(heading));
if (missingReport.length) fail(`${RUN_FILES.report} has no ${missingReport.join(" or ")} section`);
const design = readFileSync(runFile(RUN_FILES.design), "utf8");
const missingDesign = DESIGN_SECTIONS.filter((heading) => !new RegExp(`^${heading}\\s*$`, "m").test(design));
if (missingDesign.length) fail(`${RUN_FILES.design} has no ${missingDesign.join(", ")} section: its Design rules page draws the palette, parts and dashboards after them`);

// Its cards: each gets the repository's stories and tests, and a section of its own in the design rules.
const domains = JSON.parse(readFileSync(join(root, domainsFile), "utf8"));
const cardDirs = existsSync(join(from, "cards")) ? readdirSync(join(from, "cards"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name) : [];
const unknown = cardDirs.filter((dir) => !domains[dir]);
const undocumented = cardDirs.filter((dir) => domains[dir] && !new RegExp(`^## ${domains[dir].Label}\\s*$`, "m").test(design));
if (undocumented.length) fail(`${RUN_FILES.design} has no ${undocumented.map((dir) => `## ${domains[dir].Label}`).join(", ")} section: the task asks for one per card`);

const node = (script, args) => {
  const result = spawnSync(process.execPath, [join(root, script), ...args], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) fail(`${script} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`);
};

// 1. The study's shell, and each card's in-repo stories and tests, by the generators every skin here is made with.
console.log(`Making the ${skin} study's shell…`);
node("scripts/new-skin/index.js", [skin, "--study"]);
for (const domain of cardDirs.filter((dir) => domains[dir])) {
  // The card's kind is what the agent's card takes: a control has an action prop, a reading none.
  const card = readdirSync(join(from, "cards", domain)).find((file) => /Card\.tsx$/.test(file) && !file.includes(".stories."));
  const control = card && /\bon[A-Z]\w*\?: \(\) => void/.test(readFileSync(join(from, "cards", domain, card), "utf8"));
  node("scripts/new-card/index.js", [domain, "--skin", skin, "--kind", control ? "control" : "reading"]);
}

// 2. The agent's skin over the shell. A file only a standalone skin has (its templates' paths, names filled) stays behind.
const standaloneRoots = ["standalone", "standalone-card"].map((folder) => join(root, skinTemplates.package, "src/templates", folder));
const DOTFILES = { _gitignore: ".gitignore", "_env.example": ".env.example" };
const walk = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => relative(dir, join(entry.parentPath, entry.name)));
const standalone = standaloneRoots.flatMap((dir) => walk(dir)).map((path) => new RegExp(`^${(DOTFILES[path] ?? path).replace(/[.]/g, "\\.").replace(/__\w+?__/g, "[^/]+")}$`));
const LEFT_OUT = /^(?:node_modules|dist|preview\/snapshots)\/|^(?:\.env|package-lock\.json)$/;
const files = walk(from).filter((path) => !LEFT_OUT.test(path));
const dropped = files.filter((path) => standalone.some((pattern) => pattern.test(path)));
for (const path of files.filter((file) => !dropped.includes(file))) {
  mkdirSync(dirname(join(to, path)), { recursive: true });
  cpSync(join(from, path), join(to, path));
}

// 3. What the run leaves beside the skin: its design rules, its report, its reference and what it looked like.
writeFileSync(join(root, studies.designDoc(skin)), design);
const rules = join(to, "stories/DesignRules.mdx");
writeFileSync(rules, fitDesignRules(readFileSync(rules, "utf8"), headingsOf(design)));
cpSync(runFile(RUN_FILES.report), join(to, RUN_FILES.report));
if (run.reference.kind === "image") cpSync(runFile(run.reference.file), join(to, run.reference.file));
const captures = [];
const capturesDir = join(root, studies.captures(skin));
mkdirSync(capturesDir, { recursive: true });
const snapshots = join(from, "preview", "snapshots");
for (const file of existsSync(snapshots) ? readdirSync(snapshots).filter((file) => file.endsWith(".png")) : []) {
  cpSync(join(snapshots, file), join(capturesDir, file));
  captures.push(file);
}
try {
  await screenshotDashboard(`${run.haUrl}/dashhaus-${skin}`, join(capturesDir, "deployed.png"));
  captures.push("deployed.png");
} catch (error) {
  console.warn(`! no screenshot of the deployed dashboard: ${error.message.split("\n")[0]}`);
}
if (!captures.length) fail(`no captures: the agent ran no snapshot and ${run.haUrl} couldn't be screenshotted; keep the run while npm run study serves`);

const record = { name, skin, kept: new Date().toISOString().slice(0, 10), version: run.version, commit: run.commit, made: "run", reference: run.reference, task: run.task, captures };
writeFileSync(join(root, studies.record(skin)), `${JSON.stringify(record, null, 2)}\n`);
const readme = join(to, "README.md");
writeFileSync(readme, readFileSync(readme, "utf8").replace(/(## How it was made\n\n)[\s\S]*?(\n## Make it a real skin)/, (_, head, tail) => `${head}${madeByRun(run)}${tail}`));
const manifestPath = join(to, "package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const Section = readFileSync(join(to, "storybook.tsx"), "utf8").match(/section: "Studies\/([^"]+)"/)?.[1] ?? skin;
const look = run.reference.kind === "image" ? "a picture" : run.reference.text;
manifest.description = `A study: ${Section}, a skin an agent built from the release packages to look like ${look}. Not finished or polished; use it, build on it, contribute back.`;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

// Link the new workspace package, then the checks every skin here passes.
console.log("Installing…");
if (spawnSync("npm", ["install", "--silent"], { cwd: root, stdio: "inherit" }).status !== 0) fail("npm install failed");
const checks = [
  ["typecheck", "npm", ["run", "typecheck", "--silent"]],
  ["lint", "npx", ["eslint", generated.dir(skin)]],
  ["tests", "npx", ["vitest", "run", "--config", "config/vitest.config.ts", generated.dir(skin), "verify/"]],
];
const failed = checks.filter(([label, command, args]) => {
  console.log(`\n— ${label}`);
  return spawnSync(command, args, { cwd: root, stdio: "inherit" }).status !== 0;
});

console.log(`\nKept the ${name} run as the ${Section} study in ${relative(root, to)}: ${files.length - dropped.length} files of the agent's, its design rules, report and ${captures.length} capture(s).`);
if (unknown.length) console.warn(`! cards/${unknown.join(", cards/")}: no domain the generators know, so copied with no stories or tests of the repository's`);
if (dropped.some((path) => path.startsWith("preview/"))) console.log("  Its preview/ stayed behind: Storybook's Dashboards and Connected stories draw it here.");
console.log(failed.length
  ? `\nTo fix before committing (${failed.map(([label]) => label).join(", ")} failed above): fix the study, not the checks, and say what you changed under "How it was made" in its README, so the agent's work and the fix stay apart. Then npm run test-storybook.`
  : "\nIts checks pass. Then npm run test-storybook, and look at Studies in Storybook.");
