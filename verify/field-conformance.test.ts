/**
 * Every field card is built the same way and registered in the same places. `npm run new-card -- <name> --skin field`
 * produces a card that passes all of this; a hand-built one fails here with what is missing. The steps are in
 * AGENTS.md → Adding an existing domain to another skin. Its stories are held to the shared set in
 * verify/storybook.test.ts.
 *
 * A card's `LIVE` line (FieldDashboard.tsx) must name its `<Ha<Name>Module` within its first two lines, as the check
 * below reads it. A module that needs a dashboard-wide setting reads it from a context there with the context's
 * `Consumer` inline, as the camera's does with `Stills` (`stills`, `quiet`): a hook would need a component of its own,
 * which moves `<HaCameraModule` out of the line's reach. Do the same rather than loosen the check.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cardFolders, checkCards } from "@dashhaus/core/lovelace/conformance";
import { exists, object, read, reachesHa, uncomment } from "./conformance";

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

/** The generic checks, declared for field: its module files, its story section and its fd-<code> class prefixes. */
const CHECKS = {
  skin: SKIN,
  storyPrefix: "Field/Cards",
  component: (Name: string) => `${Name}Module.tsx`,
  stories: (Name: string) => `${Name}Module.stories.tsx`,
  code: (source: string) => source.match(/<ModuleFrame\s+kind="fd-([a-z]{2})"/)?.[1],
  allowedClass: (cls: string, { code }: { code?: string }) =>
    code != null && (cls === `fd-${code}` || cls.startsWith(`fd-${code}-`) || SHARED.has(cls)),
  forbiddenImport: reachesHa,
};

const cards = cardFolders(SKIN)
  .map((name) => {
    const Name = name[0].toUpperCase() + name.slice(1);
    const dir = `${SKIN}/cards/${name}`;
    const moduleFile = `${dir}/${Name}Module.tsx`;
    const source = exists(moduleFile) ? read(moduleFile) : "";
    const words = name.replace(/([A-Z])/g, " $1").toLowerCase();
    return { name, Name, dir, moduleFile, code: CHECKS.code(source), words };
  });

describe("the generic card checks", () => {
  it("pass for every card", () => {
    expect(checkCards(CHECKS), "@dashhaus/core/lovelace/conformance").toEqual([]);
  });
});

describe.each(cards)("field $name card", ({ name, Name, dir, moduleFile, code, words }) => {
  it("has the standard files", () => {
    const missing = [moduleFile, `${dir}/${Name}Module.css`, `${dir}/${Name}Module.stories.tsx`, `${dir}/${Name}Module.test.tsx`, `${dir}/icons.tsx`, `packages/core/src/seeds/${name}.ts`, `packages/core/src/entities/${name}/types.ts`].filter((p) => !exists(p));
    expect(missing, `${STEP}, step 2`).toEqual([]);
  });

  it("draws its stories from the domain's seeds in @dashhaus/core, never a copy of its own", () => {
    expect(exists(`${dir}/demo`), `${dir}/demo: the seeds are @dashhaus/core/seeds/${name}, shared by every skin`).toBe(false);
    expect(read(`${dir}/${Name}Module.stories.tsx`)).toContain(`"@dashhaus/core/seeds/${name}"`);
  });

  it("is drawn in the shared frame, with its details in its panel", () => {
    expect(code, `${moduleFile}: draw it in <ModuleFrame kind="fd-<code>" …>, which opens its details in a panel`).toBeDefined();
  });

  it("says its small print in core's words", () => {
    expect(read(moduleFile), `${moduleFile}: its facts come from @dashhaus/core/entities/facts, when first (spec/cards.md → What every card says → Small print)`).toContain('"@dashhaus/core/entities/facts"');
  });

  it("lists its class prefix in AGENTS.md", () => {
    expect(read("AGENTS.md"), "AGENTS.md → Hard rules, the field skin: add it to the card class prefixes").toContain(`\`fd-${code}-\``);
  });

  it("is exported from the field skin's entry", () => {
    const index = read("src/skins/field/index.ts");
    const missing = [`${Name}Module`, `${Name}ModuleProps`, `Ha${Name}Module`, `Ha${Name}ModuleProps`].filter((n) => !new RegExp(`\\b${n}\\b`).test(index));
    expect(missing, `${STEP}, step 5`).toEqual([]);
  });

  it("connects to Home Assistant through the shared hook", () => {
    const missing = [`${SKIN}/ha/Ha${Name}Module.tsx`, `${SKIN}/ha/Ha${Name}Module.test.tsx`, `${SKIN}/ha/Ha${Name}Module.stories.tsx`].filter((p) => !exists(p));
    expect(missing, `${STEP}, step 3`).toEqual([]);
    expect(exists(`${SKIN}/ha/Ha${Name}Module.tsx`) && read(`${SKIN}/ha/Ha${Name}Module.tsx`), `${STEP}, step 3: call useHa${Name}`).toMatch(new RegExp(`\\buseHa${Name}\\(`));
  });

  it("is documented", () => {
    expect(read("spec/field.md"), "spec/field.md: a section for the card").toMatch(new RegExp(`^## ${name[0].toUpperCase()}${words.slice(1)}$`, "m"));
    if (name !== "light") expect(read("spec/cards.md"), "spec/cards.md: a field subsection under the card").toContain(`### Field ${words} module`);
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

describe("the module frame", () => {
  // spec/skins.md → Rules every skin keeps → A card extends a shared part only generically.
  it("draws in Foundations → Parts every prop of its that only one module passes", () => {
    const ui = read(`${SKIN}/shared/ui.tsx`);
    const props = ["ModuleProps", "ModuleFrameProps"].flatMap((type) =>
      [...(ui.match(new RegExp(`export interface ${type}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "").matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]));
    expect(props).toContain("body");
    const modules = readdirSync(join(process.cwd(), `${SKIN}/cards`))
      .map((folder) => `${SKIN}/cards/${folder}/${folder[0].toUpperCase()}${folder.slice(1)}Module.tsx`)
      .filter(exists).map(read);
    const parts = read(`${SKIN}/stories/Parts.stories.tsx`);
    const passes = (source: string, prop: string) => new RegExp(`\\s${prop}=[{"]`).test(source);
    const once = props.filter((prop) => modules.filter((source) => passes(source, prop)).length === 1);
    expect(once.filter((prop) => !passes(parts, prop)), "draw it in the Module frame part of Field → Foundations → Parts").toEqual([]);
  });
});
