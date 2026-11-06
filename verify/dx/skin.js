#!/usr/bin/env node
/**
 * The user's no-terminal journey for one skin on its own, from the Marketplace (HACS before 2026.11), from what
 * `release:pack` builds:
 *
 *   npm run release:pack
 *   node verify/dx/skin.js [--skin orb|field] [--tarballs <dir>] [--keep] [--screenshot <dir>]
 *
 * Each skin installs from a repository of its own (spec/release.md → The skin repositories): `orb-dashboard` and
 * `field-dashboard`. For each, check what its repository carries (`hacs/<repository>/`: `hacs.json`, the release
 * workflow that mirrors `<repository>.js` from npm, the README); take `<repository>.js` out of the skin's packed tarball,
 * where the mirror takes it from; install it as the Marketplace does
 * (`www/community/<repository>/`, registered as `/hacsfiles/<repository>/<repository>.js?hacstag=…`) into
 * `@dashhaus/fake-home-assistant`; then, in Chromium, do what the person does: open Add dashboard, find the skin
 * under its own name, and nothing named Dashhaus, pick it, and open the dashboard it made, whose strategy expands into
 * the skin's one view, drawing its card. No Node, token or SSH on the person's side.
 *
 * The file is the one inside the skin's package, which its repository releases unchanged; the mirror's checks on npm's
 * provenance are verify/skin-repositories.test.ts's.
 */
/* global window -- the evaluate callbacks run in the page. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { startFakeHomeAssistant } from "@dashhaus/fake-home-assistant";
import { clean, createReport, inPage, makeApp, repoRoot, screenshotDashboard, screenshotDir, shown, tarball, tarballManifest, tarballsDir } from "./harness.js";

/**
 * The skins that install on their own, as a person meets them: the repository and its asset, the name Add dashboard
 * lists, the dashboard that name makes, and the Lovelace card its one view draws.
 */
const SKINS = [
  { skin: "orb", name: "Orb", repository: "orb-dashboard", tag: "dashhaus-orb", icon: "mdi:home-variant" },
  { skin: "field", name: "Field", repository: "field-dashboard", tag: "dashhaus-field", icon: "mdi:knob" },
];

const skinArg = process.argv.indexOf("--skin");
const only = skinArg === -1 ? undefined : process.argv[skinArg + 1];
const chosen = SKINS.filter((entry) => !only || entry.skin === only);
if (!chosen.length) throw new Error(`no skin "${only}"; choose ${SKINS.map((entry) => entry.skin).join(" or ")}`);

const report = createReport(`DX skin — each skin from its own repository, then Add dashboard → its name: ${chosen.map((entry) => entry.name).join(", ")}`);
console.log(`  tarballs: ${shown(tarballsDir)}`);

