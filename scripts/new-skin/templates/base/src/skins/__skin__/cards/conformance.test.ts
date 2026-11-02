import { describe, expect, it } from "vitest";
import { cardFolders, checkCards } from "@dashhaus/dashboard/conformance";
import { exists, read } from "../../../../verify/conformance";

const SKIN = "src/skins/__skin__";
const cards = cardFolders(SKIN).map((name) => ({ name, Name: name[0].toUpperCase() + name.slice(1) }));

/** The generic checks, declared for __Section__: its story section and its __skin__-<name>- classes. */
const CHECKS = {
  skin: SKIN,
  storyPrefix: "__Stories__/Cards",
  component: (Name: string) => `__Skin__${Name}Card.tsx`,
  stories: (Name: string) => `__Skin__${Name}Card.stories.tsx`,
  allowedClass: (cls: string, card: { name: string }) => cls.startsWith("__skin__-") || cls.startsWith(`${card.name}-`),
  forbiddenImport: (specifier: string) => /^(?:\.\.\/)+ha\//.test(specifier),
};

describe("__Section__ card conformance", () => {
  it("passes the generic card checks", () => {
    expect(checkCards(CHECKS), "@dashhaus/dashboard/conformance").toEqual([]);
  });
});

describe.each(cards)("__Section__ $name Card", ({ name, Name }) => {
  const component = `__Skin__${Name}Card`;
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
    expect(read(`__designDoc__`)).toMatch(new RegExp(`^## ${Name.replace(/([A-Z])/g, " $1").trim()}$`, "mi"));
  });
});
