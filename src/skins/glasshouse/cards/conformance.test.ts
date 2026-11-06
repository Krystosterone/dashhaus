import { describe, expect, it } from "vitest";
import { cardFolders, checkCards } from "@dashhaus/core/lovelace/conformance";
import { exists, read } from "../../../../verify/conformance";

const SKIN = "src/skins/glasshouse";
const cards = cardFolders(SKIN).map((name) => ({ name, Name: name[0].toUpperCase() + name.slice(1) }));

/** The generic checks, declared for Glasshouse: its story section and its glasshouse-<name>- classes. */
const CHECKS = {
  skin: SKIN,
  storyPrefix: "Studies/Glasshouse/Cards",
  component: (Name: string) => `Glasshouse${Name}Card.tsx`,
  stories: (Name: string) => `Glasshouse${Name}Card.stories.tsx`,
  allowedClass: (cls: string, card: { name: string }) => cls.startsWith("glasshouse-") || cls.startsWith(`${card.name}-`),
  forbiddenImport: (specifier: string) => /^(?:\.\.\/)+ha\//.test(specifier),
};

describe("Glasshouse card conformance", () => {
  it("passes the generic card checks", () => {
    expect(checkCards(CHECKS), "@dashhaus/core/lovelace/conformance").toEqual([]);
  });
});

describe.each(cards)("Glasshouse $name Card", ({ name, Name }) => {
  const component = `Glasshouse${Name}Card`;
  const dir = `${SKIN}/cards/${name}`;

  it("has its presentational, story, test and Connected files, and the domain's seeds in @dashhaus/core", () => {
    expect([
      `${dir}/${component}.tsx`, `${dir}/${component}.css`, `${dir}/${component}.stories.tsx`, `${dir}/${component}.test.tsx`, `${dir}/icons.tsx`, `packages/core/src/seeds/${name}.ts`,
      `${SKIN}/ha/Ha${component}.tsx`, `${SKIN}/ha/Ha${component}.stories.tsx`, `${SKIN}/ha/Ha${component}.test.tsx`,
    ].filter((path) => !exists(path))).toEqual([]);
  });

  it("is registered, exported and documented", () => {
    expect(read(`${SKIN}/lovelace/registry.tsx`)).toContain(`${name}: {`);
    expect(read(`${SKIN}/index.ts`)).toContain(component);
    expect(read(`src/skins/glasshouse/design.md`)).toMatch(new RegExp(`^## ${Name.replace(/([A-Z])/g, " $1").trim()}$`, "mi"));
  });
});
