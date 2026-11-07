/**
 * What every card says has one home, spec/cards.md → What every card says, and a card's words and warnings are its
 * model's, in `@dashhaus/core`. This holds what a grep can of it, in Orb's and Field's card folders:
 *
 * - severity is ranked once, in core (`entities/<name>/severity.ts`): a card draws the level it is given and never
 *   declares a ranking of its own;
 * - before a first value every reading says `No reading yet` (or `Waiting…`, where Orb has room for a figure alone),
 *   never another phrase for it (`No reading since 10:20`, a reading that stopped, is a warning, not this).
 *
 * Studies keep their own design (spec/skins.md → Studies), so only the two skins are held here.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const SKINS = ["orb", "field"];

const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});

/** Each card folder's drawing: its components and helpers, without its tests and stories. */
const sources = SKINS.flatMap((skin) => files(join(root, "src/skins", skin, "cards")))
  .filter((path) => /\.tsx?$/.test(path) && !/\.(test|stories)\.tsx?$/.test(path))
  .map((path) => ({ path: relative(root, path), text: readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "") }));

/** Where a match is: `file:line`, with the line itself. */
const where = (path: string, text: string, index: number) => {
  const line = text.slice(0, index).split("\n").length;
  return `${path}:${line} ${text.split("\n")[line - 1].trim().slice(0, 120)}`;
};

const hits = (pattern: RegExp) => sources.flatMap(({ path, text }) =>
  [...text.matchAll(new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`))].map((m) => where(path, text, m.index!)));

describe("what every card says", () => {
  it("finds the skins' cards", () => {
    for (const skin of SKINS) expect(sources.filter(({ path }) => path.startsWith(`src/skins/${skin}/`)).length).toBeGreaterThan(10);
  });

  it("ranks severity in core: no card declares a severity function or a severity of its own", () => {
    expect(hits(/\bfunction\s+\w*[sS]everity\s*\(|\b(?:const|let)\s+\w*[sS]everity\w*\s*(?::[^=]+)?=\s*(?:\([^)]*\)|\w+)\s*=>|:\s*Severity\b[^=;)]*=\s*["']/)).toEqual([]);
  });

  it("says `No reading yet` before a first value, never another phrase for it", () => {
    const other = /["'`>](?:No (?:data|values?|figures?)\b|No reading(?!s? yet|s? since|\$\{)|No readings? available|Awaiting\b|Waiting for (?:data|a reading|readings|events|the first)|Loading\b)/;
    expect(hits(other)).toEqual([]);
  });
});
