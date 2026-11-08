/**
 * The card generator edits files it doesn't own, by anchoring on their text, so a refactor elsewhere can break it
 * without anyone running it. A dry run against the repo catches a moved anchor; a real run in a copy of the repo
 * checks that what it writes still typechecks and passes the conformance and Storybook shape tests, in orb and, with
 * `--skin field`, over both generated and hand-built domains in field.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { copyRepo, linkNodeModules, root, run, typecheckCopy } from "../repo-copy";

const script = "scripts/new-card/index.js";
const generatedField = existsSync(join(root, "src/skins/field/lovelace/registry.tsx"));
const PROBES = [
  ["probeFan", "--code", "zf", "--domain", "probe_fan"],
  ["probeCo2", "--code", "zc", "--domain", "sensor", "--kind", "reading", "--unit", "ppm"],
];
/**
 * Field cards over the generated domains above, run in the copy once orb has drawn them: every hand-built domain has
 * its field card, so none is left to sample in the repo.
 */
const FIELD_CARDS = [["probeFan"], ["probeCo2"]].map((args) => [...args, "--skin", "field"]);
/** Domains the field generator must refuse, each with the reason it gives. */
const REFUSED = [
  ["owlet", /src\/skins\/field\/cards\/owlet already exists/],
  ["light", /src\/skins\/field\/cards\/light already exists/],
  ["humidifier", /src\/skins\/field\/cards\/humidifier already exists/],
  ["sound", /src\/skins\/field\/cards\/sound already exists/],
  ["cover", /src\/skins\/field\/cards\/cover already exists/],
  ["alarm", /src\/skins\/field\/cards\/alarm already exists/],
  ["lock", /src\/skins\/field\/cards\/lock already exists/],
] as const;

