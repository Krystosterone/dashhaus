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
 *
 * The deprecated setup card still ships, so it is still checked after: added to a dashboard, a non-admin refused
 * before anything is sent, Create as an admin, both dashboards it made open, and a second press creates nothing.
 */
/* global document, window -- the waitForFunction and evaluate callbacks run in the page. */
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
/** Where the person puts the deprecated setup card; in Home Assistant, usually Overview. */
const SETUP_PATH = "home-setup";
const MADE = ["dashhaus-orb", "dashhaus-field"];

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
        assert.match(source, /dashhaus-setup/, "the bundle must still define the deprecated custom:dashhaus-setup");
        return `www/community/${REPOSITORY}/${REPOSITORY}.js, resource /hacsfiles/${REPOSITORY}/${REPOSITORY}.js?hacstag=${hacstag}`;
      })
    : { ok: false };

  const STRATEGY_STAGES = ["Add dashboard lists Dashhaus", "pick Dashhaus", "its views draw"];
  const SETUP_STAGES = ["setup card: not an admin", "setup card: create", "setup card: the dashboards draw", "setup card: press again"];
  if (!installed.ok) {
    report.blocked([...STRATEGY_STAGES, ...SETUP_STAGES], "the bundle did not install");
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

    // The deprecated setup card, still shipped: the one thing the person did by hand was add it to a dashboard.
    await ha.send("lovelace/dashboards/create", { url_path: SETUP_PATH, title: "Overview", icon: "mdi:home", mode: "storage" });
    await ha.send("lovelace/config/save", { url_path: SETUP_PATH, config: { views: [{ title: "Home", path: "home", type: "panel", cards: [{ type: "custom:dashhaus-setup" }] }] } });
    const creates = () => ha.calls.filter((call) => call.type === "lovelace/dashboards/create" && MADE.includes(call.payload.url_path)).length;

    await report.stage("setup card: not an admin", async () => {
      const said = await inPage(`${HA_URL}/${SETUP_PATH}?admin=false`, async (page) => {
        const alert = page.getByRole("alert");
        await alert.waitFor({ state: "visible", timeout: 10000 });
        return alert.innerText();
      });
      assert.match(said, /Only an administrator/);
      assert.equal(ha.calls.filter((call) => call.type.startsWith("lovelace/dashboards/") && ![SETUP_PATH, STRATEGY_PATH].includes(call.payload?.url_path)).length, 0, "a non-admin's page must send nothing");
      return `"${said.split(".")[0]}.", nothing sent`;
    });

    const created = await report.stage("setup card: create", async () => {
      const status = await inPage(`${HA_URL}/${SETUP_PATH}`, async (page) => {
        for (const path of MADE) {
          const box = page.locator(`input[type=checkbox][value="${path}"]`);
          await box.waitFor({ state: "visible", timeout: 10000 });
          assert.equal(await box.isChecked(), true, `${path} must start checked`);
        }
        const shot = async (name) => {
          if (!screenshotDir) return;
          await mkdir(screenshotDir, { recursive: true });
          await page.locator("dashhaus-setup").screenshot({ path: join(screenshotDir, `marketplace-setup-${name}.png`) });
        };
        await shot("before");
        await page.getByRole("button", { name: "Create dashboards" }).click();
        const line = page.getByRole("status");
        await page.waitForFunction(() => {
          const card = document.querySelector("dashhaus-setup");
          return /^Done\./.test(card?.shadowRoot?.querySelector("[role=status]")?.textContent ?? "");
        }, null, { timeout: 15000 });
        for (const title of ["Home (Orb)", "Home (Field)"]) await page.getByRole("link", { name: `Open ${title}` }).waitFor({ timeout: 5000 });
        await shot("after");
        return line.innerText();
      });
      assert.deepEqual(MADE.filter((path) => ha.dashboards.some((dashboard) => dashboard.url_path === path)), MADE);
      const orb = ha.saved.find((entry) => entry.url_path === "dashhaus-orb")?.config.views[0].cards[0];
      const field = ha.saved.find((entry) => entry.url_path === "dashhaus-field")?.config.views[0].cards[0];
      // The automatic layout, as the bundle README's deploy config saves it: the same dashboards either way in.
      assert.deepEqual(orb, { type: "custom:dashhaus-orb", title: "Home" });
      assert.deepEqual(field, { type: "custom:dashhaus-field", title: "Home" });
      return `${status.split(".")[0]}: ${MADE.join(", ")}, each on its automatic layout`;
    });

    if (!created.ok) {
      report.blocked(["setup card: the dashboards draw", "setup card: press again"], "Create did not make the dashboards");
    } else {
      await report.stage("setup card: the dashboards draw", async () => {
        for (const path of MADE) {
          if (screenshotDir) console.log(`  screenshot: ${await screenshotDashboard(`${HA_URL}/${path}`, join(screenshotDir, `marketplace-${path}.png`))}`);
          else await inPage(`${HA_URL}/${path}`, async () => undefined);
        }
        return `${MADE.map((path) => `/${path}`).join(" and ")} draw their cards`;
      });

      await report.stage("setup card: press again", async () => {
        const before = creates();
        await inPage(`${HA_URL}/${SETUP_PATH}`, async (page) => {
          for (const path of MADE) {
            const box = page.locator(`input[type=checkbox][value="${path}"]`);
            await page.waitForFunction((value) => document.querySelector("dashhaus-setup")?.shadowRoot?.querySelector(`input[value="${value}"]`)?.disabled === true, path, { timeout: 10000 });
            assert.equal(await box.isChecked(), false);
          }
          assert.equal(await page.getByRole("button", { name: "Create dashboards" }).isDisabled(), true, "with every dashboard there, Create must be disabled");
        });
        assert.equal(creates(), before, "a second visit must create nothing");
        return "both marked Already there, Create disabled, nothing sent";
      });
    }
  }
} finally {
  await server?.close();
  await clean(app);
}
report.finish();
