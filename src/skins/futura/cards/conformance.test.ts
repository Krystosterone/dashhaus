import { describe, expect, it } from "vitest";
import { cardFolders, checkCards } from "@dashhaus/dashboard/conformance";
import { exists, read } from "../../../../verify/conformance";

const SKIN = "src/skins/futura";
const cards = cardFolders(SKIN).map((name) => ({ name, Name: name[0].toUpperCase() + name.slice(1) }));

/** The generic checks, declared for Futura: its story section and its futura-<name>- classes. */
const CHECKS = {
  skin: SKIN,
  storyPrefix: "Studies/Futura/Cards",
  component: (Name: string) => `Futura${Name}Card.tsx`,
  stories: (Name: string) => `Futura${Name}Card.stories.tsx`,
  allowedClass: (cls: string, card: { name: string }) => cls.startsWith("futura-") || cls.startsWith(`${card.name}-`),
  forbiddenImport: (specifier: string) => /^(?:\.\.\/)+ha\//.test(specifier),
};

describe("Futura card conformance", () => {
  it("passes the generic card checks", () => {
    expect(checkCards(CHECKS), "@dashhaus/dashboard/conformance").toEqual([]);
  });
});

describe.each(cards)("Futura $name Card", ({ name, Name }) => {
  const component = `Futura${Name}Card`;
  const dir = `${SKIN}/cards/${name}`;

  it("has its presentational, story, test, demo and Connected files", () => {
    expect([
      `${dir}/${component}.tsx`, `${dir}/${component}.css`, `${dir}/${component}.stories.tsx`, `${dir}/${component}.test.tsx`, `${dir}/icons.tsx`, `${dir}/demo`,
      `${SKIN}/ha/Ha${component}.tsx`, `${SKIN}/ha/Ha${component}.stories.tsx`, `${SKIN}/ha/Ha${component}.test.tsx`,
    ].filter((path) => !exists(path))).toEqual([]);
  });

  it("is registered, exported and documented", () => {
    expect(read(`${SKIN}/lovelace/registry.tsx`)).toContain(`${name}: {`);
    expect(read(`${SKIN}/index.ts`)).toContain(component);
    expect(read(`src/skins/futura/design.md`)).toMatch(new RegExp(`^## ${Name.replace(/([A-Z])/g, " $1").trim()}$`, "mi"));
  });
});
