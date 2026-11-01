/**
 * Install the release tarballs into a clean app outside the workspace and prove the packed surface:
 *
 * - tarball contents: no tests, stories, repo docs or spec, or workspace-only source paths;
 * - packed manifests: real version, no `private`, no `source` condition, internal ranges pinned, optional peers;
 * - Node imports of every declared subpath, a jsdom React render for `@dashhaus/dashboard`, `./skin` and `./card`, a
 *   Vitest run for `@dashhaus/core/testing`, a TypeScript consumer (Bundler and NodeNext), the `dashhaus-deploy` bin
 *   loading a config that imports `@dashhaus/deploy/config`, and a Node-only app installing deploy alone.
 * - each tarball's non-empty README.
 *
 * Usage: `npm run release:pack` then `npm run verify:packages`.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publicPackages, root, SEMVER } from "./manifest.js";

const outIndex = process.argv.indexOf("--tarballs");
const tarballsDir = outIndex === -1 ? join(root, "release") : process.argv[outIndex + 1] ?? join(root, "release");

const tarballFor = (manifest) => join(tarballsDir, `${manifest.name.replace(/^@/, "").replace("/", "-")}-${manifest.version}.tgz`);

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

function ok(message) {
  console.log(`✓ ${message}`);
}

const tarFiles = (tarball) => execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" }).trim().split("\n");
const tarManifest = (tarball) => JSON.parse(execFileSync("tar", ["-xOzf", tarball, "package/package.json"], { encoding: "utf8" }));

async function checkTarballs(manifests) {
  for (const pkg of publicPackages) {
    const manifest = manifests[pkg.key];
    const tarball = tarballFor(manifest);
    if (!existsSync(tarball)) throw new Error(`missing ${tarball}; run npm run release:pack`);
    const files = tarFiles(tarball);
    const bad = files.filter((file) => {
      // The scaffolder ships story metadata as templates for the skin it writes, not stories of its own.
      if (pkg.key === "scaffold" && file.startsWith("package/dist/templates/")) return false;
      return /(?:\.test\.|\.stories\.|^package\/(?:\.agents|research|docs|spec)\/|^package\/src\/.*\.test\.)/.test(file);
    });
    if (bad.length) throw new Error(`${manifest.name}: tarball ships ${bad.join(", ")}`);
    if (pkg.key !== "deploy" && files.some((file) => file.startsWith("package/src/"))) {
      throw new Error(`${manifest.name}: tarball ships source instead of dist`);
    }

    const packed = tarManifest(tarball);
    if (packed.private) throw new Error(`${manifest.name}: packed manifest is still private`);
    if (!SEMVER.test(packed.version) || packed.version === "0.0.0") throw new Error(`${manifest.name}: packed version is ${packed.version}`);
    if (JSON.stringify(packed.exports).includes('"source"')) throw new Error(`${manifest.name}: packed exports declare a source condition`);
    if (["core", "dashboard", "orb", "field"].includes(pkg.key) && packed.peerDependenciesMeta?.["home-assistant-js-websocket"]?.optional !== true) {
      throw new Error(`${manifest.name}: home-assistant-js-websocket must stay an optional peer`);
    }
    const filesField = JSON.stringify(packed.files);
    if (!filesField.includes("dist") && pkg.key !== "deploy") throw new Error(`${manifest.name}: packed files must ship dist`);

    const required = pkg.key === "core"
      ? ["package/README.md", "package/dist/index.js", "package/dist/index.d.ts", "package/dist/entities/format.js", "package/dist/ha/fixtures/light.json"]
      : pkg.key === "dashboard"
        ? ["package/README.md", "package/dist/index.js", "package/dist/skin.js", "package/dist/skin.d.ts", "package/dist/card.js", "package/dist/schema.js", "package/dist/layout.js", "package/dist/conformance.js", "package/dist/conformance.d.ts"]
        : pkg.key === "orb"
          ? ["package/README.md", "package/dist/index.js", "package/dist/index.d.ts", "package/dist/lovelace/card.js", "package/dist/lovelace/card.d.ts", "package/dist/lovelace/auto.js", "package/dist/styles/tokens.css", "package/dist/storybook.js"]
          : pkg.key === "field"
            ? ["package/README.md", "package/dist/index.js", "package/dist/index.d.ts", "package/dist/lovelace/card.js", "package/dist/lovelace/card.d.ts", "package/dist/styles/tokens.css", "package/dist/storybook.js"]
            : pkg.key === "bundle"
              ? ["package/README.md", "package/dist/index.js", "package/dist/index.d.ts", "package/dist/dashhaus.js"]
              : pkg.key === "scaffold"
                ? ["package/README.md", "package/bin.js", "package/dist/index.js", "package/dist/templates/package.json", "package/dist/templates/lovelace/card.tsx"]
                : ["package/README.md", "package/bin.js", "package/src/cli.js", "package/src/cli.d.ts", "package/src/config.js", "package/src/config.d.ts"];
    const missing = required.filter((file) => !files.includes(file));
    if (missing.length) throw new Error(`${manifest.name}: tarball misses ${missing.join(", ")}`);
    if (pkg.key === "scaffold") {
      const template = JSON.parse(execFileSync("tar", ["-xOzf", tarball, "package/dist/templates/package.json"], { encoding: "utf8" }));
      for (const name of ["@dashhaus/core", "@dashhaus/dashboard", "@dashhaus/deploy"]) {
        const range = template.dependencies?.[name] ?? template.devDependencies?.[name];
        if (range !== `^${packed.version}`) {
          throw new Error(`${manifest.name}: template pins ${name} "${range}", expected "^${packed.version}"`);
        }
      }
    }
    const readme = execFileSync("tar", ["-xOzf", tarball, "package/README.md"], { encoding: "utf8" });
    if (!readme.trim()) throw new Error(`${manifest.name}: README.md in the tarball is empty`);
    ok(`${manifest.name}@${packed.version}: ${files.length} entries, ${(statSync(tarball).size / 1024).toFixed(1)} KiB`);
  }

  const dashboard = manifests.dashboard;
  if (dashboard.dependencies?.["@dashhaus/core"] !== `^${manifests.core.version}`) {
    throw new Error(`@dashhaus/dashboard depends on @dashhaus/core "${dashboard.dependencies?.["@dashhaus/core"]}", expected "^${manifests.core.version}"`);
  }
}

async function install(app, manifests) {
  const dependencies = Object.fromEntries(publicPackages.map((pkg) => [manifests[pkg.key].name, tarballFor(manifests[pkg.key])]));
  const base = {
    name: "dashhaus-packed-consumer",
    private: true,
    type: "module",
    dependencies: { ...dependencies, react: "18.3.1", "react-dom": "18.3.1" },
  };
  await writeFile(join(app, "package.json"), `${JSON.stringify(base, null, 2)}\n`);
  run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], app);
  const wsMeta = manifests.core.peerDependenciesMeta?.["home-assistant-js-websocket"]?.optional;
  if (wsMeta !== true) throw new Error("the optional websocket peer lost its optional flag");
  ok(`installed ${publicPackages.length} tarballs into a clean React 18 app`);

  const devDependencies = {
    "@testing-library/react": "16.3.3",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "home-assistant-js-websocket": "9.7.1",
    jsdom: "30.1.3",
    vitest: "3.2.7",
  };
  await writeFile(join(app, "package.json"), `${JSON.stringify({ ...base, devDependencies }, null, 2)}\n`);
  run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], app);
}

async function nodeConsumer(app) {
  await writeFile(join(app, "consumer.js"), `
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const loads = [];
const load = async (specifier) => {
  const module = await import(specifier);
  loads.push(specifier);
  return module;
};

const core = await load("@dashhaus/core");
assert.equal(typeof core.createHaStore, "function");
assert.equal(typeof core.HaProvider, "function");
await load("@dashhaus/core/entities");
await load("@dashhaus/core/entities/format");
await load("@dashhaus/core/entities/light/types");
await load("@dashhaus/core/entities/light/kelvin");
await load("@dashhaus/core/primitives");
await load("@dashhaus/core/hooks");
await load("@dashhaus/core/demo");
await load("@dashhaus/core/websocket");
const fixture = (await import("@dashhaus/core/fixtures/light.json", { with: { type: "json" } })).default;
assert.ok(Object.keys(fixture).length > 0);

const deployConfig = await load("@dashhaus/deploy/config");
assert.equal(typeof deployConfig.generatedDashboards, "function");
await load("@dashhaus/dashboard/schema");
await load("@dashhaus/dashboard/layout");
const conformance = await load("@dashhaus/dashboard/conformance");
assert.equal(typeof conformance.checkCards, "function");
assert.equal(typeof conformance.cardFolders, "function");
const deploy = await load("@dashhaus/deploy");
assert.equal(typeof deploy.loadDashboards, "function");
const orbAuto = await load("@dashhaus/orb/lovelace/auto");
assert.equal(typeof orbAuto.autoDashboard, "function");
const bundle = await load("@dashhaus/bundle");
assert.ok(bundle.bundlePath instanceof URL, "bundlePath is a file URL");
assert.ok(existsSync(fileURLToPath(bundle.bundlePath)), "the bundle package ships its dashhaus.js");
const bundleCode = await (await import("node:fs/promises")).readFile(fileURLToPath(bundle.bundlePath), "utf8");
assert.match(bundleCode, /dashhaus-orb/);
assert.match(bundleCode, /dashhaus-field/);

const { JSDOM } = await import("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const key of ["window", "document", "HTMLElement", "customElements", "CustomEvent", "Event", "Node", "MutationObserver"]) {
  Object.defineProperty(globalThis, key, { value: key === "window" ? dom.window : dom.window[key], configurable: true, writable: true });
}
const dashboard = await load("@dashhaus/dashboard");
assert.equal(typeof dashboard.registerCard, "function");
const skin = await load("@dashhaus/dashboard/skin");
assert.deepEqual(Object.keys(skin).sort(), ["LovelaceDashboardElement", "autoInput", "registerCard", "scopeToHost"]);
const card = await load("@dashhaus/dashboard/card");
assert.equal(card.cardShape({ footprint: "compact" }).footprint, "compact");

const { createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const container = document.createElement("div");
document.body.appendChild(container);
const reactRoot = createRoot(container);
reactRoot.render(createElement(card.CardDialog, { open: false, onClose: () => {}, label: "packed" }));
await new Promise((resolve) => setTimeout(resolve, 100));
reactRoot.unmount();
loads.push("react-dom render");

console.log(loads.join("\\n"));
`);
  run(process.execPath, ["consumer.js"], app);
  ok("Node imports every declared subpath and renders the dashboard entry under jsdom");
}

async function testingConsumer(app) {
  await writeFile(join(app, "testing.test.ts"), `
import { createElement } from "react";
import { expect, it } from "vitest";
import { fakeTransport, renderConnected } from "@dashhaus/core/testing";

it("renders a connected component through the packed testing helper", () => {
  const fake = fakeTransport({});
  expect(fake.transport).toBeDefined();
  const view = renderConnected(createElement("span", null, "packed"), {});
  expect(view.getByText("packed")).toBeTruthy();
});
`);
  run(join(app, "node_modules", ".bin", "vitest"), ["run", "testing.test.ts", "--environment", "jsdom", "--reporter", "dot"], app);
  ok("@dashhaus/core/testing runs inside Vitest");
}

async function typeConsumer(app) {
  await writeFile(join(app, "consumer.ts"), `
import type { CardProps } from "@dashhaus/dashboard/card";
import { cardShape } from "@dashhaus/dashboard/card";
import type { DeployConfig } from "@dashhaus/deploy/config";
import { generatedDashboards } from "@dashhaus/deploy/config";
import type { LovelaceHass } from "@dashhaus/dashboard/skin";
import type { CardCheck } from "@dashhaus/dashboard/conformance";
import { checkCards } from "@dashhaus/dashboard/conformance";
import { HaActionError } from "@dashhaus/core";
import type { HassEntity } from "@dashhaus/core";
import { fmt1 } from "@dashhaus/core/entities/format";
import { kelvinToLch } from "@dashhaus/core/entities/light/kelvin";
import { useNow } from "@dashhaus/core/hooks";
import { usePress } from "@dashhaus/core/primitives";
import { createDemoHouseTransport } from "@dashhaus/core/demo";
import fixture from "@dashhaus/core/fixtures/light.json";

const shape = cardShape({ footprint: "compact" });
const config: DeployConfig = { bundle: "dist/cards.js", dashboards: generatedDashboards([]) };
export const values = [HaActionError, kelvinToLch, fmt1, usePress, useNow, createDemoHouseTransport, fixture, config, shape, checkCards];
export type Card = CardProps;
export type Check = CardCheck;
export type Entity = HassEntity;
export type Hass = LovelaceHass;
`);
  await writeFile(join(app, "tsconfig.bundler.json"), `${JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      resolveJsonModule: true,
    },
    include: ["consumer.ts"],
  }, null, 2)}\n`);
  run(process.execPath, [join(root, "node_modules", "typescript", "bin", "tsc"), "-p", join(app, "tsconfig.bundler.json")], app);

  await writeFile(join(app, "consumer.node.ts"), `
import type { DeployConfig } from "@dashhaus/deploy/config";
import { generatedDashboards } from "@dashhaus/deploy/config";
import { cardShape } from "@dashhaus/dashboard/card";
import type { CardCheck } from "@dashhaus/dashboard/conformance";
import { checkCards } from "@dashhaus/dashboard/conformance";
import { HaActionError } from "@dashhaus/core";
import { fmt1 } from "@dashhaus/core/entities/format";

export const value: string = fmt1(1) + generatedDashboards([]).length;
export const shape = cardShape({ footprint: "compact" });
export const checks = checkCards;
export const error = HaActionError;
export type Check = CardCheck;
export type Config = DeployConfig;
`);
  await writeFile(join(app, "tsconfig.node.json"), `${JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      skipLibCheck: true,
    },
    include: ["consumer.node.ts"],
  }, null, 2)}\n`);
  run(process.execPath, [join(root, "node_modules", "typescript", "bin", "tsc"), "-p", join(app, "tsconfig.node.json")], app);
  ok("TypeScript consumers typecheck against the packed declarations (Bundler and NodeNext)");
}

/**
 * A deploy-only app installs `@dashhaus/bundle` alone and reads the prebuilt file: no React, core or dashboard is
 * present, and the one bundle carries both cards and their CSS.
 */
