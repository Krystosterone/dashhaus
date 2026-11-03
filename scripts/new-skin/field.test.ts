/**
 * The Field reconstruction: remove Field from a temporary copy, rebuild every card through `new-skin` and the normal
 * Card command, and check the result at the public seams. It has its own file so this copy runs beside the canvas one.
 */
import { lstatSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { copyRepo, linkNodeModules, recordWorkspace, run, typecheckCopy } from "../repo-copy";

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
  rmSync(join(copy, "spec/field.md"), { force: true });
  writeChanged(copy, ".storybook/preview.tsx", (source) => withoutArrayEntry(source
    .replace('import { fieldStorybook } from "@dashhaus/field/storybook";\n', "")
    .replace(", fieldStorybook", ""), "Field"));
  writeChanged(copy, "apps/lovelace/entry.ts", (source) => source
    .replace('import "@dashhaus/field/styles/tokens.css";\n', "")
    .replace('import { defineFieldCard } from "@dashhaus/field/lovelace/card";\n', "")
    .replace("defineFieldCard(css);\n", ""));
  writeChanged(copy, "dashboard.config.mjs", (source) => source.replace(/\n {4}\{\n {6}path: "dashhaus-field",[\s\S]*?\n {4}\},/, ""));
  writeChanged(copy, "spec/deploy.md", (source) => source.replace(/\n## The field dashboard[\s\S]*?(?=\n## |\n?$)/i, ""));
  writeChanged(copy, "spec/cards.md", (source) => source.replace(/\n### Field [^\n]*(?:module|Card)\n[\s\S]*?(?=\n## |\n### )/gi, ""));
  writeChanged(copy, "scripts/generated-skins.js", (source) => source.replace(/^ {2}\{ id: "field".*\n/m, ""));
};

const FIELD_DOMAINS = ["light", "climate", "sensor", "weather", "toggle", "humidifier", "sound", "cover", "alarm", "owlet", "lock"];

describe("new-skin", () => {
  describe("reconstructing Field in a copy", () => {
    let copy = "";
    beforeAll(() => {
      copy = copyRepo("new-skin-field-");
      removeField(copy);
    }, 120_000);
    afterAll(() => process.env.KEEP_NEW_SKIN_COPY ? console.info(`FIELD_RECONSTRUCTION=${copy}`) : rmSync(copy, { recursive: true, force: true }));

    it("recreates every current domain and passes generated-skin seams", async () => {
      const skin = await run(copy, "node", ["scripts/new-skin/index.js", "field"]);
      expect(skin.status, skin.output).toBe(0);
      for (const card of FIELD_DOMAINS) {
        const result = await run(copy, "node", ["scripts/new-card/index.js", card, "--skin", "field"]);
        expect(result.status, `${card}:\n${result.output}`).toBe(0);
      }
      linkNodeModules(copy);
      const workspace = await recordWorkspace(copy);
      expect(workspace.status, workspace.output).toBe(0);
      const lock = JSON.parse(readFileSync(join(copy, "package-lock.json"), "utf8"));
      expect(lock.packages["node_modules/@dashhaus/field"]).toMatchObject({ resolved: "src/skins/field", link: true });

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

      const typecheck = await typecheckCopy(copy);
      expect(typecheck.status, typecheck.output).toBe(0);
      const lint = await run(copy, "npx", ["eslint", "src/skins/field", "scripts/new-skin", "scripts/new-card/generated.js"]);
      expect(lint.status, lint.output).toBe(0);
      const tests = await run(copy, "npx", ["vitest", "run", "--config", "config/vitest.config.ts", "src/skins/field", "verify/storybook.test.ts", "verify/boundaries.test.ts", "verify/skin-surface.test.ts"]);
      expect(tests.status, tests.output).toBe(0);
      const storybook = await run(copy, "npm", ["run", "build-storybook"]);
      expect(storybook.status, storybook.output).toBe(0);
      const bundle = await run(copy, "npm", ["run", "build:ha"]);
      expect(bundle.status, bundle.output).toBe(0);

      // The rebuilt Field gets the page around its cards from the templates: its own theme attribute, the font seam
      // and the rejected-command row (its card tests prove the named article; its Lovelace tests, the row).
      expect(readFileSync(join(copy, "src/skins/field/styles/tokens.css"), "utf8")).toContain('[data-field-theme="dark"]');
      expect(readFileSync(join(copy, "src/skins/field/storybook.tsx"), "utf8")).toContain("fontHref: FIELD_FONT_HREF,");
      expect(readFileSync(join(copy, "src/skins/field/lovelace/FieldDashboard.tsx"), "utf8")).toContain("<FieldActionStatus />");

      const index = readFileSync(join(copy, "src/skins/field/index.ts"), "utf8");
      const registry = readFileSync(join(copy, "src/skins/field/lovelace/registry.tsx"), "utf8");
      for (const card of FIELD_DOMAINS) {
        const Name = card[0].toUpperCase() + card.slice(1);
        expect(index).toContain(`Field${Name}Card`);
        expect(registry).toContain(`${card}: {`);
      }
      expect(readFileSync(join(copy, "scripts/generated-skins.js"), "utf8")).toContain('{ id: "field"');
      expect(readFileSync(join(copy, "spec/deploy.md"), "utf8").match(/^## The Field dashboard$/gm)).toHaveLength(1);
      expect(readFileSync(join(copy, "spec/cards.md"), "utf8").match(/^### Field .* Card$/gm)).toHaveLength(FIELD_DOMAINS.length);
    }, 300_000);
  });
});
