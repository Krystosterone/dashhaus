/**
 * The documentation site's code samples are files, never page text: `docs/examples/`, shown by
 * `docs/src/components/Example.astro`. `npm run typecheck` compiles them (`docs/examples/tsconfig.json`) and
 * `npm run lint` lints them. This suite holds the rest:
 *
 * - no page carries a code fence in a language that compiles or parses, so every such sample comes from a file;
 * - every sample a page names exists, and every file in `docs/examples/` is shown somewhere;
 * - every Lovelace YAML sample reads cleanly through its skin's own parser;
 * - the user guide's deploy config loads through `@dashhaus/deploy` as `npx dashhaus-deploy` would load it;
 * - the author guide's scaffold is what `create-dashhaus-skin my-skin` writes today, and with the guide's added domain
 *   laid over it, the skin typechecks.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { loadDashboards } from "@dashhaus/deploy";
import { parseDashboardConfig } from "../src/skins/orb/lovelace/config";
import { parseFieldConfig } from "../src/skins/field/lovelace/config";
import { fill, SKIN } from "../docs/src/lib/scaffold";

const root = process.cwd();
const pagesDir = join(root, "docs/src/content/docs");
const examplesDir = join(root, "docs/examples");
const templatesDir = join(root, "packages/create-dashhaus-skin/src/templates");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const pages = walk(pagesDir).filter((file) => /\.mdx?$/.test(file));
const page = (file: string) => readFileSync(file, "utf8");
const attributes = (name: string) =>
  pages.flatMap((file) => [...page(file).matchAll(new RegExp(`<Example\\b[^>]*\\b${name}="([^"]+)"`, "g"))].map((match) => ({ file, value: match[1] })));

/** Languages a sample can stop compiling or parsing in. Shell, text and output stay on the page. */
const CHECKED = /^\s*(?:```|~~~)\s*(?:ts|tsx|typescript|js|jsx|mjs|cjs|javascript|yaml|yml|json|css)\b/m;

/** Shown by name on the page beside the file it supports, or read by the docs build rather than shown. */
const UNSHOWN = new Set([
  "tsconfig.json",
  "api-types.ts",
  "scaffold/cards/cover/MySkinCoverCard.css",
  "scaffold/cards/cover/MySkinCoverCard.stories.tsx",
]);

describe("documentation samples", () => {
  it("keeps every compiled or parsed sample in a file", () => {
    for (const file of pages) {
      expect(CHECKED.test(page(file)), `${relative(root, file)}: move the code fence into docs/examples and show it with <Example>`).toBe(false);
    }
  });

  it("names only samples that exist, and shows every sample", () => {
    const named = attributes("file");
    expect(named.length).toBeGreaterThan(0);
    for (const { file, value } of named) expect(existsSync(join(examplesDir, value)), `${relative(root, file)}: no docs/examples/${value}`).toBe(true);
    for (const { file, value } of attributes("template")) expect(existsSync(join(templatesDir, value)), `${relative(root, file)}: no template ${value}`).toBe(true);
    const shown = new Set(named.map(({ value }) => value));
    for (const file of walk(examplesDir).map((path) => relative(examplesDir, path))) {
      if (UNSHOWN.has(file)) continue;
      expect(shown.has(file), `docs/examples/${file} is on no page`).toBe(true);
    }
  });

  it("reads every Lovelace YAML sample through its skin's parser", () => {
    const yaml = walk(examplesDir).filter((file) => file.endsWith(".yaml"));
    expect(yaml.length).toBeGreaterThan(0);
    for (const file of yaml) {
      const config = parse(readFileSync(file, "utf8")) as { type?: string };
      const at = relative(root, file);
      if (config.type === "custom:dashhaus-orb") expect(() => parseDashboardConfig(config), at).not.toThrow();
      else if (config.type === "custom:dashhaus-field") expect(() => parseFieldConfig(config), at).not.toThrow();
      else throw new Error(`${at}: no parser for type ${config.type}`);
    }
  });

  it("loads the user guide's deploy config", async () => {
    const { dashboards } = await loadDashboards({ file: join(examplesDir, "user/dashboard.config.mjs"), env: {} });
    expect(dashboards.map((dashboard: { path: string }) => dashboard.path)).toEqual(["home-orb", "home-field"]);
  });
});

describe("the author guide's scaffold", () => {
  const skin = join(root, "node_modules/.cache/dashhaus-docs", SKIN);
  const overlay = join(examplesDir, "scaffold");

  it("is what create-dashhaus-skin writes, and typechecks with the added domain", () => {
    rmSync(skin, { recursive: true, force: true });
    mkdirSync(dirname(skin), { recursive: true });
    const scaffold = spawnSync(process.execPath, [join(root, "packages/create-dashhaus-skin/bin.mjs"), skin], { encoding: "utf8" });
    expect(scaffold.status, scaffold.stderr).toBe(0);

    for (const { file, value } of attributes("template")) {
      const written = join(skin, fill(value));
      expect(readFileSync(written, "utf8"), `${relative(root, file)}: ${value} is not what the scaffold writes`).toBe(fill(readFileSync(join(templatesDir, value), "utf8")));
    }

    // The guide's edits to a scaffold file keep every line it had, in order: they add lines, or extend one (a union or
    // a list gaining "cover"). A scaffold line the guide no longer has means the template moved on: update the guide.
    const kept = (original: string) => (line: string) => {
      if (line === original) return true;
      // The original with text inserted at one place: its start, then the insertion, then the rest of it.
      let common = 0;
      while (common < original.length && line[common] === original[common]) common += 1;
      return common >= 8 && line.length > original.length && line.endsWith(original.slice(common));
    };
    for (const file of walk(overlay)) {
      const path = relative(overlay, file);
      const target = join(skin, path);
      if (existsSync(target)) {
        const edited = readFileSync(file, "utf8").split("\n");
        let at = 0;
        for (const line of readFileSync(target, "utf8").split("\n")) {
          const found = edited.slice(at).findIndex(kept(line));
          at = found < 0 ? -1 : at + found;
          expect(at, `docs/examples/scaffold/${path} lost the scaffold's line: ${line}`).toBeGreaterThanOrEqual(0);
          at += 1;
        }
      }
      mkdirSync(dirname(target), { recursive: true });
      cpSync(file, target);
    }

    writeFileSync(join(skin, "inline.d.ts"), 'declare module "*.css?inline" {\n  const css: string;\n  export default css;\n}\n');
    writeFileSync(join(skin, "tsconfig.json"), JSON.stringify({
      extends: relative(skin, join(root, "config/tsconfig.base.json")),
      include: ["**/*.ts", "**/*.tsx"],
    }));
    const tsc = spawnSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", skin], { encoding: "utf8" });
    expect(tsc.status, tsc.stdout + tsc.stderr).toBe(0);
  }, 120_000);
});
