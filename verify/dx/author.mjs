#!/usr/bin/env node
/**
 * The skin author's clean-room journey, from packed tarballs only:
 *
 *   npm run release:pack
 *   node verify/dx/author.mjs [--tarballs <dir>] [--keep]
 *
 * Install core, dashboard, deploy, the scaffolder and React; run `create-dashhaus-skin my-skin`; run the skin's
 * conformance test; build one bundle; deploy it through `deploy({ connect: fakeHa })`.
 *
 * The scaffold's `node_modules` is a link to the app's installed tree. A real author runs `npm install` in the new
 * folder; in a tarball-only clean room the app has already installed those packages, so the link stands in for that
 * install without reaching this repository or the registry.
 *
 * Deviation from the plan's install line: `home-assistant-js-websocket` is installed as well. The element base reaches
 * `@dashhaus/core/websocket`, whose runtime import of the websocket client makes it an optional peer of core, so a
 * browser bundle cannot be built without it. The scaffold's own package.json carries that peer.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readdir, symlink } from "node:fs/promises";
import { join, relative } from "node:path";
import { FakeHomeAssistant, connectTo } from "./fake-ha.mjs";
import {
  Gap,
  clean,
  createReport,
  importFromApp,
  install,
  installedPackage,
  makeApp,
  read,
  resolveFromApp,
  run,
  shown,
  tarballs,
  tarballsDir,
  toolVersion,
} from "./harness.mjs";

const PHASE_SKIN = "Phase 1 — add and freeze @dashhaus/dashboard/skin";
const PHASE_SCAFFOLD = "Phase 3 — create create-dashhaus-skin and include it in release:pack";
const SKIN = "my-skin";

const report = createReport("DX author — install, scaffold, test, build, deploy");
console.log(`  tarballs: ${shown(tarballsDir)}`);

const app = await makeApp("author");
try {
  const required = tarballs(["@dashhaus/core", "@dashhaus/dashboard", "@dashhaus/deploy", "create-dashhaus-skin"]);
  const setup = await report.stage("tarballs", async () => {
    if (required.missing.includes("create-dashhaus-skin")) {
      throw new Gap("release/ has no create-dashhaus-skin tarball; the author journey cannot scaffold", PHASE_SCAFFOLD);
    }
    if (required.missing.length) {
      throw new Error(`missing ${required.missing.join(", ")}; run npm run release:pack first`);
    }
    return "core, dashboard, deploy and the scaffolder are packed";
  });

  const installed = setup.ok
    ? await report.stage("install", async () => {
        await install(app, {
          name: "dashhaus-dx-author",
          private: true,
          type: "module",
          dependencies: {
            "@dashhaus/core": `file:${required.found["@dashhaus/core"]}`,
            "@dashhaus/dashboard": `file:${required.found["@dashhaus/dashboard"]}`,
            "@dashhaus/deploy": `file:${required.found["@dashhaus/deploy"]}`,
            "create-dashhaus-skin": `file:${required.found["create-dashhaus-skin"]}`,
            "home-assistant-js-websocket": toolVersion("home-assistant-js-websocket"),
            react: toolVersion("react"),
            "react-dom": toolVersion("react-dom"),
          },
          devDependencies: {
            "@vitejs/plugin-react": toolVersion("@vitejs/plugin-react"),
            vite: toolVersion("vite"),
          },
        });
        const installed = ["@dashhaus/core", "@dashhaus/dashboard", "@dashhaus/deploy", "create-dashhaus-skin"].map((name) => {
          const { manifest } = installedPackage(app, name);
          return `${manifest.name}@${manifest.version}`;
        });
        return `${installed.join(", ")}; React ${toolVersion("react")}`;
      })
    : { ok: false };

  if (!installed.ok) {
    report.blocked(["scaffold", "conformance", "skin runtime", "build", "deploy"], "the packed packages did not install");
  } else {
    const skinApp = join(app, SKIN);
    await report.stage("scaffold", async () => {
      const { directory, manifest } = installedPackage(app, "create-dashhaus-skin");
      const bin = manifest.bin?.["create-dashhaus-skin"];
      if (!bin) throw new Error("create-dashhaus-skin declares no create-dashhaus-skin bin");
      run(process.execPath, [join(directory, bin), SKIN], { cwd: app });
      // A real author runs `npm install` in the scaffold; the app already holds those packages.
      await symlink(join(app, "node_modules"), join(skinApp, "node_modules"), "dir");
      const files = await readdir(skinApp);
      for (const requiredFile of ["package.json", "vite.config.mjs", "conformance.mjs", "dashboard.config.mjs", "cards"]) {
        assert.ok(files.includes(requiredFile), `the scaffold wrote no ${requiredFile}`);
      }
      return `${SKIN}: ${files.length} entries, no Storybook or repo path`;
    });

    await report.stage("conformance", async () => {
      if (!existsSync(join(skinApp, "cards"))) throw new Error("no cards in the scaffold; the scaffold stage did not produce one");
      const result = run("npm", ["test", "--silent"], { cwd: skinApp });
      const line = result.output.split("\n").find((entry) => entry.startsWith("conformance:"));
      if (!line) throw new Error(`the conformance script printed no result:\n${result.output}`);
      return line;
    });

    await report.stage("skin runtime", async () => {
      const { manifest } = installedPackage(app, "@dashhaus/dashboard");
      if (!manifest.exports?.["./skin"]) {
        throw new Gap(`@dashhaus/dashboard@${manifest.version} declares no "./skin" export`, PHASE_SKIN);
      }
      return relative(app, resolveFromApp(app, "@dashhaus/dashboard/skin"));
    });

    const build = await report.stage("build", async () => {
      const result = run("npm", ["run", "build", "--silent"], { cwd: skinApp, allowFailure: true });
      if (result.status !== 0) {
        const output = result.output;
        if (/@dashhaus\/dashboard\/skin|Missing "\.\/skin"/.test(output)) {
          throw new Gap(`vite cannot resolve @dashhaus/dashboard/skin:\n${output.split("\n").slice(-12).join("\n")}`, PHASE_SKIN);
        }
        throw new Error(`vite build failed:\n${output}`);
      }
      const files = (await readdir(join(skinApp, "dist"))).filter((file) => file.endsWith(".js"));
      assert.deepEqual(files, ["dashhaus.js"], "the build must emit one JS file");
      const bundle = await read(join(skinApp, "dist/dashhaus.js"));
      assert.match(bundle, /custom:dashhaus-my-skin/, "the bundle must register the skin's card");
      assert.match(bundle, /--my-skin-/, "the bundle must carry the skin's CSS");
      return `dist/dashhaus.js (${Math.round(bundle.length / 1024)} kB)`;
    });

    if (!build.ok) {
      report.blocked("deploy", "no dist/dashhaus.js to upload");
    } else {
      await report.stage("deploy", async () => {
        await mkdir(join(app, "www"), { recursive: true });
        const { deploy } = await importFromApp(app, "@dashhaus/deploy");
        assert.equal(typeof deploy, "function", "@dashhaus/deploy exports no deploy()");
        const ha = new FakeHomeAssistant();
        const seen = {};
        const warnings = [];
        const result = await deploy({
          configFile: join(skinApp, "dashboard.config.mjs"),
          env: { HA_URL: "http://ha.test/", HA_TOKEN: "token", HA_WWW: join(app, "www") },
          skipBuild: true,
          report: () => undefined,
          warn: (message) => warnings.push(message),
          connect: connectTo(ha, seen),
        });

        assert.equal(seen.url, "http://ha.test");
        assert.equal(seen.token, "token");
        assert.equal(ha.closed, true);
        assert.deepEqual(warnings, []);
        assert.equal(ha.resources.length, 1);
        assert.match(ha.resources[0].url, /^\/local\/dashhaus\/dashhaus\.js\?v=[0-9a-f]{10}$/);
        assert.deepEqual(ha.dashboards.map((dashboard) => dashboard.url_path), ["dashhaus-my-skin"]);
        assert.deepEqual(ha.dashboards.map((dashboard) => dashboard.title), ["Home (My Skin)"]);
        assert.equal(ha.saved.length, 1);
        assert.equal(ha.saved[0].config.views[0].type, "panel");
        assert.equal(ha.saved[0].config.views[0].cards[0].type, "custom:dashhaus-my-skin");
        assert.equal(result.dashboards[0].status, "created");
        const uploaded = join(app, "www/dashhaus/dashhaus.js");
        assert.ok(existsSync(uploaded), "deploy did not copy the bundle into HA_WWW");
        assert.equal(await read(uploaded), await read(join(skinApp, "dist/dashhaus.js")));
        return `1 resource, 1 dashboard, ${Math.round((await read(uploaded)).length / 1024)} kB uploaded`;
      });
    }
  }
} finally {
  await clean(app);
}
report.finish();
