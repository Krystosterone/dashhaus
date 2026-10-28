/**
 * Every field card is built the same way and registered in the same places. `npm run new-card -- <name> --skin field`
 * produces a card that passes all of this; a hand-built one fails here with what is missing. The steps are in
 * AGENTS.md → Adding an existing domain to another skin. Its stories are held to the shared set in
 * src/skins/storybook.test.ts.
 */
import { describe, expect, it } from "vitest";
import { cardFolders, exists, object, read, strayClasses, uncomment } from "../../conformance";

const SKIN = "src/skins/field";
const STEP = "AGENTS.md → Adding an existing domain to another skin";

/** Classes the shared module system styles or sets; a card may use them as they are. */
const SHARED = new Set([
  ...["module.css", "panel.css"].flatMap((f) => [...uncomment(read(`${SKIN}/shared/${f}`)).matchAll(/\.(fd-[\w-]+)/g)].map((m) => m[1])),
  ...[...read(`${SKIN}/shared/ui.tsx`).matchAll(/className="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)),
]);

/** A Storybook section's list for one of its groups in .storybook/preview.tsx, e.g. Field → Cards. */
function sorted(section: string, group: string) {
  const source = read(".storybook/preview.tsx");
  const from = source.indexOf(`"${section}", [`);
  return source.slice(from).match(new RegExp(`"${group}", \\[([^\\]]*)\\]`))?.[1] ?? "";
}

const cards = cardFolders(SKIN)
  .map((name) => {
    const Name = name[0].toUpperCase() + name.slice(1);
    const dir = `${SKIN}/cards/${name}`;
    const moduleFile = `${dir}/${Name}Module.tsx`;
    const source = exists(moduleFile) ? read(moduleFile) : "";
    const words = name.replace(/([A-Z])/g, " $1").toLowerCase();
    return { name, Name, dir, moduleFile, source, code: source.match(/<ModuleFrame\s+kind="fd-([a-z]{2})"/)?.[1], words };
  });

describe.each(cards)("field $name card", ({ name, Name, dir, moduleFile, source, code, words }) => {
  it("has the standard files", () => {
    const missing = [moduleFile, `${dir}/${Name}Module.css`, `${dir}/${Name}Module.stories.tsx`, `${dir}/${Name}Module.test.tsx`, `${dir}/icons.tsx`, `${dir}/demo`, `src/domains/${name}/types.ts`].filter((p) => !exists(p));
    expect(missing, `${STEP}, step 2`).toEqual([]);
  });

  it("is drawn in the shared frame, with its details in its panel", () => {
    expect(code, `${moduleFile}: draw it in <ModuleFrame kind="fd-<code>" …>, which opens its details in a panel`).toBeDefined();
    expect(source, `${moduleFile}: presentational files never import src/ha/`).not.toMatch(/from "(\.\.\/)+ha\//);
  });

  it("prefixes every class of its own with fd-<code>-", () => {
    const bad = strayClasses(dir, (cls) => cls === `fd-${code}` || cls.startsWith(`fd-${code}-`) || SHARED.has(cls));
    expect(bad, `classes start with fd-${code}- (or are the shared fd- system's)`).toEqual([]);
  });

  it("lists its class prefix in AGENTS.md", () => {
    expect(read("AGENTS.md"), "AGENTS.md → Layout, src/skins/field/: add it to the card class prefixes").toContain(`\`fd-${code}-\``);
  });

  it("is exported from src/index.ts", () => {
    const index = read("src/index.ts");
    const missing = [`${Name}Module`, `${Name}ModuleProps`, `Ha${Name}Module`, `Ha${Name}ModuleProps`].filter((n) => !new RegExp(`\\b${n}\\b`).test(index));
    expect(missing, `${STEP}, step 5`).toEqual([]);
  });

  it("connects to Home Assistant through the shared hook", () => {
    const missing = [`${SKIN}/ha/Ha${Name}Module.tsx`, `${SKIN}/ha/Ha${Name}Module.test.tsx`, `${SKIN}/ha/Ha${Name}Module.stories.tsx`].filter((p) => !exists(p));
    expect(missing, `${STEP}, step 3`).toEqual([]);
    expect(exists(`${SKIN}/ha/Ha${Name}Module.tsx`) && read(`${SKIN}/ha/Ha${Name}Module.tsx`), `${STEP}, step 3: call useHa${Name}`).toMatch(new RegExp(`\\buseHa${Name}\\(`));
  });

  it("is documented", () => {
    expect(read("docs/field.md"), "docs/field.md: a section for the card").toMatch(new RegExp(`^## ${name[0].toUpperCase()}${words.slice(1)}$`, "m"));
    if (name !== "light") expect(read("docs/cards.md"), "docs/cards.md: a field subsection under the card").toContain(`### Field ${words} module`);
  });

  it("is in Storybook's order and on the Design rules page", () => {
    expect(sorted("Field", "Cards"), ".storybook/preview.tsx: list it under Field → Cards").toContain(`"${Name}"`);
    expect(sorted("Field", "Connected"), ".storybook/preview.tsx: list it under Field → Connected").toContain(`"${Name}"`);
    expect(read(`${SKIN}/stories/DesignRules.mdx`), `${SKIN}/stories/DesignRules.mdx: show its stories after its section`).toContain(`../cards/${name}/${Name}Module.stories`);
  });

  it("is a module on the Lovelace card", () => {
    expect(object(read(`${SKIN}/lovelace/config.ts`), "FIELD_KINDS"), `${STEP}, step 4: give it its domains in FIELD_KINDS (${SKIN}/lovelace/config.ts)`).toMatch(new RegExp(`^\\s*${name}: \\{ domains:`, "m"));
    expect(object(read(`${SKIN}/lovelace/FieldDashboard.tsx`), "LIVE"), `${STEP}, step 4: draw it in LIVE (${SKIN}/lovelace/FieldDashboard.tsx)`).toMatch(new RegExp(`^\\s*${name}: [^\\n]*(\\n[^\\n]*)?<Ha${Name}Module\\b`, "m"));
  });
});

describe("field card codes", () => {
  it("are unique", () => {
    const codes = cards.map((c) => c.code);
    expect(codes.filter((c, i) => codes.indexOf(c) !== i)).toEqual([]);
  });
});
