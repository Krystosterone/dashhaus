import { describe, expect, it } from "vitest";
import { fmt1, fmtDuration } from "./ui";

describe("fmtDuration", () => {
  it("formats minutes only", () => {
    expect(fmtDuration(54)).toBe("54m");
  });
  it("formats whole hours", () => {
    expect(fmtDuration(180)).toBe("3h");
  });
  it("formats hours and minutes", () => {
    expect(fmtDuration(714)).toBe("11h 54m");
  });
  it("clamps negatives to zero", () => {
    expect(fmtDuration(-5)).toBe("0m");
  });
});

describe("fmt1", () => {
  it("shows one decimal", () => {
    expect(fmt1(3.141)).toBe("3.1");
  });
  it("rounds at one decimal", () => {
    expect(fmt1(0.05)).toBe("0.1");
  });
  it("never shows -0.0", () => {
    expect(fmt1(-0.04)).toBe("0.0");
  });
});
