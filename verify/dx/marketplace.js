#!/usr/bin/env node
/**
 * The combined Marketplace install, in its last release (spec/release.md → The combined install's sunset), for the
 * people who already have it: from the release's asset only, which `release:pack` writes beside the tarballs.
 *
 *   npm run release:pack
 *   node verify/dx/marketplace.js [--tarballs <dir>] [--keep] [--screenshot <dir>]
 *
 * Check `hacs.json` names the release asset the Marketplace will look for; install `dashhaus.js` as the
 * Marketplace does (`www/community/dashhaus/`, served and registered as `/hacsfiles/dashhaus/dashhaus.js?hacstag=…`) into
 * `@dashhaus/fake-home-assistant`; then, in Chromium, do what the person does: open Add dashboard, pick **Dashhaus**
 * under Community dashboards (its `window.customStrategies` entry, which says Orb and Field now install on their own),
 * and open the dashboard it made, whose `custom:dashhaus` strategy the page expands as the frontend does into one view
 * per look, each drawing the notice above its skin's card. No Node, token or SSH on the person's side.
 */
/* global window -- the evaluate callbacks run in the page. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { startFakeHomeAssistant } from "@dashhaus/fake-home-assistant";
import {
  clean,
  createReport,
  inPage,
  makeApp,
  read,
  repoRoot,
  screenshotDashboard,
  screenshotDir,
  shown,
  tarballManifest,
  tarballs,
  tarballsDir,
} from "./harness.js";

const report = createReport("DX marketplace — the combined install's last release: its asset as the Marketplace installs it, then Add dashboard → Dashhaus");
console.log(`  tarballs: ${shown(tarballsDir)}`);

/** The repository the Marketplace installs from; with no `filename` in hacs.json, the asset is named after it. */
const REPOSITORY = "dashhaus";
/** The dashboard Add dashboard makes from the strategy's suggested title, `Dashhaus`, and the views it expands to. */
const STRATEGY_PATH = "dashboard-dashhaus";
const VIEWS = [{ title: "Orb", path: "orb", tag: "dashhaus-orb" }, { title: "Field", path: "field", tag: "dashhaus-field" }];

const app = await makeApp("marketplace");
let server;
try {
  const asset = join(tarballsDir, `${REPOSITORY}.js`);
  const required = tarballs(["@dashhaus/core"]);
  const packaged = await report.stage("packages", async () => {
    if (!existsSync(asset)) throw new Error(`missing ${REPOSITORY}.js beside the tarballs; run npm run release:pack first`);
    if (required.missing.length) throw new Error(`missing ${required.missing.join(", ")}, whose version the release has; run npm run release:pack first`);
    return `${REPOSITORY}.js is packed`;
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
        const { version } = tarballManifest(required.found["@dashhaus/core"]);
        const www = join(app, "www");
        await mkdir(join(www, "community", REPOSITORY), { recursive: true });
        await copyFile(asset, join(www, "community", REPOSITORY, `${REPOSITORY}.js`));
        server = await startFakeHomeAssistant({ port: 0, www });
        const { ha } = server;
        // HACS's resource: /hacsfiles/<repository>/<file>?hacstag=<repository id><version digits> (plugin.py).
        const hacstag = `123456789${version.replace(/\D+/g, "")}`;
        await ha.send("lovelace/resources/create", { res_type: "module", url: `/hacsfiles/${REPOSITORY}/${REPOSITORY}.js?hacstag=${hacstag}` });
        const source = await read(asset);
        assert.match(source, /ll-strategy-dashboard-/, `${REPOSITORY}.js must define the dashboard strategy`);
        return `www/community/${REPOSITORY}/${REPOSITORY}.js, resource /hacsfiles/${REPOSITORY}/${REPOSITORY}.js?hacstag=${hacstag}`;
      })
    : { ok: false };

  const STRATEGY_STAGES = ["Add dashboard lists Dashhaus", "pick Dashhaus", "its views draw"];
  if (!installed.ok) {
    report.blocked(STRATEGY_STAGES, `${REPOSITORY}.js did not install`);
  } else {
    const { HA_URL } = server.settings;
    const { ha } = server;

    const listed = await report.stage("Add dashboard lists Dashhaus", async () => {
      const entries = await inPage(`${HA_URL}/config/lovelace/dashboards`, async (page) => {
        await page.getByRole("button", { name: "Dashhaus", exact: true }).waitFor({ timeout: 10000 });
        return page.evaluate(() => window.customStrategies);
      });
      const ours = entries.filter((entry) => entry.type === "dashhaus");
      assert.equal(ours.length, 1, "the combined install must list one dashhaus entry");
      assert.equal(ours[0].strategyType, "dashboard");
      assert.match(ours[0].description, /^Orb and Field now install on their own/, "the dialog's entry must say Orb and Field install on their own");
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
            return page.evaluate(() => ({ views: window.__fakeHaViews, view: window.__fakeHaView, notes: window.__fakeHaMarkdown }));
          });
          assert.deepEqual(drawn.views, VIEWS.map(({ title, path }) => ({ title, path })), "one view per look, Orb then Field");
          const [stack] = drawn.view.cards;
          assert.equal(drawn.view.type, "panel");
          assert.equal(stack.type, "vertical-stack", "the view stacks the notice above the look's card");
          assert.deepEqual(stack.cards[1], { type: `custom:${view.tag}`, title: "Home" });
          assert.equal(drawn.notes.length, 1, "the view draws one notice");
          assert.match(drawn.notes[0], new RegExp(`${view.title} now installs on its own[\\s\\S]*/dashhaus/${view.path}/[\\s\\S]*remove Dashhaus`), "the notice says where the look's own install starts");
          if (screenshotDir) console.log(`  screenshot: ${await screenshotDashboard(url, join(screenshotDir, `marketplace-strategy-${view.path}.png`))}`);
        }
        return `${VIEWS.map((view) => `/${STRATEGY_PATH}/${view.path}`).join(" and ")} expand to panels: the notice, then each look's card`;
      });
    }
  }
} finally {
  await server?.close();
  await clean(app);
}
report.finish();
