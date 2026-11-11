/**
 * A card drawn from its domain's description, in both mature skins: in a copy of the repo, the fan's orb card and
 * field module go, with every registration they made, and the generators draw them again from the domain core already
 * has (`describeDomain`, the scaffolder's `domains.json` too). The lock's orb card goes too, and comes back with its
 * guarded actions answered in the sheet. What comes back typechecks and passes each skin's conformance and Storybook
 * shape, with only its words and icon left to write by hand.
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
  change(copy, "src/skins/orb/lovelace/config.ts", withoutLines(/^ {2}\| "fan"$|^ {2}fan: "fan",$|kind: "fan"|^ {2}fan: \{\},$/));
  change(copy, "src/skins/orb/lovelace/ConfigDashboard.tsx", withoutLines(/HaFanTile/));
  change(copy, "src/skins/orb/lovelace/auto.ts", withoutLines(/^ {4}"fan",$|^ {2}fan: "fan",$/));
  change(copy, "src/skins/field/index.ts", withoutLines(/\.\/cards\/fan\/|\.\/ha\/HaFanModule"/));
  change(copy, "src/skins/field/lovelace/config.ts", withoutLines(/^ {2}\| "fan"$|^ {2}fan: \{ domains: \["fan"\] \},$/));
  change(copy, "src/skins/field/lovelace/FieldDashboard.tsx", withoutLines(/HaFanModule/));
  change(copy, "src/skins/field/stories/DesignRules.mdx", withoutLines(/cards\/fan\/FanModule\.stories|^ {4}Fan: \[Fan\./));
  change(copy, ".storybook/preview.tsx", withoutLines(/^ {14}"Fan",$/));
  change(copy, "src/skins/orb/stories/WorstCase.stories.tsx", withoutLines(/DemoFanTile|"@dashhaus\/core\/seeds\/fan"|card\(FAN_WORST_CASE/));
  change(copy, "src/skins/field/stories/WorstCase.stories.tsx", (source) => withoutLines(/cards\/fan\/FanModule"|"@dashhaus\/core\/seeds\/fan"|card\(FAN_WORST_CASE/)(source).replace(/\nfunction Fan\(\{[\s\S]*?\n\}\n/, ""));
  change(copy, "AGENTS.md", (source) => source.replace(", `fd-fn-` for fan", ""));
  change(copy, "spec/field.md", (source) => source.replace(/\n## Fan\n[\s\S]*?(?=\n## |$)/, ""));
  change(copy, "spec/cards.md", (source) => source.replace(/\n### Field fan module\n[\s\S]*?(?=\n## |\n### )/, ""));
};

/**
 * Remove the lock's orb card, and what it registered in orb, leaving its domain in core and its field module. Orb's
 * Foundations draw it through `DemoLockTile`'s seed, footprint and showControl, which the generated demo keeps.
 */
