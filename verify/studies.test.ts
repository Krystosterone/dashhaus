/**
 * Studies (spec/skins.md → Studies): skins an agent built with the generators, kept to learn from and build on. A study
 * is marked in its package.json and that marker decides everything else: it says what it is (its README and Read me
 * first page), it sits under Studies in Storybook, it never ships, its docs stay in its folder, and the docs site lists
 * it. Every other skin ships. The specs, AGENTS.md and the docs pages talk about studies in general, never one by name.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GENERATED_SKINS } from "../scripts/generated-skins.js";
import { storySection, studies } from "../scripts/packages.js";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const skins = readdirSync(join(process.cwd(), "src/skins"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(process.cwd(), "src/skins", entry.name, "package.json")))
  .map(({ name: skin }) => {
    const manifest = JSON.parse(read(`src/skins/${skin}/package.json`));
    return { skin, manifest, study: studies.is(manifest), section: storySection(read(`src/skins/${skin}/storybook.tsx`)) ?? "" };
  });
const studySkins = skins.filter((s) => s.study);
const shipped = skins.filter((s) => !s.study);

const entry = read("apps/lovelace/entry.ts");
const deployDoc = read("spec/deploy.md");

describe("the skins", () => {
  it("are studies or shipped skins, and Orb and Field ship", () => {
    expect(shipped.map((s) => s.skin)).toEqual(expect.arrayContaining(["orb", "field"]));
  });

  it.each(shipped.map((s) => s.skin))("ship %s in the Lovelace bundle", (skin) => {
    expect(entry).toContain(`"@dashhaus/${skin}/lovelace/card"`);
    expect(entry).toContain(`"@dashhaus/${skin}/styles/tokens.css"`);
  });
});

describe.each(studySkins.map((s) => [s.skin, s] as const))("the %s study", (skin, { manifest, section }) => {
  const dir = `src/skins/${skin}`;

  it("never ships: no bundle, no deploy-config dashboard, no YAML in spec/deploy.md", () => {
    expect(entry).not.toContain(`@dashhaus/${skin}/`);
    expect(GENERATED_SKINS.map((dashboard: { id: string }) => dashboard.id)).not.toContain(skin);
    expect(read("dashboard.config.mjs")).not.toContain(`dashhaus-${skin}`);
    expect(deployDoc).not.toContain(`custom:dashhaus-${skin}`);
  });

  it("keeps its docs in its own folder: no spec/ page, no spec/cards.md entries, no mention in AGENTS.md or the docs site", () => {
    expect(existsSync(join(process.cwd(), dir, "design.md")), `${dir}/design.md holds its design rules`).toBe(true);
    expect(existsSync(join(process.cwd(), `spec/${skin}.md`))).toBe(false);
    const Name = section.split("/").at(-1)!;
    const named = new RegExp(`\\b(?:${skin}|${Name})\\b`, "i");
    const docs = [
      "AGENTS.md",
      ...readdirSync(join(process.cwd(), "spec"), { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".md")).map((f) => `spec/${f}`),
      ...readdirSync(join(process.cwd(), "docs/src/content/docs"), { recursive: true, encoding: "utf8" }).filter((f) => /\.mdx?$/.test(f)).map((f) => `docs/src/content/docs/${f}`),
    ];
    expect(docs.filter((path) => named.test(read(path))), `files naming the ${Name} study`).toEqual([]);
  });

  it("sits under Studies in Storybook", () => {
    expect(section).toMatch(new RegExp(`^${studies.group}/[^/]+$`));
  });

  it("says what it is: a README, opened in Storybook as its Read me first page, and a description", () => {
    const readme = read(`${dir}/README.md`);
    expect(readme).toMatch(/^# .+, a study\n/);
    expect(readme).toContain("is a **study**");
    expect(readme).toMatch(/not finished or polished/);
    expect(readme).toMatch(/contributions back are welcome/);
    const page = read(`${dir}/stories/ReadMeFirst.mdx`);
    expect(page).toContain('import readme from "../README.md?raw";');
    expect(page).toContain(`<Meta title="${section}/Read me first" />`);
    expect(manifest.description).toMatch(/^A study: /);
  });

  it("names a theme toolbar global its Storybook setup declares, for the docs site's embed", () => {
    const { global, light, dark } = manifest.dashhaus.study.theme;
    const setup = read(`${dir}/storybook.tsx`);
    expect(setup).toMatch(new RegExp(`\\b${global}: \\{`));
    for (const value of [light, dark]) expect(setup).toContain(`"${value}"`);
  });
});

describe("the study brief", () => {
  it("asks for what the generator makes a study today, so starting a run can't send an agent somewhere stale", () => {
    const brief = read("spec/study-brief.md");
    for (const expected of [
      "npm run new-skin -- <name> --study",
      "npm run new-card -- <domain> --skin <name>",
      "src/skins/<name>/design.md",
      "src/skins/<name>/captures/",
      `${studies.group}/<Name>`,
      "Read me first",
      "FRICTION",
      "spec/skins.md → Running a study",
    ]) expect(brief, `spec/study-brief.md names ${expected}`).toContain(expected);
    expect(brief).not.toMatch(/artifacts\/|spec\/<name>\.md/);
  });

  it("is where AGENTS.md and spec/skins.md send an agent", () => {
    expect(read("AGENTS.md")).toContain("[spec/study-brief.md](spec/study-brief.md)");
    expect(read("spec/skins.md")).toContain("### Running a study");
    expect(read("spec/skins.md")).toContain("[study-brief.md](study-brief.md)");
  });
});

describe("the docs site's Studies page", () => {
  it("is built from the skins' manifests, so every study appears with no edit", () => {
    expect(read("docs/src/content/docs/develop/studies.mdx")).toContain("<Studies />");
    const component = read("docs/src/components/Studies.astro");
    expect(component).toContain('import.meta.glob<Manifest>("../../../src/skins/*/package.json"');
    expect(component).toContain("manifest.dashhaus?.study");
    expect(read("docs/astro.config.js")).toContain('slug: "develop/studies"');
  });
});
