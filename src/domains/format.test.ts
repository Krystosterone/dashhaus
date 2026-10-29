import { describe, expect, it } from "vitest";
import { fmtAgo } from "./format";

describe("fmtAgo", () => {
  it("says how long ago in one unit, rounded down, so it fits a row's screen", () => {
    expect(fmtAgo(3.9)).toBe("3m");
    expect(fmtAgo(59)).toBe("59m");
    expect(fmtAgo(254)).toBe("4h");
    expect(fmtAgo(14_641)).toBe("10d");
    expect(fmtAgo(-2)).toBe("0m");
  });
});
