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
 * for real, and open and close the light's and sensor's details in the deployed dashboard. Before the deploy, the
 * guide's Install by hand on the same fake Home Assistant, from only what the guide hands over: the file in
 * `www/dashhaus-<skin>/`, its resource line with `?v=1`, a dashboard at the guide's URL holding its pasted YAML, and
 * the next version's `?v=2`; the deploy then finds that resource and dashboard and keeps them. Then add a climate card and
 * a lock, and check the lock's unlock asks first, sends nothing on Cancel and sends once on its question's Unlock.
 * `--screenshot <dir>`
 * renders the deployed dashboard from the fake Home Assistant with the repo's Playwright.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { startFakeHomeAssistant } from "@dashhaus/fake-home-assistant";
import {
  clean,
  createReport,
  exerciseDetails,
  exerciseGuarded,
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
const required = tarballs(["@dashhaus/core", "@dashhaus/deploy", "create-dashhaus-skin"]);
let server;
/** The fake Home Assistant, started once, serving `www` at /local/: the hand install and every deploy share it. */
const www = join(app, "www");
const fakeHomeAssistant = async () => {
  if (!server) {
    await mkdir(www, { recursive: true });
    server = await startFakeHomeAssistant({ port: 0, www });
  }
  return server;
};
try {
  const setup = await report.stage("tarballs", async () => {
    if (required.missing.length) throw new Error(`missing ${required.missing.join(", ")}; run npm run release:pack first`);
    return "core, deploy and the scaffolder are packed";
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
        assert.match(manifestText, /"create-dashhaus-skin": "file:/, "--tarballs must point the skin's own scaffolder, which npm run add runs, at its tarball");
        return `${SKIN}: ${files.length} entries, @dashhaus dependencies on the tarballs`;
      })
    : { ok: false };

  if (!scaffold.ok) {
    report.blocked(["agent guide", "install", "conformance", "build", "install by hand", "deploy", "details", "add a domain", "added card", "add a guarded action", "guarded action"], "the scaffold failed");
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
      for (const word of ["npm run snapshot", "npm test", "npm run build", "npm run deploy", "npm run add", "styles/tokens.css", "FONT_HREF"]) {
        assert.ok(guide.includes(word), `AGENTS.md must say ${word}`);
      }
      const scripts = JSON.parse(await read(join(skinApp, "package.json"))).scripts;
      for (const script of ["preview", "snapshot", "test", "build", "deploy", "add"]) assert.ok(scripts[script], `package.json has no ${script} script`);
      return `${new Set(named).size} paths named, all present`;
    });

    const installed = await report.stage("install", async () => {
      run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], { cwd: skinApp });
      const names = ["@dashhaus/core", "@dashhaus/deploy"].map((name) => {
        const { manifest } = installedPackage(skinApp, name);
        return `${manifest.name}@${manifest.version}`;
      });
      return names.join(", ");
    });

    if (!installed.ok) {
      report.blocked(["conformance", "build", "install by hand", "deploy", "details", "add a domain", "added card", "add a guarded action", "guarded action"], "npm install failed in the skin");
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
        const { output } = run("npm", ["run", "build", "--silent"], { cwd: skinApp });
        // Every file, not only the .js ones: a stylesheet read as CSS once left an empty dist/style.css beside it.
        const files = await readdir(join(skinApp, "dist"));
        assert.deepEqual(files, [bundleName], "the build must emit one file, the JS bundle named for the skin");
        assert.doesNotMatch(output, /css-syntax-error|warnings when minifying css/i, "the build must not warn about CSS");
        const bundle = await read(join(skinApp, "dist", bundleName));
        assert.match(bundle, /dashhaus-my-skin/, "the bundle must register the skin's card");
        assert.match(bundle, /--my-skin-/, "the bundle must carry the skin's CSS");
        return `dist/${bundleName} (${Math.round(bundle.length / 1024)} kB)`;
      });

      if (!build.ok) {
        report.blocked(["install by hand", "deploy", "details", "add a domain", "added card", "add a guarded action", "guarded action"], `no dist/${bundleName} to upload`);
      } else {
        // What an agent that can't reach Home Assistant hands over, done as the person would: the guide's own lines.
        const byHand = await report.stage("install by hand", async () => {
          const guide = await read(join(skinApp, "AGENTS.md"));
          const section = guide.split("\n## Install by hand\n")[1]?.split("\n## ")[0];
          assert.ok(section, "AGENTS.md has no Install by hand section");
          const folder = `dashhaus-${SKIN}`;
          const line = `/local/${folder}/${bundleName}?v=1`;
          assert.ok(section.includes(`\`${line}\``), `Install by hand must give the resource line ${line}`);
          assert.ok(section.includes(`\`dist/${bundleName}\``), "Install by hand must name the file to hand over");
          assert.ok(section.includes(`\`${folder}\``), `Install by hand must name the folder and URL ${folder}`);
          const title = section.match(/titled\s+\*\*([^*]+)\*\*/)?.[1];
          assert.equal(title, "Home (My Skin)", "Install by hand must title the dashboard as npm run deploy does");
          const yaml = section.match(/```yaml\n([\s\S]*?)```/)?.[1];
          assert.ok(yaml, "Install by hand must give the dashboard's text as YAML");
          const config = parse(yaml);
          assert.equal(config.views[0].cards[0].type, `custom:${folder}`, "the pasted dashboard must hold the skin's card");

          const { ha, settings } = await fakeHomeAssistant();
          // File editor: the folder and the upload. Resources: the line, as a module. Then a new dashboard, pasted.
          await mkdir(join(www, folder), { recursive: true });
          await writeFile(join(www, folder, bundleName), await read(join(skinApp, "dist", bundleName)));
          await ha.send("lovelace/resources/create", { res_type: "module", url: line });
          await ha.send("lovelace/dashboards/create", { url_path: folder, title, mode: "storage" });
          await ha.send("lovelace/config/save", { url_path: folder, config });
          const served = await fetch(`${settings.HA_URL}${line}`);
          assert.equal(served.status, 200, `Home Assistant must serve ${line}`);
          await exerciseDetails(`${settings.HA_URL}/${folder}`, [{ card: "light", facts: ["State", "Entity"], close: "button" }]);

          // The next change: the new file in place of the old one, and the line's number raised.
          assert.ok(section.includes("`?v=2`"), "Install by hand must say to raise the resource's number");
          await writeFile(join(www, folder, bundleName), `${await read(join(skinApp, "dist", bundleName))}\n// the next version\n`);
          await ha.send("lovelace/resources/update", { resource_id: ha.resources[0].id, res_type: "module", url: line.replace("?v=1", "?v=2") });
          assert.match(await (await fetch(`${settings.HA_URL}${ha.resources[0].url}`)).text(), /the next version/);
          await exerciseDetails(`${settings.HA_URL}/${folder}`, [{ card: "sensor", facts: ["State", "Entity"], close: "escape" }]);
          return `${line}, ${title} from the pasted YAML, drawn; ?v=2 serves the next file`;
        });
        if (!byHand.ok) await server?.close().then(() => { server = undefined; });

        const deployed = await report.stage("deploy", async () => {
          const { HA_URL, HA_TOKEN, HA_WWW } = (await fakeHomeAssistant()).settings;
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
          return `npm run deploy: 1 resource served back, 1 dashboard (${HA_URL})${byHand.ok ? ", both the hand install's, kept" : ""}`;
        });
        if (!deployed.ok) {
          report.blocked(["details", "add a domain", "added card", "add a guarded action", "guarded action"], "the deploy failed");
        } else {
          await report.stage("details", async () => {
            const result = await exerciseDetails(`${server.settings.HA_URL}/dashhaus-${SKIN}`, [
              { card: "light", facts: ["State", "Entity"], close: "button" },
              { card: "sensor", facts: ["State", "Entity"], close: "escape" },
            ], { screenshot: screenshotDir ? join(screenshotDir, "details.png") : undefined });
            return result;
          });
          // A second domain the way the guide says: npm run add, then the same checks, build and deploy.
          const added = await report.stage("add a domain", async () => {
            const output = run("npm", ["run", "add", "--silent", "--", "climate"], { cwd: skinApp }).output;
            assert.match(output, /Added the climate card as a control/, `npm run add said:\n${output}`);
            for (const file of ["cards/climate/MySkinClimateCard.tsx", "cards/climate/MySkinClimateCard.stories.tsx", "ha/HaMySkinClimateCard.tsx"]) {
              assert.ok(existsSync(join(skinApp, file)), `npm run add wrote no ${file}`);
            }
            assert.match(await read(join(skinApp, "lovelace/registry.tsx")), /climate: \{ domains: \["climate"\]/);
            run("npm", ["test", "--silent"], { cwd: skinApp });
            const deploy = await runAsync("npm", ["run", "deploy", "--silent"], { cwd: skinApp });
            assert.doesNotMatch(deploy.output, /^\s*!/m, `the deploy warned:\n${deploy.output}`);
            return "npm run add -- climate: 3 files and a registry row; npm test and npm run deploy pass";
          });
          if (!added.ok) {
            report.blocked(["added card", "add a guarded action", "guarded action"], "npm run add failed");
          } else {
            await report.stage("added card", () => exerciseDetails(`${server.settings.HA_URL}/dashhaus-${SKIN}`, [
              { card: "climate", facts: ["State", "Entity"], close: "button" },
            ]));
            // A domain with a guarded action: the lock's unlock asks first, in the generated skin as in orb and field.
            const guarded = await report.stage("add a guarded action", async () => {
              const output = run("npm", ["run", "add", "--silent", "--", "lock"], { cwd: skinApp }).output;
              assert.match(output, /Added the lock card as a control/, `npm run add said:\n${output}`);
              const card = await read(join(skinApp, "cards/lock/MySkinLockCard.tsx"));
              assert.match(card, /key: "unlock", label: "Unlock", asks: true/, "the lock's unlock must ask first");
              run("npm", ["test", "--silent"], { cwd: skinApp });
              const deploy = await runAsync("npm", ["run", "deploy", "--silent"], { cwd: skinApp });
              assert.doesNotMatch(deploy.output, /^\s*!/m, `the deploy warned:\n${deploy.output}`);
              return "npm run add -- lock: unlock and open ask first; npm test and npm run deploy pass";
            });
            if (!guarded.ok) report.blocked("guarded action", "npm run add -- lock failed");
            else {
              await report.stage("guarded action", () => exerciseGuarded(`${server.settings.HA_URL}/dashhaus-${SKIN}`, {
                card: "lock",
                action: "Unlock",
                question: "Unlock Front door?",
                service: { domain: "lock", service: "unlock" },
              }));
            }
          }
        }
      }
    }
  }
} finally {
  await server?.close();
  await clean(app);
}
report.finish();
