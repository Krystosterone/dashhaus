import { describe, expect, it } from "vitest";
import { CLASS_LABEL, coverAsksFirst, isAccess, openness, snapEnds } from "./position";
import type { CoverEntity } from "./types";

const cover = (over: Partial<CoverEntity>): CoverEntity => ({ entityId: "cover.x", name: "X", state: "closed", deviceClass: "blind", supportsPosition: true, supportsStop: true, ...over });

describe("snapEnds", () => {
  it("snaps within 3% of either end", () => {
    expect(snapEnds(0)).toBe(0);
    expect(snapEnds(3)).toBe(0);
    expect(snapEnds(97)).toBe(100);
    expect(snapEnds(100)).toBe(100);
  });
  it("passes everything else through", () => {
    expect(snapEnds(4)).toBe(4);
    expect(snapEnds(50)).toBe(50);
    expect(snapEnds(96)).toBe(96);
  });
});

describe("openness", () => {
  it("is the position when there is one", () => {
    expect(openness(cover({ state: "open", position: 40 }))).toBe(40);
  });
  it("is all or nothing by state without one", () => {
    expect(openness(cover({ state: "open" }))).toBe(100);
    expect(openness(cover({ state: "opening" }))).toBe(100);
    expect(openness(cover({ state: "closing" }))).toBe(0);
    expect(openness(cover({ state: "closed" }))).toBe(0);
  });
});

describe("isAccess", () => {
  it("is a garage door, door or gate, never a cover that lets light in", () => {
    expect(["garage", "door", "gate"].every((k) => isAccess(k as CoverEntity["deviceClass"]))).toBe(true);
    expect(isAccess("curtain")).toBe(false);
  });
});

describe("coverAsksFirst", () => {
  it("asks first for exactly the covers that let a person in", () => {
    for (const kind of Object.keys(CLASS_LABEL) as CoverEntity["deviceClass"][]) {
      expect(coverAsksFirst({ deviceClass: kind }), kind).toBe(isAccess(kind));
    }
  });
});
