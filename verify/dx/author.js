#!/usr/bin/env node
/**
 * The skin author's clean-room journey, from packed tarballs only, the way the scaffold's own AGENTS.md walks it:
 *
 *   npm run release:pack
 *   node verify/dx/author.js [--tarballs <dir>] [--keep] [--screenshot <dir>]
 *
 * Run the packed `create-dashhaus-skin my-skin --tarballs <dir>`; check the agent guide it writes against the files it
 * names; `npm install` inside the new project (its `@dashhaus` dependencies are the tarballs, the rest the registry);
 * `npm test`; `npm run build`; then `npm run deploy` (the packed `dashhaus-deploy` bin, reading `.env`) over a real
 * websocket into `@dashhaus/fake-home-assistant`, which also serves `/local/` so the deploy's served-file check runs
 * for real, and open and close the light's and sensor's details in the deployed dashboard. `--screenshot <dir>`
 * renders the deployed dashboard from the fake Home Assistant with the repo's Playwright.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { startFakeHomeAssistant } from "@dashhaus/fake-home-assistant";
import {
  clean,
  createReport,
  exerciseDetails,
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
  writeJson,
} from "./harness.js";

const SKIN = "my-skin";
const report = createReport("DX author — scaffold, read the guide, install, test, build, deploy");
console.log(`  tarballs: ${shown(tarballsDir)}`);

const app = await makeApp("author");
const required = tarballs(["@dashhaus/core", "@dashhaus/dashboard", "@dashhaus/deploy", "create-dashhaus-skin"]);
let server;
try {
  const setup = await report.stage("tarballs", async () => {
    if (required.missing.length) throw new Error(`missing ${required.missing.join(", ")}; run npm run release:pack first`);
    return "core, dashboard, deploy and the scaffolder are packed";
  });

  const skinApp = join(app, SKIN);
  const scaffold = setup.ok
    ? await report.stage("scaffold", async () => {
        // The scaffolder alone, as `npx --package <tgz> create-dashhaus-skin` would fetch it.
        const tool = join(app, ".scaffolder");
        await mkdir(tool, { recursive: true });
        await writeJson(join(tool, "package.json"), { name: "scaffolder", private: true });
        run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline", required.found["create-dashhaus-skin"]], { cwd: tool });
        const { directory, manifest } = installedPackage(tool, "create-dashhaus-skin");
        const output = run(process.execPath, [join(directory, manifest.bin["create-dashhaus-skin"]), SKIN, "--tarballs", tarballsDir], { cwd: app }).output;
        assert.match(output, /AGENTS\.md/, "the scaffolder's closing words must point at the agent guide");
        const files = await readdir(skinApp);
        for (const file of ["package.json", "AGENTS.md", "CLAUDE.md", ".env.example", ".gitignore", "vite.config.js", "conformance.js", "dashboard.config.mjs", "cards", "preview"]) {
          assert.ok(files.includes(file), `the scaffold wrote no ${file}`);
        }
        const manifestText = await read(join(skinApp, "package.json"));
        assert.match(manifestText, /"@dashhaus\/core": "file:/, "--tarballs must point @dashhaus/core at its tarball");
        return `${SKIN}: ${files.length} entries, @dashhaus dependencies on the tarballs`;
      })
    : { ok: false };

  if (!scaffold.ok) {
    report.blocked(["agent guide", "install", "conformance", "build", "deploy", "details"], "the scaffold failed");
  } else {
    await report.stage("agent guide", async () => {
      const guide = await read(join(skinApp, "AGENTS.md"));
      assert.equal((await read(join(skinApp, "CLAUDE.md"))).trim(), "@AGENTS.md", "CLAUDE.md must import AGENTS.md");
      // Every path the guide names in backticks must exist, so the guide cannot drift from the files it describes.
      const named = [...guide.matchAll(/`((?:styles|shared|cards|lovelace|ha|preview)\/[A-Za-z0-9_./-]*|[a-z.-]+\.(?:js|md|json)|\.env\.example)`/g)]
        .map((match) => match[1].replace(/\/$/, ""))
        .filter((path) => !path.includes("<") && !path.includes("…"));
      const missing = [...new Set(named)].filter((path) => !existsSync(join(skinApp, path)));
      assert.deepEqual(missing, [], `AGENTS.md names files the scaffold did not write: ${missing.join(", ")}`);
      for (const word of ["npm run snapshot", "npm test", "npm run build", "npm run deploy", "styles/tokens.css", "FONT_HREF"]) {
        assert.ok(guide.includes(word), `AGENTS.md must say ${word}`);
      }
      const scripts = JSON.parse(await read(join(skinApp, "package.json"))).scripts;
      for (const script of ["preview", "snapshot", "test", "build", "deploy"]) assert.ok(scripts[script], `package.json has no ${script} script`);
      return `${new Set(named).size} paths named, all present`;
    });

    const installed = await report.stage("install", async () => {
      run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], { cwd: skinApp });
      const names = ["@dashhaus/core", "@dashhaus/dashboard", "@dashhaus/deploy"].map((name) => {
        const { manifest } = installedPackage(skinApp, name);
        return `${manifest.name}@${manifest.version}`;
      });
      return names.join(", ");
    });

    if (!installed.ok) {
      report.blocked(["conformance", "build", "deploy", "details"], "npm install failed in the skin");
    } else {
      await report.stage("conformance", async () => {
        const result = run("npm", ["test", "--silent"], { cwd: skinApp });
        const line = result.output.split("\n").find((entry) => entry.startsWith("conformance:"));
        if (!line) throw new Error(`the conformance script printed no result:\n${result.output}`);
        return line;
      });

      await report.stage("rules catch a colour literal", async () => {
        const css = join(skinApp, "cards/light/MySkinLightCard.css");
        const before = await read(css);
        await writeFile(css, `${before}\n.my-skin-lt-oops { color: #ff0000; }\n`);
        const result = run("npm", ["test", "--silent"], { cwd: skinApp, allowFailure: true });
        await writeFile(css, before);
        assert.notEqual(result.status, 0, "npm test must fail on a colour literal outside tokens.css");
        assert.match(result.output, /MySkinLightCard\.css:\d+: \[colour\]/, "the finding must name the file and line");
        return "npm test names the file, line and fix";
      });

      await report.stage("rules catch the shared theme attribute", async () => {
        const css = join(skinApp, "styles/tokens.css");
        const before = await read(css);
        await writeFile(css, `${before}\n:root[data-theme="dark"] { --my-skin-ink: #ffffff; }\n`);
        const result = run("npm", ["test", "--silent"], { cwd: skinApp, allowFailure: true });
        await writeFile(css, before);
        assert.notEqual(result.status, 0, "npm test must fail on CSS keyed on the shared data-theme");
        assert.match(result.output, /tokens\.css:\d+: \[theme\]/, "the finding must name the file and line");
        return "npm test refuses data-theme and names data-my-skin-theme";
      });

      const bundleName = `dashhaus-${SKIN}.js`;
      const build = await report.stage("build", async () => {
        run("npm", ["run", "build", "--silent"], { cwd: skinApp });
        const files = (await readdir(join(skinApp, "dist"))).filter((file) => file.endsWith(".js"));
        assert.deepEqual(files, [bundleName], "the build must emit one JS file named for the skin");
        const bundle = await read(join(skinApp, "dist", bundleName));
        assert.match(bundle, /dashhaus-my-skin/, "the bundle must register the skin's card");
        assert.match(bundle, /--my-skin-/, "the bundle must carry the skin's CSS");
        return `dist/${bundleName} (${Math.round(bundle.length / 1024)} kB)`;
      });

      if (!build.ok) {
        report.blocked(["deploy", "details"], `no dist/${bundleName} to upload`);
      } else {
        const deployed = await report.stage("deploy", async () => {
          const www = join(app, "www");
          await mkdir(www, { recursive: true });
          server = await startFakeHomeAssistant({ port: 0, www });
          const { HA_URL, HA_TOKEN, HA_WWW } = server.settings;
          const example = await read(join(skinApp, ".env.example"));
          for (const key of ["HA_URL=", "HA_TOKEN=", "HA_WWW="]) assert.ok(example.includes(key), `.env.example has no ${key}`);
          await writeFile(join(skinApp, ".env"), `HA_URL=${HA_URL}\nHA_TOKEN=${HA_TOKEN}\nHA_WWW=${HA_WWW}\n`);
          const result = await runAsync("npm", ["run", "deploy", "--silent"], { cwd: skinApp });
          assert.doesNotMatch(result.output, /^\s*!/m, `the deploy warned:\n${result.output}`);
          assert.match(result.output, /✓ .*\/local\/dashhaus-my-skin\/dashhaus-my-skin\.js\?v=[0-9a-f]{10} \(\d+ kB, the uploaded file\)/);
          const ha = server.ha;
          assert.equal(ha.resources.length, 1);
          assert.ok(ha.resources[0].url.startsWith(`/local/dashhaus-${SKIN}/${bundleName}?v=`), `unexpected resource URL ${ha.resources[0].url}`);
          assert.deepEqual(ha.dashboards.map((dashboard) => dashboard.url_path), ["dashhaus-my-skin"]);
          assert.deepEqual(ha.dashboards.map((dashboard) => dashboard.title), ["Home (My Skin)"]);
          assert.equal(ha.saved.length, 1);
          assert.equal(ha.saved[0].config.views[0].type, "panel");
          assert.equal(ha.saved[0].config.views[0].cards[0].type, "custom:dashhaus-my-skin");
          assert.equal(await read(join(www, `dashhaus-${SKIN}/${bundleName}`)), await read(join(skinApp, "dist", bundleName)));
          if (screenshotDir) {
            const file = await screenshotDashboard(`${HA_URL}/dashhaus-my-skin`, join(screenshotDir, "author.png"));
            console.log(`  screenshot: ${file}`);
          }
          return `npm run deploy: 1 resource served back, 1 dashboard (${HA_URL})`;
        });
        if (!deployed.ok) {
          report.blocked("details", "the deploy failed");
        } else {
          await report.stage("details", async () => {
            const result = await exerciseDetails(`${server.settings.HA_URL}/dashhaus-${SKIN}`, [
              { code: "lt", facts: ["Area", "State", "Brightness"], close: "button" },
              { code: "sn", facts: ["Area", "Temperature", "Humidity", "Unit"], close: "escape" },
            ], { screenshot: screenshotDir ? join(screenshotDir, "details.png") : undefined });
            return result;
          });
        }
      }
    }
  }
} finally {
  await server?.close();
  await clean(app);
}
report.finish();
