#!/usr/bin/env node
/**
 * The user's no-terminal journey, the Home Assistant Marketplace (HACS before 2026.11), from the packed bundle only:
 *
 *   npm run release:pack
 *   node verify/dx/marketplace.js [--tarballs <dir>] [--keep] [--screenshot <dir>]
 *
 * Check `hacs.json` names the release asset the Marketplace will look for; install the bundle's `dashhaus.js` as the
 * Marketplace does (`www/community/dashhaus/`, served and registered as `/hacsfiles/dashhaus/dashhaus.js?hacstag=…`) into
 * `@dashhaus/fake-home-assistant`; then, in Chromium, do what the person does: open Add dashboard, pick **Dashhaus**
 * under Community dashboards (the bundle's `window.customStrategies` entry), and open the dashboard it made, whose
 * `custom:dashhaus` strategy the page expands as the frontend does into one view per look, each drawing its skin's
 * card. No Node, token or SSH on the person's side.
 */
/* global window -- the evaluate callbacks run in the page. */
import assert from "node:assert/strict";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startFakeHomeAssistant } from "@dashhaus/fake-home-assistant";
import {
  clean,
  createReport,
  importFromApp,
  inPage,
  install,
  installedPackage,
  makeApp,
  read,
  repoRoot,
  screenshotDashboard,
  screenshotDir,
  shown,
  tarballs,
  tarballsDir,
} from "./harness.js";

const report = createReport("DX marketplace — install the release asset as the Marketplace does, then Add dashboard → Dashhaus");
console.log(`  tarballs: ${shown(tarballsDir)}`);

/** The repository the Marketplace installs from; with no `filename` in hacs.json, the asset is named after it. */
const REPOSITORY = "dashhaus";
/** The dashboard Add dashboard makes from the strategy's suggested title, `Dashhaus`, and the views it expands to. */
const STRATEGY_PATH = "dashboard-dashhaus";
const VIEWS = [{ title: "Orb", path: "orb", tag: "dashhaus-orb" }, { title: "Field", path: "field", tag: "dashhaus-field" }];

