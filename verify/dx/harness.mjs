/**
 * The shared machinery for the two clean-room DX drivers:
 *
 *   npm run release:pack
 *   node verify/dx/author.mjs
 *   node verify/dx/user.mjs
 *
 * A driver creates a temporary app outside this repo, installs the packed tarballs by `file:` specifier, and runs the
 * consumer journey there. Nothing here imports a workspace package, and no app config sets the `source` condition.
 * `--tarballs <dir>` reads another release directory; `--keep` leaves the app behind for inspection.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The repository root: this file sits at `verify/dx/`. */
export const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

const argv = process.argv.slice(2);
const tarballArg = argv.indexOf("--tarballs");
export const tarballsDir = resolve(tarballArg === -1 ? join(repoRoot, "release") : argv[tarballArg + 1] ?? join(repoRoot, "release"));
export const keepApp = argv.includes("--keep");

const repoManifest = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

/** A version the repo already pins, so a clean-room app uses the same toolchain. */
export function toolVersion(name) {
  const version = repoManifest.devDependencies?.[name] ?? repoManifest.dependencies?.[name];
  if (!version) throw new Error(`the repo declares no ${name} version to pin the clean-room app to`);
  return version;
}

/** The newest packed tarball for a package name, or undefined when it has not been packed. */
export function tarball(name) {
  if (!existsSync(tarballsDir)) return undefined;
  const prefix = `${name.replace(/^@/, "").replace("/", "-")}-`;
  const matches = readdirSync(tarballsDir)
    .filter((file) => file.startsWith(prefix) && file.endsWith(".tgz"))
    .map((file) => join(tarballsDir, file))
    .sort();
  return matches.at(-1);
}

/** The tarballs a journey needs, read before any app is created, so a missing package is one clear finding. */
export function tarballs(names) {
  const found = {};
  const missing = [];
  for (const name of names) {
    const file = tarball(name);
    if (file) found[name] = file;
    else missing.push(name);
  }
  return { found, missing };
}

/** A package tarball's manifest, without installing it. */
export function tarballManifest(file) {
  return JSON.parse(spawnSync("tar", ["-xOzf", file, "package/package.json"], { encoding: "utf8" }).stdout);
}

/** Run one command, with its output captured. Non-zero throws unless the caller expects to inspect it. */
export function run(command, args, { cwd, allowFailure = false } = {}) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: {
      ...process.env,
      NO_COLOR: "1",
      npm_config_audit: "false",
      npm_config_fund: "false",
      npm_config_update_notifier: "false",
      npm_config_workspaces: "false",
    },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.error) throw new Error(`could not run \`${command} ${args.join(" ")}\`: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`\`${command} ${args.join(" ")}\` failed (exit ${result.status}):\n${tail(output)}`);
  }
  return { status: result.status ?? 1, output, ms: Date.now() - started };
}

/** A temporary app directory, outside the workspace. */
export async function makeApp(label) {
  return mkdtemp(join(tmpdir(), `dashhaus-dx-${label}-`));
}

/** Install the app's manifest and return the npm result. The app never inherits this workspace's dependencies. */
export async function install(app, manifest) {
  await writeJson(join(app, "package.json"), manifest);
  return run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], { cwd: app });
}

export async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

/** Resolve a specifier from the app's own `node_modules`, never from this repo. */
export function resolveFromApp(app, specifier) {
  return createRequire(join(app, "package.json")).resolve(specifier);
}

/** Import a module from the app's own `node_modules`. */
export async function importFromApp(app, specifier) {
  return import(pathToFileURL(resolveFromApp(app, specifier)).href);
}

/**
 * The installed package behind a specifier, found from its resolved entry so a nested install is found too. The
 * manifest is the packed one, and its files live under the app, not this repo.
 */
export function installedPackage(app, name) {
  const entry = resolveFromApp(app, name);
  const appRoot = realpathSync(app);
  let directory = dirname(entry);
  while (directory !== dirname(directory)) {
    const manifestFile = join(directory, "package.json");
    if (existsSync(manifestFile)) {
      const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
      if (manifest.name === name) {
        const real = realpathSync(directory);
        if (real !== appRoot && !real.startsWith(`${appRoot}${sep}`)) {
          throw new Error(`${name} resolved outside the clean app: ${real}`);
        }
        assertPacked(name, manifest);
        return { directory: real, entry: realpathSync(entry), manifest };
      }
    }
    directory = dirname(directory);
  }
  throw new Error(`could not find the package.json for ${name}`);
}

/** The packed manifest has no workspace-only fields or conditions. */
function assertPacked(name, manifest) {
  if (manifest.private) throw new Error(`${name}: the installed manifest is still private`);
  if (manifest.source !== undefined) throw new Error(`${name}: the installed manifest declares a source field`);
  if (JSON.stringify(manifest.exports ?? {}).includes('"source"')) {
    throw new Error(`${name}: the installed exports declare a source condition`);
  }
}

export async function read(path) {
  return readFile(path, "utf8");
}

/** Remove the app unless `--keep`; print where it stayed. */
export async function clean(app) {
  if (keepApp) {
    console.log(`  app kept at ${app}`);
    return;
  }
  await rm(app, { recursive: true, force: true });
}

/** A known missing capability: the driver fails, and names the phase that removes it. */
export class Gap extends Error {
  constructor(message, phase) {
    super(message);
    this.name = "Gap";
    this.phase = phase;
  }
}

/** The last `count` lines, for a readable failure without the whole npm log. */
function tail(text, count = 24) {
  return text.split("\n").slice(-count).join("\n");
}

function indent(text, prefix = "    ") {
  return text.split("\n").map((line) => `${prefix}${line}`).join("\n");
}

/** A stage-by-stage report; the driver's exit code is non-zero while any gap or unexpected failure remains. */
export function createReport(title) {
  const rows = [];
  console.log(`\n${title}`);
  return {
    async stage(name, task) {
      try {
        const detail = await task();
        rows.push({ name, status: "pass", detail });
        console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
        return { ok: true, value: detail };
      } catch (error) {
        if (error instanceof Gap) {
          rows.push({ name, status: "gap", detail: error.message, phase: error.phase });
          const [first, ...rest] = error.message.split("\n");
          console.log(`✗ ${name} — ${first}`);
          if (rest.length) console.log(indent(rest.join("\n"), "  "));
          console.log(`  expected gap: ${error.phase}`);
        } else {
          rows.push({ name, status: "fail", detail: error?.message ?? String(error) });
          console.log(`! ${name} — unexpected failure`);
          console.log(indent(error?.stack ?? String(error)));
        }
        return { ok: false, error };
      }
    },
    blocked(names, why) {
      for (const name of [].concat(names)) {
        rows.push({ name, status: "blocked", detail: why });
        console.log(`- ${name} — blocked: ${why}`);
      }
    },
    finish() {
      const count = (status) => rows.filter((row) => row.status === status).length;
      const gaps = rows.filter((row) => row.status === "gap");
      const failed = count("fail");
      console.log(
        `\n${title}: ${count("pass")} passed, ${gaps.length} expected gap(s), ${failed} unexpected failure(s), ${count("blocked")} blocked`,
      );
      if (gaps.length) {
        console.log("Expected gaps:");
        for (const gap of gaps) console.log(`  • ${gap.name}: ${gap.phase}`);
      }
      if (failed) console.log("Unexpected failures need review; they are not a known missing capability.");
      process.exitCode = gaps.length || failed ? 1 : 0;
    },
  };
}

/** A relative path for a report line. */
export function shown(path) {
  return relative(process.cwd(), path) || path;
}
