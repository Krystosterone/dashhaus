/**
 * The skin generator crosses every repository surface a skin owns. This test removes Field in a temporary copy,
 * rebuilds it through `new-skin` plus the normal Card command, and checks the result at the public seams.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = process.cwd();
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("VITEST") && key !== "NODE_OPTIONS"));
const run = (cwd: string, command: string, args: string[]) => {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
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
  writeChanged(copy, "scripts/deploy.mjs", (source) => source.replace(/\n {2}\{\n {4}path: process\.env\.HA_FIELD_DASHBOARD[\s\S]*?\n {2}\},/, ""));
  writeChanged(copy, "docs/deploy.md", (source) => source.replace(/\n## The field dashboard[\s\S]*?(?=\n## |\n?$)/i, ""));
  writeChanged(copy, "docs/cards.md", (source) => source.replace(/\n### Field [^\n]*(?:module|Card)\n[\s\S]*?(?=\n## |\n### )/gi, ""));
  writeChanged(copy, "scripts/generated-skins.mjs", (source) => source.replace(/^ {2}\{ id: "field".*\n/m, ""));
};

const CARDS = ["light", "climate", "sensor", "weather", "toggle", "humidifier", "sound", "cover", "alarm", "owlet"];

describe("new-skin", () => {
  it("finds every registration anchor without writing", () => {
    const result = run(root, "node", ["scripts/new-skin/index.mjs", "probe-skin", "--dry-run"]);
    expect(result.status, result.output).toBe(0);
    for (const path of [".storybook/preview.tsx", "apps/lovelace/entry.ts", "scripts/generated-skins.mjs", "docs/deploy.md"]) expect(result.output).toContain(`edit   ${path}`);
    expect(result.output).toContain("create src/skins/probe-skin/index.ts");
    expect(result.output).toContain("create src/skins/probe-skin/lovelace/registry.tsx");
  });

  describe("reconstructing Field in a copy", () => {
    const skip = ["node_modules", ".git", "dist", "storybook-static", ".agents", ".claude", "research"];
    let copy = "";
    beforeAll(() => {
      copy = mkdtempSync(join(tmpdir(), "new-skin-field-"));
      cpSync(root, copy, { recursive: true, filter: (source) => !skip.includes(relative(root, source).split("/")[0]) });
      symlinkSync(join(root, "node_modules"), join(copy, "node_modules"));
      removeField(copy);
    });
    afterAll(() => process.env.KEEP_NEW_SKIN_COPY ? console.info(`FIELD_RECONSTRUCTION=${copy}`) : rmSync(copy, { recursive: true, force: true }));

    it("recreates every current domain and passes generated-skin seams", () => {
      const skin = run(copy, "node", ["scripts/new-skin/index.mjs", "field"]);
      expect(skin.status, skin.output).toBe(0);
      for (const card of CARDS) {
        const result = run(copy, "node", ["scripts/new-card/index.mjs", card, "--skin", "field"]);
        expect(result.status, `${card}:\n${result.output}`).toBe(0);
      }

      const typecheck = run(copy, "npx", ["tsc", "--noEmit"]);
      expect(typecheck.status, typecheck.output).toBe(0);
      const lint = run(copy, "npx", ["eslint", "src/skins/field", "scripts/new-skin", "scripts/new-card/generated.mjs"]);
      expect(lint.status, lint.output).toBe(0);
      const tests = run(copy, "npx", ["vitest", "run", "src/skins/field", "verify/storybook.test.ts", "verify/boundaries.test.ts"]);
      expect(tests.status, tests.output).toBe(0);
      const storybook = run(copy, "npm", ["run", "build-storybook"]);
      expect(storybook.status, storybook.output).toBe(0);
      const bundle = run(copy, "npm", ["run", "build:ha"]);
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
