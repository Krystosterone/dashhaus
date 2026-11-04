/**
 * Skins never import each other: what two skins share goes in @dashhaus/core. ESLint's import patterns can't say
 * "any skin but this one", so this resolves every import in each skin: relative paths, bare or aliased specifiers
 * (a workspace alias, an absolute repo path) and CSS `@import`. A file directly under src/skins/ would be shared
 * by the skins, so only a skin's test may import it.
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, posix } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const skins = readdirSync(join(root, "src/skins"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const require = createRequire(join(root, "package.json"));

/** `from "…"`, `import "…"`, `import("…")`, `require("…")` and CSS `@import "…"`, multi-line included. */
const JS_SPECS = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /^\s*import\s+["']([^"']+)["']/gm,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];
const CSS_SPECS = [/@import\s+(?:url\(\s*)?["']([^"']+)["']/g];

/** Every import specifier in a source file, without its query suffix (`?raw`). */
export function specifiers(source: string, file: string) {
  const found = new Set<string>();
  for (const pattern of file.endsWith(".css") ? CSS_SPECS : JS_SPECS) {
    for (const match of source.matchAll(pattern)) found.add(match[1].split("?")[0]);
  }
  return [...found];
}

/** A specifier's target relative to the repo root, or undefined when it belongs to a dependency. */
export function resolveSpecifier(spec: string, file: string): string | undefined {
  if (spec.startsWith(".")) return posix.normalize(posix.join(posix.dirname(file), spec));
  if (spec.startsWith("/")) return posix.normalize(spec.slice(1));
  if (spec.startsWith("src/")) return spec;
  // A skin by its package name: Node's resolver ignores the `source` condition, so it finds no built dist and throws.
  const skin = /^@dashhaus\/([^/]+)/.exec(spec)?.[1];
  if (skin && skins.includes(skin)) return `src/skins/${skin}/index.ts`;
  // A bare specifier: a package, or an alias that resolves into another skin.
  try {
    const resolved = require.resolve(spec);
    return posix.normalize(resolved.startsWith(root) ? resolved.slice(root.length + 1) : resolved);
  } catch {
    return undefined;
  }
}

/** The crossings in one file: another skin, or the shared helper beside the skins from a non-test file. */
export function crossings(file: string, source: string, resolve = resolveSpecifier) {
  const [, , skin] = file.split("/");
  const bad: string[] = [];
  for (const spec of specifiers(source, file)) {
    const target = resolve(spec, file);
    if (!target || !target.startsWith("src/skins/")) continue;
    const [, , other] = target.split("/");
    const otherSkin = skins.includes(other) && other !== skin;
    const helper = !skins.includes(other) && !/\.test\.tsx?$/.test(file);
    if (otherSkin || helper) bad.push(`${file} → ${spec} (${target})`);
  }
  return bad;
}

describe.each(skins)("the %s skin", (skin) => {
  const dir = `src/skins/${skin}`;
  const sources = readdirSync(join(root, dir), { recursive: true, encoding: "utf8" }).filter((f) => /\.(tsx?|css)$/.test(f));

  it("imports no other skin", () => {
    const found = sources.flatMap((file) => crossings(posix.join(dir, file), readFileSync(join(root, dir, file), "utf8")));
    expect(found).toEqual([]);
  });

  it("has its own tokens, the one source of its colours", () => {
    expect(readdirSync(join(root, dir, "styles"))).toContain("tokens.css");
  });
});

describe("the import scanner", () => {
  it("catches a relative import, an absolute path, an alias and a CSS @import into another skin", () => {
    const orb = "src/skins/orb";
    expect(crossings(`${orb}/cards/x/X.tsx`, 'import { y } from "../../../field/cards/y/Y";')).toHaveLength(1);
    expect(crossings(`${orb}/cards/x/X.tsx`, 'import { y } from "src/skins/field/cards/y/Y";')).toHaveLength(1);
    expect(crossings(`${orb}/cards/x/X.tsx`, 'import { y } from "@alias/field";', (spec) => spec === "@alias/field" ? "src/skins/field/index.ts" : undefined)).toHaveLength(1);
    expect(crossings(`${orb}/styles/tokens.css`, '@import "../../field/styles/tokens.css";')).toHaveLength(1);
    expect(crossings(`${orb}/cards/x/X.tsx`, 'import { LightModule } from "@dashhaus/field";')).toHaveLength(1);
  });

  it("leaves @dashhaus/core, its own skin and a test's shared helper alone", () => {
    const orb = "src/skins/orb";
    expect(crossings(`${orb}/ha/HaLightTile.tsx`, 'import { HaProvider } from "@dashhaus/core";\nimport { LightEntity } from "@dashhaus/core/entities/light/types";')).toEqual([]);
    expect(crossings(`${orb}/cards/x/X.tsx`, 'import { Card } from "./X";\nimport { N } from "../../n/N";')).toEqual([]);
    expect(crossings(`${orb}/cards/x/X.test.tsx`, 'import { read } from "../../../conformance";')).toEqual([]);
    expect(crossings(`${orb}/cards/x/X.tsx`, 'import { read } from "../../../conformance";')).toHaveLength(1);
  });
});
