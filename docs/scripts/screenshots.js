#!/usr/bin/env node
/**
 * Captures the home page's pictures from a static Storybook build, each in the site's light and dark look, as WebP:
 *
 * - `src/assets/skins/phone-<skin>-<look>.webp`: each skin's phone example, the screen alone. The home page shows it
 *   while the live story loads, and in its place where the story can't run.
 * - `src/assets/kinds/<kind>-<look>.webp`: one card of each kind of entity, Orb's tile over Field's module, for the
 *   home page's list of what the skins draw.
 *
 * Run `npm run build-storybook` at the root first, then `npm run screenshots -w docs [-- <storybook-static dir>]`. Rerun
 * it when a skin's phone example or one of the cards below changes.
 */
/* global document */
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { chromiumLaunchOptions } from "../../scripts/chromium.js";
import sharp from "sharp";

const here = fileURLToPath(new URL(".", import.meta.url));
const storybook = resolve(process.argv[2] ?? join(here, "../../storybook-static"));
const assets = join(here, "../src/assets");

/** Each skin's Storybook toolbar global for the site's light and dark look. */
const LOOKS = {
  orb: { light: "theme:light", dark: "theme:dark" },
  field: { light: "finish:alloy", dark: "finish:black" },
};
/** Each kind of entity, and the story each skin draws it in (its first, a typical working state). */
const KINDS = {
  light: ["orb-cards-light--dimmable", "field-cards-light--dimmable"],
  climate: ["orb-cards-climate--heating", "field-cards-climate--heating"],
  cover: ["orb-cards-cover--curtains", "field-cards-cover--open"],
  toggle: ["orb-cards-toggle--do-not-disturb", "field-cards-toggle--on-until"],
  sound: ["orb-cards-sound--on", "field-cards-sound--playing"],
  humidifier: ["orb-cards-humidifier--on", "field-cards-humidifier--humidifying"],
  fan: ["orb-cards-fan--on", "field-cards-fan--on"],
  sensor: ["orb-cards-sensor--comfortable", "field-cards-sensor--indoor"],
  weather: ["orb-cards-weather--partly-cloudy", "field-cards-weather--partly"],
  alarm: ["orb-cards-alarm--disarmed", "field-cards-alarm--disarmed"],
  lock: ["orb-cards-lock--locked", "field-cards-lock--locked"],
  owlet: ["orb-cards-owlet--deep-sleep", "field-cards-owlet--deep-sleep"],
};

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  const path = join(storybook, decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname));
  try {
    // Read before the head goes out, so a missing file can still answer 404.
    const body = await readFile(path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const { port } = /** @type {import("node:net").AddressInfo} */ (server.address());
const story = (id, globals) => `http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story&globals=${globals}`;

await mkdir(join(assets, "skins"), { recursive: true });
await mkdir(join(assets, "kinds"), { recursive: true });

const browser = await chromium.launch(chromiumLaunchOptions());
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  /** Opens a story once its fonts are in. */
  const open = async (id, globals) => {
    await page.goto(story(id, globals));
    await page.locator("#storybook-root > *").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
  };
  /**
   * The story's first element on its own page, as a band of the given shape: the page around the card is taken from
   * the shot (Orb's is a gradient, so it can't be painted in), widened to fit a card larger than the band.
   */
  const capture = async (width, height) => {
    const box = await page.locator("#storybook-root > *").first().boundingBox();
    const scale = Math.max(1, (box.width + 48) / width, (box.height + 48) / height);
    const [w, h] = [width * scale, height * scale];
    const png = await page.screenshot({ animations: "disabled", clip: { x: box.x + box.width / 2 - w / 2, y: box.y + box.height / 2 - h / 2, width: w, height: h } });
    return sharp(png).resize(width * 2, height * 2).png().toBuffer();
  };

  for (const [skin, looks] of Object.entries(LOOKS)) {
    for (const [look, globals] of Object.entries(looks)) {
      await open(`${skin}-dashboards-examples--phone`, globals);
      const screen = await page.locator("#storybook-root figure > div").first().screenshot({ animations: "disabled" });
      await sharp(screen).resize({ width: 600 }).webp({ quality: 80 }).toFile(join(assets, "skins", `phone-${skin}-${look}.webp`));
      console.log(`wrote skins/phone-${skin}-${look}.webp`);
    }
  }

  /** 4:5, as the home page shows it: Orb's card in the upper half, Field's module in the lower. */
  const W = 800;
  const H = 1000;
  for (const [kind, [orb, field]] of Object.entries(KINDS)) {
    for (const look of ["light", "dark"]) {
      const halves = [];
      for (const [id, globals] of [[orb, LOOKS.orb[look]], [field, LOOKS.field[look]]]) {
        await open(id, globals);
        halves.push(await capture(W / 2, H / 4));
      }
      await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
        .composite([{ input: halves[0], left: 0, top: 0 }, { input: halves[1], left: 0, top: H / 2 }])
        .webp({ quality: 82 })
        .toFile(join(assets, "kinds", `${kind}-${look}.webp`));
      console.log(`wrote kinds/${kind}-${look}.webp`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
