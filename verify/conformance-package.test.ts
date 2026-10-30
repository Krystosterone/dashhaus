/**
 * A skin outside this repo proves the public conformance preset: it installs the release tarballs into a temporary
 * app, imports `@dashhaus/dashboard/conformance` from the packed dist, and checks a two-card skin where only the
 * non-conforming card fails, by a rule it can name. The build and pack use a temporary build root, so this never
 * touches the repo's own `dist/` while the rest of the suite runs.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pack } from "../scripts/release/pack.mjs";

const writeFiles = async (root: string, files: Record<string, string>) => {
  for (const [path, body] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), body);
  }
};

describe("the packed conformance preset", () => {
  it("fails only the non-conforming card of a skin outside the workspace", async () => {
    const work = await mkdtemp(join(tmpdir(), "dashhaus-conformance-"));
    try {
      const { tarballs, buildRoot, app } = {
        tarballs: join(work, "tarballs"),
        buildRoot: join(work, "build"),
        app: join(work, "app"),
      };
      const packed = await pack(tarballs, buildRoot);
      const dashboard = packed.find((pkg) => pkg.package === "@dashhaus/dashboard");
      const core = packed.find((pkg) => pkg.package === "@dashhaus/core");
      if (!dashboard || !core) throw new Error("pack did not produce the core and dashboard tarballs");

      const files = execFileSync("tar", ["-tzf", dashboard.tarball], { encoding: "utf8" }).trim().split("\n");
      expect(files, "the packed dashboard ships the conformance entry and its declarations").toEqual(
        expect.arrayContaining(["package/dist/conformance.js", "package/dist/conformance.d.ts"]),
      );
      expect(files.filter((file) => /\.(?:test|stories)\./.test(file)), "the tarball ships no test or story files").toEqual([]);
      expect(files.filter((file) => file.startsWith("package/src/")), "the tarball ships dist, not source").toEqual([]);
      const manifest = JSON.parse(execFileSync("tar", ["-xOzf", dashboard.tarball, "package/package.json"], { encoding: "utf8" }));
      expect(manifest.exports["./conformance"]).toEqual({
        types: "./dist/conformance.d.ts",
        import: "./dist/conformance.js",
        default: "./dist/conformance.js",
      });
      expect(manifest.peerDependencies?.vitest, "the preset needs no test runner of its own").toBeUndefined();

      await writeFiles(app, {
        "package.json": `${JSON.stringify({
          name: "dashhaus-conformance-consumer",
          private: true,
          type: "module",
          dependencies: {
            "@dashhaus/core": `file:${core.tarball}`,
            "@dashhaus/dashboard": `file:${dashboard.tarball}`,
          },
        }, null, 2)}\n`,
        "skin/cards/good/GoodCard.tsx": `export const GoodCard = () => <article className="gd-card">{useCard("gd")}</article>;\n`,
        "skin/cards/good/GoodCard.css": ".gd-card { display: block; }\n",
        "skin/cards/good/Good.stories.tsx": `export default { title: "Third/Cards/Good" };\n`,
        "skin/cards/bad/BadCard.tsx": `export const BadCard = () => <article>{useCard("bd")}</article>;\n`,
        "skin/cards/bad/BadCard.css": ".oops { display: block; }\n",
        "skin/cards/bad/Bad.stories.tsx": `export default { title: "Third/Cards/Bad" };\n`,
        "check.mjs": `
import assert from "node:assert/strict";
import { cardFolders, checkCards } from "@dashhaus/dashboard/conformance";

assert.match(import.meta.resolve("@dashhaus/dashboard/conformance"), /node_modules\\/@dashhaus\\/dashboard\\/dist\\/conformance\\.js$/);
assert.deepEqual(cardFolders("skin"), ["bad", "good"]);
const findings = checkCards({
  skin: "skin",
  storyPrefix: "Third/Cards",
  component: (Name) => \`\${Name}Card.tsx\`,
  stories: (Name) => \`\${Name}.stories.tsx\`,
  code: (source) => source.match(/useCard\\("([a-z]+)"/)?.[1],
  allowedClass: (cls, card) => card.code != null && (cls === card.code || cls.startsWith(\`\${card.code}-\`)),
});
assert.deepEqual(findings, [{ card: "bad", rule: "class-prefix", message: "skin/cards/bad/BadCard.css: .oops" }]);
console.log(JSON.stringify(findings));
`,
      });
      execFileSync("npm", ["install", "--no-audit", "--no-fund", "--legacy-peer-deps"], { cwd: app, stdio: "pipe" });
      const output = execFileSync(process.execPath, ["check.mjs"], { cwd: app, encoding: "utf8" });
      expect(output.trim()).toBe('[{"card":"bad","rule":"class-prefix","message":"skin/cards/bad/BadCard.css: .oops"}]');
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }, 120_000);
});
