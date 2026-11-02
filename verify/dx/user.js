#!/usr/bin/env node
/**
 * The skin user's clean-room journey, from packed tarballs only, the way the packages' READMEs walk it:
 *
 *   npm run release:pack
 *   node verify/dx/user.js [--tarballs <dir>] [--keep] [--screenshot <dir>]
 *
 * Install `@dashhaus/bundle` and `@dashhaus/deploy`; ask `dashhaus-deploy --help` in the empty folder for a config;
 * write the bundle README's `dashboard.config.mjs` and a `.env`; run `npx dashhaus-deploy --skip-build` (the packed bin)
 * over a real websocket into `fake-ha-server.js`, which also serves `/local/` so the served-file check runs for real;
 * then deploy again and check nothing was recreated. No clone, no build, no React, core or dashboard in the app.
 */
import assert from "node:assert/strict";
import { existsSync, realpathSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { startFakeHomeAssistant } from "./fake-ha-server.js";
import {
  clean,
  createReport,
  importFromApp,
  install,
  installedPackage,
  makeApp,
  read,
  resolveFromApp,
  run,
  runAsync,
  screenshotDashboard,
  screenshotDir,
  shown,
  tarballs,
  tarballsDir,
} from "./harness.js";

const report = createReport("DX user — install bundle and deploy, no build");
console.log(`  tarballs: ${shown(tarballsDir)}`);

const app = await makeApp("user");
let server;
try {
  const required = tarballs(["@dashhaus/bundle", "@dashhaus/deploy"]);
  const packaged = await report.stage("packages", async () => {
    if (required.missing.length) throw new Error(`missing ${required.missing.join(", ")}; run npm run release:pack first`);
    return "bundle and deploy are packed";
  });

  const installed = packaged.ok
    ? await report.stage("install", async () => {
        await install(app, {
          name: "dashhaus-dx-user",
          private: true,
          type: "module",
          dependencies: {
            "@dashhaus/bundle": `file:${required.found["@dashhaus/bundle"]}`,
            "@dashhaus/deploy": `file:${required.found["@dashhaus/deploy"]}`,
          },
        });
        const bundle = installedPackage(app, "@dashhaus/bundle").manifest;
        const deploy = installedPackage(app, "@dashhaus/deploy").manifest;
        const resolvable = (specifier) => {
          try {
            resolveFromApp(app, specifier);
            return true;
          } catch {
            return false;
          }
        };
        for (const name of ["react", "@dashhaus/core", "@dashhaus/dashboard"]) {
          assert.equal(resolvable(name), false, `${name} must not be installed in the deploy-only app`);
        }
        assert.equal(existsSync(join(app, "node_modules/react")), false, "React must not be installed");
        return `${bundle.name}@${bundle.version}, ${deploy.name}@${deploy.version}; no React, core or dashboard`;
      })
    : { ok: false };

  if (!installed.ok) {
    report.blocked(["help", "bundle path", "deploy", "redeploy"], "the bundle package did not install");
  } else {
    const bin = join(app, "node_modules", ".bin", "dashhaus-deploy");

    await report.stage("help", async () => {
      const help = run(bin, ["--help"], { cwd: app });
      assert.match(help.output, /not found/, "--help must say there is no config yet");
      assert.match(help.output, /import \{ bundlePath \} from "@dashhaus\/bundle"/, "--help must print a config to start from");
      assert.match(help.output, /HA_URL=[\s\S]*HA_TOKEN=[\s\S]*HA_WWW=/, "--help must print the .env keys");
      assert.doesNotMatch(help.output, /spec\/|\.env\.example|github\.com/, "--help must not point outside the package");
      const bare = run(bin, [], { cwd: app, allowFailure: true });
      assert.notEqual(bare.status, 0);
      assert.match(bare.output, /No config at .*dashboard\.config\.mjs/, "a run with no config must say so");
      return "--help in an empty folder prints a config and the .env keys";
    });

    const bundlePath = await report.stage("bundle path", async () => {
      const module = await importFromApp(app, "@dashhaus/bundle");
      const file = fileURLToPath(module.bundlePath);
      // A macOS temp directory is reached through /var, while a module URL is realpathed to /private/var.
      const inside = relative(realpathSync(app), file);
      assert.ok(!inside.startsWith(".."), `bundlePath points outside the app: ${file}`);
      const bundle = await read(file);
      assert.match(bundle, /dashhaus-orb/, "the bundle must register custom:dashhaus-orb");
      assert.match(bundle, /dashhaus-field/, "the bundle must register custom:dashhaus-field");
      return `${inside} (${Math.round(bundle.length / 1024)} kB, both cards)`;
    });

    if (!bundlePath.ok) {
      report.blocked(["deploy", "redeploy"], "the bundle stage failed");
    } else {
      const deployed = await report.stage("deploy", async () => {
        // The config is the one the bundle's README prints, so the README cannot drift from what works.
        const readme = await read(join(installedPackage(app, "@dashhaus/bundle").directory, "README.md"));
        const config = readme.match(/```js\n([\s\S]*?)```/)?.[1];
        assert.ok(config, "@dashhaus/bundle's README has no js config block");
        await writeFile(join(app, "dashboard.config.mjs"), config);
        const www = join(app, "www");
        await mkdir(www, { recursive: true });
        server = await startFakeHomeAssistant({ port: 0, www });
        const { HA_URL, HA_TOKEN, HA_WWW } = server.settings;
        await writeFile(join(app, ".env"), `HA_URL=${HA_URL}\nHA_TOKEN=${HA_TOKEN}\nHA_WWW=${HA_WWW}\n`);

        const result = await runAsync(bin, ["--skip-build"], { cwd: app });
        assert.doesNotMatch(result.output, /^\s*!/m, `the deploy warned:\n${result.output}`);
        assert.match(result.output, /✓ .*\/local\/dashhaus\/dashhaus\.js\?v=[0-9a-f]{10} \(\d+ kB, the uploaded file\)/);
        assert.doesNotMatch(result.output, /spec\//, "the deploy's output must not point at a repository file");
        const ha = server.ha;
        assert.equal(ha.resources.length, 1);
        assert.match(ha.resources[0].url, /^\/local\/dashhaus\/dashhaus\.js\?v=[0-9a-f]{10}$/);
        assert.deepEqual(ha.dashboards.map((dashboard) => dashboard.url_path), ["home-orb", "home-field"]);
        assert.deepEqual(ha.dashboards.map((dashboard) => dashboard.title), ["Home (Orb)", "Home (Field)"]);
        const orb = ha.saved.find((entry) => entry.url_path === "home-orb");
        const field = ha.saved.find((entry) => entry.url_path === "home-field");
        assert.ok(orb && field, "both dashboards must get a saved layout");
        assert.deepEqual(orb.config.views[0].cards[0], { type: "custom:dashhaus-orb" });
        assert.deepEqual(field.config.views[0].cards[0], { type: "custom:dashhaus-field" });
        const source = fileURLToPath((await importFromApp(app, "@dashhaus/bundle")).bundlePath);
        assert.equal(await read(join(www, "dashhaus/dashhaus.js")), await read(source));
        if (screenshotDir) {
          for (const path of ["home-orb", "home-field"]) {
            console.log(`  screenshot: ${await screenshotDashboard(`${HA_URL}/${path}`, join(screenshotDir, `user-${path}.png`))}`);
          }
        }
        return `npx dashhaus-deploy --skip-build: 1 resource served back, 2 dashboards (${HA_URL})`;
      });

      if (!deployed.ok) {
        report.blocked("redeploy", "the first deploy failed");
      } else {
        await report.stage("redeploy", async () => {
          const result = await runAsync(bin, ["--skip-build"], { cwd: app });
          assert.match(result.output, /its layout is yours and was left alone/);
          const creates = server.ha.calls.filter((call) => call.type === "lovelace/dashboards/create").length;
          assert.equal(creates, 2, "a second deploy must not create the dashboards again");
          assert.equal(server.ha.resources.length, 1, "a second deploy must update the resource, not add one");
          return "layouts kept, resource updated in place";
        });
      }
    }
  }
} finally {
  await server?.close();
  await clean(app);
}
report.finish();
