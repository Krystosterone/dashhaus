/**
 * A card is composition: what two cards of one skin both need is a part in the skin's `shared/` (or behaviour in
 * `@dashhaus/core`), never a copy in each card folder, and what the skin's `shared/` already draws a card uses rather
 * than writes again (AGENTS.md → Vocabulary, Part). This finds the copies a grep can: a component whose source is the
 * same in two card folders of a skin once each card's class code is set aside (a keypad pasted from the alarm into the
 * lock), and a CSS rule's declarations written again, whatever its selector, inside an at-rule or not, once each card's
 * code is set aside (a key group's grid; a binary sensor's `.hd--compact .bs-f` and a camera's `.hd--compact .cm-f`,
 * the one word under two prefixes):
 *
 * - three or more declarations that another card of the skin writes, or that a stylesheet in the skin's `shared/`
 *   already has (a cover's open and close groove, the stepper's `.hd-step`);
 * - two declarations written in three places or more, the skin's `shared/` counting as one (the reading's two metric
 *   tracks a binary sensor, a camera and a sensor each set). A pair in two places is left alone: at that size it is as
 *   often an idiom two cards both reach for (`display: flex; align-items: baseline`) as a part.
 *
 * Two kinds of block are a card's own and never count: colours alone (its resting or warning ink), and a focus ring
 * (`outline` and `outline-offset` alone), which every control draws around itself whatever it is. A name two cards
 * share isn't a copy (orb's alarm and climate both have a `ModeIcon`, of different modes); only the same body is.
 *
 * `KNOWN` lists the copies there are today, each with what it is, so the next copy fails where it is written; moving
 * one into a part removes its row, and a row whose copy is gone fails until it is removed.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const skinsDir = join(root, "src/skins");

/**
 * The copies there are today, each as the check names it, with why it stays for now; a copy that has to stay a while is
 * listed here with its reason, never left to pass unseen.
 */
const KNOWN: Record<string, string> = {
  "orb: css { background: transparent; box-shadow: none; color: var(--ink-3) } in cover (.cv-oc-b:disabled > span) and shared/card.css (.hd-step-b:disabled > span)":
    "the cover's open and close ends are the stepper's (hd-step-b) but for its hover, which they don't have: drawing them on hd-step-b gives them it, a design call",
  "orb: css { background: transparent; box-shadow: none; color: var(--ink-3); cursor: default } in climate (.cw-fine-b:disabled) and shared/card.css (.hd-pill:disabled)":
    "a disabled button lies flat (spec/orb.md → One UI language), on the climate's round fine-step buttons and the shared pill alike; the climate's are a 40 px circle of their own, not a pill, so they keep their rule until orb's buttons share one disabled state",
  "glasshouse: css { display: grid; gap: 4px; min-width: 0 } in lock (.glasshouse-lock-copy) and shared/ui.css (.glasshouse-stat)":
    "a study, as its agent built it: the lock's state and caption are stacked as a stat's label and figure are; a stack of the study's own would hold both",
};

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

/** The fewest declarations a copied rule has to have to count in two places; one alone is a coincidence. */
const MIN_DECLARATIONS = 3;
/** A pair of declarations counts only where this many places write it, the skin's `shared/` counting as one. */
const PAIR_PLACES = 3;

/** A colour a card may set on its own: a block of only these is the card's (its resting or warning ink), never a copy. */
const COLOUR = /^(?:color|background(?:-color)?|fill|stroke|(?:border|outline|text-decoration|caret|accent)(?:-[a-z]+)?-color|opacity)$/;
/** A focus ring's: every control draws its own around itself, so a block of only these is never a copy. */
const RING = /^outline(?:-offset)?$/;

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
 * Each rule's declarations, sorted and joined with every card code set aside, for rules of two or more that set more
 * than colours or a focus ring: the key two places' copies share whatever their selectors, with its selector and size.
 */
function blocks(css: string): { key: string; selector: string; size: number }[] {
  const property = (d: string) => d.split(":")[0].trim();
  return rules(css)
    .map(({ selector, decls }) => ({ selector: selector.replace(/\s+/g, " "), decls: [...decls].sort() }))
    .filter(({ decls }) => decls.length >= 2 && !decls.every((d) => COLOUR.test(property(d))) && !decls.every((d) => RING.test(property(d))))
    .map(({ selector, decls }) => ({ key: uncoded(decls.join("; ")), selector, size: decls.length }));
}

/**
 * Whether a block of `size` declarations is a copy where `cards` card folders write it, and the skin's `shared/` too
 * when `shared`: three or more in two places (a card's and another card's, or a card's and the shared one), two in
 * `PAIR_PLACES`. A copy needs a card: what `shared/` alone writes twice is the skin's own business.
 */
const copied = (size: number, cards: number, shared: boolean) =>
  cards > 0 && (size >= MIN_DECLARATIONS ? cards + (shared ? 1 : 0) >= 2 : cards + (shared ? 1 : 0) >= PAIR_PLACES);

/** Set each card's class code aside, so a copy with its prefix changed (`al-kp` to `lk-kp`) is still the same. */
const uncoded = (source: string) => source.replace(/\b(?:fd-)?[a-z]{2}-(?=[a-z])/g, "<code>-").replace(/\s+/g, " ");

