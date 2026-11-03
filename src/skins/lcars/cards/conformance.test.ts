import { describe, expect, it } from "vitest";
import { cardFolders, checkCards } from "@dashhaus/dashboard/conformance";
import { exists, read } from "../../../../verify/conformance";

const SKIN = "src/skins/lcars";
const cards = cardFolders(SKIN).map((name) => ({ name, Name: name[0].toUpperCase() + name.slice(1) }));

/** The generic checks, declared for Lcars: its story section and its lcars-<name>- classes. */
const CHECKS = {
  skin: SKIN,
  storyPrefix: "Studies/Lcars/Cards",
  component: (Name: string) => `Lcars${Name}Card.tsx`,
  stories: (Name: string) => `Lcars${Name}Card.stories.tsx`,
  allowedClass: (cls: string, card: { name: string }) => cls.startsWith("lcars-") || cls.startsWith(`${card.name}-`),
  forbiddenImport: (specifier: string) => /^(?:\.\.\/)+ha\//.test(specifier),
};

describe("Lcars card conformance", () => {
  it("passes the generic card checks", () => {
    expect(checkCards(CHECKS), "@dashhaus/dashboard/conformance").toEqual([]);
  });
});

describe.each(cards)("Lcars $name Card", ({ name, Name }) => {
  const component = `Lcars${Name}Card`;
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
    expect(read(`src/skins/lcars/design.md`)).toMatch(new RegExp(`^## ${Name.replace(/([A-Z])/g, " $1").trim()}$`, "mi"));
  });
});
