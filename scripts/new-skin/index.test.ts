/**
 * The skin generator crosses every repository surface a skin owns. This test removes Field in a temporary copy,
 * rebuilds it through `new-skin` plus the normal Card command, and checks the result at the public seams.
 */
import { spawn } from "node:child_process";
import { cpSync, lstatSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = process.cwd();
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("VITEST") && key !== "NODE_OPTIONS"));

/**
 * Run a command without blocking the worker: Vitest's parent times out `onTaskUpdate` when a test holds the event
 * loop through a long `spawnSync`, which these generator runs are.
 */
const run = (cwd: string, command: string, args: string[]) =>
  new Promise<{ status: number | null; output: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env });
    let output = "";
    child.stdout?.on("data", (chunk) => { output += chunk; });
    child.stderr?.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, output }));
  });

/** A real workspace install: it links every generated skin package by its manifest name. */
const install = async (cwd: string) => {
  const result = await run(cwd, "npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"]);
  expect(result.status, result.output).toBe(0);
  return result;
};

const withoutArrayEntry = (source: string, label: string) => {
  const labelAt = source.indexOf(`"${label}", [`);
  if (labelAt === -1) return source;
  const start = source.lastIndexOf("\n", labelAt) + 1;
  const arrayAt = source.indexOf("[", labelAt);
  let depth = 0;
  let end = arrayAt;
  for (; end < source.length; end++) {
    if (source[end] === "[") depth++;
    if (source[end] === "]" && --depth === 0) break;
  }
  const comma = source.indexOf(",", end);
  return source.slice(0, start) + source.slice(comma + 1).replace(/^\n/, "");
};

const writeChanged = (copy: string, path: string, change: (source: string) => string) => {
  const full = join(copy, path);
  writeFileSync(full, change(readFileSync(full, "utf8")));
};

