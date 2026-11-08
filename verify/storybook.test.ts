/**
 * Every skin's Storybook section has the same shape (AGENTS.md → Storybook): the same groups in the same order, and
 * every card the same stories under the same names, so moving between skins or cards never means relearning the tree.
 * Story titles and names are read from the source the way Storybook's indexer reads them: statically. Orb's and
 * Field's Foundations → Worst case page draws every card's worst-case seeds (`<NAME>_WORST_CASE` in
 * `@dashhaus/core/seeds/<name>`) side by side, so a card left off it fails here rather than in a review.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { describe, expect, it } from "vitest";
import { generated, referenceSkins } from "../scripts/packages.js";

/** Each skin's top-level groups, in sidebar order. A group a skin can't fill holds one story that says why. */
const GROUPS = ["Cards", "Bundles", "Dashboards", "Foundations", "Connected"];

/** Groups that belong to one skin's idea rather than to every skin: other skins leave them out, with no gap story. */
const OWN: Record<string, string> = { Bundles: "Orb" };
/** A study (spec/skins.md → Studies) sits under `Studies/<Name>` and opens on its README, before the usual groups. */
const STUDIES = "Studies";
const READ_ME = "Read me first";
const groupsOf = (section: string) => [
  ...(section.startsWith(`${STUDIES}/`) ? [READ_ME] : []),
  ...GROUPS.filter((g) => !OWN[g] || OWN[g] === section),
];

/** The stories every card has, in this order, as [export, sidebar name]. A card's own states come first; it may add a variant after the one it extends (`misplaced`). */
const STANDARD: [string, string][] = [
  ["Unavailable", "Unavailable"],
  ["WorstCase", "Worst case"],
  ["AllStates", "All states"],
  ["Sizes", "Sizes"],
  ["Footprints", "Footprints"],
  ["Compact", "Compact"],
  ["Details", "Details"],
  ["DetailsUnavailable", "Details, unavailable"],
  ["DetailsPhone", "Details, phone"],
];

/**
 * Every card's worst case side by side, under Foundations. The reference skins, Orb and Field, must have the page (a
 * skin `new-skin` lays out has none: its registry says it was generated); any skin that has one keeps it whole.
 */
const WORST_CASE = "Worst case";
const needsWorstCase = (skin: string) => skin in referenceSkins && !existsSync(join(process.cwd(), generated.file(skin, generated.files.registry)));

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const label = (name: string) => name[0].toUpperCase() + name.slice(1);
/** A card folder's seeds constant, as `names()` in scripts/new-card/lib.js makes it: `binarySensor` → `BINARY_SENSOR`. */
const constant = (name: string) => name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase();

/**
 * Each story export of a CSF file and its sidebar name: its `name:` (after a spread of the story it reuses, if any),
 * or the export name when it has none.
 */
