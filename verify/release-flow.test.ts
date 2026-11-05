/**
 * The release flow's logic (spec/release.md → Releasing): change notes and which pull requests owe one, the API
 * comparison and the version it suggests, the candidate's digests and unfinished record, and the record itself. The
 * workflow that runs them is held by verify/toolchain.test.ts; packing and the registry are exercised by CI's dx lane.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { apiMarkdown, compareVersions, diffApi, readApi, suggestVersion } from "../scripts/release/api.js";
import type { Api } from "../scripts/release/api.js";
import { digestProblems, formatDigests, parseDigests, releaseBody, unfinished } from "../scripts/release/candidate.js";
import { CHANGE_TYPES, formatChange, noteFileName, parseChange, pullRequestProblem, readChanges, shipsFrom } from "../scripts/release/changes.js";
import { publicPackages } from "../scripts/release/manifest.js";
import { renderRecord } from "../scripts/release/prepare.js";

const REPO = "git+https://github.com/Krystosterone/dashhaus.git";

describe("change notes", () => {
  it("reads a note's type and body, and refuses one without either", () => {
    expect(parseChange(formatChange("fix", "The lock card asks again.\n"), "changes/a.md")).toEqual({ type: "fix", body: "The lock card asks again.", file: "changes/a.md" });
    expect(() => parseChange("The lock card asks again.", "changes/a.md")).toThrow(/front matter/);
    expect(() => parseChange(formatChange("chore", "x"), "changes/a.md")).toThrow(/type must be one of/);
    expect(() => parseChange(formatChange("fix", "  "), "changes/a.md")).toThrow(/say what changed/);
    expect(CHANGE_TYPES).toEqual(["breaking", "feature", "fix", "internal"]);
  });

  it("keeps every note in changes/ readable", async () => {
    for (const note of await readChanges()) expect(CHANGE_TYPES, note.file).toContain(note.type);
  });

  it("counts a change as shipped when it can change a tarball or the bundle", () => {
    for (const path of ["packages/core/src/entities/light/types.ts", "src/skins/orb/cards/lock/LockCard.tsx", "apps/lovelace/entry.ts", "package-lock.json", "packages/create-dashhaus-skin/src/templates/card/x.tsx"]) {
      expect(shipsFrom(path), path).toBe(true);
    }
    for (const path of ["packages/core/src/entities/light/light.test.ts", "src/skins/orb/cards/lock/LockCard.stories.tsx", "packages/core/README.md", "docs/src/content/docs/index.mdx", "spec/orb.md", "verify/storybook.test.ts", "packages/fake-home-assistant/src/server.js"]) {
      expect(shipsFrom(path), path).toBe(false);
    }
    for (const { dir } of publicPackages) expect(shipsFrom(`${dir}/package.json`), dir).toBe(true);
  });

  it("asks a pull request that ships for a note, and nothing of one that doesn't or that releases", () => {
    const card = { status: "M", path: "src/skins/orb/cards/lock/LockCard.tsx" };
    expect(pullRequestProblem([card])).toMatch(/adds no change note.*npm run change/);
    expect(pullRequestProblem([card, { status: "A", path: "changes/lock-asks-again.md" }])).toBeUndefined();
    expect(pullRequestProblem([card, { status: "M", path: "changes/lock-asks-again.md" }])).toBeUndefined();
    expect(pullRequestProblem([card, { status: "M", path: "changes/README.md" }])).toMatch(/no change note/);
    expect(pullRequestProblem([{ status: "M", path: "spec/orb.md" }, { status: "M", path: "src/skins/orb/cards/lock/LockCard.test.tsx" }])).toBeUndefined();
    // A release PR moves every manifest and deletes the notes it collects.
    expect(pullRequestProblem([
      { status: "M", path: "packages/core/package.json" },
      { status: "D", path: "changes/lock-asks-again.md" },
      { status: "A", path: "spec/releases/0.3.0.sha256" },
    ])).toBeUndefined();
  });

  it("names a note from its first words, numbered when taken", () => {
    expect(noteFileName("Orb's lock card asks for the code again, instead of locking.", new Set())).toBe("orbs-lock-card-asks-for-the-code-again.md");
    expect(noteFileName("Fix it", new Set(["fix-it.md", "fix-it-2.md"]))).toBe("fix-it-3.md");
    expect(noteFileName("!!!", new Set())).toBe("change.md");
  });
});

const api = (exports: Record<string, Record<string, string>>): Api =>
  Object.fromEntries(Object.entries(exports).map(([key, own]) => [key, { typed: true, exports: own }]));

describe("the API comparison", () => {
  it("calls a removed entry, a removed export or a changed declaration breaking, and an addition additive", () => {
    const before = api({ "@dashhaus/core": { useHaLight: "f(a: string): void", gone: "x" }, "@dashhaus/core/old": {} });
    const after = api({ "@dashhaus/core": { useHaLight: "f(a: number): void", useHaFan: "y" }, "@dashhaus/core/new": {} });
    const diff = diffApi(before, after);
    expect(diff).toMatchObject({
      removedSubpaths: ["@dashhaus/core/old"],
      addedSubpaths: ["@dashhaus/core/new"],
      removed: [{ subpath: "@dashhaus/core", name: "gone" }],
      changed: [{ subpath: "@dashhaus/core", name: "useHaLight" }],
      added: [{ subpath: "@dashhaus/core", name: "useHaFan" }],
      breaking: true,
      additive: true,
    });
    expect(apiMarkdown(diff, "0.2.0").split("\n")).toEqual([
      "- **Removed entry** `@dashhaus/core/old`",
      "- **Removed** `gone` from `@dashhaus/core`",
      "- **Changed** `useHaLight` in `@dashhaus/core`",
      "- Added entry `@dashhaus/core/new`",
      "- Added `useHaFan` to `@dashhaus/core`",
    ]);
    const same = diffApi(before, before);
    expect(same.breaking || same.additive).toBe(false);
    expect(apiMarkdown(same, "0.2.0")).toMatch(/^None/);
  });

  it("suggests the next version the way a caret range reads it", () => {
    expect(suggestVersion("0.2.0", { breaking: true, feature: true })).toBe("0.3.0");
    expect(suggestVersion("0.2.0", { breaking: false, feature: true })).toBe("0.2.1");
    expect(suggestVersion("0.2.3", { breaking: false, feature: false })).toBe("0.2.4");
    expect(suggestVersion("1.4.2", { breaking: true, feature: false })).toBe("2.0.0");
    expect(suggestVersion("1.4.2", { breaking: false, feature: true })).toBe("1.5.0");
    expect(suggestVersion("1.4.2", { breaking: false, feature: false })).toBe("1.4.3");
  });

  it("orders versions, a prerelease below its release", () => {
    expect(compareVersions("0.3.0", "0.2.9")).toBe(1);
    expect(compareVersions("0.3.0-rc.1", "0.3.0")).toBe(-1);
    expect(compareVersions("0.3.0-rc.1", "0.3.0-rc.2")).toBe(-1);
    expect(compareVersions("0.2.0", "0.2.0")).toBe(0);
  });

  it("reads each export's declaration from packed types, without comments, following the package's exports", async () => {
    const work = await mkdtemp(join(process.cwd(), "node_modules/.cache/api-test-"));
    try {
      const write = async (version: string, body: string) => {
        const pkg = join(work, version, "node_modules/@dashhaus/core");
        await mkdir(join(pkg, "dist/seeds"), { recursive: true });
        await writeFile(join(pkg, "package.json"), JSON.stringify({
          name: "@dashhaus/core",
          exports: {
            ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
            "./seeds/*": { types: "./dist/seeds/*.d.ts", import: "./dist/seeds/*.js" },
            "./fixtures/*": "./fixtures/*.json",
          },
        }));
        await writeFile(join(pkg, "dist/index.d.ts"), body);
        await writeFile(join(pkg, "dist/seeds/light.d.ts"), "export declare const LIGHT: { on: boolean };\n");
        return readApi(join(work, version), ["@dashhaus/core"]);
      };
      const before = await write("a", "/** Reads a light. */\nexport declare function useHaLight(id: string): void;\nexport type Kind = 'a';\n");
      const reworded = await write("b", "/** Reads one light, by id. */\nexport declare function useHaLight(id: string): void;\nexport type Kind = 'a';\n");
      const changed = await write("c", "export declare function useHaLight(id: string, options?: {}): void;\nexport type Kind = 'a';\n");
      expect(Object.keys(before)).toEqual(["@dashhaus/core", "@dashhaus/core/seeds/light", "@dashhaus/core/fixtures/*"]);
      expect(before["@dashhaus/core/fixtures/*"]).toEqual({ typed: false, exports: {} });
      expect(before["@dashhaus/core"].exports.useHaLight).toBe("export declare function useHaLight(id: string): void;");
      expect(diffApi(before, reworded).breaking, "a doc comment is not the API").toBe(false);
      expect(diffApi(before, changed).changed.map(({ name }) => name)).toEqual(["useHaLight"]);
    } finally {
      await rm(work, { recursive: true, force: true });
    }
    // Three TypeScript programs: about 1.5s alone, more beside the whole suite.
  }, 30_000);
});

