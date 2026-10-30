import { describe, expect, it } from "vitest";
import { cardFolders, exists, read, strayClasses } from "../../conformance";

const SKIN = "src/skins/__skin__";
const cards = cardFolders(SKIN).map((name) => ({ name, Name: name[0].toUpperCase() + name.slice(1) }));

describe.each(cards)("__Section__ $name Card", ({ name, Name }) => {
  const component = `__Skin__${Name}Card`;
  const dir = `${SKIN}/cards/${name}`;

  it("has its presentational, story, test, demo and Connected files", () => {
    expect([
      `${dir}/${component}.tsx`, `${dir}/${component}.css`, `${dir}/${component}.stories.tsx`, `${dir}/${component}.test.tsx`, `${dir}/icons.tsx`, `${dir}/demo`,
      `${SKIN}/ha/Ha${component}.tsx`, `${SKIN}/ha/Ha${component}.stories.tsx`, `${SKIN}/ha/Ha${component}.test.tsx`,
    ].filter((path) => !exists(path))).toEqual([]);
  });

  it("stays presentational and prefixes its own classes", () => {
    const source = read(`${dir}/${component}.tsx`);
    expect(source).not.toMatch(/from "(\.\.\/)+ha\//);
    expect(strayClasses(dir, (cls) => cls.startsWith("__skin__-") || cls.startsWith(`${name}-`))).toEqual([]);
  });

  it("is registered, exported and documented", () => {
    expect(read(`${SKIN}/lovelace/registry.tsx`)).toContain(`${name}: {`);
    expect(read("src/index.ts")).toContain(component);
    expect(read(`docs/__skin__.md`)).toMatch(new RegExp(`^## ${Name.replace(/([A-Z])/g, " $1").trim()}$`, "mi"));
  });
});