async function bundleConsumer(manifests) {
  const app = await mkdtemp(join(tmpdir(), "dashhaus-bundle-app-"));
  try {
    await writeFile(join(app, "package.json"), `${JSON.stringify({
      name: "dashhaus-bundle-only",
      private: true,
      type: "module",
      dependencies: { "@dashhaus/bundle": tarballFor(manifests.bundle) },
    }, null, 2)}\n`);
    run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], app);
    for (const peer of ["react", "react-dom", "@dashhaus/core", "@dashhaus/dashboard"]) {
      if (existsSync(join(app, "node_modules", ...peer.split("/")))) throw new Error(`the bundle-only app installed ${peer}; the bundle must carry its runtime`);
    }
    await writeFile(join(app, "consumer.js"), `
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { bundlePath } from "@dashhaus/bundle";

assert.ok(bundlePath instanceof URL, "bundlePath is a file URL");
const file = fileURLToPath(bundlePath);
assert.ok(existsSync(file), "bundlePath points at a shipped file");
assert.match(file, /node_modules\\/@dashhaus\\/bundle\\/dist\\/dashhaus\\.js$/);
const code = await readFile(file, "utf8");
assert.match(code, /dashhaus-orb/);
assert.match(code, /dashhaus-field/);
assert.match(code, /--brand-c/);
assert.match(code, /--fd-/);
console.log("bundle-only import ok");
`);
    run(process.execPath, ["consumer.js"], app);
    ok("@dashhaus/bundle installs and resolves its prebuilt file with no React or runtime package");
  } finally {
    await rm(app, { recursive: true, force: true });
  }
}

