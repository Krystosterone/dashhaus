import { describe, expect, it } from "vitest";
import { rangePosition, stepValue } from "./range";

describe("rangePosition", () => {
  it("places a value between its limits, and a degenerate range at the start", () => {
    expect(rangePosition(23, 16, 30)).toBe(0.5);
    expect(rangePosition(40, 16, 30)).toBe(1);
    expect(rangePosition(10, 16, 30)).toBe(0);
    expect(rangePosition(20, 20, 20)).toBe(0);
  });
});

describe("stepValue", () => {
  it("lands on the step grid inside the limits, without float residue", () => {
    expect(stepValue(0.5, 16, 30, 0.5)).toBe(23);
    expect(stepValue(0.52, 16, 30, 0.5)).toBe(23.5);
    expect(stepValue(1 / 3, 7, 35, 0.1)).toBe(16.3);
    expect(stepValue(1.4, 16, 30, 1)).toBe(30);
    expect(stepValue(-1, 16, 30, 1)).toBe(16);
  });
});
