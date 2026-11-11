import { describe, expect, it } from "vitest";
import { CLASS_LABEL, QUICK_ENDS, coverAskOpens, coverAskPosition, coverAskSettled, coverAskTo, coverAsksFirst, isAccess, openness, snapEnds } from "./position";
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

describe("a position that asks first", () => {
  it("asks to close or open at an end, and to move there between them", () => {
    expect(coverAskTo(0)).toBe("close");
    expect(coverAskTo(100)).toBe("open");
    expect(coverAskTo(40)).toEqual({ position: 40 });
    expect(QUICK_ENDS.map((q) => q.label)).toEqual(["Closed", "Open"]);
  });

  it("knows whether yes lets more through, from where it is now", () => {
    expect(coverAskOpens("open", cover({}))).toBe(true);
    expect(coverAskOpens("close", cover({ state: "open", position: 100 }))).toBe(false);
    expect(coverAskOpens({ position: 40 }, cover({ position: 0 }))).toBe(true);
    expect(coverAskOpens({ position: 40 }, cover({ state: "open", position: 100 }))).toBe(false);
  });

  it("stops asking once it gets there, by itself or elsewhere, or goes unavailable", () => {
    expect(coverAskSettled({ position: 40 }, cover({ state: "open", position: 40 }))).toBe(true);
    expect(coverAskSettled({ position: 40 }, cover({ state: "opening", position: 20 }))).toBe(false);
    expect(coverAskSettled("open", cover({ state: "opening", position: 20 }))).toBe(true);
    expect(coverAskSettled("close", cover({ state: "open", position: 100 }))).toBe(false);
    expect(coverAskSettled({ position: 40 }, cover({ state: "unavailable" }))).toBe(true);
  });

  it("is drawn where it would go while it is asked", () => {
    expect(coverAskPosition({ position: 40 })).toBe(40);
    expect(coverAskPosition("open")).toBe(100);
    expect(coverAskPosition("close")).toBe(0);
  });
});
