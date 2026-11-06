#!/usr/bin/env node
/**
 * The developer's clean-room journey: the headless hooks in a React app of their own, from the packed `@dashhaus/core`
 * alone, the way the documentation's Use the hooks page walks it:
 *
 *   npm run release:pack
 *   node verify/dx/developer.js [--tarballs <dir>] [--keep]
 *
 * Install `@dashhaus/core` with React and nothing else of Dashhaus; check no skin, no dashboard package and no CSS came
 * with it; typecheck the site's own first sample (docs/examples/start: LivingRoomLight.tsx, App.tsx, demo.tsx) against the
 * installed types; then put the demo store under `HaProvider`, draw a light through `useHaLight`, press it through the
 * hook's actions and draw it again, showing the change came back through the store. No generator, no Lovelace card, no
 * Home Assistant.
 */
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  clean,
  createReport,
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
  writeJson,
} from "./harness.js";

const report = createReport("DX developer — the headless hooks in your own React app, no skin, no generator");
console.log(`  tarballs: ${shown(tarballsDir)}`);

const SAMPLES = ["LivingRoomLight.tsx", "App.tsx", "demo.tsx"];
const app = await makeApp("developer");
try {
  const required = tarballs(["@dashhaus/core"]);
  const packaged = await report.stage("packages", async () => {
    if (required.missing.length) throw new Error(`missing ${required.missing.join(", ")}; run npm run release:pack first`);
    return "core is packed";
  });

  const installed = packaged.ok
    ? await report.stage("install", async () => {
        await install(app, {
          name: "dashhaus-dx-developer",
          private: true,
          type: "module",
          dependencies: {
            "@dashhaus/core": `file:${required.found["@dashhaus/core"]}`,
            react: toolVersion("react"),
            "react-dom": toolVersion("react-dom"),
            "home-assistant-js-websocket": toolVersion("home-assistant-js-websocket"),
          },
          devDependencies: {
            typescript: toolVersion("typescript"),
            "@types/react": toolVersion("@types/react"),
            "@types/react-dom": toolVersion("@types/react-dom"),
          },
        });
        const resolvable = (specifier) => {
          try {
            resolveFromApp(app, specifier);
            return true;
          } catch {
            return false;
          }
        };
        for (const name of ["@dashhaus/dashboard", "@dashhaus/orb", "@dashhaus/field", "@dashhaus/bundle", "@dashhaus/deploy"]) {
          assert.equal(resolvable(name), false, `${name} must not come with @dashhaus/core`);
        }
        const { directory, manifest } = installedPackage(app, "@dashhaus/core");
        const css = readdirSync(directory, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".css") && !file.includes("node_modules"));
        assert.deepEqual(css, [], "@dashhaus/core must ship no stylesheet");
        return `${manifest.name}@${manifest.version} with React; no skin, no other package, no CSS`;
      })
    : { ok: false };

  if (!installed.ok) {
    report.blocked(["typecheck the docs' sample", "draw, press, draw again"], "core did not install");
  } else {
    await report.stage("typecheck the docs' sample", async () => {
      const src = join(app, "src");
      await mkdir(src, { recursive: true });
      for (const file of SAMPLES) await copyFile(join(repoRoot, "docs/examples/start", file), join(src, file));
      await writeJson(join(app, "tsconfig.json"), {
        compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM"], module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", strict: true, noEmit: true, skipLibCheck: false },
        include: ["src"],
      });
      const tsc = join(app, "node_modules", ".bin", "tsc");
      const result = run(tsc, ["-p", "."], { cwd: app, allowFailure: true });
      assert.equal(result.status, 0, `the documentation's first sample does not typecheck against the packed core:\n${result.output}`);
      return `${SAMPLES.join(", ")} typecheck against the installed types (skipLibCheck off)`;
    });

    await report.stage("draw, press, draw again", async () => {
      // Plain ESM with createElement, so Node runs it as is; the light is the one the sample draws, so the site's Demo
      // house tab is held to a light the demo house has.
      const sample = await read(join(repoRoot, "docs/examples/start", SAMPLES[0]));
      const light = sample.match(/useHaLight\("([^"]+)"\)/)?.[1];
      assert.ok(light, `${SAMPLES[0]} calls no useHaLight("<entity id>")`);
      await writeFile(join(app, "run.js"), `import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { HaProvider, useHaLight } from "@dashhaus/core";
import { createDemoStore } from "@dashhaus/core/demo";

let press;
function LivingRoomLight() {
  const { entity, actions } = useHaLight(${JSON.stringify(light)});
  press = actions.onToggle;
  return h("button", { "aria-pressed": entity.state === "on" }, entity.name + ": " + entity.state);
}

const store = createDemoStore();
await store.connect();
const draw = () => renderToString(h(HaProvider, { store }, h(LivingRoomLight)));
const before = draw();
await press();
await new Promise((resolve) => setTimeout(resolve, 50));
const after = draw();
store.disconnect();
console.log(JSON.stringify({ before, after }));
`);
      const result = run(process.execPath, ["run.js"], { cwd: app });
      const { before, after } = JSON.parse(result.output.trim().split("\n").at(-1));
      assert.match(before, /<button[^>]*>[^<]+: (on|off)<\/button>/, `the demo house has no ${light}, the light the docs' sample draws: ${before}`);
      assert.notEqual(after, before, `the press through the hook's actions changed nothing: ${before}`);
      const state = (html) => html.match(/: (on|off)</)?.[1];
      return `useHaLight("${light}") drew ${state(before)}, onToggle, drew ${state(after)}`;
    });
  }
} finally {
  await clean(app);
}
report.finish();
