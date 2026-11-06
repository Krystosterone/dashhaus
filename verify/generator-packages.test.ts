/**
 * The generators treat the repo as a package graph through scripts/packages.js: one map holds where packages live,
 * which specifiers they declare, where a generated skin lives and which marker each registration targets. This
 * check fails if a generator reintroduces a package path or a bare `@dashhaus/…` literal, or if the map and the root
 * workspace list drift apart.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { generated, generatedManifest, packages, skinTemplates, workspaces } from "../scripts/packages.js";
import { domainsFile, domainsJson } from "../scripts/domains.js";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const rootManifest = JSON.parse(read("package.json"));

/** The generator bodies; templates are generated source, and packages.js is the map itself. */
const GENERATORS = [
  "scripts/new-card/index.js",
  "scripts/new-card/field.js",
  "scripts/new-card/generated.js",
  "scripts/new-card/lib.js",
  "scripts/new-skin/index.js",
  "scripts/domains.js",
];

/** A string literal that names a package root or a bare @dashhaus specifier rather than going through the map. */
const HARD_CODED = [/(["'`])(?:\.\.\/)*packages\/(?:core|dashboard|deploy)\b/, /(["'`])src\/skins\//, /(["'`])@dashhaus\//];

describe("the generator package map", () => {
  it("is the root's workspace list", () => {
    expect(rootManifest.workspaces).toEqual(workspaces);
    expect(rootManifest.workspaces).toContain(generated.workspace);
  });

  it("names distinct packages whose manifests exist and agree with the map", () => {
    expect(new Set(Object.values(packages).map((pkg) => pkg.name)).size).toBe(2);
    for (const pkg of Object.values(packages)) {
      expect(JSON.parse(read(`${pkg.dir}/package.json`)).name).toBe(pkg.name);
      expect(pkg.exports).toBeTypeOf("object");
    }
  });

  it("describes a generated skin as a private workspace package with the root apps' surface", () => {
    const manifest = generatedManifest("canvas");
    expect(manifest.name).toBe("@dashhaus/canvas");
    expect(manifest.name).not.toBe("@dashhaus/core");
    expect(manifest.private).toBe(true);
    expect(manifest.type).toBe("module");
    expect(Object.keys(manifest.exports).sort()).toEqual([".", "./lovelace/card", "./storybook", "./styles/tokens.css"]);
    expect(manifest.dependencies).toHaveProperty("@dashhaus/core");
    expect(Object.keys(manifest.dependencies), "the Lovelace framework comes with core").toEqual(["@dashhaus/core"]);
    for (const target of Object.values(manifest.exports)) expect(target).toMatch(/^\.\//);
    for (const reserved of ["core", "dashboard", "deploy", "bundle", "fake-home-assistant"]) expect(() => generatedManifest(reserved)).toThrow(/reserved/);
  });

  it("marks a study in its manifest and nothing else", () => {
    expect(generatedManifest("canvas")).not.toHaveProperty("dashhaus");
    const theme = { global: "canvasTheme", light: "light", dark: "dark" };
    const study = generatedManifest("canvas", { study: true, Section: "Canvas", theme });
    expect(study.dashhaus).toEqual({ study: { theme } });
    expect(study.description).toMatch(/^A study: the Canvas skin an agent built/);
    expect({ ...study, description: undefined, dashhaus: undefined }).toEqual({ ...generatedManifest("canvas"), description: undefined, dashhaus: undefined });
  });

  it("ships the scaffolder every shared domain as the repository describes it", () => {
    expect(read(domainsFile), `${domainsFile} is behind @dashhaus/core: run npm run domains`).toBe(domainsJson());
  });

  it("hands a composed model's companions to its hook, from the YAML and from the automatic layout", async () => {
    const { registryLines, skinNames } = await import(pathToFileURL(join(root, skinTemplates.writer)).href);
    const { sensor } = JSON.parse(read(domainsFile));
    expect(sensor.companions).toEqual([{ key: "humidity", option: "humidityEntityId" }, { key: "battery", option: "batteryEntityId" }]);
    const { entry } = registryLines(sensor, skinNames("my-skin"));
    expect(entry).toContain('...mySkinCompanions(["humidity", "battery"])');
    expect(entry).toContain("humidityEntityId={item.companions?.humidity} batteryEntityId={item.companions?.battery}");
    expect(read(`${skinTemplates.skin}/lovelace/auto.ts`), "roomSensors finds a sensor's companions on its device; the layout must pass them on")
      .toContain('roomSensors(input).map(({ entity, ...companions }): CardConfig => ({ entity, kind: "sensor", ...(Object.keys(companions).length && { companions }) }))');
  });

  it("keeps one copy of every skin template: the in-repo overlays add files, never a second version of a shared one", () => {
    const files = (dir: string) => readdirSync(join(root, dir), { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name).slice(join(root, dir).length + 1));
    const shared = new Set([...files(skinTemplates.skin), ...files(skinTemplates.card)]);
    const overlays = ["repo", "repo-card", "study"].flatMap((overlay) => files(`scripts/new-skin/templates/${overlay}`).map((file) => ({ overlay, file })));
    expect(overlays.filter(({ file }) => shared.has(file)).map(({ overlay, file }) => `scripts/new-skin/templates/${overlay}/${file}`), "edit the shared template in packages/create-dashhaus-skin instead").toEqual([]);
  });

  it("has generated Card templates importing only declared @dashhaus subpaths", () => {
    const declared = (specifier: string) => {
      const [, name, ...rest] = specifier.split("/");
      const entry = Object.values(packages).find((pkg) => pkg.name === `@dashhaus/${name}`);
      if (!entry) return false;
      const key = rest.length ? `./${rest.join("/")}` : ".";
      return Object.keys(entry.exports).some((exported) => exported === key || (exported.endsWith("/*") && key.startsWith(exported.slice(0, -1))));
    };
    const templates = ["scripts/new-skin/templates", "scripts/new-card/templates", skinTemplates.skin, skinTemplates.card];
    const bad: string[] = [];
    for (const root of templates) {
      for (const file of readdirSync(join(process.cwd(), root), { recursive: true, encoding: "utf8" }).filter((path) => /\.(tsx?|js|mjs)$/.test(path))) {
        const path = `${root}/${file}`;
        for (const match of read(path).matchAll(/\bfrom\s+["'](@dashhaus\/[^"']+)["']/g)) {
          if (!declared(match[1])) bad.push(`${path}: ${match[1]}`);
        }
      }
    }
    expect(bad, "declare the subpath in the package manifest, or import a declared one").toEqual([]);
  });

  it("has no hard-coded package path left in a generator body", () => {
    const found: string[] = [];
    for (const path of GENERATORS) {
      const lines = read(path).split("\n");
      lines.forEach((line, index) => {
        if (HARD_CODED.some((pattern) => pattern.test(line))) found.push(`${path}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(found, "name the package in scripts/packages.js and cross it by path or specifier").toEqual([]);
  });
});
