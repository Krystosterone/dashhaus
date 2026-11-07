/**
 * What every card says has one home, spec/cards.md → What every card says, and a card's words and warnings are its
 * model's, in `@dashhaus/core`. This holds what a grep can of it, in Orb's and Field's card folders:
 *
 * - severity is ranked once, in core (`entities/<name>/severity.ts`): a card draws the level it is given and never
 *   declares a ranking of its own;
 * - before a first value every reading says `No reading yet` (or `Waiting…`, where Orb has room for a figure alone),
 *   never another phrase for it (`No reading since 10:20`, a reading that stopped, is a warning, not this);
 * - an unavailable card says when it was last seen as `lastSeenFact` does (`Last seen 08:20`), never `Seen 08:20`;
 * - a blank figure says one of two things: `No reading yet` where the device declares the figure but hasn't sent it,
 *   `Not reported` where it doesn't declare it and a fixed place must still hold something, never a phrase of the
 *   card's own for either (`No room temperature`, `No heart rate yet`, `Direction not reported`).
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

  it("says `No reading yet` for a declared figure not sent yet, never a phrase of its own for one figure", () => {
    // A list that hasn't been read yet (the weather's `No forecast yet`) is not a figure, so it says its own words.
    const own = /["'`>]No (?!reading(?:s)? (?:yet|since)\b|new reading|forecast\b)(?:[a-z]+ ){0,2}(?:reading|readings|yet)\b|["'`>]No (?:room|temperature|warmth|humidity|direction|speed|level|colou?r|heart rate|oxygen|value)\b(?! (?:to|is|today|left|more))/;
    expect(hits(own)).toEqual([]);
  });

  it("says `Not reported` for a figure the device doesn't declare, never another phrase for it", () => {
    const other = /["'`>](?:[A-Z][a-z]+(?: [a-z]+)? not reported|Not (?:available|supported|known|declared)\b|Unreported\b|N\/A\b)|["'`>]not reported\b/;
    expect(hits(other)).toEqual([]);
  });

  it("says when an unavailable card was last seen in core's words (`lastSeenFact`), never a bare `Seen`", () => {
    expect(hits(/["'`>]Seen (?:\$\{|\d)/)).toEqual([]);
  });
});
