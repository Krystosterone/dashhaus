/**
 * A skin outside this repo proves the public surface it is promised from a packed install: the release tarballs go
 * into a temporary app and both entries load from the installed dist. The conformance preset checks a two-card skin
 * where only the non-conforming card fails, by a rule it can name. The card schema defines a kind with its own id
 * pattern, keys and options: `cardKinds` dispatches to it, `readCard` merges the option it reads into the card, and a
 * bad value is one problem at the card's path naming its key. The build and pack use a temporary build root, so this
 * never touches the repo's own `dist/` while the rest of the suite runs.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLISH_ORDER, publishOrder } from "../scripts/release/manifest.js";
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
      const core = packed.find((pkg) => pkg.package === "@dashhaus/core");
      if (!core) throw new Error("pack did not produce the core tarball");
      // The Release workflow publishes in this file's order, with the shell alone.
      expect(await readFile(join(tarballs, PUBLISH_ORDER), "utf8")).toBe(publishOrder(packed));

      const files = execFileSync("tar", ["-tzf", core.tarball], { encoding: "utf8" }).trim().split("\n");
      expect(files, "the packed core ships the conformance and schema entries with their declarations").toEqual(
        expect.arrayContaining([
          "package/dist/lovelace/conformance.js",
          "package/dist/lovelace/conformance.d.ts",
          "package/dist/lovelace/schema.js",
          "package/dist/lovelace/schema.d.ts",
        ]),
      );
      expect(files.filter((file) => /\.(?:test|stories)\./.test(file)), "the tarball ships no test or story files").toEqual([]);
      expect(files.filter((file) => file.startsWith("package/src/")), "the tarball ships dist, not source").toEqual([]);
      const manifest = JSON.parse(execFileSync("tar", ["-xOzf", core.tarball, "package/package.json"], { encoding: "utf8" }));
      expect(manifest.exports["./lovelace/conformance"]).toEqual({
        types: "./dist/lovelace/conformance.d.ts",
        import: "./dist/lovelace/conformance.js",
        default: "./dist/lovelace/conformance.js",
      });
      expect(manifest.exports["./lovelace/schema"], "the packed manifest points the schema at dist, never source").toEqual({
        types: "./dist/lovelace/schema.d.ts",
        import: "./dist/lovelace/schema.js",
        default: "./dist/lovelace/schema.js",
      });
      expect(manifest.peerDependenciesMeta?.vitest?.optional, "the preset needs no test runner of its own: only ./testing names one").toBe(true);

      await writeFiles(app, {
        "package.json": `${JSON.stringify({
          name: "dashhaus-conformance-consumer",
          private: true,
          type: "module",
          dependencies: {
            "@dashhaus/core": `file:${core.tarball}`,
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
import { cardFolders, checkCards } from "@dashhaus/core/lovelace/conformance";

assert.match(import.meta.resolve("@dashhaus/core/lovelace/conformance"), /node_modules\\/@dashhaus\\/core\\/dist\\/lovelace\\/conformance\\.js$/);
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
import { Reader, cardKinds, readCard, readColor } from "@dashhaus/core/lovelace/schema";

const schema = {
  noun: "card",
  common: ["entity", "card", "name"],
  kinds: {
    light: { domains: ["light"] },
    candle: {
      domains: ["light"],
      id: /^light\\.candle_/,
      keys: ["color"],
      readOptions: (read, raw, at) => ({ color: readColor(read, raw, at, ["amber"]) }),
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
  resolved: import.meta.resolve("@dashhaus/core/lovelace/schema"),
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
      expect(proof.resolved, "the schema is imported from the installed tarball's dist").toMatch(/node_modules\/@dashhaus\/core\/dist\/lovelace\/schema\.js$/);
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
