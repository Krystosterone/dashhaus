#!/usr/bin/env node
/**
 * The user's no-terminal journey, the Home Assistant Marketplace (HACS before 2026.11), from the packed bundle only:
 *
 *   npm run release:pack
 *   node verify/dx/marketplace.js [--tarballs <dir>] [--keep] [--screenshot <dir>]
 *
 * Check `hacs.json` names the release asset the Marketplace will look for; install the bundle's `dashhaus.js` as the
 * Marketplace does (`www/community/dashhaus/`, a module resource with `?v=<version>`) into
 * `@dashhaus/fake-home-assistant`; add `custom:dashhaus-setup` to a dashboard, as the person does once; then, in
 * Chromium, check a non-admin is refused before anything is sent, press Create as an admin, open both dashboards it
 * made, and press again to check nothing is created twice. No Node, token or SSH on the person's side.
 */
/* global document -- the waitForFunction callbacks run in the page. */
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

const report = createReport("DX marketplace — install the release asset as the Marketplace does, then press Create");
console.log(`  tarballs: ${shown(tarballsDir)}`);

/** The repository the Marketplace installs from; with no `filename` in hacs.json, the asset is named after it. */
const REPOSITORY = "dashhaus";
/** Where the person puts the setup card; in Home Assistant, usually Overview. */
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
        await ha.send("lovelace/resources/create", { res_type: "module", url: `/local/community/${REPOSITORY}/${REPOSITORY}.js?v=${version}` });
        assert.match(await read(asset), /dashhaus-setup/, "the bundle must define custom:dashhaus-setup");
        // The one thing the person does by hand: add the setup card to a dashboard.
        await ha.send("lovelace/dashboards/create", { url_path: SETUP_PATH, title: "Overview", icon: "mdi:home", mode: "storage" });
        await ha.send("lovelace/config/save", { url_path: SETUP_PATH, config: { views: [{ title: "Home", path: "home", type: "panel", cards: [{ type: "custom:dashhaus-setup" }] }] } });
        return `www/community/${REPOSITORY}/${REPOSITORY}.js, resource ?v=${version}, setup card on /${SETUP_PATH}`;
      })
    : { ok: false };

  if (!installed.ok) {
    report.blocked(["not an admin", "create", "the dashboards draw", "press again"], "the bundle did not install");
  } else {
    const { HA_URL } = server.settings;
    const { ha } = server;
    const creates = () => ha.calls.filter((call) => call.type === "lovelace/dashboards/create" && MADE.includes(call.payload.url_path)).length;

    await report.stage("not an admin", async () => {
      const said = await inPage(`${HA_URL}/${SETUP_PATH}?admin=false`, async (page) => {
        const alert = page.getByRole("alert");
        await alert.waitFor({ state: "visible", timeout: 10000 });
        return alert.innerText();
      });
      assert.match(said, /Only an administrator/);
      assert.equal(ha.calls.filter((call) => call.type.startsWith("lovelace/dashboards/") && call.payload?.url_path !== SETUP_PATH).length, 0, "a non-admin's page must send nothing");
      return `"${said.split(".")[0]}.", nothing sent`;
    });

    const created = await report.stage("create", async () => {
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
      report.blocked(["the dashboards draw", "press again"], "Create did not make the dashboards");
    } else {
      await report.stage("the dashboards draw", async () => {
        for (const path of MADE) {
          if (screenshotDir) console.log(`  screenshot: ${await screenshotDashboard(`${HA_URL}/${path}`, join(screenshotDir, `marketplace-${path}.png`))}`);
          else await inPage(`${HA_URL}/${path}`, async () => undefined);
        }
        return `${MADE.map((path) => `/${path}`).join(" and ")} draw their cards`;
      });

      await report.stage("press again", async () => {
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
