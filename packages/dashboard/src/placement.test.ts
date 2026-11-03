import { describe, expect, it } from "vitest";
import { placeRow, spanWidth, trackCount } from "./layout";
import type { PlaceEntry } from "./layout";

const ORB = { gap: 8, min: 156, preferred: 300, max: 12 };
const FIELD = { gap: 12, min: 260, preferred: 260, max: 4 };
/** Each cell as "column/span row/height". */
const lines = (entries: PlaceEntry[], options: Parameters<typeof placeRow>[1]) =>
  placeRow(entries, options).cells.map((c) => `${c.column}/${c.span} ${c.row}/${c.height}`);

describe("trackCount", () => {
  it("keeps an explicit count until a track would be narrower than the skin's minimum", () => {
    expect(trackCount(343, 2, ORB)).toBe(2);
    expect(trackCount(320, 2, ORB)).toBe(2);
    expect(trackCount(319, 2, ORB)).toBe(1);
    expect(trackCount(1200, 3, ORB)).toBe(3);
    expect(trackCount(600, 4, ORB)).toBe(3);
  });

  it("fits as many preferred tracks as the width holds when columns are left out, up to the most", () => {
    expect(trackCount(343, undefined, ORB)).toBe(1);
    expect(trackCount(736, undefined, ORB)).toBe(2);
    expect(trackCount(1248, undefined, ORB)).toBe(4);
    expect(trackCount(1208, undefined, FIELD)).toBe(4);
    expect(trackCount(5000, undefined, FIELD)).toBe(4);
  });

  it("treats columns as a most in field: the width decides, never more than asked", () => {
    expect(trackCount(1208, 2, FIELD)).toBe(2);
    expect(trackCount(500, 3, FIELD)).toBe(1);
    expect(trackCount(600, 3, FIELD)).toBe(2);
  });

  it("draws the written columns before the row is measured", () => {
    expect(trackCount(undefined, 3, ORB)).toBe(3);
    expect(trackCount(0, undefined, ORB)).toBe(1);
  });

  it("measures a span's width with the gaps it covers", () => {
    expect(spanWidth(328, 2, 1, 8)).toBe(160);
    expect(spanWidth(328, 2, 2, 8)).toBe(328);
    expect(spanWidth(undefined, 2, 1, 8)).toBeUndefined();
  });
});