function stories(source: string) {
  const out: { id: string; name: string }[] = [];
  const exports = [...source.matchAll(/^export const (\w+): Story = /gm)];
  exports.forEach((m, i) => {
    const body = source.slice(m.index + m[0].length, exports[i + 1]?.index ?? source.length);
    out.push({ id: m[1], name: body.match(/^\{\s*(?:\.\.\.\w+,\s*)?name: "([^"]+)"/)?.[1] ?? m[1] });
  });
  return out;
}

/**
 * Where a card's own stories sit (AGENTS.md → Storybook), as far as their names tell: a state goes among the card's
 * states, before Unavailable; past it, a story is a variant of the standard story before it and is named after it
 * (`Compact, sizes`, `Details, colour`), so every `Details, …` comes before `Details, unavailable`, and nothing comes
 * after `Details, phone`. Returns each misplaced story, saying where it goes.
 */
function misplaced(found: { id: string; name: string }[]) {
  const standard = STANDARD.map(([, name]) => name);
  const last = standard.at(-1)!;
  let extended: string | undefined;
  return found.flatMap(({ id, name }) => {
    if (standard.includes(name)) {
      extended = name;
      return [];
    }
    const story = `${id} ("${name}")`;
    if (!extended) {
      const of = standard.find((s) => name.startsWith(`${s}, `));
      return of ? [`${story}: a variant of "${of}" goes after it`] : [];
    }
    if (extended === last) return [`${story}: nothing comes after "${last}"; a state goes before "Unavailable", a variant after the story it extends`];
    if (name.startsWith(`${extended}, `)) return [];
    return [`${story}: after "${extended}" only its variants ("${extended}, …"); a state goes before "Unavailable", a variant after the story it extends, named after it`];
  });
}

/** `storySort.order` in .storybook/preview.tsx, which must stay a literal for Storybook to read it. */
function storySort(): unknown[] {
  const source = read(".storybook/preview.tsx");
  const start = source.indexOf("[", source.indexOf("order:"));
  let depth = 0;
  let end = start;
  for (; end < source.length; end++) {
    if (source[end] === "[") depth++;
    if (source[end] === "]" && --depth === 0) break;
  }
  return JSON.parse(source.slice(start, end + 1).replace(/\/\/.*$/gm, "").replace(/,(\s*\])/g, "$1"));
}

/** A section's own order in storySort, following its path through the nesting: `Studies/Atelier` is "Atelier" inside "Studies". */
const orderOf = (section: string) => section.split("/").reduce<unknown[] | undefined>((level, part) => {
  const i = level?.indexOf(part) ?? -1;
  return i === -1 ? undefined : level![i + 1] as unknown[];
}, storySort());

const skins = readdirSync(join(process.cwd(), "src/skins"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map(({ name: skin }) => {
    const dir = `src/skins/${skin}`;
    const section = read(`${dir}/storybook.tsx`).match(/section: "([^"]+)"/)?.[1] ?? "";
    const study = Boolean(JSON.parse(read(`${dir}/package.json`)).dashhaus?.study);
    const files = readdirSync(join(process.cwd(), dir), { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".stories.tsx") || f.endsWith(".mdx"))
      .map((f) => posix.join(dir, f))
      .map((path) => ({ path, source: read(path) }))
      // A CSF file's title is in its meta, an MDX page's in its <Meta title="…" />.
      .map(({ path, source }) => ({ path, source, title: source.slice(Math.max(0, source.indexOf("const meta"))).match(/\btitle[:=]\s*"([^"]+)"/)?.[1] ?? "" }));
    const cards = readdirSync(join(process.cwd(), dir, "cards"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    return { skin, section, study, files, cards };
  });

describe("the Storybook tree", () => {
  it("covers every skin", () => {
    expect(skins.map((s) => s.section).filter((s) => !s), "each src/skins/<skin>/storybook.tsx names its section").toEqual([]);
  });

  it("orders every skin's groups the same in storySort", () => {
    for (const { section } of skins) {
      const groups = orderOf(section);
      expect(groups, `.storybook/preview.tsx: list ${section} in storySort`).toBeDefined();
      expect(groups!.filter((g) => typeof g === "string"), `${section}'s groups in storySort`).toEqual(groupsOf(section));
    }
  });

  it("files a study under Studies, and only a study", () => {
    expect(skins.filter(({ study, section }) => study !== section.startsWith(`${STUDIES}/`)).map(({ skin, section }) => `${skin}: "${section}"`)).toEqual([]);
    const order = storySort();
    expect(order.at(-2), "Studies come last in storySort, after every skin").toBe(STUDIES);
  });
});

describe.each(skins)("the $section section", ({ section, files, cards, skin }) => {
  it("files every story under one of the shared groups", () => {
    const stray = files.filter(({ title }) => !groupsOf(section).some((g) => title.startsWith(`${section}/${g}`))).map((f) => `${f.path}: "${f.title}"`);
    expect(stray, `titles start with ${section}/<${groupsOf(section).join(" | ")}>`).toEqual([]);
  });

  it("has every group, filled or saying why it is empty", () => {
    const present = [READ_ME, ...GROUPS].filter((g) => files.some(({ title }) => title === `${section}/${g}` || title.startsWith(`${section}/${g}/`)));
    expect(present).toEqual(groupsOf(section));
  });

  const worstCase = files.find(({ title }) => title === `${section}/Foundations/${WORST_CASE}`);

  it.runIf(needsWorstCase(skin) || Boolean(worstCase))(`draws every card's worst case on ${section}/Foundations/${WORST_CASE}`, () => {
    expect(worstCase?.path, `a stories file in src/skins/${skin}/stories/ titled "${section}/Foundations/${WORST_CASE}"`).toBeDefined();
    const page = worstCase?.source ?? "";
    const seedless = cards.filter((card) => !new RegExp(`export const ${constant(card)}_WORST_CASE\\b`).test(read(`packages/core/src/seeds/${card}.ts`)));
    expect(seedless, "packages/core/src/seeds/<name>.ts exports the card's <NAME>_WORST_CASE").toEqual([]);
    // Imported from the domain's seeds, never a copy, and drawn: named again past its import.
    const missing = cards.filter((card) => {
      const seeds = `${constant(card)}_WORST_CASE`;
      const imported = new RegExp(`import \\{[^}]*\\b${seeds}\\b[^}]*\\} from "@dashhaus/core/seeds/${card}"`).test(page);
      return !imported || (page.match(new RegExp(`\\b${seeds}\\b`, "g")) ?? []).length < 2;
    }).map((card) => `${card}: draw ${constant(card)}_WORST_CASE, from "@dashhaus/core/seeds/${card}"`);
    expect(missing, `${worstCase?.path}: a row for every card, before "// new-card: worst cases"`).toEqual([]);
    const foundations = orderOf(section)?.[(orderOf(section) ?? []).indexOf("Foundations") + 1];
    expect(Array.isArray(foundations) && foundations.includes(WORST_CASE), `.storybook/preview.tsx: list "${WORST_CASE}" in ${section}'s Foundations`).toBe(true);
  });

  describe.each(cards)(`src/skins/${skin}/cards/%s`, (card) => {
    const title = `${section}/Cards/${label(card)}`;
    const own = files.find((f) => f.path.startsWith(`src/skins/${skin}/cards/${card}/`) && f.title === title);

    it(`is titled ${section}/Cards/<Name>`, () => {
      expect(own?.path, `a stories file in src/skins/${skin}/cards/${card}/ titled "${title}"`).toBeDefined();
    });

    it("has the standard stories, in order and by their shared names", () => {
      const found = stories(own?.source ?? "");
      const ids = found.map((s) => s.id);
      expect(STANDARD.map(([id]) => id).filter((id) => !ids.includes(id)), "missing standard stories").toEqual([]);
      const positions = STANDARD.map(([id]) => ids.indexOf(id));
      expect(positions, `standard stories in the order ${STANDARD.map(([id]) => id).join(", ")}`).toEqual([...positions].sort((a, b) => a - b));
      const misnamed = STANDARD.filter(([id, name]) => found.find((s) => s.id === id)?.name !== name).map(([id, name]) => `${id} should be named "${name}"`);
      expect(misnamed).toEqual([]);
    });

    it("places its own stories beside the one they extend: states before Unavailable, a variant after its story", () => {
      expect(misplaced(stories(own?.source ?? ""))).toEqual([]);
    });

    it(`has a connected story under ${section}/Connected/<Name>`, () => {
      expect(files.some((f) => f.title === `${section}/Connected/${label(card)}`)).toBe(true);
    });
  });
});
