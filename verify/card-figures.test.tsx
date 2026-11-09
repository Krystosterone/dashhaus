/**
 * A figure both skins print from one model value is rounded the same way, in core or by the same call (spec/cards.md →
 * What every card says): a garage door 99.6% open reads 100% in both, never `99.6%` in one; a feels-like of 3.8° reads
 * 4° in both.
 *
 * Every domain both skins draw is drawn on every seed, its demo seeds and its worst case, as Orb's tile and Field's
 * module, on the dashboard and in the details, and the numbers each prints are compared (times of day aside): a number
 * with a fraction one skin prints, which the other doesn't print but prints rounded to a whole, is one value rounded two
 * ways. Two different figures that happen to sit a rounding apart would fail too; none does, and one that did would be
 * worth saying more plainly anyway.
 *
 * Studies keep their own design (spec/skins.md → Studies), so only the two skins are drawn here.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { ComponentType } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import * as orb from "@dashhaus/orb";
import * as field from "@dashhaus/field";

const SEEDS = "packages/core/src/seeds";
/** What isn't a domain's seeds: the demo pictures and the demo clock. */
const SHARED = ["pictures", "clock"];
const names = readdirSync(join(process.cwd(), SEEDS)).filter((file) => /^\w+\.ts$/.test(file) && !file.endsWith(".test.ts"))
  .map((file) => file.replace(/\.ts$/, "")).filter((name) => !SHARED.includes(name));

type Seed = Record<string, unknown> & { entity: { name: string } };
const component = (skin: object, name: string) => (skin as Record<string, ComponentType<Record<string, unknown>> | undefined>)[name];
const capital = (name: string) => `${name[0].toUpperCase()}${name.slice(1)}`;

/** A domain's seeds, its demo seeds and its worst case, from core. */
async function seedsOf(name: string) {
  const exports = (await import(`../packages/core/src/seeds/${name}.ts`)) as Record<string, unknown>;
  return Object.entries(exports).filter(([key]) => /_(SEEDS|WORST_CASE)$/.test(key))
    .flatMap(([, value]) => (Array.isArray(value) ? value : Object.values(value as object))) as Seed[];
}

/** Every number a drawing prints, on the dashboard and in its details, leaving out times of day ("18:30"). */
function figures(Card: ComponentType<Record<string, unknown>>, seed: Seed) {
  const text: string[] = [];
  for (const defaultOpen of [false, true]) {
    render(<Card {...seed} footprint="standard" defaultOpen={defaultOpen} />);
    text.push(document.body.textContent ?? "");
    cleanup();
  }
  return new Set((text.join(" ").replace(/\d{1,2}:\d{2}/g, " ").match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number));
}

beforeAll(() => {
  // jsdom has no modal dialog; these do what a browser's do to the `open` attribute.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(cleanup);

describe("a figure both skins print", () => {
  it("is drawn by both skins for every domain with seeds", () => {
    expect(names.length).toBeGreaterThan(15);
    expect(names.filter((name) => !component(orb, `${capital(name)}Tile`) || !component(field, `${capital(name)}Module`))).toEqual([]);
  });

  for (const name of names) {
    it(`${name}: is rounded the same way in Orb and Field`, async () => {
      const [tile, module] = [component(orb, `${capital(name)}Tile`)!, component(field, `${capital(name)}Module`)!];
      const seeds = await seedsOf(name);
      expect(seeds.length).toBeGreaterThan(0);
      const wrong: string[] = [];
      for (const seed of seeds) {
        const sides = [["Orb", figures(tile, seed)], ["Field", figures(module, seed)]] as const;
        for (const [skin, mine] of sides) {
          const [other, theirs] = sides.find(([s]) => s !== skin)!;
          for (const x of mine) {
            if (!Number.isInteger(x) && !theirs.has(x) && theirs.has(Math.round(x))) wrong.push(`${seed.entity.name}: ${skin} prints ${x}, ${other} ${Math.round(x)}`);
          }
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});
