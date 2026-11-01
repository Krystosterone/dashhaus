#!/usr/bin/env node
/**
 * The skin user's clean-room journey, from packed tarballs only:
 *
 *   npm run release:pack
 *   node verify/dx/user.js [--tarballs <dir>] [--keep]
 *
 * Install `@dashhaus/bundle` and `@dashhaus/deploy`, write a short `dashboard.config.mjs`, and deploy the prebuilt
 * bundle through `deploy({ connect: fakeHa })`. No clone, no build, no React, core or dashboard in the app.
 *
 * The deploy CLI defaults to `dashboard.config.mjs` (`packages/deploy/src/cli.js`), so that is the file the driver
 * writes and passes to `deploy()`. The plan's snippet names a different config file; `npx dashhaus-deploy --skip-build`
 * would not find that name without `--config`. This is a plan/code discrepancy, not a driver choice.
 */
import assert from "node:assert/strict";
import { existsSync, realpathSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { FakeHomeAssistant, connectTo } from "./fake-ha.js";
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
  shown,
  tarballs,
  tarballsDir,
} from "./harness.js";

const PHASE_BUNDLE = "Phase 2 — add @dashhaus/bundle with the prebuilt dashhaus.js and bundlePath";

const USER_CONFIG = `import { fileURLToPath } from "node:url";
import { bundlePath } from "@dashhaus/bundle";

export default {
  pageTitle: "Home",
  bundle: fileURLToPath(bundlePath),
  dashboards: [
    {
      path: "home-orb",
      title: "Home (Orb)",
      icon: "mdi:home-variant",
      async card() {
        return { card: { type: "custom:dashhaus-orb" }, made: "automatic" };
      },
    },
    {
      path: "home-field",
      title: "Home (Field)",
      icon: "mdi:knob",
      async card() {
        return { card: { type: "custom:dashhaus-field" }, made: "automatic" };
      },
    },
  ],
};
`;

const report = createReport("DX user — install bundle and deploy, no build");
console.log(`  tarballs: ${shown(tarballsDir)}`);

const app = await makeApp("user");
try {
  const required = tarballs(["@dashhaus/bundle", "@dashhaus/deploy"]);
  const packaged = await report.stage("packages", async () => {
    if (required.missing.includes("@dashhaus/bundle")) {
      throw new Gap("release/ has no @dashhaus/bundle tarball; the prebuilt bundle cannot be installed yet", PHASE_BUNDLE);
    }
    if (required.missing.length) {
      throw new Error(`missing ${required.missing.join(", ")}; run npm run release:pack first`);
    }
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
    report.blocked(["bundle path", "config", "deploy"], "the bundle package did not install");
  } else {
    const bundlePath = await report.stage("bundle path", async () => {
      const module = await importFromApp(app, "@dashhaus/bundle");
      assert.ok(
        typeof module.bundlePath === "string" || module.bundlePath instanceof URL,
        "@dashhaus/bundle must export bundlePath as a file URL or path",
      );
      const file = fileURLToPath(module.bundlePath);
      // A macOS temp directory is reached through /var, while a module URL is realpathed to /private/var.
      const inside = relative(realpathSync(app), file);
      assert.ok(!inside.startsWith(".."), `bundlePath points outside the app: ${file}`);
      const bundle = await read(file);
      assert.match(bundle, /dashhaus-orb/, "the bundle must register custom:dashhaus-orb");
      assert.match(bundle, /dashhaus-field/, "the bundle must register custom:dashhaus-field");
      return `${inside} (${Math.round(bundle.length / 1024)} kB, both cards)`;
    });

    const config = await report.stage("config", async () => {
      await writeFile(join(app, "dashboard.config.mjs"), USER_CONFIG);
      const { readConfig } = await importFromApp(app, "@dashhaus/deploy");
      const loaded = await readConfig(join(app, "dashboard.config.mjs"));
      assert.equal(loaded.dashboards.length, 2);
      assert.equal(loaded.bundle, fileURLToPath((await importFromApp(app, "@dashhaus/bundle")).bundlePath));
      return "dashboard.config.mjs loads through @dashhaus/deploy";
    });

    if (!bundlePath.ok || !config.ok) {
      report.blocked("deploy", "the bundle or config stage failed");
    } else {
      await report.stage("deploy", async () => {
        await mkdir(join(app, "www"), { recursive: true });
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
        assert.deepEqual(ha.dashboards.map((dashboard) => dashboard.url_path), ["home-orb", "home-field"]);
        assert.deepEqual(ha.dashboards.map((dashboard) => dashboard.title), ["Home (Orb)", "Home (Field)"]);
        assert.equal(ha.saved.length, 2);

        const orb = ha.saved.find((entry) => entry.url_path === "home-orb");
        const field = ha.saved.find((entry) => entry.url_path === "home-field");
        assert.ok(orb && field, "both dashboards must get a saved layout");
        assert.deepEqual(orb.config.views[0].cards[0], { type: "custom:dashhaus-orb" });
        assert.deepEqual(field.config.views[0].cards[0], { type: "custom:dashhaus-field" });
        assert.equal("sections" in orb.config.views[0].cards[0], false, "the orb card must auto-layout");
        assert.equal("modules" in field.config.views[0].cards[0], false, "the field card must auto-layout");
        assert.deepEqual(result.dashboards.map((dashboard) => dashboard.status), ["created", "created"]);
        assert.equal(ha.calls.filter((call) => call.type === "lovelace/resources/create").length, 1);
        assert.equal(ha.calls.filter((call) => call.type === "lovelace/dashboards/create").length, 2);
        assert.equal(ha.calls.filter((call) => call.type === "lovelace/config/save").length, 2);

        const uploaded = join(app, "www/dashhaus/dashhaus.js");
        assert.ok(existsSync(uploaded), "deploy did not copy the prebuilt bundle into HA_WWW");
        const source = fileURLToPath((await importFromApp(app, "@dashhaus/bundle")).bundlePath);
        assert.equal(await read(uploaded), await read(source));
        return `1 resource, 2 dashboards, ${Math.round((await read(uploaded)).length / 1024)} kB uploaded`;
      });
    }
  }
} finally {
  await clean(app);
}
report.finish();