describe("the candidate", () => {
  const hash = (c: string) => c.repeat(64);

  it("writes and reads sha256sum lines, and says where the packed files differ from the recorded ones", () => {
    const recorded = [{ name: "dashhaus-core-0.3.0.tgz", hash: hash("a") }, { name: "dashhaus.js", hash: hash("b") }];
    expect(formatDigests(recorded)).toBe(`${hash("a")}  dashhaus-core-0.3.0.tgz\n${hash("b")}  dashhaus.js\n`);
    expect(parseDigests(formatDigests(recorded))).toEqual(recorded);
    expect(() => parseDigests("nonsense\n")).toThrow(/sha256sum/);
    expect(digestProblems(recorded, recorded)).toEqual([]);
    expect(digestProblems(recorded, [{ name: "dashhaus-core-0.3.0.tgz", hash: hash("c") }, { name: "dashhaus-orb-0.3.0.tgz", hash: hash("d") }])).toEqual([
      "dashhaus-core-0.3.0.tgz packs cccccccccccc…, the record says aaaaaaaaaaaa…",
      "dashhaus-orb-0.3.0.tgz is packed but not recorded",
      "dashhaus.js is recorded but not packed",
    ]);
  });

  it("publishes the record's Release page section, linking the whole record at the tag", () => {
    const record = "# Dashhaus 0.3.0\n\n## Release page\n\nThe lock card asks again.\n\n### Also\n\nMore.\n\n## What changed\n\nStuff.\n";
    expect(releaseBody(record, "0.3.0", REPO)).toBe(
      "The lock card asks again.\n\n### Also\n\nMore.\n\nFull notes: [spec/releases/0.3.0.md](https://github.com/Krystosterone/dashhaus/blob/v0.3.0/spec/releases/0.3.0.md)\n",
    );
    expect(releaseBody("## Release page\n\nLast section.", "0.3.0", REPO)).toMatch(/^Last section\.\n/);
    expect(() => releaseBody("# Dashhaus 0.3.0\n\n## What changed\n", "0.3.0", REPO)).toThrow(/Release page/);
  });
});

