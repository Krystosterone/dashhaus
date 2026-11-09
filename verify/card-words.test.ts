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
 *   card's own for either (`No room temperature`, `No heart rate yet`, `Direction not reported`);
 * - a skin never formats a time itself, in its cards or its shared parts (an hour axis among them): it passes
 *   `useHourCycle()` to core's words (`hourLabel`, `formatHaTime`, …), so every time is on the dashboard's one clock.
 * - a guard's words are core's (`@dashhaus/core/entities/guard`, the domain's `coverQuestion`, `lockAskDetail`…): no
 *   card passes its question part (`Confirm`) a question, a meaning, a yes, a waiting line or a failure of its own
 *   words, only core's with the skin's end punctuation; no card or part writes `Try again` itself;
 * - what asks first is said in core's words too: no card writes a sentence ending `asks first.` (the hint,
 *   `COVER_ASKS_HINT`, `lockAsksHint`), only the skin's mark on a control's name (Field's `: asks first`).
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

/** A skin folder's drawing (`cards`, `shared`): its components and helpers, without its tests and stories. */
const drawing = (folder: string) => SKINS.flatMap((skin) => files(join(root, "src/skins", skin, folder)))
  .filter((path) => /\.tsx?$/.test(path) && !/\.(test|stories)\.tsx?$/.test(path))
  .map((path) => ({ path: relative(root, path), text: readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "") }));
/** Each card folder's drawing. */
const sources = drawing("cards");

/** Where a match is: `file:line`, with the line itself. */
const where = (path: string, text: string, index: number) => {
  const line = text.slice(0, index).split("\n").length;
  return `${path}:${line} ${text.split("\n")[line - 1].trim().slice(0, 120)}`;
};

/** Each `<Name …/>` in a source, to its own closing `/>` (the braces of its props balanced), with where it starts. */
function elements(text: string, name: string) {
  return [...text.matchAll(new RegExp(`<${name}\\b`, "g"))].map((m) => {
    let depth = 0, i = m.index!;
    for (; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      else if (depth === 0 && text.startsWith("/>", i)) break;
    }
    return Object.assign([text.slice(m.index!, i + 2)], { index: m.index! });
  });
}

const hits = (pattern: RegExp, among = sources) => among.flatMap(({ path, text }) =>
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

  it("says a guard's words in core's: no question part takes a literal, and no card or part writes Try again", () => {
    const literal = /"[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*'|`(?:[^`$]|\$(?!\{)|\$\{[^}]*\})*`/g;
    const own: string[] = [];
    for (const { path, text } of sources) {
      for (const confirm of elements(text, "Confirm")) {
        for (const prop of confirm[0].matchAll(/\b(question|detail|action|waiting|error)=("[^"]*"|\{)/g)) {
          let value = prop[2];
          if (value === "{") {
            // The expression, to its closing brace.
            let depth = 0, i = confirm.index! + prop.index! + prop[0].length - 1;
            const from = i;
            for (; i < text.length; i++) { if (text[i] === "{") depth++; else if (text[i] === "}" && --depth === 0) break; }
            value = text.slice(from, i + 1);
          }
          const words = [...value.matchAll(literal)].map((m) => m[0].replace(/\$\{[^}]*\}/g, "")).filter((l) => /[A-Za-z]/.test(l));
          if (words.length) own.push(`${where(path, text, confirm.index! + prop.index!)} → ${prop[1]}: ${words.join(", ")}`);
        }
      }
    }
    expect(own, "a guard's words are core's: @dashhaus/core/entities/guard, or the domain's words").toEqual([]);
    expect(hits(/["'`>][^"'`<]*Try again/, [...sources, ...drawing("shared")]), "say core's ACTION_FAILED or WRONG_CODE").toEqual([]);
  });

  it("says what asks first in core's words, never a hint sentence of a card's own", () => {
    expect(hits(/["'`>][^"'`<\n]*\basks? first\./)).toEqual([]);
  });

  it("never formats a time itself, in a card or a shared part: every time is core's words on the page's hour cycle", () => {
    // A weekday or a date (`toLocaleDateString` with `weekday`) isn't on a clock, so it isn't held here.
    const own = /\.toLocaleTimeString\(|\.toLocaleString\(|\bIntl\.DateTimeFormat\b|\.get(?:UTC)?(?:Hours|Minutes)\(\)|\bhour12\s*:|\.padStart\(\s*2\b/;
    expect(hits(own, [...sources, ...drawing("shared")]), "pass useHourCycle() to core's words (hourLabel, formatHaTime, clockTime, …)").toEqual([]);
  });
});
