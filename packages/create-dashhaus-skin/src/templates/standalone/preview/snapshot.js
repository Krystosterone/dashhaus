#!/usr/bin/env node
/**
 * Save the preview as PNGs, so the skin can be looked at without a browser window or a Home Assistant:
 *
 *   npm run snapshot                  # preview/snapshots/{desktop,phone,desktop-dark}.png
 *   npm run snapshot -- --yaml '{"cards":[{"entity":"light.porch"}]}'
 *
 * It serves `preview/` with Vite and drives Chromium through Playwright, a dev dependency. The first run tells you
 * the commands that install Playwright's Chromium; `DASHHAUS_CHROMIUM=/path/to/chrome` uses a Chromium or Chrome
 * already on the machine instead. Page errors are printed, and fail the run.
 */
/* global document -- the waitForFunction and evaluate callbacks run in the page. */
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const out = fileURLToPath(new URL("./snapshots/", import.meta.url));
const args = process.argv.slice(2);
const yaml = args.includes("--yaml") ? args[args.indexOf("--yaml") + 1] : undefined;

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(`npm run snapshot needs Playwright, a dev dependency: run npm install, then npm run snapshot again.
(npm run preview doesn't need it; it serves the same page to a browser.)`);
  process.exit(1);
}

const server = await createServer({
  root,
  configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
  logLevel: "error",
  server: { port: 0, host: "127.0.0.1" },
});
await server.listen();
const base = server.resolvedUrls.local[0];
const shots = [
  { name: "desktop", width: 1280, height: 900, theme: "light" },
  { name: "phone", width: 390, height: 844, theme: "light" },
  { name: "desktop-dark", width: 1280, height: 900, theme: "dark" },
];

let browser;
const problems = [];
try {
  // A Chromium or Chrome already on the machine, when Playwright's own build isn't installed or can't be.
  const executablePath = process.env.DASHHAUS_CHROMIUM || undefined;
  browser = await chromium.launch({ executablePath });
  await mkdir(out, { recursive: true });
  // A warm-up load: Vite finds a newly imported dependency on the first request and re-optimizes, which reloads the
  // page and can briefly serve two copies of React ("Invalid hook call"). The shots start once that has settled.
  const warmup = await browser.newPage();
  await warmup.goto(base, { waitUntil: "networkidle" });
  await warmup.waitForTimeout(1000);
  await warmup.close();
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
    page.on("pageerror", (error) => problems.push(`${shot.name}: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`${shot.name}: ${message.text()}`);
    });
    const query = new URLSearchParams({ theme: shot.theme, ...(yaml ? { yaml } : {}) });
    await page.goto(`${base}?${query}`);
    await page.waitForFunction((type) => {
      const element = document.querySelector(type);
      return Boolean(element?.shadowRoot?.querySelector("main, [role=alert], .hd-config-error")) || Boolean(document.querySelector("pre"));
    }, "__card_type__", { timeout: 15000 }).catch(() => problems.push(`${shot.name}: the card drew nothing within 15 s`));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const file = `${out}${shot.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`✓ ${file} (${shot.width} px, ${shot.theme})`);
    await page.close();
  }
} catch (error) {
  if (/Executable doesn't exist|browserType\.launch/.test(String(error?.message))) {
    console.error(process.env.DASHHAUS_CHROMIUM
      ? `No browser at DASHHAUS_CHROMIUM=${process.env.DASHHAUS_CHROMIUM}: point it at a Chromium or Chrome executable.`
      : `Playwright has no Chromium yet. Install it, then npm run snapshot again:
  npx playwright install chromium
  npx playwright install-deps chromium   # Linux only, when Chromium is missing system libraries (needs sudo)
Or use a Chromium or Chrome already on this machine: DASHHAUS_CHROMIUM=/path/to/chrome npm run snapshot`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server.close();
}
if (problems.length) {
  console.error(`\nThe page reported:\n  ${problems.join("\n  ")}`);
  process.exitCode = 1;
}
