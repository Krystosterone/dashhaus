/**
 * A card drawn from its domain's description, in both mature skins: in a copy of the repo, the fan's orb card and
 * field module go, with every registration they made, and the generators draw them again from the domain core already
 * has (`describeDomain`, the scaffolder's `domains.json` too). What comes back typechecks and passes each skin's
 * conformance and Storybook shape, with only its words and icon left to write by hand.
 */
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { copyRepo, linkNodeModules, run, typecheckCopy } from "../repo-copy";

const script = "scripts/new-card/index.js";

const change = (copy: string, path: string, edit: (source: string) => string) => {
  const full = join(copy, path);
  const before = readFileSync(full, "utf8");
  const after = edit(before);
  if (after === before) throw new Error(`nothing to remove in ${path}: update this test's list of fan's registrations`);
  writeFileSync(full, after);
};
const withoutLines = (pattern: RegExp) => (source: string) => source.split("\n").filter((line) => !pattern.test(line)).join("\n");

/** Remove the fan's orb card and field module, and what they registered, leaving its domain in core. */
const removeFan = (copy: string) => {
  for (const path of ["src/skins/orb/cards/fan", "src/skins/orb/ha/HaFanTile.tsx", "src/skins/orb/ha/HaFanTile.stories.tsx", "src/skins/orb/ha/HaFanTile.test.tsx",
    "src/skins/field/cards/fan", "src/skins/field/ha/HaFanModule.tsx", "src/skins/field/ha/HaFanModule.stories.tsx", "src/skins/field/ha/HaFanModule.test.tsx"]) {
    rmSync(join(copy, path), { recursive: true, force: true });
  }
  change(copy, "src/skins/orb/index.ts", withoutLines(/^\/\/ Fan$|\.\/cards\/fan\/|\.\/ha\/HaFanTile"/));
  change(copy, "src/skins/orb/lovelace/config.ts", withoutLines(/^ {2}\| "fan"$|^ {2}fan: "fan",$|kind: "fan"|^ {2}fan: \{ keys:/));
  change(copy, "src/skins/orb/lovelace/ConfigDashboard.tsx", withoutLines(/HaFanTile/));
  change(copy, "src/skins/orb/lovelace/auto.ts", withoutLines(/^ {4}"fan",$/));
  change(copy, "src/skins/field/index.ts", withoutLines(/\.\/cards\/fan\/|\.\/ha\/HaFanModule"/));
  change(copy, "src/skins/field/lovelace/config.ts", withoutLines(/^ {2}\| "fan"$|^ {2}fan: \{ domains: \["fan"\] \},$/));
  change(copy, "src/skins/field/lovelace/FieldDashboard.tsx", withoutLines(/HaFanModule/));
  change(copy, "src/skins/field/stories/DesignRules.mdx", withoutLines(/cards\/fan\/FanModule\.stories|^ {4}Fan: \[Fan\./));
  change(copy, ".storybook/preview.tsx", withoutLines(/^ {14}"Fan",$/));
  change(copy, "AGENTS.md", (source) => source.replace(", `fd-fn-` for fan", ""));
  change(copy, "spec/field.md", (source) => source.replace(/\n## Fan\n[\s\S]*?(?=\n## |$)/, ""));
  change(copy, "spec/cards.md", (source) => source.replace(/\n### Field fan module\n[\s\S]*?(?=\n## |\n### )/, ""));
};

describe("new-card from a domain's description", () => {
  let copy = "";
  beforeAll(() => {
    copy = copyRepo("new-card-regenerate-");
    removeFan(copy);
    linkNodeModules(copy);
  }, 120_000);
  afterAll(() => process.env.KEEP_REGENERATE_COPY ? console.info(`REGENERATE_COPY=${copy}`) : rmSync(copy, { recursive: true, force: true }));

  it("draws the fan again in orb and field, from the parts, with only its words and icon to write", async () => {
    const orb = await run(copy, "node", [script, "fan", "--code", "fn"]);
    expect(orb.status, orb.output).toBe(0);
    const field = await run(copy, "node", [script, "fan", "--skin", "field"]);
    expect(field.status, field.output).toBe(0);

    const card = readFileSync(join(copy, "src/skins/orb/cards/fan/FanCard.tsx"), "utf8");
    expect(card).toContain("<CardFrame");
    const module = readFileSync(join(copy, "src/skins/field/cards/fan/FanModule.tsx"), "utf8");
    expect(module).toContain("<ModuleFrame");

    const typecheck = await typecheckCopy(copy);
    expect(typecheck.status, typecheck.output).toBe(0);
    const tests = await run(copy, "npx", ["vitest", "run", "--config", "config/vitest.config.ts",
      "src/skins/orb/cards/fan", "src/skins/orb/ha/HaFanTile.test.tsx", "src/skins/field/cards/fan", "src/skins/field/ha/HaFanModule.test.tsx",
      "verify/orb-conformance.test.ts", "verify/field-conformance.test.ts", "verify/storybook.test.ts", "verify/card-copies.test.ts"]);
    expect(tests.status, tests.output).toBe(0);
    const lint = await run(copy, "npx", ["eslint", "src/skins/orb/cards/fan", "src/skins/orb/ha", "src/skins/field/cards/fan", "src/skins/field/ha"]);
    expect(lint.status, lint.output).toBe(0);
  }, 300_000);
});