/**
 * The packed scaffolder writes a standalone skin. The app installs only the tool, so this also proves the templates
 * travel in the tarball and the output names no repository file.
 */
async function scaffoldConsumer(manifests) {
  const app = await mkdtemp(join(tmpdir(), "dashhaus-scaffold-app-"));
  try {
    await writeFile(join(app, "package.json"), `${JSON.stringify({
      name: "dashhaus-scaffold-only",
      private: true,
      type: "module",
      dependencies: { "create-dashhaus-skin": tarballFor(manifests.scaffold) },
    }, null, 2)}\n`);
    run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], app);
    const bin = join(app, "node_modules", "create-dashhaus-skin", "bin.js");
    run(process.execPath, [bin, "outside-skin"], app);
    const skin = join(app, "outside-skin");
    for (const file of ["package.json", "vite.config.js", "conformance.js", "dashboard.config.mjs", "cards/light/OutsideSkinLightCard.tsx", "lovelace/entry.tsx", "styles/tokens.css"]) {
      if (!existsSync(join(skin, file))) throw new Error(`create-dashhaus-skin wrote no ${file}`);
    }
    const source = await readFile(join(skin, "lovelace", "entry.tsx"), "utf8");
    if (/src\/skins|Storybook|\.\.\/\.\.\//.test(source)) throw new Error("the scaffold reaches a repository path or Storybook");
    ok("create-dashhaus-skin scaffolds a standalone skin from the packed templates");
  } finally {
    await rm(app, { recursive: true, force: true });
  }
}

