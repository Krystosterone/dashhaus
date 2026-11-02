#!/usr/bin/env node
/**
 * Start a study run: npm run study -- <name> (--image <path> | --describe "<text>") [--port <port>]
 *
 * Packs the release, writes the sandbox (spec/skins.md → Running a study) with the tarballs, the reference and the
 * task, starts the fake Home Assistant the agent deploys to, and prints how to hand the task to a fresh agent. It
 * keeps serving until you stop it; run `npm run study:keep -- <name>` before you do, so the kept study gets a
 * screenshot of what was deployed.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { startFakeHomeAssistant } from "@dashhaus/fake-home-assistant";
import { root } from "../packages.js";
import { STUDIES, sandbox, studyName, taskText } from "./lib.js";

const fail = (message) => {
  console.error(`study: ${message}`);
  process.exit(1);
};
const args = process.argv.slice(2);
const option = (flag) => {
  const at = args.indexOf(flag);
  if (at === -1) return undefined;
  const [, value] = args.splice(at, 2);
  if (!value) fail(`${flag} needs a value`);
  return value;
};
const image = option("--image");
const description = option("--describe");
const port = Number(option("--port") ?? 8801);
let name;
try {
  name = studyName(args[0]);
} catch (error) {
  fail(`${error.message}\nusage: npm run study -- <name> (--image <path> | --describe "<text>") [--port <port>]`);
}
if (args.length !== 1 || (image == null) === (description == null)) fail('give a name and one of --image <path> or --describe "<text>"');
if (image && !existsSync(image)) fail(`${image} doesn't exist`);
if (existsSync(join(root, STUDIES, name))) fail(`${STUDIES}/${name} is already kept; pick another name`);
const box = sandbox(name);
if (existsSync(box.dir)) fail(`${box.dir} exists from an earlier run: keep it (npm run study:keep -- ${name}) or remove it`);

console.log("Packing the release tarballs…");
const pack = spawnSync("npm", ["run", "release:pack", "--silent"], { cwd: root, stdio: "inherit" });
if (pack.status !== 0) fail("npm run release:pack failed");

mkdirSync(join(box.agent, "tarballs"), { recursive: true });
mkdirSync(box.www, { recursive: true });
for (const file of readdirSync(join(root, "release")).filter((file) => file.endsWith(".tgz"))) copyFileSync(join(root, "release", file), join(box.agent, "tarballs", file));
const reference = image ? { kind: "image", file: `reference${extname(image).toLowerCase()}` } : { kind: "description", text: description };
if (image) copyFileSync(resolve(image), join(box.agent, reference.file));

const server = await startFakeHomeAssistant({ port, www: box.www, stateFile: box.state });
const { HA_URL, HA_TOKEN, HA_WWW } = server.settings;
const task = taskText({ reference, haUrl: HA_URL, token: HA_TOKEN, www: HA_WWW });
writeFileSync(join(box.agent, "TASK.md"), task);
const version = JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8")).version;
const commit = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
writeFileSync(box.run, `${JSON.stringify({ name, started: new Date().toISOString(), version, commit, reference, task, haUrl: HA_URL }, null, 2)}\n`);

console.log(`
The ${name} study is ready.

  Agent folder   ${box.agent}   (TASK.md, tarballs/${image ? `, ${reference.file}` : ""})
  Home Assistant ${HA_URL}  (www: ${HA_WWW})

Start a fresh agent in the agent folder, with no web access and no access to this repository, and give it TASK.md
as its whole prompt, e.g.:

  cd ${box.agent} && claude "Read TASK.md and do it."

Judge the result from Home Assistant, not from the agent's word: ${HA_URL}/<the dashboard's path>.
When the agent is done, keep the study (this server must still be running, for the screenshot):

  npm run study:keep -- ${name}

Then stop this with Ctrl-C.`);

process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