describe("the release record", () => {
  const notes = [
    { type: "fix" as const, body: "The lock card asks for the code again.", file: "changes/a.md" },
    { type: "feature" as const, body: "A fan card.\nWith two speeds.", file: "changes/b.md" },
    { type: "internal" as const, body: "A refactor.", file: "changes/c.md" },
  ];
  const none = diffApi({}, {});

  it("lists the notes by kind, counts the internal ones, and leaves a TODO only where a person decides", () => {
    const record = renderRecord({ version: "0.2.1", from: "0.2.0", notes, diff: none, repository: REPO });
    expect(record).toContain("### New\n\n- A fan card.\n  With two speeds.\n\n### Fixed\n\n- The lock card asks for the code again.\n");
    expect(record).not.toContain("A refactor.");
    expect(record).toContain("Internal changes, left out: 1.");
    expect(record).toContain("[0.2.1.sha256](0.2.1.sha256)");
    expect(unfinished(record).map((line) => line.slice(0, 40))).toEqual([
      "TODO: two or three lines for the GitHub ",
      "TODO: run it at this commit, as spec/rel",
    ]);
    expect(renderRecord({ version: "0.2.1", from: "0.2.0", notes, diff: none, repository: REPO }), "the same inputs write the same file").toBe(record);
  });

  it("asks for a decision when the API breaks and no note says so", () => {
    const breaking = diffApi(api({ "@dashhaus/core": { gone: "x" } }), api({ "@dashhaus/core": {} }));
    expect(unfinished(renderRecord({ version: "0.3.0", from: "0.2.0", notes, diff: breaking, repository: REPO }))).toHaveLength(3);
    const owned = [...notes, { type: "breaking" as const, body: "gone is gone.", file: "changes/d.md" }];
    expect(unfinished(renderRecord({ version: "0.3.0", from: "0.2.0", notes: owned, diff: breaking, repository: REPO }))).toHaveLength(2);
  });
});