/**
 * A Node-only app installs `@dashhaus/deploy` alone and imports its pure config subpath. No React, core or dashboard
 * peer is present, so the import proves the config surface stays installable without the browser packages.
 */
async function deployConfigConsumer(manifests) {
  const app = await mkdtemp(join(tmpdir(), "dashhaus-deploy-app-"));
  try {
    await writeFile(join(app, "package.json"), `${JSON.stringify({
      name: "dashhaus-deploy-only",
      private: true,
      type: "module",
      dependencies: { "@dashhaus/deploy": tarballFor(manifests.deploy) },
    }, null, 2)}\n`);
    run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], app);
    for (const peer of ["react", "react-dom", "@dashhaus/core", "@dashhaus/dashboard"]) {
      if (existsSync(join(app, "node_modules", ...peer.split("/")))) throw new Error(`the deploy-only app installed ${peer}; the config surface must not need it`);
    }
    await writeFile(join(app, "config.js"), `
import assert from "node:assert/strict";
import { generatedDashboards } from "@dashhaus/deploy/config";

const [node] = generatedDashboards([{ id: "node", title: "Node", icon: "mdi:home" }]);
assert.equal(node.path, "dashhaus-node");
assert.equal((await node.card({ send: async () => undefined })).card.type, "custom:dashhaus-node");
console.log("deploy/config import ok");
`);
    run(process.execPath, ["config.js"], app);
    ok("@dashhaus/deploy/config imports in a Node-only app with no React");
  } finally {
    await rm(app, { recursive: true, force: true });
  }
}

