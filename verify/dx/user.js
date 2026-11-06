#!/usr/bin/env node
/**
 * The command-line user's clean-room journey, from packed tarballs only, the way the skins' READMEs walk it:
 *
 *   npm run release:pack
 *   node verify/dx/user.js [--tarballs <dir>] [--keep] [--screenshot <dir>]
 *
 * Install `@dashhaus/orb`, `@dashhaus/field` and `@dashhaus/deploy`; ask `dashhaus-deploy --help` in the empty folder
 * for a config; then, for each skin, write its README's `dashboard.config.mjs` (the skin's own dashboard on its
 * strategy, and a dashboard of the person's own: the skin's card with their rows) and run the packed bin with
 * `--skip-build` over a real websocket into `@dashhaus/fake-home-assistant`, which also serves `/local/`, so the
 * served-file check runs for real. Then draw all four dashboards in Chromium, expanded as the frontend expands a
 * strategy, and deploy again to check nothing was recreated. No clone and no build: the file uploaded is the one the
 * skin's package ships.
 */
/* global window -- the evaluate callbacks run in the page. */
import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
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
  run,
  runAsync,
  screenshotDashboard,
  screenshotDir,
  shown,
  tarballs,
  tarballsDir,
} from "./harness.js";

const report = createReport("DX user — deploy a skin's dashboard and one of your own from the command line, no build");
console.log(`  tarballs: ${shown(tarballsDir)}`);

/** Each skin as its README deploys it: its file, its strategy's dashboard, and a dashboard of the person's own. */
const SKINS = [
  { skin: "orb", name: "Orb", file: "orb-dashboard.js", folder: "orb-dashboard", card: "dashhaus-orb", strategy: "custom:orb-dashboard" },
  { skin: "field", name: "Field", file: "field-dashboard.js", folder: "field-dashboard", card: "dashhaus-field", strategy: "custom:field-dashboard" },
];

