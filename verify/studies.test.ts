/**
 * Studies (spec/skins.md → Studies): skins an agent built, kept to learn from and build on. A study run is a fresh agent
 * building a standalone skin from the release tarballs in a sandbox (`npm run study`); keeping it (`npm run
 * study:keep`) brings it into `src/skins/<skin>/` with the shape every study has: marked in its package.json, under
 * Studies in Storybook with a Read me first page, its own design rules, captures and study.json, and for a run the
 * agent's report. None ships, all are on the docs site's Studies page, and the specs, AGENTS.md and the docs pages talk
 * about studies in general, never one by name.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GENERATED_SKINS } from "../scripts/generated-skins.js";
import { RESOURCES } from "../scripts/resources.js";
import { storySection, studies } from "../scripts/packages.js";
import { DESIGN_SECTIONS, REPORT_SECTIONS, fitDesignRules, taskText } from "../scripts/study/lib.js";
import type { StudyRecord } from "../scripts/study/lib.js";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const skins = readdirSync(join(process.cwd(), "src/skins"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(process.cwd(), "src/skins", entry.name, "package.json")))
  .map(({ name: skin }) => {
    const manifest = JSON.parse(read(`src/skins/${skin}/package.json`));
    return { skin, manifest, study: studies.is(manifest), section: storySection(read(`src/skins/${skin}/storybook.tsx`)) ?? "" };
  });
const studySkins = skins.filter((s) => s.study);
const shipped = skins.filter((s) => !s.study);

/** The skins a resource ships, by id: Orb's and Field's and each generated skin's (scripts/resources.js). */
const resourceIds = RESOURCES.map((resource: { id: string }) => resource.id);
const deployDoc = read("spec/deploy.md");

describe("the skins", () => {
  it("are studies or shipped skins, and Orb and Field ship", () => {
    expect(shipped.map((s) => s.skin)).toEqual(expect.arrayContaining(["orb", "field"]));
  });

  it.each(shipped.map((s) => s.skin))("ship %s as a resource of its own", (skin) => {
    expect(resourceIds).toContain(skin);
    expect(existsSync(join(process.cwd(), `src/skins/${skin}/lovelace/resource.ts`)), `src/skins/${skin}/lovelace/resource.ts is its resource's entry`).toBe(true);
  });
});

describe.each(studySkins.map((s) => [s.skin, s] as const))("the %s study", (skin, { manifest, section }) => {
  const dir = `src/skins/${skin}`;

  it("never ships: no resource, no deploy-config dashboard, no YAML in spec/deploy.md", () => {
    expect(resourceIds).not.toContain(skin);
    expect(read("apps/lovelace/entry.ts")).not.toContain(`@dashhaus/${skin}/`);
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

  const record: StudyRecord | undefined = existsSync(join(process.cwd(), dir, "study.json")) ? JSON.parse(read(`${dir}/study.json`)) : undefined;

  it("records how it was made: its name, the version and commit it was built from, and what it looked like", () => {
    expect(record, `${dir}/study.json`).toBeDefined();
    expect(record!.skin).toBe(skin);
    expect(record!.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(record!.commit).toMatch(/^[0-9a-f]{7,}$/);
    expect(["run", "generators"]).toContain(record!.made);
    for (const capture of record!.captures) expect(existsSync(join(process.cwd(), dir, "captures", capture)), capture).toBe(true);
  });

  it("draws its own design rules as Foundations → Design rules", () => {
    const rules = read(`${dir}/stories/DesignRules.mdx`);
    expect(rules).toMatch(new RegExp(`import rules from "(?:\\.\\./design\\.md|(?:\\.\\./)+${dir}/design\\.md)\\?raw";`));
    expect(rules).toContain(`<Meta title="${section}/Foundations/Design rules" />`);
  });

  it.runIf(record?.made === "run")("keeps its run: the agent's report and design rules, its reference and its task", () => {
    expect(record!.captures.length, "its snapshots or the dashboard it deployed").toBeGreaterThan(0);
    for (const heading of REPORT_SECTIONS) expect(read(`${dir}/REPORT.md`)).toContain(heading);
    for (const heading of DESIGN_SECTIONS) expect(read(`${dir}/design.md`)).toMatch(new RegExp(`^${heading}\\s*$`, "m"));
    const reference = record!.reference!;
    if (reference.kind === "image") expect(existsSync(join(process.cwd(), dir, reference.file)), "kept, or withdrawn and gone").toBe(!reference.withdrawn);
    else expect(reference.text).toBeTruthy();
    expect(record!.task).toContain("REPORT.md");
    expect(read(`${dir}/README.md`)).toContain("[`REPORT.md`](REPORT.md)");
  });
});

describe("a study run", () => {
  it("gives the agent one request and what a person would know, never a repository path", () => {
    for (const reference of [{ kind: "image", file: "reference.png" }, { kind: "description", text: "warm paper and brass" }] as const) {
      const task = taskText({ reference, haUrl: "http://127.0.0.1:8801", token: "fake-ha-token", www: "/tmp/www" });
      expect(task).toContain(reference.kind === "image" ? "./reference.png" : "warm paper and brass");
      for (const expected of ["./tarballs", "http://127.0.0.1:8801", "fake-ha-token", "/tmp/www", "Work only in this folder", "REPORT.md", "DESIGN.md", ...REPORT_SECTIONS, ...DESIGN_SECTIONS]) expect(task).toContain(expected);
      expect(task).not.toMatch(/src\/skins|spec\/|AGENTS\.md|npm run new-/);
    }
  });

  it("draws the design rules the agent wrote: its palette and parts after their sections, nothing after one it lacks", () => {
    const template = [
      "  after={{",
      '    "Baseline design": [Palette.Roles, Parts.States],',
      "    Dashboards: [Examples.Phone, Examples.Tablet],",
      "    Light: [Light.AllStates, Light.Footprints],",
      "    Sensor: [Sensor.AllStates, Sensor.Footprints],",
      "    // new-card: design rule stories",
      "  }}",
    ].join("\n");
    expect(fitDesignRules(template, ["Direction", "Palette", "Parts", "Dashboards", "Light"])).toBe([
      "  after={{",
      "    Palette: [Palette.Roles],",
      "    Parts: [Parts.States],",
      "    Dashboards: [Examples.Phone, Examples.Tablet],",
      "    Light: [Light.AllStates, Light.Footprints],",
      "    // new-card: design rule stories",
      "  }}",
    ].join("\n"));
  });

  it("is how AGENTS.md and spec/skins.md say to start one", () => {
    const root = JSON.parse(read("package.json"));
    expect(root.scripts.study).toBe("node scripts/study/run.js");
    expect(root.scripts["study:keep"]).toBe("node scripts/study/keep.js");
    expect(read("AGENTS.md")).toContain("npm run study -- <name>");
    const skins = read("spec/skins.md");
    expect(skins).toContain("### Running a study");
    for (const command of ["npm run study --", "npm run study:keep --"]) expect(skins).toContain(command);
  });

});

describe("the docs site's Studies page", () => {
  it("is built from every study's manifest and study.json, so every study appears with no edit", () => {
    expect(read("docs/src/content/docs/develop/studies.mdx")).toContain("<Studies />");
    const component = read("docs/src/components/Studies.astro");
    expect(component).toContain('import.meta.glob<Manifest>("../../../src/skins/*/package.json"');
    expect(component).toContain("manifest.dashhaus?.study");
    expect(component).toContain('import.meta.glob<StudyRecord>("../../../src/skins/*/study.json"');
    expect(read("docs/astro.config.js")).toContain('slug: "develop/studies"');
  });
});