async function deployBin(app) {
  await writeFile(join(app, "dashboard.config.mjs"), `
import { generatedDashboards } from "@dashhaus/deploy/config";

export default {
  bundle: "dist/cards.js",
  dashboards: generatedDashboards([{ id: "canvas", title: "Packed", icon: "mdi:home" }]),
};
`);
  const result = spawnSync(join(app, "node_modules", ".bin", "dashhaus-deploy"), ["--help"], { cwd: app, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`deploy bin exited ${result.status}: ${result.stderr}`);
  if (!result.stdout.includes("Packed") || !result.stdout.includes("/dashhaus-canvas")) {
    throw new Error(`deploy bin did not load the packed config:\n${result.stdout}`);
  }
  ok("dashhaus-deploy runs and loads a config importing @dashhaus/deploy/config");
}

async function main() {
  const manifests = {};
  for (const pkg of publicPackages) manifests[pkg.key] = JSON.parse(await readFile(join(root, pkg.dir, "package.json"), "utf8"));
  await checkTarballs(manifests);

  const app = await mkdtemp(join(tmpdir(), "dashhaus-consumer-"));
  try {
    await install(app, manifests);
    await nodeConsumer(app);
    await bundleConsumer(manifests);
    await scaffoldConsumer(manifests);
    await deployConfigConsumer(manifests);
    await testingConsumer(app);
    await typeConsumer(app);
    await deployBin(app);
    ok(`packed install verified in ${app}`);
  } finally {
    if (!process.env.KEEP_PACKED_APP) await rm(app, { recursive: true, force: true });
  }
}

await main();
