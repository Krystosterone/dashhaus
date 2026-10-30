/**
 * Every card is built the same way and registered in the same places. `npm run new-card`
 * produces a card that passes all of this; a hand-built one fails here with what is missing.
 * The steps are in AGENTS.md → Adding a card. Its stories are held to the shared set in verify/storybook.test.ts.
 */
import { describe, expect, it } from "vitest";
import * as core from "@scope/core";
import { cardFolders, exists, object, read, strayClasses } from "./conformance";

/** The skin these cards belong to; a card's logic lives outside it, in @scope/core. */
const SKIN = "src/skins/orb";

/* Every folder in cards/ is one entity's card. The dashboard's title row is type on the page, not a card: it lives
   in dashboards/ with the rest of the page. */
const cards = cardFolders(SKIN)
  .map((name) => {
    const Name = name[0].toUpperCase() + name.slice(1);
    const dir = `${SKIN}/cards/${name}`;
    const cardFile = `${dir}/${Name}Card.tsx`;
    const source = exists(cardFile) ? read(cardFile) : "";
    return { name, Name, dir, cardFile, source, code: source.match(/useCard\("([a-z]+)"/)?.[1], words: name.replace(/([A-Z])/g, " $1").toLowerCase() };
  });

describe.each(cards)("$name card", ({ name, Name, dir, cardFile, source, code, words }) => {
  it("has the standard files", () => {
    const missing = [cardFile, `${dir}/${Name}Card.css`, `${dir}/${Name}Tile.tsx`, `packages/core/src/entities/${name}/types.ts`, `${dir}/demo/Demo${Name}Tile.tsx`, `${dir}/${Name}.stories.tsx`].filter((p) => !exists(p));
    expect(missing, "AGENTS.md → Adding a card, step 1").toEqual([]);
  });

  it("is built from the shared card system", () => {
    expect(code, `${cardFile}: call useCard("<code>", …) and spread its \`article\` onto the <article>`).toBeDefined();
    expect(source, `${cardFile}: spread paint(role, glow, own, prop) onto the article`).toMatch(/\bpaint\(/);
    expect(source, `${cardFile}: the sheet needs its close button`).toMatch(/<SheetClose\b/);
  });

  it("titles its stories Orb/Cards/<Name>", () => {
    expect(read(`${dir}/${Name}.stories.tsx`)).toContain(`title: "Orb/Cards/${Name}"`);
  });

  it("prefixes every class with its card code", () => {
    const bad = strayClasses(dir, (cls) => cls === code || cls.startsWith(`${code}-`) || cls === "hd" || cls.startsWith("hd-"));
    expect(bad, `classes start with ${code}- (or are the shared hd- system)`).toEqual([]);
  });

  it("lists its class prefix in AGENTS.md", () => {
    expect(read("AGENTS.md"), "AGENTS.md → Hard rules: add it to the prefix list").toContain(`\`${code}-\``);
  });

  it("is exported from the orb skin's entry, its shared hook and headless component from @scope/core", () => {
    const entry = read("src/skins/orb/index.ts");
    const missing = [`${Name}Card`, `${Name}Sheet`, `${Name}Tile`, `Ha${Name}Tile`].filter((n) => !new RegExp(`\\b${n}\\b`).test(entry));
    expect(missing, "AGENTS.md → Adding a card, step 3: export it from src/skins/orb/index.ts").toEqual([]);
    const shared = [`useHa${Name}`, `Ha${Name}`].filter((n) => !(n in core));
    expect(shared, "export the shared hook and headless component from @scope/core").toEqual([]);
  });

  it("is documented in docs/cards.md", () => {
    expect(read("docs/cards.md")).toContain(`## Using the ${words} card`);
  });

  it("connects to Home Assistant", () => {
    const missing = [`packages/core/src/ha/hooks/${name}.ts`, `${SKIN}/ha/Ha${Name}Tile.tsx`, `${SKIN}/ha/Ha${Name}Tile.test.tsx`, `${SKIN}/ha/Ha${Name}Tile.stories.tsx`, `packages/core/src/ha/mappers/${name}.ts`, `packages/core/src/ha/mappers/${name}.test.ts`, `packages/core/src/ha/fixtures/${name}.json`].filter((p) => !exists(p));
    expect(missing, "home-assistant-integration skill → Adding a domain").toEqual([]);
    expect(read("packages/core/src/ha/mappers/fixtures.test.ts"), "register the fixture in packages/core/src/ha/mappers/fixtures.test.ts").toContain(`"../fixtures/${name}.json"`);
    expect(core, "give it a headless component in @scope/core").toHaveProperty(`Ha${Name}`);
  });

  it("is a card on the Lovelace dashboard", () => {
    const step = "AGENTS.md → Adding a card, step 6";
    const config = read(`${SKIN}/lovelace/config.ts`);
    const picked = object(config, "DOMAIN_KIND").includes(`: "${name}",`) || new RegExp(`^\\s*${name}:`, "m").test(object(config, "SHARED_KINDS"));
    expect(picked, `${step}: give it its domain in DOMAIN_KIND, or list it in SHARED_KINDS (${SKIN}/lovelace/config.ts)`).toBe(true);
    expect(read(`${SKIN}/lovelace/ConfigDashboard.tsx`), `${step}: render it in tile() (${SKIN}/lovelace/ConfigDashboard.tsx)`).toMatch(new RegExp(`<Ha${Name}Tile\\b`));
    expect(read("docs/deploy.md"), `${step}: list its domain in docs/deploy.md`).toMatch(new RegExp(`^- \`.*\`: ${words}\\b`, "m"));
  });
});

describe("card codes", () => {
  it("are unique", () => {
    const codes = cards.map((c) => c.code);
    expect(codes.filter((c, i) => codes.indexOf(c) !== i)).toEqual([]);
  });
});