for (const entry of chosen) {
  const { name, repository, tag } = entry;
  const packed = tarball(`@dashhaus/${entry.skin}`);
  const version = packed ? tarballManifest(packed).version : undefined;
  const dashboardPath = `dashboard-${entry.skin}`;
  const STAGES = [`${repository}: its repository`, `${repository}: install like the Marketplace`, `Add dashboard lists ${name}`, `pick ${name}`, `${name} draws`];

  const carried = await report.stage(STAGES[0], async () => {
    const dir = join(repoRoot, "hacs", repository);
    const hacs = JSON.parse(await readFile(join(dir, "hacs.json"), "utf8"));
    assert.equal(hacs.name, name, `hacs.json names the plugin ${name}, as the person finds it`);
    assert.equal(hacs.filename, undefined, `hacs.json needs no filename while the asset is ${repository}.js`);
    assert.equal(hacs.hide_default_branch, true, `hacs.json must hide the default branch, which has no ${repository}.js`);
    const release = await readFile(join(dir, ".github/workflows/release.yml"), "utf8");
    assert.match(release, /node \.github\/mirror\.js fetch /, "the release workflow takes the file from npm, checking its provenance");
    assert.match(release, /npm audit signatures/, "the release workflow checks npm's signatures before releasing");
    assert.ok(release.includes(`"@dashhaus/${entry.skin}@$VERSION"`), `the release workflow mirrors @dashhaus/${entry.skin}`);
    assert.ok(release.includes(`"mirror/${repository}.js"`), `the release workflow releases ${repository}.js, its one asset`);
    assert.doesNotMatch(release, /npm run|build:ha/, "the release workflow builds nothing");
    const readme = await readFile(join(dir, "README.md"), "utf8");
    assert.match(readme, new RegExp(`^# ${name}$`, "m"), `the README is ${name}'s`);
    assert.ok(readme.includes(`repository=${repository}&category=plugin`), "the README's My link opens this repository");
    assert.ok(readme.includes(`pick **${name}** under Community dashboards`), `the README says to pick ${name} in Add dashboard`);
    return `"${hacs.name}", asset ${repository}.js mirrored from @dashhaus/${entry.skin} on npm`;
  });

  let server;
  let app;
  const installed = await report.stage(STAGES[1], async () => {
    if (!packed) throw new Error(`@dashhaus/${entry.skin} is not packed; run npm run release:pack first`);
    // What the mirror releases: the package's own dist/<repository>.js, unchanged.
    const file = execFileSync("tar", ["-xzOf", packed, `package/dist/${repository}.js`], { maxBuffer: 64 * 1024 * 1024 });
    app = await makeApp(`skin-${entry.skin}`);
    const www = join(app, "www");
    const asset = join(www, "community", repository, `${repository}.js`);
    await mkdir(join(www, "community", repository), { recursive: true });
    await writeFile(asset, file);
    server = await startFakeHomeAssistant({ port: 0, www });
    // HACS's resource: /hacsfiles/<repository>/<file>?hacstag=<repository id><version digits> (plugin.py).
    const hacstag = `987654321${version.replace(/\D+/g, "")}`;
    await server.ha.send("lovelace/resources/create", { res_type: "module", url: `/hacsfiles/${repository}/${repository}.js?hacstag=${hacstag}` });
    const source = await readFile(asset, "utf8");
    assert.ok(!source.includes("dashhaus-setup"), "the file carries no setup card");
    assert.ok(!source.includes('"dashhaus-' + (entry.skin === "orb" ? "field" : "orb") + '"'), "the file carries no other skin");
    return `www/community/${repository}/${repository}.js, resource /hacsfiles/${repository}/${repository}.js?hacstag=${hacstag}`;
  });

  if (!carried.ok || !installed.ok) {
    report.blocked(STAGES.slice(2), `${repository} did not install`);
    await server?.close();
    if (app) await clean(app);
    continue;
  }
  const { ha } = server;
  const { HA_URL } = server.settings;
  try {
    const listed = await report.stage(STAGES[2], async () => {
      const { strategies, cards } = await inPage(`${HA_URL}/config/lovelace/dashboards`, async (page) => {
        await page.getByRole("button", { name, exact: true }).waitFor({ timeout: 10000 });
        return page.evaluate(() => ({ strategies: window.customStrategies, cards: window.customCards }));
      });
      // The skin is presented as itself: one entry under its own name, and nothing named Dashhaus.
      assert.deepEqual(strategies.map((item) => [item.type, item.strategyType, item.name]), [[repository, "dashboard", name]], `Add dashboard lists ${name} alone`);
      assert.ok(!JSON.stringify(strategies).includes("Dashhaus"), "no entry names Dashhaus");
      // Its documentation link is the skin's own page, whose foot is the way to what it is drawn on.
      assert.equal(strategies[0].documentationURL, `https://krystosterone.github.io/dashhaus/${entry.skin}/`);
      assert.deepEqual(cards.map((card) => [card.type, card.name]), [[tag, name]], `the card picker lists its card as ${name}`);
      return `Community dashboards: "${strategies[0].name}", ${strategies[0].description}`;
    });

    const picked = listed.ok
      ? await report.stage(STAGES[3], async () => {
          const before = ha.calls.length;
          await inPage(`${HA_URL}/config/lovelace/dashboards`, async (page) => {
            await page.getByRole("button", { name, exact: true }).click();
            await page.getByRole("link", { name: `Open ${name}` }).waitFor({ timeout: 10000 });
          });
          const made = ha.dashboards.find((dashboard) => dashboard.url_path === dashboardPath);
          assert.ok(made, `Add dashboard must make /${dashboardPath}`);
          assert.equal(made.title, name, "the strategy suggests the skin's name as the title");
          assert.equal(made.icon, entry.icon, "the strategy suggests the skin's icon");
          assert.deepEqual(ha.saved.find((saved) => saved.url_path === dashboardPath)?.config, { strategy: { type: `custom:${repository}` } });
          assert.deepEqual(ha.calls.slice(before).map((call) => call.type), ["lovelace/dashboards/create", "lovelace/config/save"], "picking it sends the dialog's two commands and nothing else");
          return `/${dashboardPath}, saved as { strategy: { type: custom:${repository} } }`;
        })
      : { ok: false };

    if (!picked.ok) {
      report.blocked([STAGES[4]], "Add dashboard did not make the dashboard");
    } else {
      await report.stage(STAGES[4], async () => {
        const url = `${HA_URL}/${dashboardPath}`;
        const drawn = await inPage(url, async (page) => {
          await page.locator(tag).waitFor({ state: "attached", timeout: 10000 });
          return page.evaluate(() => ({ views: window.__fakeHaViews, view: window.__fakeHaView }));
        });
        assert.deepEqual(drawn.views, [{ title: name, path: "home" }], `one view, ${name}`);
        assert.deepEqual(drawn.view, { title: name, path: "home", type: "panel", cards: [{ type: `custom:${tag}`, title: "Home" }] });
        if (screenshotDir) {
          console.log(`  screenshot: ${await screenshotDashboard(url, join(screenshotDir, `skin-${entry.skin}-desktop.png`))}`);
          console.log(`  screenshot: ${await screenshotDashboard(url, join(screenshotDir, `skin-${entry.skin}-phone.png`), { width: 390, height: 844 })}`);
        }
        return `/${dashboardPath} expands to a panel and draws custom:${tag}`;
      });
    }
  } finally {
    await server.close();
    await clean(app);
  }
}
report.finish();