describe("placeRow", () => {
  it("fills left to right, then down, in YAML order", () => {
    expect(lines([{ width: 1, height: 2 }, { width: 1, height: 2 }, { width: 1, height: 2 }], { tracks: 2 })).toEqual(["1/1 1/2", "2/1 1/2", "1/1 3/2"]);
  });

  it("stacks shorter cards beside a taller one on the unit grid", () => {
    // A standard climate (2 units) and two compact rows (1 unit each) beside it.
    expect(lines([{ width: 1, height: 2 }, { width: 1, height: 1 }, { width: 1, height: 1 }], { tracks: 2 })).toEqual(["1/1 1/2", "2/1 1/1", "2/1 2/1"]);
  });

  it("keeps the hero and its sidebar side by side, and bottom-aligns the sidebar by whole units", () => {
    const hero: PlaceEntry[] = [{ width: 2, column: 1, height: 4 }, { width: 1, column: 3, height: 2 }, { width: 1, column: 3, height: 1 }];
    expect(lines(hero, { tracks: 3, columns: 3 })).toEqual(["1/2 1/4", "3/1 1/2", "3/1 3/1"]);
    // 196 px of sidebar beside 264 px of hero: one 68 px pitch lower.
    expect(lines(hero, { tracks: 3, columns: 3, align: "bottom" })).toEqual(["1/2 1/4", "3/1 2/2", "3/1 4/1"]);
  });

  it("moves a spanning card with the columns it ties together", () => {
    const tied: PlaceEntry[] = [{ width: 2, height: 1 }, { width: 1, column: 1, height: 1 }, { width: 1, column: 3, height: 4 }];
    const placed = placeRow(tied, { tracks: 3, columns: 3, align: "bottom" });
    // C starts beside B (the cursor is past A), so the row is five units; A and B move together, three down.
    expect(placed.rows).toBe(5);
    expect(placed.cells.map((c) => c.row)).toEqual([4, 5, 2]);
  });

  it("leaves a full-width row alone when bottom-aligned: one group has nothing to move against", () => {
    expect(lines([{ width: "full", height: 2 }, { width: 1, height: 1 }], { tracks: 3, align: "bottom" })).toEqual(["1/3 1/2", "1/1 3/1"]);
  });

  it("never moves a later card into an earlier hole in normal flow, and does in dense flow", () => {
    const holes: PlaceEntry[] = [{ width: 2, height: 2 }, { width: 2, height: 2 }, { width: 1, height: 2 }];
    expect(lines(holes, { tracks: 3 })).toEqual(["1/2 1/2", "1/2 3/2", "3/1 3/2"]);
    expect(lines(holes, { tracks: 3, flow: "dense" })).toEqual(["1/2 1/2", "1/2 3/2", "3/1 1/2"]);
  });

  it("stacks repeated anchors down their column, never on top of each other", () => {
    expect(lines([{ width: 1, column: 2, height: 1 }, { width: 1, column: 2, height: 2 }, { width: 1, column: 2, height: 1 }], { tracks: 2, columns: 2 }))
      .toEqual(["2/1 1/1", "2/1 2/2", "2/1 4/1"]);
  });

  it("starts an anchor no earlier than the previous card in normal flow, and from the top in dense flow", () => {
    const late: PlaceEntry[] = [{ width: 1, height: 1 }, { width: 1, height: 1 }, { width: 1, column: 1, height: 1 }];
    expect(lines(late, { tracks: 3, columns: 3 })).toEqual(["1/1 1/1", "2/1 1/1", "1/1 2/1"]);
    const hole: PlaceEntry[] = [{ width: 1, column: 2, height: 1 }, { width: 1, column: 1, height: 1 }];
    expect(lines(hole, { tracks: 2, columns: 2 })).toEqual(["2/1 1/1", "1/1 2/1"]);
    expect(lines(hole, { tracks: 2, columns: 2, flow: "dense" })).toEqual(["2/1 1/1", "1/1 1/1"]);
  });

  it("clamps widths to the tracks it has and releases every anchor when it has fewer than written", () => {
    const written: PlaceEntry[] = [{ width: 2, column: 1, height: 4 }, { width: 1, column: 3, height: 2 }, { width: 1, column: 3, height: 1 }];
    const phone = placeRow(written, { tracks: 1, columns: 3 });
    expect(phone.anchored).toBe(false);
    expect(phone.cells.map((c) => `${c.column}/${c.span} ${c.row}/${c.height}`)).toEqual(["1/1 1/4", "1/1 5/2", "1/1 7/1"]);
    const two = placeRow(written, { tracks: 2, columns: 3 });
    expect(two.cells.map((c) => `${c.column}/${c.span} ${c.row}`)).toEqual(["1/2 1", "1/1 5", "2/1 5"]);
  });

  it("holds the anchors of an automatic row while it has the columns they reach", () => {
    const anchors: PlaceEntry[] = [{ width: 1, column: 2, height: 1 }, { width: 1, height: 1 }];
    expect(placeRow(anchors, { tracks: 3 }).anchored).toBe(true);
    expect(lines(anchors, { tracks: 3 })).toEqual(["2/1 1/1", "3/1 1/1"]);
    expect(placeRow(anchors, { tracks: 1 }).anchored).toBe(false);
  });

  it("asks each card its height at the span it gets: a bundle that stacks when narrow", () => {
    const joined = (span: number) => (span >= 2 ? 1 : 3);
    expect(lines([{ width: 2, height: joined }], { tracks: 2 })).toEqual(["1/2 1/1"]);
    expect(lines([{ width: 2, height: joined }], { tracks: 1 })).toEqual(["1/1 1/3"]);
  });

  it("places the same entries the same way every time", () => {
    const entries: PlaceEntry[] = [{ width: 1, height: 2 }, { width: 2, height: 1 }, { width: 1, column: 1, height: 1 }];
    expect(placeRow(entries, { tracks: 3, columns: 3, flow: "dense" })).toEqual(placeRow(entries, { tracks: 3, columns: 3, flow: "dense" }));
  });
});
