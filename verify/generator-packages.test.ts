/**
 * The generators treat the repo as a package graph through scripts/packages.mjs: one map holds where packages live,
 * which specifiers they declare, where a generated skin lives and which marker each registration targets. This
 * check fails if a generator reintroduces a package path or a bare `@dashhaus/…` literal, or if the map and the root
 * workspace list drift apart.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generated, generatedManifest, packages, workspaces } from "../scripts/packages.mjs";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const rootManifest = JSON.parse(read("package.json"));

/** The generator bodies; templates are generated source, and packages.mjs is the map itself. */
const GENERATORS = [
  "scripts/new-card/index.mjs",
  "scripts/new-card/field.mjs",
  "scripts/new-card/generated.mjs",
  "scripts/new-card/lib.mjs",
  "scripts/new-skin/index.mjs",
];

/** A string literal that names a package root or a bare @dashhaus specifier rather than going through the map. */
const HARD_CODED = [/(["'`])(?:\.\.\/)*packages\/(?:core|dashboard|deploy)\b/, /(["'`])src\/skins\//, /(["'`])@dashhaus\//];

describe("the generator package map", () => {
  it("is the root's workspace list", () => {
    expect(rootManifest.workspaces).toEqual(workspaces);
    expect(rootManifest.workspaces).toContain(generated.workspace);
  });

  it("names distinct packages whose manifests exist and agree with the map", () => {
    expect(new Set(Object.values(packages).map((pkg) => pkg.name)).size).toBe(3);
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
    expect(manifest.dependencies).toHaveProperty("@dashhaus/dashboard");
    for (const target of Object.values(manifest.exports)) expect(target).toMatch(/^\.\//);
    for (const reserved of ["core", "dashboard", "deploy"]) expect(() => generatedManifest(reserved)).toThrow(/reserved/);
  });

  it("has generated Card templates importing only declared @dashhaus subpaths", () => {
    const declared = (specifier: string) => {
      const [, name, ...rest] = specifier.split("/");
      const entry = Object.values(packages).find((pkg) => pkg.name === `@dashhaus/${name}`);
      if (!entry) return false;
      const key = rest.length ? `./${rest.join("/")}` : ".";
      return Object.keys(entry.exports).some((exported) => exported === key || (exported.endsWith("/*") && key.startsWith(exported.slice(0, -1))));
    };
    const templates = ["scripts/new-skin/templates", "scripts/new-card/templates"];
    const bad: string[] = [];
    for (const root of templates) {
      for (const file of readdirSync(join(process.cwd(), root), { recursive: true, encoding: "utf8" }).filter((path) => /\.(tsx?|mjs)$/.test(path))) {
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
    expect(found, "name the package in scripts/packages.mjs and cross it by path or specifier").toEqual([]);
  });
});
