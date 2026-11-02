/**
 * A skin outside this repo proves the public surface it is promised from a packed install: the release tarballs go
 * into a temporary app and both entries load from the installed dist. The conformance preset checks a two-card skin
 * where only the non-conforming card fails, by a rule it can name. The card schema defines a kind with its own id
 * pattern, keys and options: `cardKinds` dispatches to it, `readCard` merges the option it reads into the card, and a
 * bad value is one problem at the card's path naming its key. The build and pack use a temporary build root, so this
 * never touches the repo's own `dist/` while the rest of the suite runs.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pack } from "../scripts/release/pack.js";

const writeFiles = async (root: string, files: Record<string, string>) => {
  for (const [path, body] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), body);
  }
};

describe("the packed public surface", () => {
  it("serves a skin outside the workspace the conformance preset and the card schema from dist", async () => {
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
      expect(files, "the packed dashboard ships the conformance and schema entries with their declarations").toEqual(
        expect.arrayContaining([
          "package/dist/conformance.js",
          "package/dist/conformance.d.ts",
          "package/dist/schema.js",
          "package/dist/schema.d.ts",
        ]),
      );
      expect(files.filter((file) => /\.(?:test|stories)\./.test(file)), "the tarball ships no test or story files").toEqual([]);
      expect(files.filter((file) => file.startsWith("package/src/")), "the tarball ships dist, not source").toEqual([]);
      const manifest = JSON.parse(execFileSync("tar", ["-xOzf", dashboard.tarball, "package/package.json"], { encoding: "utf8" }));
      expect(manifest.exports["./conformance"]).toEqual({
        types: "./dist/conformance.d.ts",
        import: "./dist/conformance.js",
        default: "./dist/conformance.js",
      });
      expect(manifest.exports["./schema"], "the packed manifest points the schema at dist, never source").toEqual({
        types: "./dist/schema.d.ts",
        import: "./dist/schema.js",
        default: "./dist/schema.js",
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
        "check.js": `
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
        "schema-check.js": `
import { Reader, cardKinds, readCard, readColor } from "@dashhaus/dashboard/schema";

const schema = {
  noun: "card",
  common: ["entity", "card", "name"],
  kinds: {
    light: { domains: ["light"] },
    candle: {
      domains: ["light"],
      id: /^light\\.candle_/,
      keys: ["color"],
      options: (read, raw, at) => ({ color: readColor(read, raw, at, ["amber"]) }),
    },
  },
  base: (read, raw, at) => ({ name: read.string(raw, "name", at) }),
};

const table = cardKinds(schema.kinds);
const ok = new Reader();
const card = readCard(ok, schema, { entity: "light.candle_hall", name: "Hall candle", color: "amber" }, "cards[0]");
const bad = new Reader();
const rejected = readCard(bad, schema, { entity: "light.candle_hall", color: "blue" }, "cards[0]");

console.log(JSON.stringify({
  resolved: import.meta.resolve("@dashhaus/dashboard/schema"),
  kindsFor: table.kindsFor("light.candle_hall"),
  kindOfCandle: table.kindOf("light.candle_hall"),
  kindOfLight: table.kindOf("light.kitchen"),
  card,
  okProblems: ok.problems,
  rejectedKind: rejected?.kind,
  rejectedColor: rejected?.color ?? null,
  problems: bad.problems,
}));
`,
      });
      execFileSync("npm", ["install", "--no-audit", "--no-fund", "--legacy-peer-deps"], { cwd: app, stdio: "pipe" });
      const output = execFileSync(process.execPath, ["check.js"], { cwd: app, encoding: "utf8" });
      expect(output.trim()).toBe('[{"card":"bad","rule":"class-prefix","message":"skin/cards/bad/BadCard.css: .oops"}]');

      const proof = JSON.parse(execFileSync(process.execPath, ["schema-check.js"], { cwd: app, encoding: "utf8" }));
      expect(proof.resolved, "the schema is imported from the installed tarball's dist").toMatch(/node_modules\/@dashhaus\/dashboard\/dist\/schema\.js$/);
      expect(proof.resolved).not.toMatch(/\/src\//);
      expect(proof.kindsFor).toEqual(["light", "candle"]);
      expect(proof.kindOfCandle).toBe("candle");
      expect(proof.kindOfLight).toBe("light");
      expect(proof.card).toEqual({ name: "Hall candle", entity: "light.candle_hall", kind: "candle", color: "amber" });
      expect(proof.okProblems).toEqual([]);
      expect(proof.rejectedKind).toBe("candle");
      expect(proof.rejectedColor, "a bad option is reported, not silently defaulted").toBeNull();
      expect(proof.problems).toHaveLength(1);
      expect(proof.problems[0]).toMatch(/^cards\[0\] \(light\.candle_hall\):/);
      expect(proof.problems[0]).toContain('"color"');
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }, 120_000);
});