const app = await makeApp("user");
let server;
try {
  const required = tarballs(["@dashhaus/core", "@dashhaus/orb", "@dashhaus/field", "@dashhaus/deploy"]);
  const packaged = await report.stage("packages", async () => {
    if (required.missing.length) throw new Error(`missing ${required.missing.join(", ")}; run npm run release:pack first`);
    return "core, orb, field and deploy are packed";
  });

  const installed = packaged.ok
    ? await report.stage("install", async () => {
        await install(app, {
          name: "dashhaus-dx-user",
          private: true,
          type: "module",
          // Core is listed only so npm takes the packed one the skins depend on, not the registry's.
          dependencies: Object.fromEntries(Object.entries(required.found).map(([name, file]) => [name, `file:${file}`])),
        });
        return ["@dashhaus/orb", "@dashhaus/field", "@dashhaus/deploy"].map((name) => `${name}@${installedPackage(app, name).manifest.version}`).join(", ");
      })
    : { ok: false };

  const DEPLOY_STAGES = SKINS.flatMap(({ name }) => [`deploy ${name}`, `${name}'s dashboards draw`]).concat("redeploy");
  if (!installed.ok) {
    report.blocked(["help", ...DEPLOY_STAGES], "the packages did not install");
  } else {
    const bin = join(app, "node_modules", ".bin", "dashhaus-deploy");

    await report.stage("help", async () => {
      const help = run(bin, ["--help"], { cwd: app });
      assert.match(help.output, /not found/, "--help must say there is no config yet");
      assert.match(help.output, /from "@dashhaus\/orb\/resource"/, "--help must print a config to start from, on a skin's resource");
      assert.match(help.output, /HA_URL=[\s\S]*HA_TOKEN=[\s\S]*HA_WWW=/, "--help must print the .env keys");
      assert.doesNotMatch(help.output, /spec\/|\.env\.example|github\.com/, "--help must not point outside the package");
      const bare = run(bin, [], { cwd: app, allowFailure: true });
      assert.notEqual(bare.status, 0);
      assert.match(bare.output, /No config at .*dashboard\.config\.mjs/, "a run with no config must say so");
      return "--help in an empty folder prints a config and the .env keys";
    });

    const www = join(app, "www");
    await mkdir(www, { recursive: true });
    server = await startFakeHomeAssistant({ port: 0, www });
    const { HA_URL, HA_TOKEN, HA_WWW } = server.settings;
    await writeFile(join(app, ".env"), `HA_URL=${HA_URL}\nHA_TOKEN=${HA_TOKEN}\nHA_WWW=${HA_WWW}\n`);
    const { ha } = server;
    const deployed = [];

    for (const entry of SKINS) {
      const own = `my-home-${entry.skin}`;
      const done = await report.stage(`deploy ${entry.name}`, async () => {
        const { resourceFile } = await importFromApp(app, `@dashhaus/${entry.skin}/resource`);
        // A macOS temp directory is reached through /var, while a module URL is realpathed to /private/var.
        const inside = relative(realpathSync(app), resourceFile);
        assert.ok(!inside.startsWith(".."), `resourceFile points outside the app: ${resourceFile}`);
        assert.ok(inside.endsWith(`@dashhaus/${entry.skin}/dist/${entry.file}`), `resourceFile is the package's own ${entry.file}: ${inside}`);

        // The config is the one the skin's README prints, so the README cannot drift from what works.
        const readme = await read(join(installedPackage(app, `@dashhaus/${entry.skin}`).directory, "README.md"));
        const config = readme.match(/```js\n([\s\S]*?)```/)?.[1];
        assert.ok(config, `@dashhaus/${entry.skin}'s README has no js config block`);
        const configFile = `${entry.skin}.config.mjs`;
        await writeFile(join(app, configFile), config);

        const result = await runAsync(bin, ["--config", configFile, "--skip-build"], { cwd: app });
        assert.doesNotMatch(result.output, /^\s*!/m, `the deploy warned:\n${result.output}`);
        const resource = new RegExp(`✓ .*/local/${entry.folder}/${entry.file.replace(".", "\\.")}\\?v=[0-9a-f]{10} \\(\\d+ kB, the uploaded file\\)`);
        assert.match(result.output, resource, `the deploy must check Home Assistant serves ${entry.file}`);
        assert.doesNotMatch(result.output, /spec\//, "the deploy's output must not point at a repository file");
        assert.ok(ha.resources.some((item) => new RegExp(`^/local/${entry.folder}/${entry.file}\\?v=[0-9a-f]{10}$`).test(item.url)), `${entry.file} must be registered`);
        assert.equal(await read(join(www, entry.folder, entry.file)), await read(resourceFile), "the uploaded file is the package's, byte for byte");

        const home = ha.saved.find((item) => item.url_path === `home-${entry.skin}`);
        const mine = ha.saved.find((item) => item.url_path === own);
        assert.ok(home && mine, "both dashboards must get a saved config");
        // The skin's own dashboard keeps only the strategy, so it follows the skin as it updates.
        assert.deepEqual(home.config, { strategy: { type: entry.strategy } });
        // The person's own: the skin's card with their rows, in one panel view.
        const card = mine.config.views[0].cards[0];
        assert.equal(mine.config.views[0].type, "panel");
        assert.equal(card.type, `custom:${entry.card}`);
        assert.ok(Array.isArray(card.rows) && card.rows.length > 0, "the dashboard of your own keeps its rows");
        deployed.push({ ...entry, own, card });
        return `--config ${configFile} --skip-build: ${entry.file} served back; /home-${entry.skin} on ${entry.strategy}, /${own} with ${card.rows.length} rows`;
      });

      if (!done.ok) {
        report.blocked(`${entry.name}'s dashboards draw`, `the ${entry.name} deploy failed`);
        continue;
      }
      await report.stage(`${entry.name}'s dashboards draw`, async () => {
        const { card } = deployed.at(-1);
        for (const [path, view] of [
          [`home-${entry.skin}`, { title: entry.name, path: "home", type: "panel", cards: [{ type: `custom:${entry.card}`, title: "Home" }] }],
          [own, { title: "Home", path: "home", type: "panel", cards: [card] }],
        ]) {
          const shownView = await inPage(`${HA_URL}/${path}`, async (page) => {
            await page.locator(entry.card).waitFor({ state: "attached", timeout: 10000 });
            return page.evaluate(() => window.__fakeHaView);
          });
          assert.deepEqual(shownView, view, `/${path} must draw ${entry.name}'s card`);
          if (screenshotDir) console.log(`  screenshot: ${await screenshotDashboard(`${HA_URL}/${path}`, join(screenshotDir, `user-${path}.png`))}`);
        }
        return `/home-${entry.skin} expands its strategy to ${entry.name}'s automatic page; /${own} draws your rows`;
      });
    }

    if (deployed.length !== SKINS.length) {
      report.blocked("redeploy", "a first deploy failed");
    } else {
      await report.stage("redeploy", async () => {
        const creates = () => ha.calls.filter((call) => call.type === "lovelace/dashboards/create").length;
        const before = { creates: creates(), resources: ha.resources.length };
        for (const { skin } of SKINS) {
          const result = await runAsync(bin, ["--config", `${skin}.config.mjs`, "--skip-build"], { cwd: app });
          assert.match(result.output, /its layout is yours and was left alone/);
        }
        assert.equal(creates(), before.creates, "a second deploy must not create the dashboards again");
        assert.equal(ha.resources.length, before.resources, "a second deploy must update each resource, not add one");
        return `4 dashboards kept, ${ha.resources.length} resources updated in place`;
      });
    }
  }
} finally {
  await server?.close();
  await clean(app);
}
report.finish();
