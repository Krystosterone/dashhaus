#!/usr/bin/env node
/**
 * Typechecks the root program and each public package. The four programs share no output and read the same files, so
 * they run side by side; each keeps its own incremental state under `node_modules/.cache/tsc/`. A failure prints the
 * program and its output before the command exits non-zero.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const tsc = join(root, "node_modules", ".bin", "tsc");
const programs = [
  ["--noEmit", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/root.tsbuildinfo"],
  ["--noEmit", "-p", "packages/core/tsconfig.json", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/core.tsbuildinfo"],
  ["--noEmit", "-p", "packages/dashboard/tsconfig.json", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/dashboard.tsbuildinfo"],
  ["--noEmit", "-p", "packages/deploy/tsconfig.json", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/deploy.tsbuildinfo"],
];

const results = await Promise.all(programs.map((args) => new Promise((resolve) => {
  const child = spawn(tsc, args, { cwd: root });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("error", (error) => resolve({ command: `tsc ${args.join(" ")}`, status: 1, output: String(error) }));
  child.on("close", (status) => resolve({ command: `tsc ${args.join(" ")}`, status, output }));
})));

let failed = false;
for (const { command, status, output } of results) {
  if (!status) continue;
  failed = true;
  console.error(`\n${command}`);
  process.stderr.write(output);
}
if (failed) process.exit(1);
