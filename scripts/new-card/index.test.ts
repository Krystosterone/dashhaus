/**
 * The generator edits files it doesn't own, by anchoring on their text, so a refactor elsewhere can break it
 * without anyone running it. A dry run against the repo catches a moved anchor; a real run in a copy of the
 * repo checks that what it writes still typechecks and passes the conformance and Storybook shape tests, in orb and,
 * with `--skin field`, over both generated and hand-built domains in field.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = process.cwd();
const script = "scripts/new-card/index.mjs";
const CARDS = [
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
] as const;

/** Children run outside this vitest run: without its variables a nested `vitest run` acts as a fresh one. */
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("VITEST") && key !== "NODE_OPTIONS"));
const run = (cwd: string, command: string, args: string[]) => {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
};

describe("new-card", () => {
  it.each(CARDS)("finds every anchor for %s", (...args) => {
    const { status, output } = run(root, "node", [script, ...args, "--dry-run"]);
    expect(status, output).toBe(0);
    for (const path of ["src/skins/orb/lovelace/config.ts", "src/skins/orb/lovelace/ConfigDashboard.tsx", "docs/deploy.md"]) {
      expect(output).toContain(`edit   ${path}`);
    }
  });

  it.each(REFUSED)("refuses to draw %s in field, and says why", (name, reason) => {
    const { status, output } = run(root, "node", [script, name, "--skin", "field", "--dry-run"]);
    expect(status).toBe(1);
    expect(output).toMatch(reason);
  });

  describe("in a copy of the repo", () => {
    const skip = new Set(["node_modules", ".git", "dist", "storybook-static", ".agents", ".claude", "research"]);
    let copy = "";
    beforeAll(() => {
      copy = mkdtempSync(join(tmpdir(), "new-card-"));
      cpSync(root, copy, { recursive: true, filter: (source) => !skip.has(relative(root, source).split("/")[0]) });
      symlinkSync(join(root, "node_modules"), join(copy, "node_modules"));
    });
    afterAll(() => rmSync(copy, { recursive: true, force: true }));

    it("finds every field anchor", () => {
      for (const args of CARDS) {
        const { status, output } = run(copy, "node", [script, ...args]);
        expect(status, output).toBe(0);
      }
      const { status, output } = run(copy, "node", [script, ...FIELD_CARDS[0], "--dry-run"]);
      expect(status, output).toBe(0);
      for (const path of ["src/skins/field/lovelace/config.ts", "src/skins/field/lovelace/FieldDashboard.tsx", ".storybook/preview.tsx", "src/skins/field/stories/DesignRules.mdx", "AGENTS.md"]) {
        expect(output).toContain(`edit   ${path}`);
      }
    });

    it("writes cards that typecheck and pass the conformance and Storybook shape tests", () => {
      for (const args of FIELD_CARDS) {
        const { status, output } = run(copy, "node", [script, ...args]);
        expect(status, output).toBe(0);
      }
      const typecheck = run(copy, "npx", ["tsc", "--noEmit"]);
      expect(typecheck.status, typecheck.output).toBe(0);
      const tests = run(copy, "npx", ["vitest", "run", "src/skins/orb/cards/conformance.test.ts", "src/skins/field/cards", "src/skins/field/ha", "src/skins/storybook.test.ts", "src/skins/orb/lovelace", "src/skins/field/lovelace", "src/ha/lovelace", "src/ha/mappers/fixtures.test.ts"]);
      expect(tests.status, tests.output).toBe(0);
      const lint = run(copy, "npx", ["eslint", "src/skins/field"]);
      expect(lint.status, lint.output).toBe(0);
    }, 240_000);

    it("refuses a control domain with no onToggle, unless it starts as a reading", () => {
      const orb = run(copy, "node", [script, "probeDial", "--code", "zd", "--domain", "probe_dial"]);
      expect(orb.status, orb.output).toBe(0);
      const actions = join(copy, "src/ha/actions/probeDial.ts");
      writeFileSync(actions, readFileSync(actions, "utf8").replaceAll("onToggle", "onSpin"));
      const control = run(copy, "node", [script, "probeDial", "--skin", "field", "--dry-run"]);
      expect(control.status).toBe(1);
      expect(control.output).toMatch(/has no onToggle[\s\S]*--kind reading/);
      const reading = run(copy, "node", [script, "probeDial", "--skin", "field", "--kind", "reading", "--dry-run"]);
      expect(reading.status, reading.output).toBe(0);
    });

    it("refuses a domain whose hook needs an option a generated module can't know, and says which", () => {
      const orb = run(copy, "node", [script, "probeHub", "--code", "zh", "--domain", "probe_hub"]);
      expect(orb.status, orb.output).toBe(0);
      const hook = join(copy, "src/ha/hooks/probeHub.ts");
      writeFileSync(hook, readFileSync(hook, "utf8").replace("export interface HaProbeHubOptions {\n", "export interface HaProbeHubOptions {\n  hubId: string;\n"));
      const { status, output } = run(copy, "node", [script, "probeHub", "--skin", "field", "--dry-run"]);
      expect(status).toBe(1);
      expect(output).toMatch(/useHaProbeHub requires hubId/);
    });
  });
});