describe("new-card", () => {
  it.each(PROBES)("finds every anchor for %s", async (...args) => {
    const { status, output } = await run(root, "node", [script, ...args, "--dry-run"]);
    expect(status, output).toBe(0);
    for (const path of ["src/skins/orb/lovelace/config.ts", "src/skins/orb/lovelace/ConfigDashboard.tsx", "src/skins/orb/stories/WorstCase.stories.tsx", "spec/deploy.md"]) {
      expect(output).toContain(`edit   ${path}`);
    }
  });

  it.each(REFUSED)("refuses to draw %s in field, and says why", async (name, reason) => {
    const { status, output } = await run(root, "node", [script, name, "--skin", "field", "--dry-run"]);
    expect(status).toBe(1);
    expect(output).toMatch(reason);
  });

  describe("in a copy of the repo", () => {
    let copy = "";
    beforeAll(() => {
      copy = copyRepo("new-card-");
      linkNodeModules(copy);
    }, 120_000);
    afterAll(() => rmSync(copy, { recursive: true, force: true }));

    it("finds every field anchor", async () => {
      for (const args of PROBES) {
        const { status, output } = await run(copy, "node", [script, ...args]);
        expect(status, output).toBe(0);
      }
      const { status, output } = await run(copy, "node", [script, ...FIELD_CARDS[0], "--dry-run"]);
      expect(status, output).toBe(0);
      const paths = generatedField
        ? ["src/skins/field/lovelace/registry.tsx", ".storybook/preview.tsx", "src/skins/field/stories/DesignRules.mdx", "spec/field.md"]
        : ["src/skins/field/lovelace/config.ts", "src/skins/field/lovelace/FieldDashboard.tsx", ".storybook/preview.tsx", "src/skins/field/stories/DesignRules.mdx", "src/skins/field/stories/WorstCase.stories.tsx", "AGENTS.md"];
      for (const path of paths) expect(output).toContain(`edit   ${path}`);
    });

    it("writes cards that typecheck and pass the conformance and Storybook shape tests", async () => {
      for (const args of FIELD_CARDS) {
        const { status, output } = await run(copy, "node", [script, ...args]);
        expect(status, output).toBe(0);
      }
      const typecheck = await typecheckCopy(copy);
      expect(typecheck.status, typecheck.output).toBe(0);
      const tests = await run(copy, "npx", ["vitest", "run", "--config", "config/vitest.config.ts", "verify/orb-conformance.test.ts", "src/skins/field/cards/probeFan", "src/skins/field/cards/probeCo2", "src/skins/field/ha/HaProbeFanModule.test.tsx", "src/skins/field/ha/HaProbeCo2Module.test.tsx", "verify/field-conformance.test.ts", "verify/storybook.test.ts", "src/skins/orb/lovelace", "src/skins/field/lovelace", "packages/core/src/ha/mappers/fixtures.test.ts"]);
      expect(tests.status, tests.output).toBe(0);
      const lint = await run(copy, "npx", ["eslint", "src/skins/field"]);
      expect(lint.status, lint.output).toBe(0);
    }, 240_000);

    it("draws a control from the actions its domain declares, not only onToggle, and refuses one with none a press can give", async () => {
      const orb = await run(copy, "node", [script, "probeDial", "--code", "zd", "--domain", "probe_dial"]);
      expect(orb.status, orb.output).toBe(0);
      const actions = join(copy, "packages/core/src/ha/actions/probeDial.ts");
      const source = readFileSync(actions, "utf8");
      writeFileSync(actions, source.replaceAll("onToggle", "onSpin"));
      const control = await run(copy, "node", [script, "probeDial", "--skin", "field", "--dry-run"]);
      expect(control.status, control.output).toBe(0);
      // Undeclared, an action is never guessed from its signature.
      writeFileSync(actions, source.replace('  onToggle: { takes: "nothing" },\n', ""));
      const undeclared = await run(copy, "node", [script, "probeDial", "--skin", "field", "--dry-run"]);
      expect(undeclared.status).toBe(1);
      expect(undeclared.output).toMatch(/PROBE_DIAL_ACTIONS doesn't say what onToggle is/);
      // Only a value to set: nothing a press can give, so it starts as a reading, and a control is refused.
      writeFileSync(actions, source.replace('onToggle: { takes: "nothing" }', 'onToggle: { takes: "value" }'));
      const reading = await run(copy, "node", [script, "probeDial", "--skin", "field", "--dry-run"]);
      expect(reading.status, reading.output).toBe(0);
      const valueOnly = await run(copy, "node", [script, "probeDial", "--skin", "field", "--kind", "control", "--dry-run"]);
      expect(valueOnly.status).toBe(1);
      expect(valueOnly.output).toMatch(/no action a press can give[\s\S]*--kind reading/);
    });

    it("draws an action that asks first through the panel's question, never one press, even when it takes no code", async () => {
      const orb = await run(copy, "node", [script, "probeLatch", "--code", "zl", "--domain", "probe_latch"]);
      expect(orb.status, orb.output).toBe(0);
      const actions = join(copy, "packages/core/src/ha/actions/probeLatch.ts");
      writeFileSync(actions, readFileSync(actions, "utf8")
        .replace("  onToggle: () => void;\n}", "  onToggle: () => void;\n  onUnlatch: (code?: string) => void;\n  onPurge: () => void;\n  onLevel?: (level: number) => void;\n}")
        .replace('  onToggle: { takes: "nothing" },\n', '  onToggle: { takes: "nothing" },\n  onUnlatch: { takes: "code", asks: true },\n  onPurge: { takes: "nothing", asks: true },\n  onLevel: { takes: "value" },\n')
        .replace('      if (actionable()) run("toggle");\n    },\n', '      if (actionable()) run("toggle");\n    },\n    onUnlatch: (code) => {\n      if (actionable()) run("unlatch", code ? { code } : {});\n    },\n    onPurge: () => {\n      if (actionable()) run("purge");\n    },\n'));
      const types = join(copy, "packages/core/src/entities/probeLatch/types.ts");
      writeFileSync(types, readFileSync(types, "utf8").replace("  lastChanged?: string;", '  lastChanged?: string;\n  codeFormat?: "number" | "text" | null;'));
      const field = await run(copy, "node", [script, "probeLatch", "--skin", "field"]);
      expect(field.status, field.output).toBe(0);
      expect(field.output).toMatch(/onUnlatch \(asks first\), onPurge \(asks first\)/);
      expect(field.output).toMatch(/Left out onLevel/);
      const module = readFileSync(join(copy, "src/skins/field/cards/probeLatch/ProbeLatchModule.tsx"), "utf8");
      expect(module).toContain('onPress={() => ask("purge")}');
      expect(module).not.toMatch(/onPress=\{\(\) => onPurge/);
      const typecheck = await typecheckCopy(copy);
      expect(typecheck.status, typecheck.output).toBe(0);
      const tests = await run(copy, "npx", ["vitest", "run", "--config", "config/vitest.config.ts", "src/skins/field/cards/probeLatch", "src/skins/field/ha/HaProbeLatchModule.test.tsx", "verify/field-conformance.test.ts"]);
      expect(tests.status, tests.output).toBe(0);
    }, 240_000);

    it("refuses a domain whose hook needs an option a generated module can't know, and says which", async () => {
      const orb = await run(copy, "node", [script, "probeHub", "--code", "zh", "--domain", "probe_hub"]);
      expect(orb.status, orb.output).toBe(0);
      const hook = join(copy, "packages/core/src/ha/hooks/probeHub.ts");
      writeFileSync(hook, readFileSync(hook, "utf8").replace("export interface HaProbeHubOptions {\n", "export interface HaProbeHubOptions {\n  hubId: string;\n"));
      const { status, output } = await run(copy, "node", [script, "probeHub", "--skin", "field", "--dry-run"]);
      expect(status).toBe(1);
      expect(output).toMatch(/useHaProbeHub requires hubId/);
    });
  });
});
