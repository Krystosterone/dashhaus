/**
 * The shared machinery for the clean-room DX drivers, one per journey in spec/journeys.md:
 *
 *   npm run release:pack
 *   node verify/dx/skin.js          the user: each skin's file installed as the Marketplace does, then Add dashboard
 *   node verify/dx/user.js          the user, from the command line
 *   node verify/dx/author.js        the author
 *   node verify/dx/developer.js     the developer
 *
 * A driver creates a temporary app outside this repo, installs the packed tarballs by `file:` specifier, and runs the
 * consumer journey there. Nothing here imports a workspace package, and no app config sets the `source` condition.
 * `--tarballs <dir>` reads another release directory; `--keep` leaves the app behind for inspection; `--screenshot <dir>`
 * saves the deployed dashboards as PNGs, drawn by the fake Home Assistant in the repo's Chromium.
 */
/* global document, window -- the screenshot's waitForFunction and evaluate callbacks run in the page. */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromiumLaunchOptions } from "../../scripts/chromium.js";

/** The repository root: this file sits at `verify/dx/`. */
export const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

const argv = process.argv.slice(2);
const tarballArg = argv.indexOf("--tarballs");
export const tarballsDir = resolve(tarballArg === -1 ? join(repoRoot, "release") : argv[tarballArg + 1] ?? join(repoRoot, "release"));
export const keepApp = argv.includes("--keep");
const screenshotArg = argv.indexOf("--screenshot");
export const screenshotDir = screenshotArg === -1 ? undefined : resolve(argv[screenshotArg + 1] ?? ".");

/**
 * Open a page the fake Home Assistant serves in the repo's Chromium, wait until its card is drawn, and run `task` on
 * it. A page that reports an error, or never draws its card, fails the stage.
 */
export async function inPage(url, task, { width = 1280, height = 900 } = {}) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch(chromiumLaunchOptions());
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__fakeHaReady || window.__fakeHaProblem, null, { timeout: 15000 });
    const problem = await page.evaluate(() => window.__fakeHaProblem ?? null);
    if (problem) throw new Error(`${url}: ${problem}`);
    const result = await task(page);
    if (errors.length) throw new Error(`${url} reported: ${errors.join("; ")}`);
    return result;
  } finally {
    await browser.close();
  }
}

/**
 * Draw a dashboard page the fake Home Assistant serves and save it. Playwright is the repo's own (the clean app never
 * sees it); a page that reports an error, or never draws its card, fails the stage.
 */