const app = await makeApp("marketplace");
let server;
try {
  const required = tarballs(["@dashhaus/bundle"]);
  const packaged = await report.stage("packages", async () => {
    if (required.missing.length) throw new Error(`missing ${required.missing.join(", ")}; run npm run release:pack first`);
    return "bundle is packed";
  });

  await report.stage("hacs.json", async () => {
    const hacs = JSON.parse(await readFile(join(repoRoot, "hacs.json"), "utf8"));
    assert.equal(typeof hacs.name, "string", "hacs.json must name the plugin");
    assert.equal(hacs.filename, undefined, `hacs.json needs no filename while the asset is ${REPOSITORY}.js`);
    // The default branch holds no built file (dist/ is ignored), so offering it could only fail.
    assert.equal(hacs.hide_default_branch, true, "hacs.json must hide the default branch, which has no dashhaus.js");
    const release = await readFile(join(repoRoot, ".github/workflows/release.yml"), "utf8");
    assert.match(release, new RegExp(`gh release upload "\\$TAG" dist/${REPOSITORY}\\.js`), "the release workflow must attach dist/dashhaus.js");
    return `"${hacs.name}", asset ${REPOSITORY}.js attached by the release workflow`;
  });

  const installed = packaged.ok
    ? await report.stage("install like the Marketplace", async () => {
        await install(app, { name: "dashhaus-dx-marketplace", private: true, type: "module", dependencies: { "@dashhaus/bundle": `file:${required.found["@dashhaus/bundle"]}` } });
        const asset = fileURLToPath((await importFromApp(app, "@dashhaus/bundle")).bundlePath);
        assert.equal(basename(asset), `${REPOSITORY}.js`, "the bundle's file must be the asset the Marketplace looks for");
        const { version } = installedPackage(app, "@dashhaus/bundle").manifest;
        const www = join(app, "www");
        await mkdir(join(www, "community", REPOSITORY), { recursive: true });
        await copyFile(asset, join(www, "community", REPOSITORY, `${REPOSITORY}.js`));
        server = await startFakeHomeAssistant({ port: 0, www });
        const { ha } = server;
        // HACS's resource: /hacsfiles/<repository>/<file>?hacstag=<repository id><version digits> (plugin.py).
        const hacstag = `123456789${version.replace(/\D+/g, "")}`;
        await ha.send("lovelace/resources/create", { res_type: "module", url: `/hacsfiles/${REPOSITORY}/${REPOSITORY}.js?hacstag=${hacstag}` });
        const source = await read(asset);
        assert.match(source, /ll-strategy-dashboard-/, "the bundle must define the dashboard strategy");
        return `www/community/${REPOSITORY}/${REPOSITORY}.js, resource /hacsfiles/${REPOSITORY}/${REPOSITORY}.js?hacstag=${hacstag}`;
      })
    : { ok: false };

  const STRATEGY_STAGES = ["Add dashboard lists Dashhaus", "pick Dashhaus", "its views draw"];
  if (!installed.ok) {
    report.blocked(STRATEGY_STAGES, "the bundle did not install");
  } else {
    const { HA_URL } = server.settings;
    const { ha } = server;

    const listed = await report.stage("Add dashboard lists Dashhaus", async () => {
      const entries = await inPage(`${HA_URL}/config/lovelace/dashboards`, async (page) => {
        await page.getByRole("button", { name: "Dashhaus", exact: true }).waitFor({ timeout: 10000 });
        return page.evaluate(() => window.customStrategies);
      });
      const ours = entries.filter((entry) => entry.type === "dashhaus");
      assert.equal(ours.length, 1, "the bundle must list one dashhaus entry");
      assert.equal(ours[0].strategyType, "dashboard");
      return `Community dashboards: "${ours[0].name}", ${ours[0].description}`;
    });

    const picked = listed.ok
      ? await report.stage("pick Dashhaus", async () => {
          const before = ha.calls.length;
          await inPage(`${HA_URL}/config/lovelace/dashboards`, async (page) => {
            await page.getByRole("button", { name: "Dashhaus", exact: true }).click();
            await page.getByRole("link", { name: "Open Dashhaus" }).waitFor({ timeout: 10000 });
          });
          const made = ha.dashboards.find((dashboard) => dashboard.url_path === STRATEGY_PATH);
          assert.ok(made, `Add dashboard must make /${STRATEGY_PATH}`);
          assert.equal(made.title, "Dashhaus", "the strategy suggests the title");
          assert.equal(made.icon, "mdi:home-variant", "the strategy suggests the icon");
          // The dialog saves the bare strategy: nothing else is stored, so the dashboard follows Dashhaus as it updates.
          assert.deepEqual(ha.saved.find((entry) => entry.url_path === STRATEGY_PATH)?.config, { strategy: { type: "custom:dashhaus" } });
          assert.deepEqual(ha.calls.slice(before).map((call) => call.type), ["lovelace/dashboards/create", "lovelace/config/save"], "picking it sends the dialog's two commands and nothing else");
          return `/${STRATEGY_PATH}, saved as { strategy: { type: custom:dashhaus } }`;
        })
      : { ok: false };

    if (!picked.ok) {
      report.blocked(["its views draw"], "Add dashboard did not make the dashboard");
    } else {
      await report.stage("its views draw", async () => {
        for (const view of VIEWS) {
          const url = `${HA_URL}/${STRATEGY_PATH}/${view.path}`;
          const drawn = await inPage(url, async (page) => {
            await page.locator(view.tag).waitFor({ state: "attached", timeout: 10000 });
            return page.evaluate(() => ({ views: window.__fakeHaViews, view: window.__fakeHaView }));
          });
          assert.deepEqual(drawn.views, VIEWS.map(({ title, path }) => ({ title, path })), "one view per look, Orb then Field");
          assert.deepEqual(drawn.view, { title: view.title, path: view.path, type: "panel", cards: [{ type: `custom:${view.tag}`, title: "Home" }] });
          if (screenshotDir) console.log(`  screenshot: ${await screenshotDashboard(url, join(screenshotDir, `marketplace-strategy-${view.path}.png`))}`);
        }
        return `${VIEWS.map((view) => `/${STRATEGY_PATH}/${view.path}`).join(" and ")} expand to panels and draw their cards`;
      });
    }
  }
} finally {
  await server?.close();
  await clean(app);
}
report.finish();
