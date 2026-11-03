/**
 * A card is composition: what two cards of one skin both need is a part in the skin's `shared/` (or behaviour in
 * `@dashhaus/core`), never a copy in each card folder (research/mechanism-backlog.md → 2). This finds the copies a grep
 * can: a component whose source is the same in two card folders of a skin once each card's class code is set aside
 * (a keypad pasted from the alarm into the lock), and a CSS rule of three or more declarations, on one card class, that
 * another card of the skin writes again (a key group's grid). A name two cards share isn't a copy (orb's alarm and
 * climate both have a `ModeIcon`, of different modes); only the same body is.
 *
 * `KNOWN` lists the copies there are today, each with what it is, so the next copy fails where it is written; moving
 * one into a part removes its row, and a row whose copy is gone fails until it is removed.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const skinsDir = join(root, "src/skins");

/**
 * The copies there are today, each `<skin>: <kind> <what> in <cards>` with what it is: a part waiting to be made.
 * None now; a copy that has to stay for a while is listed here with its reason, never left to pass unseen.
 */
const KNOWN: Record<string, string> = {};

const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});

/** A card folder's own source: its components and stylesheets, not its stories, tests or demo seeds. */
const own = (path: string) => !/\.(stories|test)\.tsx?$/.test(path) && !path.includes("/demo/");

/** Each top-level component's source, by name: `function Name(` or `const Name = (` to the brace that closes it at the margin. */
function components(source: string): [string, string][] {
  return [...source.matchAll(/^(?:export )?(?:function ([A-Z][a-z]\w*)\b|const ([A-Z][a-z]\w*) = (?:\([^)]*\)|\w+) =>)[\s\S]*?^\}?;?$/gm)]
    .map((match) => [match[1] ?? match[2], match[0]] as [string, string])
    .filter(([, body]) => body.split("\n").length >= 5);
}

/** The fewest declarations a copied rule has to have to count: fewer is a coincidence, not a part. */
const MIN_DECLARATIONS = 3;

/** A rule's declarations, sorted and joined, for rules on one class with at least `MIN_DECLARATIONS` of them. */
function blocks(css: string): string[] {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...bare.matchAll(/(?<=^|\})\s*([^{}@]+?)\s*\{([^{}]+)\}/g)]
    .filter(([, selector]) => /^\.[\w-]+$/.test(selector.trim()))
    .map(([, , body]) => body.split(";").map((d) => d.trim().replace(/\s+/g, " ")).filter(Boolean).sort())
    .filter((decls) => decls.length >= MIN_DECLARATIONS)
    .map((decls) => decls.join("; "));
}

/** Set each card's class code aside, so a copy with its prefix changed (`al-kp` to `lk-kp`) is still the same. */
const uncoded = (source: string) => source.replace(/\b(?:fd-)?[a-z]{2}-(?=[a-z])/g, "<code>-").replace(/\s+/g, " ");

function copies(skin: string): string[] {
  const cardsDir = join(skinsDir, skin, "cards");
  const found = new Map<string, Set<string>>();
  const note = (key: string, card: string) => found.set(key, (found.get(key) ?? new Set()).add(card));
  for (const card of readdirSync(cardsDir).filter((name) => statSync(join(cardsDir, name)).isDirectory())) {
    for (const path of files(join(cardsDir, card)).filter(own)) {
      const source = readFileSync(path, "utf8");
      if (path.endsWith(".tsx")) for (const [name, body] of components(source)) note(`component ${name}\n${uncoded(body)}`, card);
      if (path.endsWith(".css")) for (const body of blocks(source)) note(`css ${body}`, card);
    }
  }
  return [...found].filter(([, cards]) => cards.size > 1).map(([key, cards]) => `${skin}: ${key.split("\n")[0]} in ${[...cards].sort().join(", ")}`);
}

const skins = readdirSync(skinsDir).filter((skin) => {
  try { return statSync(join(skinsDir, skin, "cards")).isDirectory(); } catch { return false; }
});

describe("card folders", () => {
  it.each(skins)("in %s copy no component or class block another card already has", (skin) => {
    const found = copies(skin).filter((copy) => !(copy in KNOWN));
    expect(found, "make it a part in the skin's shared/ (or core) and draw both cards on it; AGENTS.md → Vocabulary, Part").toEqual([]);
  });

  it("lists no copy that is gone", () => {
    const all = new Set(skins.flatMap(copies));
    expect(Object.keys(KNOWN).filter((copy) => !all.has(copy)), "remove its row from KNOWN").toEqual([]);
  });

  it("finds a copied component and a copied rule", () => {
    const keypad = "function Keypad({ prompt }: { prompt: string }) {\n  return (\n    <div className=\"al-kp\">\n      {prompt}\n    </div>\n  );\n}";
    expect(uncoded(components(keypad)[0][1])).toBe(uncoded(components(keypad.replace("al-kp", "lk-kp"))[0][1]));
    expect(blocks(".al-keys { display: grid; gap: 8px; min-width: 0; grid-auto-flow: column; }")).toEqual(blocks(".lk-keys { grid-auto-flow: column; display: grid; min-width: 0; gap: 8px; }"));
    expect(blocks(".al-keys { display: grid; gap: 8px; }")).toEqual([]);
  });
});
