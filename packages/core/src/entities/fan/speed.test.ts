import { describe, expect, it } from "vitest";
import { namedSpeeds, percentOf, speedCountOf, speedOf, speedText } from "./speed";

describe("fan speeds", () => {
  it("counts speeds from Home Assistant's percentage_step", () => {
    expect(speedCountOf(100 / 3)).toBe(3);
    expect(speedCountOf(25)).toBe(4);
    expect(speedCountOf(1)).toBe(100);
    expect(speedCountOf(100)).toBe(1);
  });

  it("treats a missing or impossible step as stepless", () => {
    expect(speedCountOf(undefined)).toBe(100);
    expect(speedCountOf(0)).toBe(100);
    expect(speedCountOf(-5)).toBe(100);
    expect(speedCountOf(150)).toBe(100);
    expect(speedCountOf(Number.NaN)).toBe(100);
    expect(speedCountOf(0.5)).toBe(100);
  });

  it("maps a percentage to the nearest speed, never below the first", () => {
    expect(speedOf(33, 3)).toBe(1);
    expect(speedOf(67, 3)).toBe(2);
    expect(speedOf(100, 3)).toBe(3);
    expect(speedOf(0, 3)).toBe(1);
    expect(speedOf(140, 3)).toBe(3);
    expect(speedOf(42, 100)).toBe(42);
  });

  it("maps a speed back to the whole percentage Home Assistant takes", () => {
    expect([1, 2, 3].map((s) => percentOf(s, 3))).toEqual([33, 67, 100]);
    expect(percentOf(42, 100)).toBe(42);
    expect(percentOf(0, 4)).toBe(25);
    expect(percentOf(9, 4)).toBe(100);
  });

  it("round-trips every speed of every count", () => {
    for (let count = 1; count <= 100; count++) {
      for (let speed = 1; speed <= count; speed++) expect(speedOf(percentOf(speed, count), count)).toBe(speed);
    }
  });

  it("names few speeds", () => {
    expect(namedSpeeds(3)).toBe(true);
    expect(namedSpeeds(10)).toBe(true);
    expect(namedSpeeds(20)).toBe(false);
    expect(namedSpeeds(100)).toBe(false);
    expect(namedSpeeds(1)).toBe(false);
    expect(speedText(67, 3)).toBe("Speed 2");
    expect(speedText(40, 100)).toBe("40%");
  });
});
