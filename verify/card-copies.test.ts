/**
 * A card is composition: what two cards of one skin both need is a part in the skin's `shared/` (or behaviour in
 * `@dashhaus/core`), never a copy in each card folder (AGENTS.md → Vocabulary, Part). This finds the copies a grep
 * can: a component whose source is the same in two card folders of a skin once each card's class code is set aside
 * (a keypad pasted from the alarm into the lock), and a CSS rule of three or more declarations that another card of the
 * skin writes again, whatever its selector, inside an at-rule or not, once each card's code is set aside in both (a key
 * group's grid; a binary sensor's `.hd--compact .bs-f` and a camera's `.hd--compact .cm-f`, the one word under two
 * prefixes). A block of colours alone is a card's own (its resting ink), so it never counts. A name two cards share
 * isn't a copy (orb's alarm and climate both have a `ModeIcon`, of different modes); only the same body is.
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

/**
 * Each top-level component's source, by name: `function Name(` or `const Name = (` to the `}`, `};` or `);` that closes
 * it at the margin. A blank line inside the body doesn't end it.
 */
function components(source: string): [string, string][] {
  return [...source.matchAll(/^(?:export )?(?:function ([A-Z][a-z]\w*)\b|const ([A-Z][a-z]\w*) = (?:\([^)]*\)|\w+) =>)[\s\S]*?^(?:\};?|\);)$/gm)]
    .map((match) => [match[1] ?? match[2], match[0]] as [string, string])
    .filter(([, body]) => body.split("\n").length >= 5);
}

/**
 * The fewest declarations a copied rule has to have to count: fewer is a coincidence, not a part. Two are too few: a
 * focus ring (`outline`, `outline-offset`) is written on many cards' own controls without being one part.
 */
const MIN_DECLARATIONS = 3;

/** A colour a card may set on its own: a block of only these is the card's (its resting or warning ink), never a copy. */
const COLOUR = /^(?:color|background(?:-color)?|fill|stroke|(?:border|outline|text-decoration|caret|accent)(?:-[a-z]+)?-color|opacity)$/;

/** Every rule's selector and declarations, flattened out of at-rules; keyframe stops aren't rules. */
function rules(css: string): { selector: string; decls: string[] }[] {
  const out: { selector: string; decls: string[] }[] = [];
  const heads: string[] = [];
  let text = "";
  for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (char === "{") { heads.push(text.trim()); text = ""; }
    else if (char === "}") {
      const selector = heads.pop() ?? "";
      const inKeyframes = heads.some((head) => /^@(?:-\w+-)?keyframes\b/.test(head));
      if (selector && !selector.startsWith("@") && !inKeyframes) out.push({ selector, decls: text.split(";").map((d) => d.trim().replace(/\s+/g, " ")).filter(Boolean) });
      text = "";
    } else text += char;
  }
  return out;
}

/**
 * Each rule's declarations, sorted and joined with every card code set aside, for rules of at least `MIN_DECLARATIONS`
 * that set more than colours: the key two cards' copies share whatever their selectors.
 */
function blocks(css: string): string[] {
  return rules(css)
    .map(({ decls }) => decls.sort())
    .filter((decls) => decls.length >= MIN_DECLARATIONS && !decls.every((d) => COLOUR.test(d.split(":")[0].trim())))
    .map((decls) => uncoded(decls.join("; ")));
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
    const keypad = "function Keypad({ prompt }: { prompt: string }) {\n  const shown = prompt;\n\n  return (\n    <div className=\"al-kp\">\n      {shown}\n    </div>\n  );\n}";
    expect(uncoded(components(keypad)[0][1])).toBe(uncoded(components(keypad.replace("al-kp", "lk-kp"))[0][1]));
    expect(blocks(".al-keys { display: grid; gap: 8px; min-width: 0; grid-auto-flow: column; }")).toEqual(blocks(".lk-keys { grid-auto-flow: column; display: grid; min-width: 0; gap: 8px; }"));
    expect(blocks(".al-keys { display: grid; gap: 8px; }")).toEqual([]);
    // Under two prefixes, in a compound selector, inside an at-rule: still the same block.
    expect(blocks(".hd--compact .bs-f { font-size: 13.5px; font-weight: 700; letter-spacing: 0; }"))
      .toEqual(blocks("@container hd (max-width: 259px) { .cm:not(.hd--sheet) .cm-f { letter-spacing: 0; font-weight: 700; font-size: 13.5px; } }"));
    expect(blocks(".fd-lk .fd-lk-x { --fd-lk-w: 2px; width: var(--fd-lk-w); height: 4px; }")).toEqual(blocks(".fd-cm .fd-cm-x { --fd-cm-w: 2px; width: var(--fd-cm-w); height: 4px; }"));
    // A card's own colours, and a keyframe's stops, are never a copy.
    expect(blocks(".bs[data-state=\"off\"] .bs-f { color: var(--ink-2); fill: var(--ink-2); background-color: var(--well); }")).toEqual([]);
    expect(blocks("@keyframes x { from { opacity: 0; transform: none; scale: 1; } }")).toEqual([]);
  });
});
