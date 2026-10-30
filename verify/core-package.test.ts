/**
 * @dashhaus/core's declared subpaths are the package's interface: `./entities` is pure (no React, no DOM, no Node),
 * the browser entries carry no Node builtins, and only `./websocket` reaches the Home Assistant websocket client.
 * This walks the real import graph from each entry, the way a bundler would, rather than trusting folder names.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8"));
const CORE = "packages/core/src";

const read = (path: string) => readFileSync(join(root, path), "utf8");
const walk = (dir: string, out: string[] = []) => {
  for (const entry of readdirSync(join(root, dir))) {
    const path = posix.join(dir, entry);
    if (statSync(join(root, path)).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
};

const JS_SPECS = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /^\s*import\s+["']([^"']+)["']/gm,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];
const specs = (path: string) => [...read(path).matchAll(new RegExp(JS_SPECS.map((r) => r.source).join("|"), "g"))].map((m) => m[1] ?? m[2] ?? m[3]).filter(Boolean);

function resolveSpecifier(spec: string, from: string): string | undefined {
  if (spec.startsWith(".")) {
    const base = posix.normalize(posix.join(posix.dirname(from), spec));
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, `${base}/index.ts`, `${base}/index.tsx`]) {
      if (existsSync(join(root, candidate)) && statSync(join(root, candidate)).isFile()) return candidate;
    }
    return undefined;
  }
  return spec;
}

/** Every file reachable from an entry, and every bare package those files import. */
function graph(entry: string) {
  const seen = new Set<string>();
  const packages = new Set<string>();
  const visit = (path: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    if (!/\.(ts|tsx)$/.test(path)) return;
    for (const spec of specs(path)) {
      const target = resolveSpecifier(spec, path);
      if (!target) continue;
      if (target.startsWith(CORE)) visit(target);
      else packages.add(target);
    }
  };
  visit(entry);
  return { files: [...seen], packages: [...packages] };
}

const NODE_BUILTINS = /^(node:|assert$|buffer$|child_process$|crypto$|events$|fs$|http$|https$|module$|net$|os$|path$|process$|stream$|tls$|url$|util$|zlib$)/;
const BROWSER = [".", "./entities", "./primitives", "./hooks", "./websocket", "./demo"];
const sourceTarget = (subpath: string) => {
  const target = packageJson.exports[subpath];
  if (typeof target !== "object" || typeof target.source !== "string") {
    throw new Error(`@dashhaus/core has no source export for ${subpath}`);
  }
  return target.source;
};
const entry = (subpath: string) => `packages/core/${sourceTarget(subpath).replace(/^\.\//, "")}`;

describe("@dashhaus/core", () => {
  it("declares the package surface, its built files and its release metadata", () => {
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(packageJson.version).not.toBe("0.0.0");
    expect(packageJson.private).toBe(true);
    expect(packageJson.sideEffects).toBe(false);
    expect(packageJson.files).toEqual(["dist"]);
    expect(Object.keys(packageJson.exports)).toEqual(expect.arrayContaining([".", "./entities", "./entities/*", "./primitives", "./hooks", "./websocket", "./demo", "./testing", "./fixtures/*"]));
    for (const subpath of [".", "./entities", "./primitives", "./hooks", "./websocket", "./demo", "./testing"]) {
      expect(packageJson.exports[subpath].types, `${subpath} ships declarations`).toMatch(/^\.\/dist\/.+\.d\.ts$/);
      expect(packageJson.exports[subpath].import, `${subpath} ships ESM JavaScript`).toMatch(/^\.\/dist\/.+\.js$/);
      expect(packageJson.exports[subpath].default).toBe(packageJson.exports[subpath].import);
    }
    expect(packageJson.exports["./entities/*"].types).toBe("./dist/entities/*.d.ts");
    expect(packageJson.exports["./fixtures/*"].default).toBe("./dist/ha/fixtures/*");
    expect(packageJson.peerDependenciesMeta["home-assistant-js-websocket"].optional).toBe(true);
    expect(packageJson.peerDependenciesMeta.vitest.optional).toBe(true);
    expect(packageJson.peerDependenciesMeta["@testing-library/react"].optional).toBe(true);
  });

  it("has no CSS in any entry's graph", () => {
    for (const subpath of BROWSER) {
      const { files } = graph(entry(subpath));
      expect(files.filter((f) => f.endsWith(".css")), `${subpath} must stay CSS-free`).toEqual([]);
    }
  });

  it("keeps ./entities free of React, DOM and Node", () => {
    const files = walk(`${CORE}/entities`).filter((f) => /\.tsx?$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = read(file);
      expect(source, `${file} is framework-free`).not.toMatch(/\b(?:from\s+["']react(?:-dom)?(?:\/[^"']*)?["']|React\b)/);
      expect(source, `${file} has no DOM`).not.toMatch(/\b(?:document|window|navigator|localStorage|sessionStorage)\s*\./);
      expect(specs(file).filter((s) => NODE_BUILTINS.test(s)), `${file} is pure`).toEqual([]);
    }
  });

  it("gives the browser entries no Node builtins", () => {
    for (const subpath of BROWSER) {
      const { packages } = graph(entry(subpath));
      expect(packages.filter((p) => NODE_BUILTINS.test(p)), `${subpath} is a browser entry`).toEqual([]);
    }
  });

  it("owns the websocket client in ./websocket, not .", () => {
    expect(graph(entry(".")).packages, "the . entry must not import the client").not.toContain("home-assistant-js-websocket");
    expect(graph(entry("./websocket")).packages, "./websocket is the one address for it").toContain("home-assistant-js-websocket");
  });
});
