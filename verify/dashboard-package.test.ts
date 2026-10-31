/**
 * @dashhaus/dashboard's declared subpaths are its interface: each entry is browser code with no Node builtins, no CSS
 * and no skin, and every package it reaches is React or a declared @dashhaus subpath. This walks the real import graph
 * from every entry, the way a bundler would, rather than trusting folder names; it also holds the Lovelace entry to
 * its one caller, a skin's lovelace/ card.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { describe, expect, it } from "vitest";
import * as conformance from "@dashhaus/dashboard/conformance";
import * as layout from "@dashhaus/dashboard/layout";
import * as schema from "@dashhaus/dashboard/schema";

const root = process.cwd();
const PACKAGE = "packages/dashboard";
const SOURCE = `${PACKAGE}/src`;
const packageJson = JSON.parse(readFileSync(join(root, PACKAGE, "package.json"), "utf8"));

const read = (path: string) => readFileSync(join(root, path), "utf8");

const JS_SPECS = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /^\s*import\s+["']([^"']+)["']/gm,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];
/** Type-only imports and re-exports do not exist at runtime, so they are not graph edges. */
const runtime = (path: string) => read(path)
  .replace(/^\s*import\s+type\b[^;]*?;?\s*$/gm, "")
  .replace(/^\s*export\s+type\b[^;]*?;?\s*$/gm, "");
const specs = (path: string) => JS_SPECS.flatMap((pattern) => [...runtime(path).matchAll(pattern)].map((match) => match[1]));
/** The stylesheet imports of a source file; a string that merely names a `.css` file is not an import. */
const stylesheets = (path: string) => specs(path).filter((spec) => /\.(css|scss|less)$/.test(spec));

function resolveSpecifier(spec: string, from: string): string | undefined {
  if (!spec.startsWith(".")) return undefined;
  const base = posix.normalize(posix.join(posix.dirname(from), spec));
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existsSync(join(root, candidate)) && statSync(join(root, candidate)).isFile()) return candidate;
  }
  return undefined;
}

/** Every file reachable from the entries, every bare package those files import, and any relative import that leaves. */
function graph(entries: string[]) {
  const files = new Set<string>();
  const packages = new Set<string>();
  const outside: string[] = [];
  const visit = (path: string) => {
    if (files.has(path)) return;
    files.add(path);
    if (!/\.(ts|tsx)$/.test(path)) return;
    for (const spec of specs(path)) {
      const target = resolveSpecifier(spec, path);
      if (target?.startsWith(`${SOURCE}/`)) visit(target);
      else if (target) outside.push(`${path} → ${spec} (${target})`);
      else if (!spec.startsWith(".")) packages.add(spec);
    }
  };
  for (const entry of entries) visit(entry);
  return { files: [...files], packages: [...packages], outside };
}

const NODE_BUILTINS = /^(node:|assert$|buffer$|child_process$|crypto$|events$|fs$|http$|https$|module$|net$|os$|path$|process$|stream$|tls$|url$|util$|zlib$)/;
/** The browser packages the entry may reach directly; everything else must be a declared @dashhaus subpath. */
const BROWSER = ["react", "react-dom/client"];

/** The workspace resolves source through the export's `source` condition; the graph walks those files. */
const sourceTarget = (subpath: string) => {
  const target = packageJson.exports[subpath];
  if (typeof target !== "object" || typeof target.source !== "string") {
    throw new Error(`@dashhaus/dashboard has no source export for ${subpath}`);
  }
  return target.source;
};

const entries = () => Object.keys(packageJson.exports).map((subpath) => `${PACKAGE}/${sourceTarget(subpath).replace(/^\.\//, "")}`);
/** The entries a browser may load. `./conformance` reads a skin's files, so it is Node- and test-only. */
const BROWSER_ENTRIES = [".", "./skin", "./card", "./schema", "./layout"];
const browserEntries = () => BROWSER_ENTRIES.map((subpath) => `${PACKAGE}/${sourceTarget(subpath).replace(/^\.\//, "")}`);

/** Whether a bare specifier names a subpath its package declares, wildcard exports included. */
function declared(spec: string): boolean {
  const [scope, name, ...rest] = spec.split("/");
  if (scope !== "@dashhaus" || !name) return false;
  const manifest = `packages/${name}/package.json`;
  if (!existsSync(join(root, manifest))) return false;
  const subpath = rest.length ? `./${rest.join("/")}` : ".";
  const exports: unknown = JSON.parse(read(manifest)).exports;
  if (typeof exports !== "object" || exports === null) return false;
  return Object.keys(exports).some((key) => key === subpath || (key.endsWith("/*") && subpath.startsWith(key.slice(0, -1))));
}

