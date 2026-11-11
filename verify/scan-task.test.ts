/**
 * The scan-task comparison's plan (.storybook/blocks/ScanPlan.tsx; issues #186 and #188) keeps its promises: no
 * participant meets the same problem twice, each participant meets every Orb condition once per device, across six
 * participants each page meets each condition once, the catch page moves for each of the first seven, and every trial
 * the facilitator's order names is a story in both skins' Foundations → Scan task.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCAN_CATCH, SCAN_CONDITIONS, SCAN_PAGES, scanOrder } from "../.storybook/blocks/ScanPlan";
import type { ScanDevice } from "../.storybook/blocks/ScanPlan";

const DEVICES: ScanDevice[] = ["phone", "wall"];
const PARTICIPANTS = Array.from({ length: 12 }, (_, i) => i + 1);
const CODES = SCAN_CONDITIONS.map((c) => c.code);

describe("the scan task's plan", () => {
  it("never puts one problem in one room twice, on either device", () => {
    const problems = DEVICES.flatMap((d) => SCAN_PAGES[d].map((p) => `${p.name} in ${p.room}`));
    expect(new Set(problems).size).toBe(problems.length);
    const rooms = DEVICES.flatMap((d) => SCAN_PAGES[d].map((p) => p.room));
    expect(new Set(rooms).size, "a room is the problem's on one page only").toBe(rooms.length);
    expect(rooms).not.toContain(SCAN_CATCH.room);
  });

  it("puts the lamp above the problem on half of each device's pages and below it on the other half", () => {
    for (const device of DEVICES) expect(SCAN_PAGES[device].filter((p) => p.lamp === "above")).toHaveLength(3);
  });

  it("shows each participant every page once and every Orb condition once, on each device, and the catch page once", () => {
    for (const n of PARTICIPANTS) {
      for (const device of DEVICES) {
        const trials = scanOrder(n, device);
        expect(trials.map((t) => t.page).sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(trials.flatMap((t) => t.condition ?? []).sort()).toEqual(CODES);
        expect(trials.find((t) => t.page === SCAN_CATCH.page)?.condition).toBeUndefined();
      }
    }
  });

  it("pairs each page with each condition once across six participants, and again across the next six", () => {
    for (const device of DEVICES) {
      for (const group of [PARTICIPANTS.slice(0, 6), PARTICIPANTS.slice(6)]) {
        const pairs = group.flatMap((n) => scanOrder(n, device).flatMap((t) => (t.condition ? [`${t.page}${t.condition}`] : [])));
        expect(new Set(pairs).size).toBe(36);
      }
    }
  });

  it("moves the catch page to a different position for each of the first seven participants", () => {
    const positions = PARTICIPANTS.slice(0, 7).map((n) => scanOrder(n, "phone").findIndex((t) => t.page === SCAN_CATCH.page));
    expect(new Set(positions).size).toBe(7);
  });

  it("gives Field the same pages in the same order, with no condition", () => {
    for (const n of PARTICIPANTS) {
      expect(scanOrder(n, "wall", "field")).toEqual(scanOrder(n, "wall").map(({ page }) => ({ page })));
    }
  });

  it("has a story for every trial it names, in both skins", () => {
    for (const [skin, file] of [["orb", "src/skins/orb/stories/ScanTask.stories.tsx"], ["field", "src/skins/field/stories/ScanTask.stories.tsx"]] as const) {
      const source = readFileSync(file, "utf8");
      for (const n of PARTICIPANTS) {
        for (const device of DEVICES) {
          for (const { page, condition } of scanOrder(n, device, skin)) {
            const call = `scan("${device}", ${page}${condition ? `, "${condition}"` : ""})`;
            expect(source, `${file}: a story drawn by ${call}`).toContain(call);
          }
        }
      }
    }
  });
});