/** Each copy in a skin, named with every place it is written and the selectors there, then what to do about it. */
function copies(skin: string): string[] {
  const cardsDir = join(skinsDir, skin, "cards");
  const sharedDir = join(skinsDir, skin, "shared");
  const shared = "shared/";
  const parts = new Map<string, Set<string>>();
  const notePart = (key: string, card: string) => parts.set(key, (parts.get(key) ?? new Set()).add(card));
  const css = new Map<string, { size: number; at: Map<string, Set<string>> }>();
  const noteCss = (place: string, { key, selector, size }: { key: string; selector: string; size: number }) => {
    const block = css.get(key) ?? css.set(key, { size, at: new Map() }).get(key)!;
    (block.at.get(place) ?? block.at.set(place, new Set()).get(place)!).add(selector);
  };
  for (const card of readdirSync(cardsDir).filter((name) => statSync(join(cardsDir, name)).isDirectory())) {
    for (const path of files(join(cardsDir, card)).filter(own)) {
      const source = readFileSync(path, "utf8");
      if (path.endsWith(".tsx")) for (const [name, body] of components(source)) notePart(`component ${name}\n${uncoded(body)}`, card);
      if (path.endsWith(".css")) for (const block of blocks(source)) noteCss(card, block);
    }
  }
  if (existsSync(sharedDir)) {
    for (const path of files(sharedDir).filter((p) => p.endsWith(".css"))) {
      for (const block of blocks(readFileSync(path, "utf8"))) noteCss(`${shared}${relative(sharedDir, path)}`, block);
    }
  }
  const named = (at: Map<string, Set<string>>) => {
    const places = [...at.keys()].sort((a, b) => Number(a.startsWith(shared)) - Number(b.startsWith(shared)) || a.localeCompare(b));
    const list = places.map((place) => `${place} (${[...at.get(place)!].join(" | ")})`);
    return list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list.at(-1)}` : list[0];
  };
  return [
    ...[...parts].filter(([, cards]) => cards.size > 1).map(([key, cards]) => `${skin}: ${key.split("\n")[0]} in ${[...cards].sort().join(", ")}`),
    ...[...css].flatMap(([key, { size, at }]) => {
      const sharedAt = [...at.keys()].filter((place) => place.startsWith(shared));
      const cards = at.size - sharedAt.length;
      return copied(size, cards, sharedAt.length > 0) ? [`${skin}: css { ${key} } in ${named(at)}`] : [];
    }),
  ];
}

/** What to do about a copy: use the shared rule it repeats, or make the one block the cards share. */
const fix = (copy: string) => (copy.includes(" shared/")
  ? "use the shared class it repeats, or add the card's selector to that shared rule, and delete the card's copy"
  : "make it one block in the skin's shared/ (hd- or fd-, a part or a class) and draw every card on it");

const skins = readdirSync(skinsDir).filter((skin) => {
  try { return statSync(join(skinsDir, skin, "cards")).isDirectory(); } catch { return false; }
});

describe("card folders", () => {
  it.each(skins)("in %s copy no component or class block another card, or the skin's shared/, already has", (skin) => {
    const found = copies(skin).filter((copy) => !(copy in KNOWN)).map((copy) => `${copy}: ${fix(copy)}`);
    expect(found, "AGENTS.md → Vocabulary, Part: what two cards share is one part or class in the skin's shared/, and a card draws on it").toEqual([]);
  });

  it("lists no copy that is gone", () => {
    const all = new Set(skins.flatMap(copies));
    expect(Object.keys(KNOWN).filter((copy) => !all.has(copy)), "remove its row from KNOWN").toEqual([]);
  });

  it("finds a copied component and a copied rule", () => {
    const keypad = "function Keypad({ prompt }: { prompt: string }) {\n  const shown = prompt;\n\n  return (\n    <div className=\"al-kp\">\n      {shown}\n    </div>\n  );\n}";
    expect(uncoded(components(keypad)[0][1])).toBe(uncoded(components(keypad.replace("al-kp", "lk-kp"))[0][1]));
    const keys = (css: string) => blocks(css).map((block) => block.key);
    expect(keys(".al-keys { display: grid; gap: 8px; min-width: 0; grid-auto-flow: column; }")).toEqual(keys(".lk-keys { grid-auto-flow: column; display: grid; min-width: 0; gap: 8px; }"));
    // Under two prefixes, in a compound selector, inside an at-rule, or the shared rule itself: still the same block.
    expect(keys(".hd--compact .bs-f { font-size: 13.5px; font-weight: 700; letter-spacing: 0; }"))
      .toEqual(keys("@container hd (max-width: 259px) { .cm:not(.hd--sheet) .cm-f { letter-spacing: 0; font-weight: 700; font-size: 13.5px; } }"));
    expect(keys(".fd-lk .fd-lk-x { --fd-lk-w: 2px; width: var(--fd-lk-w); height: 4px; }")).toEqual(keys(".fd-cm .fd-cm-x { --fd-cm-w: 2px; width: var(--fd-cm-w); height: 4px; }"));
    expect(keys(".lk-door-x { font-weight: 500; font-size: 13.5px; color: var(--ink-2); }")).toEqual(keys(".hd-blk-v { font-size: 13.5px; font-weight: 500; color: var(--ink-2); }"));
    // A card's own colours, its focus ring, and a keyframe's stops, are never a copy.
    expect(keys(".bs[data-state=\"off\"] .bs-f { color: var(--ink-2); fill: var(--ink-2); background-color: var(--well); }")).toEqual([]);
    expect(keys(".lk-door:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }")).toEqual([]);
    expect(keys("@keyframes x { from { opacity: 0; transform: none; scale: 1; } }")).toEqual([]);
    // Three declarations count in two places; two, in three, the shared stylesheet one of them; a card's needed.
    expect([copied(3, 2, false), copied(3, 1, true), copied(3, 1, false), copied(3, 0, true)]).toEqual([true, true, false, false]);
    expect([copied(2, 3, false), copied(2, 2, true), copied(2, 2, false), copied(2, 1, true)]).toEqual([true, true, false, false]);
  });
});
