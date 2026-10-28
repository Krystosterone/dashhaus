/**
 * Skins never import each other: what two skins share goes in src/domains/, src/primitives/, src/hooks/ or src/ha/. ESLint's
 * import patterns can't say "any skin but this one", so this resolves every relative import in each skin.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { describe, expect, it } from "vitest";

const skins = readdirSync(join(process.cwd(), "src/skins"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const SPEC = /(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g;

describe.each(skins)("the %s skin", (skin) => {
  const dir = `src/skins/${skin}`;
  const sources = readdirSync(join(process.cwd(), dir), { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f));

  it("imports no other skin", () => {
    const crossings: string[] = [];
    for (const file of sources) {
      const path = posix.join(dir, file);
      for (const [, spec] of readFileSync(join(process.cwd(), path), "utf8").matchAll(SPEC)) {
        const target = posix.normalize(posix.join(posix.dirname(path), spec));
        const [, , other] = target.split("/");
        if (target.startsWith("src/skins/") && other !== skin) crossings.push(`${path} → ${target}`);
      }
    }
    expect(crossings).toEqual([]);
  });

  it("has its own tokens, the one source of its colours", () => {
    expect(readdirSync(join(process.cwd(), dir, "styles"))).toContain("tokens.css");
  });
});
