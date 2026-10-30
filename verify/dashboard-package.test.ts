/**
 * @scope/dashboard's declared subpaths are its interface: each entry is browser code with no Node builtins, no CSS
 * and no skin, and every package it reaches is React or a declared @scope subpath. This walks the real import graph
 * from every entry, the way a bundler would, rather than trusting folder names; it also holds the Lovelace entry to
 * its one caller, a skin's lovelace/ card.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { describe, expect, it } from "vitest";

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
const specs = (path: string) => JS_SPECS.flatMap((pattern) => [...read(path).matchAll(pattern)].map((match) => match[1]));

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
/** The browser packages the entry may reach directly; everything else must be a declared @scope subpath. */
const BROWSER = ["react", "react-dom/client"];

const entries = () => Object.entries(packageJson.exports).map(([subpath, target]) => {
  if (typeof target !== "string") throw new Error(`@scope/dashboard has no string export for ${subpath}`);
  return `${PACKAGE}/${target.replace(/^\.\//, "")}`;
});

/** Whether a bare specifier names a subpath its package declares, wildcard exports included. */
function declared(spec: string): boolean {
  const [scope, name, ...rest] = spec.split("/");
  if (scope !== "@scope" || !name) return false;
  const manifest = `packages/${name}/package.json`;
  if (!existsSync(join(root, manifest))) return false;
  const subpath = rest.length ? `./${rest.join("/")}` : ".";
  const exports: unknown = JSON.parse(read(manifest)).exports;
  if (typeof exports !== "object" || exports === null) return false;
  return Object.keys(exports).some((key) => key === subpath || (key.endsWith("/*") && subpath.startsWith(key.slice(0, -1))));
}

describe("@scope/dashboard", () => {
  it("declares its one package surface and is side-effect free", () => {
    expect(packageJson.name).toBe("@scope/dashboard");
    expect(packageJson.version).toBe("0.0.0");
    expect(packageJson.private).toBe(true);
    expect(packageJson.sideEffects).toBe(false);
    expect(Object.keys(packageJson.exports)).toEqual([".", "./card"]);
  });

  it("exposes the card frame on a subpath of its own", () => {
    expect(packageJson.exports["./card"]).toBeTypeOf("string");
    expect(packageJson.exports["./card"]).not.toBe(packageJson.exports["."]);
  });

  it("keeps every reachable file inside the package, with no CSS, no skin and no Node builtin", () => {
    const { files, packages, outside } = graph(entries());
    expect(files.length).toBeGreaterThan(0);
    expect(outside, "no relative import leaves @scope/dashboard").toEqual([]);
    expect(files.filter((file) => file.includes("/skins/")), "the framework is skin-free").toEqual([]);
    expect(files.filter((file) => /\.(css|scss|less)["']/.test(read(file))), "the entries import no stylesheet").toEqual([]);
    expect(packages.filter((spec) => NODE_BUILTINS.test(spec)), "the entry is browser code").toEqual([]);
  });

  it("reaches only React and declared @scope subpaths, never the websocket client", () => {
    const { packages } = graph(entries());
    expect(packages.filter((spec) => !BROWSER.includes(spec) && !declared(spec)), "a package specifier is a declared subpath").toEqual([]);
    expect(packages, "the entry reaches the client through @scope/core/websocket").not.toContain("home-assistant-js-websocket");
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
    expect(files.filter((file) => !file.includes("/lovelace/") && specs(file).includes("@scope/dashboard"))).toEqual([]);
  });
});
