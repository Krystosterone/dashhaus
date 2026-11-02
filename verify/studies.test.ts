/**
 * Studies (spec/skins.md → Studies): skins an agent built, kept to learn from and build on. A study run is a fresh agent
 * building a standalone skin from the release tarballs in a sandbox (`npm run study`), kept under `studies/<name>/`
 * (`npm run study:keep`): the skin pinned to its version, the agent's report, its captures and the run's record. An
 * older kind is a skin built in this repository with `new-skin`, marked in its package.json; nothing makes a new one.
 * Neither ships, both are on the docs site's Studies page, and the specs, AGENTS.md and the docs pages talk about
 * studies in general, never one by name.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GENERATED_SKINS } from "../scripts/generated-skins.js";
import { storySection, studies } from "../scripts/packages.js";
import { REPORT_SECTIONS, STUDIES, pinnedManifest, taskText } from "../scripts/study/lib.js";

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

describe.each(studySkins.map((s) => [s.skin, s] as const))("the %s in-repo study", (skin, { manifest, section }) => {
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

/** Every file under the specs, AGENTS.md and the docs pages: where a study is never named. */
const docs = () => [
  "AGENTS.md",
  ...readdirSync(join(process.cwd(), "spec"), { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".md")).map((f) => `spec/${f}`),
  ...readdirSync(join(process.cwd(), "docs/src/content/docs"), { recursive: true, encoding: "utf8" }).filter((f) => /\.mdx?$/.test(f)).map((f) => `docs/src/content/docs/${f}`),
];

describe("a study run", () => {
  it("gives the agent one request and what a person would know, never a repository path", () => {
    for (const reference of [{ kind: "image", file: "reference.png" }, { kind: "description", text: "warm paper and brass" }] as const) {
      const task = taskText({ reference, haUrl: "http://127.0.0.1:8801", token: "fake-ha-token", www: "/tmp/www" });
      expect(task).toContain(reference.kind === "image" ? "./reference.png" : "warm paper and brass");
      for (const expected of ["./tarballs", "http://127.0.0.1:8801", "fake-ha-token", "/tmp/www", "Work only in this folder", "REPORT.md", ...REPORT_SECTIONS]) expect(task).toContain(expected);
      expect(task).not.toMatch(/src\/skins|spec\/|AGENTS\.md|npm run new-/);
    }
  });

  it("keeps a skin anyone can install: its tarball paths become the version it was built against", () => {
    const manifest = { name: "dashhaus-skin-x", dependencies: { "@dashhaus/core": "file:../tarballs/dashhaus-core-0.2.0.tgz", react: "^19.0.0" }, devDependencies: { "create-dashhaus-skin": "file:../tarballs/create-dashhaus-skin-0.2.0.tgz" } };
    const pinned = pinnedManifest(manifest, "0.2.0");
    expect(pinned.dependencies).toEqual({ "@dashhaus/core": "^0.2.0", react: "^19.0.0" });
    expect(pinned.devDependencies).toEqual({ "create-dashhaus-skin": "^0.2.0" });
    expect(manifest.dependencies["@dashhaus/core"]).toMatch(/^file:/);
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

  it("is kept outside every workspace and tool: only ESLint walks the whole tree, and it skips studies/", () => {
    const root = JSON.parse(read("package.json"));
    expect(root.workspaces.some((glob: string) => glob.startsWith(STUDIES))).toBe(false);
    expect(read("eslint.config.js")).toContain(`"${STUDIES}/**"`);
  });
});

const kept = existsSync(join(process.cwd(), STUDIES))
  ? readdirSync(join(process.cwd(), STUDIES), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  : [];

describe.each(kept)("the %s kept study", (name) => {
  const dir = `${STUDIES}/${name}`;
  const study = existsSync(join(process.cwd(), dir, "study.json")) ? JSON.parse(read(`${dir}/study.json`)) : undefined;

  it("records its run: the version and commit it was built against, its reference, its task and its captures", () => {
    expect(study, `${dir}/study.json`).toBeDefined();
    expect(study.name).toBe(name);
    expect(study.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(study.task).toContain("REPORT.md");
    if (study.reference.kind === "image") expect(existsSync(join(process.cwd(), dir, study.reference.file))).toBe(true);
    else expect(study.reference.text).toBeTruthy();
    for (const capture of study.captures) expect(existsSync(join(process.cwd(), dir, "captures", capture)), capture).toBe(true);
  });

  it("keeps the agent's report and says what it is", () => {
    for (const heading of REPORT_SECTIONS) expect(read(`${dir}/REPORT.md`)).toContain(heading);
    expect(read(`${dir}/README.md`)).toMatch(/^# .+, a study\n/);
    expect(read(`${dir}/README.md`)).toContain("is a **study**");
  });

  it("is a skin anyone can install: no tarball paths, no install, no build", () => {
    const manifest = read(`${dir}/skin/package.json`);
    expect(manifest).not.toContain('"file:');
    for (const left of ["node_modules", "dist", ".env", "package-lock.json"]) expect(existsSync(join(process.cwd(), dir, "skin", left)), left).toBe(false);
  });

  it("is named by no spec, AGENTS.md or docs page", () => {
    // Its path, or the name as a study's: a kept run's name can be an ordinary word another page uses for itself.
    const named = new RegExp(`${STUDIES}/${name}\\b|\\b${name}\\b,? (?:a )?study\\b`, "i");
    expect(docs().filter((path) => named.test(read(path)))).toEqual([]);
  });
});

describe("the docs site's Studies page", () => {
  it("is built from the kept runs and the in-repo studies' manifests, so every study appears with no edit", () => {
    expect(read("docs/src/content/docs/develop/studies.mdx")).toContain("<Studies />");
    const component = read("docs/src/components/Studies.astro");
    expect(component).toContain('import.meta.glob<Manifest>("../../../src/skins/*/package.json"');
    expect(component).toContain("manifest.dashhaus?.study");
    expect(component).toContain('import.meta.glob<KeptStudy>("../../../studies/*/study.json"');
    expect(read("docs/astro.config.js")).toContain('slug: "develop/studies"');
  });
});