const removeOrbLock = (copy: string) => {
  for (const path of ["src/skins/orb/cards/lock", "src/skins/orb/ha/HaLockTile.tsx", "src/skins/orb/ha/HaLockTile.stories.tsx", "src/skins/orb/ha/HaLockTile.test.tsx"]) {
    rmSync(join(copy, path), { recursive: true, force: true });
  }
  change(copy, "src/skins/orb/index.ts", withoutLines(/^\/\/ Lock$|\.\/cards\/lock\/|\.\/ha\/HaLockTile"/));
  change(copy, "src/skins/orb/lovelace/config.ts", (source) => withoutLines(/^ {2}\| "lock"$|^ {2}lock: "lock",$|kind: "lock"/)(source).replace(/\n {2}lock: \{\n[\s\S]*?\n {2}\},/, ""));
  change(copy, "src/skins/orb/lovelace/ConfigDashboard.tsx", withoutLines(/HaLockTile/));
  change(copy, "src/skins/orb/stories/WorstCase.stories.tsx", withoutLines(/DemoLockTile|"@dashhaus\/core\/seeds\/lock"|card\(LOCK_WORST_CASE/));
};

describe("new-card from a domain's description", () => {
  let copy = "";
  beforeAll(() => {
    copy = copyRepo("new-card-regenerate-");
    removeFan(copy);
    removeOrbLock(copy);
    linkNodeModules(copy);
  }, 120_000);
  afterAll(() => process.env.KEEP_REGENERATE_COPY ? console.info(`REGENERATE_COPY=${copy}`) : rmSync(copy, { recursive: true, force: true }));

  it("draws the fan again in orb and field, from the parts, with only its words and icon to write", async () => {
    const orb = await run(copy, "node", [script, "fan", "--code", "fn"]);
    expect(orb.status, orb.output).toBe(0);
    const field = await run(copy, "node", [script, "fan", "--skin", "field"]);
    expect(field.status, field.output).toBe(0);

    // Its groove and its sheet in orb, its fader and its panel in field: the declared speed, presets, direction and
    // oscillation, each on the skin's part, and nothing left out.
    const card = readFileSync(join(copy, "src/skins/orb/cards/fan/FanCard.tsx"), "utf8");
    expect(card).toContain("<CardFrame");
    expect(card).toMatch(/control=\{<LevelBar [^\n]*value=\{e\.percentage \?\? 1\}[^\n]* wakes /);
    expect(card).toMatch(/<SheetBlock>[\s\S]*label="Preset mode"[\s\S]*label="Direction"[\s\S]*label="Oscillating"[\s\S]*<\/SheetBlock>/);
    expect(card).not.toContain("Left out");
    const module = readFileSync(join(copy, "src/skins/field/cards/fan/FanModule.tsx"), "utf8");
    expect(module).toContain("<ModuleFrame");
    expect(module).toMatch(/const controls = \(where: "m" \| "p"\) => \([\s\S]*<Fader [^\n]*legend="Percentage"/);
    expect(module).toContain("controls={controls}");
    for (const legend of ["Preset mode", "Direction", "Oscillating"]) expect(module).toContain(`<KeyGroup legend="${legend}"`);
    expect(module).not.toContain("Left out");
    // Its turn-on and turn-off, given only while its state is assumed (`either`), are no keys of their own.
    expect(module).not.toContain("onTurnOn?.()");

    // The lock in orb: lock is the slot's pill, unlock and open ask first in the sheet, and each is answered on the
    // sheet's question, or its keypad where the lock wants a code. Nothing asks for a hand-drawn card.
    const lock = await run(copy, "node", [script, "lock", "--code", "lk"]);
    expect(lock.status, lock.output).toBe(0);
    const lockCard = readFileSync(join(copy, "src/skins/orb/cards/lock/LockCard.tsx"), "utf8");
    expect(lockCard).toContain("useGuardedAction<LockAction>");
    expect(lockCard).toContain("lockCodeFor(guard.pending)");
    expect(lockCard).toMatch(/control=\{<TogglePill [^\n]*guard\.attempt\("lock"\)/);
    expect(lockCard).toMatch(/<SheetBlock>[\s\S]*<Keypad [\s\S]*<Confirm [\s\S]*guard\.ask\("unlock"\)[\s\S]*guard\.ask\("open"\)[\s\S]*<\/SheetBlock>/);
    expect(lockCard).toContain("extends ActionCardProps<LockAction>");

    const typecheck = await typecheckCopy(copy);
    expect(typecheck.status, typecheck.output).toBe(0);
    const tests = await run(copy, "npx", ["vitest", "run", "--config", "config/vitest.config.ts",
      "src/skins/orb/cards/fan", "src/skins/orb/ha/HaFanTile.test.tsx", "src/skins/orb/cards/lock", "src/skins/orb/ha/HaLockTile.test.tsx", "src/skins/field/cards/fan", "src/skins/field/ha/HaFanModule.test.tsx",
      "verify/orb-conformance.test.ts", "verify/field-conformance.test.ts", "verify/storybook.test.ts", "verify/card-copies.test.ts", "verify/card-words.test.ts"]);
    expect(tests.status, tests.output).toBe(0);
    const lint = await run(copy, "npx", ["eslint", "src/skins/orb/cards/fan", "src/skins/orb/cards/lock", "src/skins/orb/ha", "src/skins/field/cards/fan", "src/skins/field/ha"]);
    expect(lint.status, lint.output).toBe(0);
  }, 300_000);
});
