#!/usr/bin/env node
/**
 * Captures the home page's hero from a static Storybook build: each skin's phone example in its light and dark look,
 * then the two phones side by side as one square image per look, written as WebP to src/assets/skins/. Run
 * `npm run build-storybook` at the root first, then `npm run screenshots -w docs [-- <storybook-static dir>]`. Rerun it
 * when a skin's phone example changes.
 */
/* global document */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const here = fileURLToPath(new URL(".", import.meta.url));
const storybook = resolve(process.argv[2] ?? join(here, "../../storybook-static"));
const out = join(here, "../src/assets/skins");

/** [skin, look, globals]: each skin's phone example in the site's light and dark look. */
const SHOTS = [
  ["orb", "light", "theme:light"],
  ["orb", "dark", "theme:dark"],
  ["field", "light", "finish:alloy"],
  ["field", "dark", "finish:black"],
];
/** `<skin>-<look>` → the phone's screen as a PNG. */
const phones = new Map();

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  const path = join(storybook, decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname));
  try {
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const { port } = /** @type {import("node:net").AddressInfo} */ (server.address());

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1400 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  for (const [skin, look, globals] of SHOTS) {
    await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${skin}-dashboards-examples--phone&viewMode=story&globals=${globals}`);
    const screen = page.locator("#storybook-root figure > div").first();
    await screen.waitFor();
    await page.evaluate(() => document.fonts.ready);
    phones.set(`${skin}-${look}`, await screen.screenshot({ animations: "disabled" }));
  }
} finally {
  await browser.close();
  server.close();
}

/** The hero is drawn square: the two phones' tops side by side, fading out where they're cut. */
const SIDE = 1600;
const fade = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIDE}" height="${SIDE}"><defs><linearGradient id="f" x2="0" y2="1">` +
    `<stop offset="0.8" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#f)"/></svg>`,
);
for (const look of ["light", "dark"]) {
  const phone = (skin) => sharp(phones.get(`${skin}-${look}`)).extract({ left: 0, top: 0, width: 780, height: SIDE }).toBuffer();
  await sharp({ create: { width: SIDE, height: SIDE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await phone("orb"), left: 0, top: 0 }, { input: await phone("field"), left: SIDE - 780, top: 0 }, { input: fade, blend: "dest-in" }])
    .webp({ quality: 86 })
    .toFile(join(out, `hero-${look}.webp`));
  console.log(`wrote hero-${look}.webp`);
}