/** Remove Field's source and compile-time registrations, as the reconstruction exercise requires. */
const removeField = (copy: string) => {
  rmSync(join(copy, "src/skins/field"), { recursive: true, force: true });
  rmSync(join(copy, "docs/field.md"), { force: true });
  writeChanged(copy, ".storybook/preview.tsx", (source) => withoutArrayEntry(source
    .replace('import { fieldStorybook } from "../src/skins/field/storybook";\n', "")
    .replace(", fieldStorybook", ""), "Field"));
  writeChanged(copy, "apps/lovelace/entry.ts", (source) => source
    .replace('import "../../src/skins/field/styles/tokens.css";\n', "")
    .replace('import { defineFieldCard } from "../../src/skins/field/lovelace/card";\n', "")
    .replace("defineFieldCard(css);\n", ""));
  writeChanged(copy, "dashboard.config.mjs", (source) => source.replace(/\n {4}\{\n {6}path: "home-dashboard-field",[\s\S]*?\n {4}\},/, ""));
  writeChanged(copy, "docs/deploy.md", (source) => source.replace(/\n## The field dashboard[\s\S]*?(?=\n## |\n?$)/i, ""));
  writeChanged(copy, "docs/cards.md", (source) => source.replace(/\n### Field [^\n]*(?:module|Card)\n[\s\S]*?(?=\n## |\n### )/gi, ""));
  writeChanged(copy, "scripts/generated-skins.mjs", (source) => source.replace(/^ {2}\{ id: "field".*\n/m, ""));
};

const CARDS = ["light", "climate", "sensor", "weather", "toggle", "humidifier", "sound", "cover", "alarm", "owlet"];

describe("new-skin", () => {
  it("finds every registration anchor without writing", async () => {
    const result = await run(root, "node", ["scripts/new-skin/index.mjs", "probe-skin", "--dry-run"]);
    expect(result.status, result.output).toBe(0);
    for (const path of [".storybook/preview.tsx", "apps/lovelace/entry.ts", "scripts/generated-skins.mjs", "docs/deploy.md"]) expect(result.output).toContain(`edit   ${path}`);
    expect(result.output).toContain("create src/skins/probe-skin/package.json");
    expect(result.output).toContain("create src/skins/probe-skin/index.ts");
    expect(result.output).toContain("create src/skins/probe-skin/lovelace/registry.tsx");
  });

  describe("a generated skin in a copy", () => {
    const skip = ["node_modules", ".git", "dist", "storybook-static", ".agents", ".claude", "research"];
    let copy = "";
    beforeAll(async () => {
      copy = mkdtempSync(join(tmpdir(), "new-skin-canvas-"));
      cpSync(root, copy, { recursive: true, filter: (source) => !skip.includes(relative(root, source).split("/")[0]) });
      await install(copy);
    });
    afterAll(() => rmSync(copy, { recursive: true, force: true }));

    it("creates a linked workspace package that a Card lands in", async () => {
      const skin = await run(copy, "node", ["scripts/new-skin/index.mjs", "canvas"]);
      expect(skin.status, skin.output).toBe(0);
      const card = await run(copy, "node", ["scripts/new-card/index.mjs", "light", "--skin", "canvas"]);
      expect(card.status, card.output).toBe(0);
      await install(copy);

      const manifest = JSON.parse(readFileSync(join(copy, "src/skins/canvas/package.json"), "utf8"));
      expect(manifest.name).toBe("@dashhaus/canvas");
      expect(manifest.private).toBe(true);
      expect(manifest.type).toBe("module");
      expect(manifest.exports).toEqual({
        ".": "./index.ts",
        "./styles/tokens.css": "./styles/tokens.css",
        "./lovelace/card": "./lovelace/card.tsx",
        "./storybook": "./storybook.tsx",
      });
      expect(lstatSync(join(copy, "node_modules/@dashhaus/canvas")).isSymbolicLink()).toBe(true);
      const require = createRequire(join(copy, "package.json"));
      expect(require.resolve("@dashhaus/canvas")).toMatch(/\/src\/skins\/canvas\/index\.ts$/);
      expect(require.resolve("@dashhaus/canvas/storybook")).toMatch(/\/src\/skins\/canvas\/storybook\.tsx$/);

      const preview = readFileSync(join(copy, ".storybook/preview.tsx"), "utf8");
      expect(preview).toContain('from "@dashhaus/canvas/storybook"');
      expect(preview).toContain('"Canvas", [');
      expect(preview).toContain('"Light"');
      const entry = readFileSync(join(copy, "apps/lovelace/entry.ts"), "utf8");
      expect(entry).toContain('import "@dashhaus/canvas/styles/tokens.css";');
      expect(entry).toContain('from "@dashhaus/canvas/lovelace/card"');
      expect(readFileSync(join(copy, "src/skins/canvas/lovelace/registry.tsx"), "utf8")).toContain("light: { domains: [\"light\"]");
      expect(readFileSync(join(copy, "src/skins/canvas/index.ts"), "utf8")).toContain("CanvasLightCard");

      const typecheck = await run(copy, "npx", ["tsc", "--noEmit"]);
      expect(typecheck.status, typecheck.output).toBe(0);
      const lint = await run(copy, "npx", ["eslint", "src/skins/canvas", "scripts/new-card", "scripts/new-skin", "verify/generator-packages.test.ts"]);
      expect(lint.status, lint.output).toBe(0);
      const tests = await run(copy, "npx", ["vitest", "run", "src/skins/canvas", "verify/storybook.test.ts", "verify/boundaries.test.ts", "verify/generator-packages.test.ts"]);
      expect(tests.status, tests.output).toBe(0);
      const bundle = await run(copy, "npm", ["run", "build:ha"]);
      expect(bundle.status, bundle.output).toBe(0);
    }, 300_000);
  });

  describe("reconstructing Field in a copy", () => {
    const skip = ["node_modules", ".git", "dist", "storybook-static", ".agents", ".claude", "research"];
    let copy = "";
    beforeAll(async () => {
      copy = mkdtempSync(join(tmpdir(), "new-skin-field-"));
      cpSync(root, copy, { recursive: true, filter: (source) => !skip.includes(relative(root, source).split("/")[0]) });
      await install(copy);
      removeField(copy);
    });
    afterAll(() => process.env.KEEP_NEW_SKIN_COPY ? console.info(`FIELD_RECONSTRUCTION=${copy}`) : rmSync(copy, { recursive: true, force: true }));

    it("recreates every current domain and passes generated-skin seams", async () => {
      const skin = await run(copy, "node", ["scripts/new-skin/index.mjs", "field"]);
      expect(skin.status, skin.output).toBe(0);
      for (const card of CARDS) {
        const result = await run(copy, "node", ["scripts/new-card/index.mjs", card, "--skin", "field"]);
        expect(result.status, `${card}:\n${result.output}`).toBe(0);
      }
      await install(copy);

      const manifest = JSON.parse(readFileSync(join(copy, "src/skins/field/package.json"), "utf8"));
      expect(manifest.name).toBe("@dashhaus/field");
      expect(manifest.private).toBe(true);
      expect(manifest.exports["."]).toBe("./index.ts");
      expect(lstatSync(join(copy, "node_modules/@dashhaus/field")).isSymbolicLink()).toBe(true);
      const require = createRequire(join(copy, "package.json"));
      expect(require.resolve("@dashhaus/field")).toMatch(/\/src\/skins\/field\/index\.ts$/);
      expect(require.resolve("@dashhaus/field/storybook")).toMatch(/\/src\/skins\/field\/storybook\.tsx$/);
      expect(readFileSync(join(copy, ".storybook/preview.tsx"), "utf8")).toContain('from "@dashhaus/field/storybook"');
      const entry = readFileSync(join(copy, "apps/lovelace/entry.ts"), "utf8");
      expect(entry).toContain('import "@dashhaus/field/styles/tokens.css";');
      expect(entry).toContain('from "@dashhaus/field/lovelace/card"');

      const typecheck = await run(copy, "npx", ["tsc", "--noEmit"]);
      expect(typecheck.status, typecheck.output).toBe(0);
      const lint = await run(copy, "npx", ["eslint", "src/skins/field", "scripts/new-skin", "scripts/new-card/generated.mjs"]);
      expect(lint.status, lint.output).toBe(0);
      const tests = await run(copy, "npx", ["vitest", "run", "src/skins/field", "verify/storybook.test.ts", "verify/boundaries.test.ts"]);
      expect(tests.status, tests.output).toBe(0);
      const storybook = await run(copy, "npm", ["run", "build-storybook"]);
      expect(storybook.status, storybook.output).toBe(0);
      const bundle = await run(copy, "npm", ["run", "build:ha"]);
      expect(bundle.status, bundle.output).toBe(0);

      const index = readFileSync(join(copy, "src/skins/field/index.ts"), "utf8");
      const registry = readFileSync(join(copy, "src/skins/field/lovelace/registry.tsx"), "utf8");
      for (const card of CARDS) {
        const Name = card[0].toUpperCase() + card.slice(1);
        expect(index).toContain(`Field${Name}Card`);
        expect(registry).toContain(`${card}: {`);
      }
      expect(readFileSync(join(copy, "scripts/generated-skins.mjs"), "utf8")).toContain('{ id: "field"');
      expect(readFileSync(join(copy, "docs/deploy.md"), "utf8").match(/^## The Field dashboard$/gm)).toHaveLength(1);
      expect(readFileSync(join(copy, "docs/cards.md"), "utf8").match(/^### Field .* Card$/gm)).toHaveLength(CARDS.length);
    }, 300_000);
  });
});
