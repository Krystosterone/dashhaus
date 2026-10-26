import { describe, expect, it } from "vitest";
import { snapEnds } from "./parts";

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