export async function screenshotDashboard(url, file, { width = 1280, height = 900 } = {}) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch(chromiumLaunchOptions());
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__fakeHaReady || window.__fakeHaProblem, null, { timeout: 15000 });
    const problem = await page.evaluate(() => window.__fakeHaProblem ?? null);
    if (problem) throw new Error(`${url}: ${problem}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await mkdir(dirname(file), { recursive: true });
    await page.screenshot({ path: file, fullPage: true });
    if (errors.length) throw new Error(`${url} reported: ${errors.join("; ")}`);
    return file;
  } finally {
    await browser.close();
  }
}

/**
 * Open and close every card's details on a deployed dashboard: each card's name opens the frame's dialog, which shows
 * the facts the card receives, and the close button or Escape closes it again. `cards` names each card by its
 * `data-card-code` and the fact labels its details must show. A `token` gives a live Home Assistant's page its
 * frontend session; it is never printed. `screenshot` saves each open dialog as `<file>-<code>.png`.
 */
export async function exerciseDetails(url, cards, { token, screenshot } = {}) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch(chromiumLaunchOptions());
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (token) {
      const origin = new URL(url).origin;
      await page.addInitScript(({ token: access, origin: hassUrl }) => {
        localStorage.setItem("hassTokens", JSON.stringify({
          access_token: access,
          token_type: "Bearer",
          expires_in: 315360000,
          refresh_token: "",
          hassUrl,
          clientId: `${hassUrl}/`,
          expires: Date.now() + 315360000000,
        }));
      }, { token, origin });
    }
    await page.goto(url);
    if (token) {
      if (new URL(page.url()).pathname.startsWith("/auth/")) throw new Error(`${url}: the token was not accepted`);
    } else {
      await page.waitForFunction(() => window.__fakeHaReady || window.__fakeHaProblem, null, { timeout: 15000 });
      const problem = await page.evaluate(() => window.__fakeHaProblem ?? null);
      if (problem) throw new Error(`${url}: ${problem}`);
    }
    const results = [];
    // A card is found by its code (Orb, Field: data-card-code) or its domain (a skin from the shared core: data-card).
    for (const { code, card, facts, close } of cards) {
      const label = code ?? card;
      const trigger = page.locator(code ? `article[data-card-code="${code}"] button[aria-haspopup="dialog"]` : `article[data-card="${card}"] button[aria-haspopup="dialog"]`).first();
      await trigger.waitFor({ state: "visible", timeout: 10000 });
      await trigger.click();
      const dialog = page.locator("dialog[open]").first();
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      const text = (await dialog.innerText()).replace(/\s+/g, " ");
      for (const fact of facts) if (!text.includes(fact)) throw new Error(`${label} details do not show "${fact}": ${text}`);
      if (screenshot) {
        const file = `${screenshot.replace(/\.png$/, "")}-${label}.png`;
        await mkdir(dirname(file), { recursive: true });
        // The sheet enters with a 160 ms transition; wait for its painted frame before capturing it.
        await page.waitForTimeout(250);
        await page.screenshot({ path: file });
      }
      if (close === "escape") await page.keyboard.press("Escape");
      else await dialog.getByRole("button", { name: /^Close (?:.+ )?details$/ }).click();
      await dialog.waitFor({ state: "hidden", timeout: 5000 });
      results.push(`${label}: ${facts.length} facts, closed with ${close === "escape" ? "Escape" : "the close button"}`);
    }
    if (errors.length) throw new Error(`${url} reported: ${errors.join("; ")}`);
    return results.join("; ");
  } finally {
    await browser.close();
  }
}

const repoManifest = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

/** A version the repo already pins, so a clean-room app uses the same toolchain. */
/**
 * A guarded action, end to end on a deployed dashboard: a press on the card's action never sends it, but opens its
 * details on the question; Cancel sends nothing; the question's own button, pressed once it has settled, sends it.
 * `service` is the call it must send (`{ domain: "lock", service: "unlock" }`), counted from the page's fake connection
 * (`window.__fakeHaCalls`), so the check is what the card sent to Home Assistant.
 */
export async function exerciseGuarded(url, { card, action, question, service }) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch(chromiumLaunchOptions());
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__fakeHaReady || window.__fakeHaProblem, null, { timeout: 15000 });
    const problem = await page.evaluate(() => window.__fakeHaProblem ?? null);
    if (problem) throw new Error(`${url}: ${problem}`);
    const count = () => page.evaluate(({ domain, name }) => (window.__fakeHaCalls ?? []).filter((call) => call.type === "call_service" && call.domain === domain && call.service === name).length, { domain: service.domain, name: service.service });
    const ask = page.locator(`article[data-card="${card}"]`).getByRole("button", { name: `${action}…`, exact: true }).first();
    await ask.waitFor({ state: "visible", timeout: 10000 });
    const dialog = page.locator("dialog[open]").first();
    await ask.click();
    await dialog.waitFor({ state: "visible", timeout: 5000 });
    if (!(await dialog.innerText()).includes(question)) throw new Error(`${card}: ${action} opened no "${question}"`);
    if (await count() !== 0) throw new Error(`${card}: a press on ${action} sent it without asking`);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    if (await count() !== 0) throw new Error(`${card}: Cancel sent ${action}`);
    // Cancel leaves the details on their buttons: ask again there. The question takes no press until it has settled
    // (useSettled, 400 ms), so a double tap can't confirm it.
    await dialog.getByRole("button", { name: `${action}…`, exact: true }).click();
    if (!(await dialog.innerText()).includes(question)) throw new Error(`${card}: ${action} in the details asked no "${question}"`);
    await page.waitForTimeout(450);
    await dialog.getByRole("button", { name: action, exact: true }).click();
    for (let tries = 0; await count() === 0 && tries < 50; tries++) await page.waitForTimeout(100);
    const sent = await count();
    if (sent !== 1) throw new Error(`${card}: the question's ${action} sent it ${sent} times, not once`);
    if (errors.length) throw new Error(`${url} reported: ${errors.join("; ")}`);
    return `${card}: ${action} asked "${question}", Cancel sent nothing, ${action} sent it once`;
  } finally {
    await browser.close();
  }
}

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

const commandEnv = () => ({
  ...process.env,
  NO_COLOR: "1",
  npm_config_audit: "false",
  npm_config_fund: "false",
  npm_config_update_notifier: "false",
  npm_config_workspaces: "false",
});

/** Run one command, with its output captured. Non-zero throws unless the caller expects to inspect it. */
export function run(command, args, { cwd, allowFailure = false } = {}) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: commandEnv(),
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.error) throw new Error(`could not run \`${command} ${args.join(" ")}\`: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`\`${command} ${args.join(" ")}\` failed (exit ${result.status}):\n${tail(output)}`);
  }
  return { status: result.status ?? 1, output, ms: Date.now() - started };
}

/**
 * `run`, without blocking this process: the fake Home Assistant a command talks to may be served from here, and a
 * synchronous child would hold its event loop until the command gave up connecting.
 */
export function runAsync(command, args, { cwd, allowFailure = false } = {}) {
  const started = Date.now();
  return new Promise((done, fail) => {
    const child = spawn(command, args, { cwd, env: commandEnv() });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", (error) => fail(new Error(`could not run \`${command} ${args.join(" ")}\`: ${error.message}`)));
    child.on("close", (status) => {
      output = output.trim();
      if (status !== 0 && !allowFailure) fail(new Error(`\`${command} ${args.join(" ")}\` failed (exit ${status}):\n${tail(output)}`));
      else done({ status: status ?? 1, output, ms: Date.now() - started });
    });
  });
}

/** A temporary app directory, outside the workspace. */
export async function makeApp(label) {
  return mkdtemp(join(tmpdir(), `dashhaus-dx-${label}-`));
}

/**
 * Install the app's manifest and return the npm result. The app never inherits this workspace's dependencies. npm
 * 11.18 blocks an install script no `allowScripts` entry names and warns about each; the root manifest denies esbuild
 * (its platform binary comes from an optional dependency), and every journey's app installs it transitively, so the
 * app records the same decision unless it has one of its own.
 */
export async function install(app, manifest) {
  await writeJson(join(app, "package.json"), { allowScripts: { esbuild: false }, ...manifest });
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
