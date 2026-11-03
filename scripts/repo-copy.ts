/**
 * Scaffolding for the generator integration tests: the repo root, a throwaway copy of it, and the commands that run
 * inside the copy. The copies leave out everything a nested run doesn't need (installed modules, build output, the
 * agent and research folders), so a copy is cheap and each suite gets its own.
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

export const root = process.cwd();

/** Children run outside this vitest run: without its variables a nested `vitest run` acts as a fresh one. */
export const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("VITEST") && key !== "NODE_OPTIONS"));

const skip = ["node_modules", ".git", "dist", "storybook-static", ".agents", ".claude", "research"];

/** A source-only copy of the repo in a fresh temporary directory. */
export const copyRepo = (prefix: string) => {
  const copy = mkdtempSync(join(tmpdir(), prefix));
  cpSync(root, copy, { recursive: true, filter: (source) => !skip.includes(relative(root, source).split("/")[0]) });
  return copy;
};

/**
 * Run a command without blocking the worker: Vitest's parent times out `onTaskUpdate` when a test holds the event
 * loop through a long `spawnSync`, which these generator runs are.
 */
export const run = (cwd: string, command: string, args: string[]) =>
  new Promise<{ status: number | null; output: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env });
    let output = "";
    child.stdout?.on("data", (chunk) => { output += chunk; });
    child.stderr?.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, output }));
  });

/**
 * The copy's own node_modules: each dependency linked from the repo, and every workspace package linked from the copy,
 * so a generated skin resolves by its manifest name without re-installing the dependency tree.
 *
 * The tool caches are the copy's own, never a link: suites run side by side and each would otherwise write its
 * typecheck state over the repo's, and over each other's. The copy starts from a snapshot of the repo's typecheck
 * state instead, which TypeScript can reuse because a copy has the same layout and its unchanged files hash the same.
 */
export const linkNodeModules = (copy: string) => {
  const modules = join(copy, "node_modules");
  mkdirSync(modules);
  for (const entry of readdirSync(join(root, "node_modules"))) {
    if (entry === "@dashhaus" || entry === ".cache") continue;
    symlinkSync(join(root, "node_modules", entry), join(modules, entry));
  }
  const tsc = join(root, "node_modules", ".cache", "tsc");
  if (existsSync(tsc)) cpSync(tsc, join(modules, ".cache", "tsc"), { recursive: true });
  mkdirSync(join(modules, "@dashhaus"));
  for (const scope of readdirSync(join(copy, "packages"))) symlinkSync(join(copy, "packages", scope), join(modules, "@dashhaus", scope), "dir");
  for (const skin of readdirSync(join(copy, "src/skins"))) {
    if (existsSync(join(copy, "src/skins", skin, "package.json"))) symlinkSync(join(copy, "src/skins", skin), join(modules, "@dashhaus", skin), "dir");
  }
};

/**
 * Typecheck the copy: the root program (the skins, verify and the generators) and the core package, the two places
 * the generators write into. The dashboard and deploy packages are byte-identical to the repo's copy, so the parent
 * gate's typecheck already covers them.
 */
export const typecheckCopy = async (cwd: string) => {
  for (const args of [
    ["--noEmit", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/root.tsbuildinfo"],
    ["--noEmit", "-p", "packages/core/tsconfig.json", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/core.tsbuildinfo"],
  ]) {
    const result = await run(cwd, "npx", ["tsc", ...args]);
    if (result.status) return result;
  }
  return { status: 0, output: "" };
};

/**
 * npm's own proof that a generated skin joined the workspace: writing the lockfile reads every workspace manifest and
 * records the package by name with its link target, without re-installing the dependency tree the copy already links.
 */
export const recordWorkspace = (cwd: string) => run(cwd, "npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund", "--prefer-offline"]);
