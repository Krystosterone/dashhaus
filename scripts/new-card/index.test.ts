/**
 * The generator edits files it doesn't own, by anchoring on their text, so a refactor elsewhere can break it
 * without anyone running it. A dry run against the repo catches a moved anchor; a real run in a copy of the
 * repo checks that what it writes still typechecks and passes the conformance and Storybook shape tests, in orb and,
 * with `--skin field`, over both generated and hand-built domains in field.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = process.cwd();
const script = "scripts/new-card/index.mjs";
const CARDS = [
  ["probeFan", "--code", "zf", "--domain", "probe_fan"],
  ["probeCo2", "--code", "zc", "--domain", "sensor", "--kind", "reading", "--unit", "ppm"],
];
/** Field cards over the generated domains above and over hand-built ones: a control, and a reading started on a control's domain. */
const FIELD_CARDS = [["probeFan"], ["probeCo2"], ["humidifier"], ["owlet", "--kind", "reading"]].map((args) => [...args, "--skin", "field"]);
/** Domains the field generator must refuse, each with the reason it gives. */
const REFUSED = [
  ["toggle", /useHaToggle requires domain/],
  ["cover", /has no onToggle[\s\S]*--kind reading/],
  ["light", /src\/skins\/field\/cards\/light already exists/],
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

  it.each(FIELD_CARDS.slice(2))("finds every field anchor for %s", (...args) => {
    const { status, output } = run(root, "node", [script, ...args, "--dry-run"]);
    expect(status, output).toBe(0);
    for (const path of ["src/skins/field/lovelace/config.ts", "src/skins/field/lovelace/FieldDashboard.tsx", ".storybook/preview.tsx", "src/skins/field/stories/DesignRules.mdx", "AGENTS.md"]) {
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

    it("writes cards that typecheck and pass the conformance and Storybook shape tests", () => {
      for (const args of [...CARDS, ...FIELD_CARDS]) {
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
  });
});
