#!/usr/bin/env node
/**
 * `npm run check`: typecheck, lint and test side by side rather than one after another, so on a machine with cores to
 * spare the gate takes about as long as the tests alone. Below four cores the three only compete for the same two, so
 * they run one after another there. Each command's output is held until it finishes, then printed whole under its name,
 * so they never interleave; every failure is reported by name at the end and the command exits non-zero. Extra
 * arguments go to the tests (`npm run check -- packages/core`).
 */
import { spawn } from "node:child_process";
import { availableParallelism } from "node:os";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const extra = process.argv.slice(2);
const commands = [
  ["typecheck", ["run", "--silent", "typecheck"]],
  ["lint", ["run", "--silent", "lint"]],
  ["test", ["run", "--silent", "test", ...(extra.length ? ["--", ...extra] : [])]],
];

// The children write to a pipe, so keep their colours when this command itself is on a terminal.
const env = process.stdout.isTTY && !("NO_COLOR" in process.env) ? { ...process.env, FORCE_COLOR: "1" } : process.env;

const run = ([name, args]) => new Promise((resolve) => {
  const start = Date.now();
  const child = spawn(npm, args, { env });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("error", (error) => resolve({ name, status: 1, output: String(error), seconds: 0 }));
  child.on("close", (status) => {
    const result = { name, status, output, seconds: (Date.now() - start) / 1000 };
    process.stdout.write(`\n── ${name} ${status ? "failed" : "passed"} (${result.seconds.toFixed(1)}s) ──\n${output.trimEnd() ? `${output.trimEnd()}\n` : ""}`);
    resolve(result);
  });
});

const started = Date.now();
const results = [];
if (availableParallelism() >= 4) results.push(...await Promise.all(commands.map(run)));
else for (const command of commands) results.push(await run(command));

const failed = results.filter(({ status }) => status);
const total = ((Date.now() - started) / 1000).toFixed(1);
if (failed.length) {
  console.error(`\ncheck failed in ${total}s: ${failed.map(({ name }) => name).join(", ")}`);
  process.exit(1);
}
console.log(`\ncheck passed in ${total}s: ${results.map(({ name, seconds }) => `${name} ${seconds.toFixed(1)}s`).join(", ")}`);
