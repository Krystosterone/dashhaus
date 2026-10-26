/**
 * Every card widget is built the same way and registered in the same places. `npm run new-widget`
 * produces a widget that passes all of this; a hand-built one fails here with what is missing.
 * The steps are in AGENTS.md → Adding a widget.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const exists = (path: string) => existsSync(join(process.cwd(), path));
const uncomment = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
/** The body of a top-level `const <name> … = { … };` object in a source file. */
const object = (source: string, name: string) => source.match(new RegExp(`const ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\};`))?.[1] ?? "";

/** The skin these widgets belong to; a widget's logic lives outside it, in src/domains/ and src/ha/. */
const SKIN = "src/skins/orb";

/** Folders in the skin's widgets that are not entity cards, and why. */
const NOT_CARDS: Record<string, string> = { header: "the dashboard's title row: type on the page, not a card" };

const widgets = readdirSync(join(process.cwd(), SKIN, "widgets"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && !NOT_CARDS[d.name])
  .map(({ name }) => {
    const Name = name[0].toUpperCase() + name.slice(1);
    const dir = `${SKIN}/widgets/${name}`;
    const widgetFile = `${dir}/${Name}Widget.tsx`;
    const source = exists(widgetFile) ? read(widgetFile) : "";
    return { name, Name, dir, widgetFile, source, code: source.match(/useCard\("([a-z]+)"/)?.[1], words: name.replace(/([A-Z])/g, " $1").toLowerCase() };
  });

describe.each(widgets)("$name widget", ({ name, Name, dir, widgetFile, source, code, words }) => {
  it("has the standard files", () => {
    const missing = [widgetFile, `${dir}/${Name}Widget.css`, `${dir}/${Name}Tile.tsx`, `src/domains/${name}/types.ts`, `${dir}/demo/Demo${Name}Tile.tsx`, `${dir}/${Name}.stories.tsx`].filter((p) => !exists(p));
    expect(missing, "AGENTS.md → Adding a widget, step 1").toEqual([]);
  });

  it("is built from the shared card system", () => {
    expect(code, `${widgetFile}: call useCard("<code>", …) and spread its \`article\` onto the <article>`).toBeDefined();
    expect(source, `${widgetFile}: spread paint(role, glow, own, prop) onto the article`).toMatch(/\bpaint\(/);
    expect(source, `${widgetFile}: the sheet needs its close button`).toMatch(/<SheetClose\b/);
  });

  it("titles its stories Orb/Widgets/<Name>", () => {
    expect(read(`${dir}/${Name}.stories.tsx`)).toContain(`title: "Orb/Widgets/${Name}"`);
  });

  it("prefixes every class with its widget code", () => {
    const allowed = (cls: string) => cls === code || cls.startsWith(`${code}-`) || cls === "hd" || cls.startsWith("hd-");
    const bad: string[] = [];
    for (const file of readdirSync(join(process.cwd(), dir), { recursive: true, encoding: "utf8" }).filter((f) => /\.(css|tsx)$/.test(f))) {
      const body = uncomment(read(`${dir}/${file}`));
      const classes = file.endsWith(".css")
        ? [...body.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1])
        : file.endsWith(".tsx") ? [...body.matchAll(/className="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean) : [];
      for (const cls of classes) if (!allowed(cls)) bad.push(`${dir}/${file}: .${cls}`);
    }
    expect(bad, `classes start with ${code}- (or are the shared hd- system)`).toEqual([]);
  });

  it("lists its class prefix in AGENTS.md", () => {
    expect(read("AGENTS.md"), "AGENTS.md → Hard rules: add it to the prefix list").toContain(`\`${code}-\``);
  });

  it("is exported from src/index.ts", () => {
    const index = read("src/index.ts");
    const missing = [`${Name}Widget`, `${Name}Sheet`, `${Name}Tile`, `useHa${Name}`, `Ha${Name}`, `Ha${Name}Tile`].filter((n) => !new RegExp(`\\b${n}\\b`).test(index));
    expect(missing, "AGENTS.md → Adding a widget, step 3").toEqual([]);
  });

  it("is on a dashboard", () => {
    expect(read(`${SKIN}/dashboards/Dashboards.stories.tsx`), "AGENTS.md → Adding a widget, step 4").toContain(`"../widgets/${name}/`);
  });

  it("is documented in docs/widgets.md", () => {
    expect(read("docs/widgets.md")).toContain(`## Using the ${words} widget`);
  });

  it("connects to Home Assistant", () => {
    const missing = [`src/ha/hooks/${name}.ts`, `${SKIN}/ha/Ha${Name}Tile.tsx`, `${SKIN}/ha/Ha${Name}Tile.test.tsx`, `${SKIN}/ha/Ha${Name}Tile.stories.tsx`, `src/ha/mappers/${name}.ts`, `src/ha/mappers/${name}.test.ts`, `src/ha/fixtures/${name}.json`].filter((p) => !exists(p));
    expect(missing, "home-assistant-integration skill → Adding a domain").toEqual([]);
    expect(read("src/ha/mappers/fixtures.test.ts"), "register the fixture in src/ha/mappers/fixtures.test.ts").toContain(`"../fixtures/${name}.json"`);
    expect(read("src/ha/headless.tsx"), "give it a headless component in src/ha/headless.tsx").toContain(`headless(useHa${Name}, "Ha${Name}")`);
  });

  it("is a card on the Lovelace dashboard", () => {
    const step = "AGENTS.md → Adding a widget, step 6";
    const config = read(`${SKIN}/lovelace/config.ts`);
    const picked = object(config, "DOMAIN_KIND").includes(`: "${name}",`) || new RegExp(`^\\s*${name}:`, "m").test(object(config, "SHARED_KINDS"));
    expect(picked, `${step}: give it its domain in DOMAIN_KIND, or list it in SHARED_KINDS (${SKIN}/lovelace/config.ts)`).toBe(true);
    expect(read(`${SKIN}/lovelace/ConfigDashboard.tsx`), `${step}: render it in tile() (${SKIN}/lovelace/ConfigDashboard.tsx)`).toMatch(new RegExp(`<Ha${Name}Tile\\b`));
    expect(read("docs/deploy.md"), `${step}: list its domain in docs/deploy.md`).toMatch(new RegExp(`^- \`.*\`: ${words}\\b`, "m"));
  });
});

describe("widget codes", () => {
  it("are unique", () => {
    const codes = widgets.map((w) => w.code);
    expect(codes.filter((c, i) => codes.indexOf(c) !== i)).toEqual([]);
  });
});
