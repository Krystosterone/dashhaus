/**
 * The documentation site's code samples are files, never page text: `docs/examples/`, shown by
 * `docs/src/components/Example.astro`. `npm run typecheck` compiles them (`docs/examples/tsconfig.json`) and
 * `npm run lint` lints them. This suite holds the rest:
 *
 * - no page carries a code fence in a language that compiles or parses, so every such sample comes from a file;
 * - every sample a page names exists, and every file in `docs/examples/` is shown somewhere;
 * - every Lovelace YAML sample reads cleanly through its skin's own parser, and a dashboard strategy sample through the
 *   strategy, every card its views hold through that card's skin's parser;
 * - the user guide's deploy config loads through `@dashhaus/deploy` as `npx dashhaus-deploy` would load it;
 * - every scaffold file the author guide shows is one `create-dashhaus-skin my-skin` writes (before or after
 *   `npm run add -- cover`), and that skin typechecks.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { loadDashboards } from "@dashhaus/deploy";
import { parseDashboardConfig } from "../src/skins/orb/lovelace/config";
import { parseFieldConfig } from "../src/skins/field/lovelace/config";
import { ORB_STRATEGY } from "../src/skins/orb/lovelace/strategy";
import { FIELD_STRATEGY } from "../src/skins/field/lovelace/strategy";
import { ADDED, writeScaffold } from "../docs/src/lib/scaffold";

const root = process.cwd();
const pagesDir = join(root, "docs/src/content/docs");
const examplesDir = join(root, "docs/examples");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const pages = walk(pagesDir).filter((file) => /\.mdx?$/.test(file));
const page = (file: string) => readFileSync(file, "utf8");
/** The author guide's `<Example template="…">`s: a scaffold path, from the skin after its added domain when `added`. */
const templates = () =>
  pages.flatMap((file) => [...page(file).matchAll(/<Example\b([^>]*)\btemplate="([^"]+)"([^>]*)>/g)]
    .map((match) => ({ file, value: { path: match[2], added: /\badded\b/.test(match[1] + match[3]) } })));
const attributes = (name: string) =>
  pages.flatMap((file) => [...page(file).matchAll(new RegExp(`<Example\\b[^>]*\\b${name}="([^"]+)"`, "g"))].map((match) => ({ file, value: match[1] })));

/** Languages a sample can stop compiling or parsing in. Shell, text and output stay on the page. */
const CHECKED = /^\s*(?:```|~~~)\s*(?:ts|tsx|typescript|js|jsx|mjs|cjs|javascript|yaml|yml|json|css)\b/m;

/** Shown by name on the page beside the file it supports, or read by the docs build rather than shown. */
const UNSHOWN = new Set([
  "tsconfig.json",
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
    const shown = new Set(named.map(({ value }) => value));
    for (const file of walk(examplesDir).map((path) => relative(examplesDir, path))) {
      if (UNSHOWN.has(file)) continue;
      expect(shown.has(file), `docs/examples/${file} is on no page`).toBe(true);
    }
  });

  it("reads every Lovelace YAML sample through its skin's parser", () => {
    const yaml = walk(examplesDir).filter((file) => file.endsWith(".yaml") && !relative(examplesDir, file).startsWith("mistakes/"));
    expect(yaml.length).toBeGreaterThan(0);
    const card = (config: { type?: string; cards?: unknown[]; [key: string]: unknown }, at: string) => {
      if (config.type === "custom:dashhaus-orb") expect(() => parseDashboardConfig(config), at).not.toThrow();
      else if (config.type === "custom:dashhaus-field") expect(() => parseFieldConfig(config), at).not.toThrow();
      else throw new Error(`${at}: no parser for type ${config.type}`);
    };
    const skins = Object.fromEntries([ORB_STRATEGY, FIELD_STRATEGY].map((strategy) => [`custom:${strategy.type}`, strategy]));
    for (const file of yaml) {
      const config = parse(readFileSync(file, "utf8")) as { type?: string; strategy?: { type?: string } };
      const at = relative(root, file);
      if (!config.strategy) {
        card(config, at);
        continue;
      }
      // A dashboard's raw config on a strategy: expanded as the frontend does, then each view's card read.
      const skin = skins[config.strategy.type ?? ""];
      if (skin) {
        // A skin's strategy draws its card with the title and the keys it hands on (its own test pins the expansion).
        const keys = Object.fromEntries(Object.entries(config.strategy).filter(([key]) => key !== "type"));
        for (const key of Object.keys(keys)) expect(["title", ...(skin.options ?? [])], `${at}: ${skin.name}'s strategy takes ${key}`).toContain(key);
        card({ type: skin.card, title: "Home", ...keys }, `${at} → ${skin.name}`);
        continue;
      }
      throw new Error(`${at}: no strategy ${config.strategy.type}`);
    }
  });

  it("quotes each mistake sample's problems exactly as its skin's parser reports them, on the page that shows it", () => {
    const mistakes = walk(join(examplesDir, "mistakes")).filter((file) => file.endsWith(".yaml"));
    expect(mistakes.length).toBeGreaterThan(0);
    for (const file of mistakes) {
      const name = relative(examplesDir, file);
      const config = parse(readFileSync(file, "utf8")) as { type?: string };
      const parser = config.type === "custom:dashhaus-orb" ? parseDashboardConfig : config.type === "custom:dashhaus-field" ? parseFieldConfig : undefined;
      if (!parser) throw new Error(`${name}: no parser for type ${config.type}`);
      let message = "";
      try { parser(config); } catch (error) { message = (error as Error).message; }
      expect(message, `${name} must fail: it shows mistakes`).not.toBe("");
      const page = attributes("file").find(({ value }) => value === name)?.file;
      expect(page, `${name} is on a page`).toBeDefined();
      expect(readFileSync(page!, "utf8"), `${relative(root, page!)} quotes ${name}'s problems as the parser words them`).toContain(message);
    }
  });

  it("loads the user guide's deploy config", async () => {
    const { dashboards } = await loadDashboards({ file: join(examplesDir, "user/dashboard.config.mjs"), env: {} });
    expect(dashboards.map((dashboard: { path: string }) => dashboard.path)).toEqual(["home-orb", "home-field", "my-home"]);
  });
});

describe("the author guide's scaffold", () => {
  const parent = join(root, "node_modules/.cache/dashhaus-docs");

  it("shows only files create-dashhaus-skin writes, and typechecks once npm run add has added a domain", () => {
    const scaffolded = writeScaffold(root, join(parent, "scaffolded"));
    const added = writeScaffold(root, join(parent, "added"), true);
    for (const { file, value } of templates()) {
      const skin = value.added ? added : scaffolded;
      expect(existsSync(join(skin, value.path)), `${relative(root, file)}: create-dashhaus-skin writes no ${value.path}${value.added ? ` after add ${ADDED}` : ""}`).toBe(true);
    }

    // The skin's own tsconfig, against the repo's packages instead of an install.
    writeFileSync(join(added, "tsconfig.json"), JSON.stringify({
      extends: relative(added, join(root, "config/tsconfig.base.json")),
      compilerOptions: { types: ["vite/client", "node"] },
      include: ["**/*.ts", "**/*.tsx"],
    }));
    const tsc = spawnSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", added], { encoding: "utf8" });
    expect(tsc.status, tsc.stdout + tsc.stderr).toBe(0);
  }, 120_000);
});
