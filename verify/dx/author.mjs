#!/usr/bin/env node
/**
 * The skin author's clean-room journey, from packed tarballs only:
 *
 *   npm run release:pack
 *   node verify/dx/author.mjs [--tarballs <dir>] [--keep]
 *
 * Install core, dashboard, deploy and React; scaffold a skin; write one control and one reading card; run the
 * conformance preset; build one bundle; deploy it through `deploy({ connect: fakeHa })`.
 *
 * Phase 0 uses `verify/dx/fixtures/author` as the scaffold output, because `create-dashhaus-skin` does not exist yet.
 * The driver refuses to pass with the fixture once the scaffolder tarball appears: Phase 3 must run the real
 * scaffolder here instead. It expects `@dashhaus/dashboard/skin`, the frozen skin-author surface Phase 1 adds, so the
 * build resolves the element base from the package rather than the repo.
 *
 * Deviation from the plan's install line: `home-assistant-js-websocket` is installed as well. The element base reaches
 * `@dashhaus/core/websocket`, whose runtime import of the websocket client makes it an optional peer of core, so a
 * browser bundle cannot be built without it. The scaffolder or the author guide must carry that dependency.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
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
  repoRoot,
  resolveFromApp,
  run,
  shown,
  tarballs,
  tarballsDir,
  toolVersion,
} from "./harness.mjs";

const PHASE_SKIN = "Phase 1 — add and freeze @dashhaus/dashboard/skin";
const PHASE_SCAFFOLD = "Phase 3 — create create-dashhaus-skin and include it in release:pack";

const AUTHOR_CONFIG = `export default {
  pageTitle: "Fixture",
  bundle: "dist/dashhaus.js",
  dashboards: [
    {
      path: "fixture-home",
      title: "Fixture Home",
      icon: "mdi:home",
      card() {
        return { card: { type: "custom:dashhaus-fixture" }, made: "the fixture skin" };
      },
    },
  ],
};
`;

const report = createReport("DX author — install, scaffold, test, build, deploy");
console.log(`  tarballs: ${shown(tarballsDir)}`);

const app = await makeApp("author");
try {
  const required = tarballs(["@dashhaus/core", "@dashhaus/dashboard", "@dashhaus/deploy"]);
  const setup = await report.stage("tarballs", async () => {
    if (required.missing.length) {
      throw new Error(`missing ${required.missing.join(", ")}; run npm run release:pack first`);
    }
    return "core, dashboard and deploy are packed";
  });

  const installed = setup.ok
    ? await report.stage("install", async () => {
        await install(app, {
          name: "dashhaus-dx-author",
          private: true,
          type: "module",
          scripts: { test: "node conformance.mjs", build: "vite build" },
          dependencies: {
            "@dashhaus/core": `file:${required.found["@dashhaus/core"]}`,
            "@dashhaus/dashboard": `file:${required.found["@dashhaus/dashboard"]}`,
            "@dashhaus/deploy": `file:${required.found["@dashhaus/deploy"]}`,
            "home-assistant-js-websocket": toolVersion("home-assistant-js-websocket"),
            react: toolVersion("react"),
            "react-dom": toolVersion("react-dom"),
          },
          devDependencies: {
            "@vitejs/plugin-react": toolVersion("@vitejs/plugin-react"),
            vite: toolVersion("vite"),
          },
        });
        const installed = ["@dashhaus/core", "@dashhaus/dashboard", "@dashhaus/deploy"].map((name) => {
          const { manifest } = installedPackage(app, name);
          return `${manifest.name}@${manifest.version}`;
        });
        return `${installed.join(", ")}; React ${toolVersion("react")}`;
      })
    : { ok: false };

  if (!installed.ok) {
    report.blocked(["scaffold", "conformance", "skin runtime", "build", "deploy"], "the packed packages did not install");
  } else {
    await report.stage("scaffold", async () => {
      await cp(join(repoRoot, "verify/dx/fixtures/author"), app, { recursive: true });
      const scaffolder = tarballs(["create-dashhaus-skin"]).found["create-dashhaus-skin"];
      if (scaffolder) {
        throw new Error(
          `create-dashhaus-skin is packed at ${shown(scaffolder)}, but this Phase 0 driver still starts from the checked-in fixture and will not report a pass for it. Phase 3 replaces this with the real scaffold.`,
        );
      }
      throw new Gap("release/ has no create-dashhaus-skin tarball; Phase 0 uses the checked-in fixture", PHASE_SCAFFOLD);
    });

    await report.stage("conformance", async () => {
      if (!existsSync(join(app, "skin/cards"))) throw new Error("no skin/cards in the app; the scaffold stage did not produce one");
      const result = run("npm", ["test", "--silent"], { cwd: app });
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
      const result = run("npm", ["run", "build", "--silent"], { cwd: app, allowFailure: true });
      if (result.status !== 0) {
        const output = result.output;
        if (/@dashhaus\/dashboard\/skin|Missing "\.\/skin"/.test(output)) {
          throw new Gap(`vite cannot resolve @dashhaus/dashboard/skin:\n${output.split("\n").slice(-12).join("\n")}`, PHASE_SKIN);
        }
        throw new Error(`vite build failed:\n${output}`);
      }
      const files = (await readdir(join(app, "dist"))).filter((file) => file.endsWith(".js"));
      assert.deepEqual(files, ["dashhaus.js"], "the build must emit one JS file");
      const bundle = await read(join(app, "dist/dashhaus.js"));
      assert.match(bundle, /dashhaus-fixture/, "the bundle must register the skin's card");
      assert.match(bundle, /--fx-ink/, "the bundle must carry the skin's CSS");
      return `dist/dashhaus.js (${Math.round(bundle.length / 1024)} kB)`;
    });

    if (!build.ok) {
      report.blocked("deploy", "no dist/dashhaus.js to upload");
    } else {
      await report.stage("deploy", async () => {
        await mkdir(join(app, "www"), { recursive: true });
        await writeFile(join(app, "dashboard.config.mjs"), AUTHOR_CONFIG);
        const { deploy } = await importFromApp(app, "@dashhaus/deploy");
        assert.equal(typeof deploy, "function", "@dashhaus/deploy exports no deploy()");
        const ha = new FakeHomeAssistant();
        const seen = {};
        const warnings = [];
        const result = await deploy({
          configFile: join(app, "dashboard.config.mjs"),
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
        assert.deepEqual(ha.dashboards.map((dashboard) => dashboard.url_path), ["fixture-home"]);
        assert.equal(ha.saved.length, 1);
        assert.equal(ha.saved[0].config.views[0].type, "panel");
        assert.equal(ha.saved[0].config.views[0].cards[0].type, "custom:dashhaus-fixture");
        assert.equal(result.dashboards[0].status, "created");
        const uploaded = join(app, "www/dashhaus/dashhaus.js");
        assert.ok(existsSync(uploaded), "deploy did not copy the bundle into HA_WWW");
        assert.equal(await read(uploaded), await read(join(app, "dist/dashhaus.js")));
        return `1 resource, 1 dashboard, ${Math.round((await read(uploaded)).length / 1024)} kB uploaded`;
      });
    }
  }
} finally {
  await clean(app);
}
report.finish();
