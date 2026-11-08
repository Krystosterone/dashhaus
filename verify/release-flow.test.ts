/**
 * The release flow's logic (spec/release.md → Releasing): change notes and which pull requests owe one, the API
 * comparison and the version it suggests, the candidate's digests and unfinished record, and the record itself. The
 * workflow that runs them is held by verify/toolchain.test.ts; packing is exercised by CI's dx lane. The registry check
 * runs here against a fake registry, which is late the way npm is after a publish.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { apiMarkdown, apiOfTarballs, compareVersions, diffApi, readApi, suggestVersion } from "../scripts/release/api.js";
import type { Api } from "../scripts/release/api.js";
import { digestProblems, formatDigests, lateNoteProblems, parseDigests, releaseBody, unfinished } from "../scripts/release/candidate.js";
import { CHANGE_TYPES, formatChange, noteFileName, parseChange, pullRequestProblem, readChanges, shipsFrom } from "../scripts/release/changes.js";
import { publicPackages } from "../scripts/release/manifest.js";
import { renderRecord } from "../scripts/release/prepare.js";
import { fetchFromRegistry, publishedAt, waitFor } from "../scripts/release/registry.js";

const REPO = "git+https://github.com/Krystosterone/dashhaus.git";

/** Every skin with a public entry, by the name a note gives it: `orb` is Orb, `glass-house` Glass House. */
const SKINS = readdirSync("src/skins", { withFileTypes: true })
  .filter((dir) => dir.isDirectory() && existsSync(join("src/skins", dir.name, "index.ts")))
  .map((dir) => ({ dir: dir.name, name: dir.name.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ") }));

/**
 * The code a note names as a skin's (spec/release.md → Change notes): `Orb's <Name>` (or `Orb's and Field's <Name>`)
 * where `<Name>` reads as an identifier, not a word: in backticks, with a capital inside it (`TogglePill`), or called a
 * part, component or hook. "Orb's Owlet card" and "Field's YAML" name what a consumer sees, not code.
 */
function namedCode(body: string, skins = SKINS.map(({ name }) => name)) {
  const skin = `(?:${skins.join("|")})['\u2019]s`;
  const pattern = new RegExp(`\\b(${skin}(?:,? (?:and|or) ${skin})*) (?:\`([A-Za-z_$][\\w$]*)\`|([A-Z][a-z0-9]+[A-Z][\\w$]*)|([A-Z][\\w$]*)(?= (?:parts?|components?|hooks?)\\b))`, "g");
  return [...body.matchAll(pattern)].flatMap((match) => {
    const name = match[2] ?? match[3] ?? match[4];
    return skins.filter((each) => new RegExp(`\\b${each}['\u2019]s`).test(match[1])).map((each) => ({ skin: each, name }));
  });
}

/** What a skin's entry exports, by name. Its entry lists its exports by name, so a star re-export is refused. */
function skinExports(dir: string): Set<string> {
  const path = join("src/skins", dir, "index.ts");
  const file = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const names = new Set<string>();
  for (const statement of file.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) throw new Error(`${path}: export * hides what it exports`);
      for (const element of statement.exportClause.elements) names.add(element.name.text);
    } else if (ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      const declared = ts.isVariableStatement(statement) ? statement.declarationList.declarations.map((d) => d.name) : [(statement as ts.DeclarationStatement).name];
      for (const name of declared) if (name && ts.isIdentifier(name)) names.add(name.text);
    }
  }
  return names;
}

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

  it("finds the code a note names as a skin's, and not the words a consumer sees", () => {
    const skins = ["Orb", "Field"];
    expect(namedCode("Orb's TogglePill gains a disabled state; Field's Steps part gains a value.", skins)).toEqual([
      { skin: "Orb", name: "TogglePill" }, { skin: "Field", name: "Steps" },
    ]);
    expect(namedCode("Orb's and Field's `Picture` part, and Orb’s `useCard`.", skins)).toEqual([
      { skin: "Orb", name: "Picture" }, { skin: "Field", name: "Picture" }, { skin: "Orb", name: "useCard" },
    ]);
    expect(namedCode("Orb's Owlet card, Field's YAML, Field's Storybook and Orb's sheet.", skins)).toEqual([]);
  });

  it("names a skin's code only where that skin's entry exports it", async () => {
    const exports = new Map(SKINS.map(({ dir, name }) => [name, skinExports(dir)]));
    expect(exports.get("Orb")?.has("TogglePill"), "reads a skin's entry").toBe(true);
    const unexported = (await readChanges()).flatMap(({ file, body }) => namedCode(body)
      .filter(({ skin, name }) => !exports.get(skin)?.has(name))
      .map(({ skin, name }) => `${file}: ${skin}'s ${name} is not exported from its entry; say what it does instead`));
    expect(unexported).toEqual([]);
  });

  it("counts a change as shipped when it can change a tarball or a resource", () => {
    for (const path of ["packages/core/src/entities/light/types.ts", "src/skins/orb/cards/lock/LockCard.tsx", "src/skins/orb/lovelace/resource.ts", "scripts/resources.js", "package-lock.json", "packages/create-dashhaus-skin/src/templates/card/x.tsx"]) {
      expect(shipsFrom(path), path).toBe(true);
    }
    for (const path of ["packages/core/src/entities/light/light.test.ts", "src/skins/orb/cards/lock/LockCard.stories.tsx", "packages/core/README.md", "src/skins/orb/stories/DesignRules.mdx", "docs/src/content/docs/index.mdx", "spec/orb.md", "verify/storybook.test.ts", "packages/fake-home-assistant/src/server.js"]) {
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
    // Inside the repository, so the unpacked declarations resolve React's types; a fresh install has no .cache yet.
    await mkdir(join(process.cwd(), "node_modules/.cache"), { recursive: true });
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
      // A package new since the version compared with has no tarball there: left out, so all of it reads as added.
      const none = await apiOfTarballs(join(work, "no-tarballs"), "0.1.0", work);
      expect(none).toEqual({});
      expect(diffApi(none, before)).toMatchObject({ addedSubpaths: Object.keys(before), breaking: false, additive: true });
    } finally {
      await rm(work, { recursive: true, force: true });
    }
    // Four TypeScript programs: about 2s alone, more beside the whole suite.
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

  it("counts only the TODO: markers as unfinished, and a note that arrived after the record as missing from it", () => {
    expect(unfinished("## Release page\n\nTODO: write it.\n\n- The TODO list card shows due dates.\n")).toEqual(["TODO: write it."]);
    expect(lateNoteProblems([{ file: "changes/fan-speeds.md" }], "0.3.0")).toEqual([
      "changes/fan-speeds.md arrived after spec/releases/0.3.0.md was written; add it to What changed there and delete it",
    ]);
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

describe("the registry check", () => {
  const sha1 = (bytes: Buffer) => createHash("sha1").update(bytes).digest("hex");
  const sha512 = (bytes: Buffer) => `sha512-${createHash("sha512").update(bytes).digest("base64")}`;

  /**
   * A registry that knows `packages` and answers each version's document with a 404 for its first `late` asks, as npm
   * does just after a publish. It serves nothing else: no package index, so a check that reads one fails.
   */
  async function registry(packages: { name: string; version: string; bytes: Buffer; shasum?: string }[], late = 0) {
    const asked = new Map<string, number>();
    const seen: string[] = [];
    const server = createServer((request, response) => {
      const path = decodeURIComponent(request.url ?? "");
      seen.push(path);
      const pkg = packages.find(({ name, version }) => path === `/${name}/${version}` || path === `/${name}/-/${version}.tgz`);
      if (!pkg) return response.writeHead(404).end("not found");
      if (path.endsWith(".tgz")) return response.writeHead(200).end(pkg.bytes);
      const times = (asked.get(path) ?? 0) + 1;
      asked.set(path, times);
      if (times <= late) return response.writeHead(404).end("version not found");
      const { port } = server.address() as AddressInfo;
      const dist = { shasum: pkg.shasum ?? sha1(pkg.bytes), integrity: sha512(pkg.bytes), tarball: `http://127.0.0.1:${port}/${pkg.name}/-/${pkg.version}.tgz` };
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ name: pkg.name, version: pkg.version, dist }));
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
    return { url, seen, close: () => new Promise<void>((done) => server.close(() => done())) };
  }

  async function scratch() {
    const dir = await mkdtemp(join(tmpdir(), "dashhaus-registry-"));
    await mkdir(join(dir, "release"));
    return dir;
  }

  const core = { name: "@dashhaus/core", version: "0.3.0", bytes: Buffer.from("core 0.3.0") };
  const orb = { name: "@dashhaus/orb", version: "0.3.0", bytes: Buffer.from("orb 0.3.0") };
  const quick = { pause: 5, log: () => {} };

  it("waits for a version npm lists late, then checks it against the registry and the packed tarball", async () => {
    const npm = await registry([core, orb], 3);
    const dir = await scratch();
    try {
      await writeFile(join(dir, "release", "dashhaus-core-0.3.0.tgz"), core.bytes);
      await writeFile(join(dir, "release", "dashhaus-orb-0.3.0.tgz"), orb.bytes);
      const problems = await fetchFromRegistry("0.3.0", join(dir, "registry"), join(dir, "release"), [core.name, orb.name], { registry: npm.url, wait: 5_000, ...quick });
      expect(problems).toEqual([]);
      expect(await readdir(join(dir, "registry"))).toEqual(["dashhaus-core-0.3.0.tgz", "dashhaus-orb-0.3.0.tgz"]);
      expect(npm.seen.filter((path) => path === "/@dashhaus/core/0.3.0"), "three misses, then the document").toHaveLength(4);
      expect(npm.seen.every((path) => /\/0\.3\.0(?:\.tgz)?$/.test(path)), "it never asks for a package's index").toBe(true);
    } finally {
      await npm.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("says which version npm still doesn't have when the wait is over", async () => {
    const npm = await registry([core], Infinity);
    const dir = await scratch();
    try {
      await expect(fetchFromRegistry("0.3.0", join(dir, "registry"), undefined, [core.name], { registry: npm.url, wait: 50, ...quick })).rejects.toThrow(
        "@dashhaus/core@0.3.0: not on the registry yet, and the wait is over",
      );
    } finally {
      await npm.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports a tarball that is not the registry's or not the one this commit packed", async () => {
    const npm = await registry([{ ...core, shasum: "0".repeat(40) }, orb]);
    const dir = await scratch();
    try {
      await writeFile(join(dir, "release", "dashhaus-core-0.3.0.tgz"), core.bytes);
      await writeFile(join(dir, "release", "dashhaus-orb-0.3.0.tgz"), "another build");
      const problems = await fetchFromRegistry("0.3.0", join(dir, "registry"), join(dir, "release"), [core.name, orb.name], { registry: npm.url, wait: 1_000, ...quick });
      expect(problems).toEqual([
        `@dashhaus/core@0.3.0: the downloaded tarball's SHA-1 ${sha1(core.bytes)} is not the registry's dist.shasum ${"0".repeat(40)}`,
        `@dashhaus/orb@0.3.0: npm holds ${sha1(orb.bytes)}, but the tag packs ${sha1(Buffer.from("another build"))}`,
      ]);
    } finally {
      await npm.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("tells a published version from one npm doesn't have", async () => {
    const npm = await registry([core]);
    try {
      expect(await publishedAt(core.name, "0.3.0", npm.url)).toBe(true);
      expect(await publishedAt(core.name, "0.2.9", npm.url)).toBe(false);
    } finally {
      await npm.close();
    }
  });

  it("retries an error as well as a miss, doubling its pause, until the deadline", async () => {
    const lines: string[] = [];
    let calls = 0;
    const found = await waitFor("x", () => (++calls === 1 ? undefined : calls === 2 ? Promise.reject(new Error("503")) : "here"), { pause: 1, log: (line) => lines.push(line) });
    expect(found).toBe("here");
    expect(lines).toEqual(["  x: not on the registry yet; trying again in 1s", "  x: 503; trying again in 1s"]);
    await expect(waitFor("y", () => undefined, { deadline: Date.now(), log: () => {} })).rejects.toThrow("y: not on the registry yet, and the wait is over");
  });
});