describe("@dashhaus/dashboard", () => {
  it("declares its six entries, its built files and its release metadata", () => {
    expect(packageJson.name).toBe("@dashhaus/dashboard");
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(packageJson.version).not.toBe("0.0.0");
    expect(packageJson.private).toBe(true);
    expect(packageJson.sideEffects).toBe(false);
    expect(packageJson.files).toEqual(["dist", "README.md"]);
    expect(Object.keys(packageJson.exports)).toEqual([".", "./skin", "./card", "./schema", "./layout", "./conformance"]);
    expect(packageJson.dependencies["@dashhaus/core"]).toBe(`^${packageJson.version}`);
  });

  it("exposes the skin runtime, the card frame, the card schema, the layout and the conformance preset on subpaths of their own", () => {
    const subpaths = ["./skin", "./card", "./schema", "./layout", "./conformance"];
    for (const subpath of subpaths) {
      expect(sourceTarget(subpath)).toMatch(new RegExp(`^\\./src/.+\\.tsx?$`));
      expect(sourceTarget(subpath)).not.toBe(sourceTarget("."));
      expect(packageJson.exports[subpath].types).toMatch(new RegExp(`^\\./dist/.+\\.d\\.ts$`));
      expect(packageJson.exports[subpath].import).toMatch(new RegExp(`^\\./dist/.+\\.js$`));
      expect(packageJson.exports[subpath].default).toBe(packageJson.exports[subpath].import);
    }
    expect(new Set([".", ...subpaths].map(sourceTarget)).size).toBe(subpaths.length + 1);
    expect(new Set([".", ...subpaths].map((subpath) => packageJson.exports[subpath].import)).size).toBe(subpaths.length + 1);
  });

  it("exposes exactly the schema's public words", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "DashboardConfigError",
      "MAIN_PAGE",
      "Reader",
      "cardKindOrder",
      "cardKinds",
      "isRaw",
      "oneOf",
      "readAlarmOptions",
      "readCard",
      "readCards",
      "readColor",
      "readOwletOptions",
      "readSensorOptions",
      "readUnit",
      "readWeatherOptions",
      "renderCard",
      "suggest",
    ]);
  });

  it("exposes exactly the layout's public words", () => {
    expect(Object.keys(layout).sort()).toEqual([
      "areaId",
      "areaName",
      "byName",
      "deviceClass",
      "domainOf",
      "friendlyName",
      "groupByArea",
      "placeSection",
      "roomSensors",
      "sortByName",
      "visibleEntities",
    ]);
  });

  it("exposes exactly the conformance preset's public words", () => {
    expect(Object.keys(conformance).sort()).toEqual(["cardFolders", "checkCards", "strayClasses"]);
  });

  it("keeps the schema and layout pure, so a Node config can import them", () => {
    for (const subpath of ["./schema", "./layout"]) {
      const { files, packages, outside } = graph([`${PACKAGE}/${sourceTarget(subpath).replace(/^\.\//, "")}`]);
      expect(outside, `${subpath} has no relative import that leaves the package`).toEqual([]);
      expect(packages, `${subpath} reaches no React, DOM or Home Assistant package`).toEqual([]);
      expect(files.filter((file) => file.includes("/skins/")), `${subpath} is skin-free`).toEqual([]);
      expect(files.filter((file) => stylesheets(file).length > 0), `${subpath} imports no stylesheet`).toEqual([]);
    }
  });

  it("keeps every reachable file inside the package, with no CSS and no skin", () => {
    const { files, outside } = graph(entries());
    expect(files.length).toBeGreaterThan(0);
    expect(outside, "no relative import leaves @dashhaus/dashboard").toEqual([]);
    expect(files.filter((file) => file.includes("/skins/")), "the framework is skin-free").toEqual([]);
    expect(files.filter((file) => stylesheets(file).length > 0), "the entries import no stylesheet").toEqual([]);
  });

  it("keeps the browser entries free of Node builtins", () => {
    const { packages } = graph(browserEntries());
    expect(packages.filter((spec) => NODE_BUILTINS.test(spec)), "the browser entries are browser code").toEqual([]);
  });

  it("keeps conformance Node-only and self-contained", () => {
    const { files, packages, outside } = graph([`${PACKAGE}/${sourceTarget("./conformance").replace(/^\.\//, "")}`]);
    expect(outside, "conformance has no relative import that leaves the package").toEqual([]);
    expect(files.filter((file) => file.includes("/skins/")), "conformance is skin-free").toEqual([]);
    expect(files.filter((file) => stylesheets(file).length > 0), "conformance imports no stylesheet").toEqual([]);
    expect(packages.filter((spec) => !NODE_BUILTINS.test(spec)), "conformance reaches only Node builtins").toEqual([]);
  });

  it("reaches only React and declared @dashhaus subpaths, never the websocket client", () => {
    const { packages } = graph(browserEntries());
    expect(packages.filter((spec) => !BROWSER.includes(spec) && !declared(spec)), "a package specifier is a declared subpath").toEqual([]);
    expect(packages, "the entry reaches the client through @dashhaus/core/websocket").not.toContain("home-assistant-js-websocket");
  });

  it("is imported only by a skin's lovelace/ card", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry.name)) files.push(path);
      }
    };
    walk("src/skins");
    expect(files.filter((file) => !file.includes("/lovelace/") && specs(file).includes("@dashhaus/dashboard"))).toEqual([]);
  });
});
