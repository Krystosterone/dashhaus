import { describe, expect, it } from "vitest";
import { fmtAgo, fmtPlayTime, inWords } from "./format";

describe("fmtAgo", () => {
  it("says how long ago in one unit, rounded down, so it fits a row's screen", () => {
    expect(fmtAgo(3.9)).toBe("3m");
    expect(fmtAgo(59)).toBe("59m");
    expect(fmtAgo(254)).toBe("4h");
    expect(fmtAgo(14_641)).toBe("10d");
    expect(fmtAgo(-2)).toBe("0m");
  });
});

describe("inWords", () => {
  it("says an integration's own name in words, sentence case", () => {
    expect(inWords("connecting")).toBe("Connecting");
    expect(inWords("zone_cleaning")).toBe("Zone cleaning");
    expect(inWords("  UPDATING-firmware ")).toBe("Updating firmware");
    expect(inWords("Max+")).toBe("Max+");
    expect(inWords("")).toBe("");
  });
});

describe("fmtPlayTime", () => {
  it("says a playing time as a player's clock does, rounded down", () => {
    expect(fmtPlayTime(5.9)).toBe("0:05");
    expect(fmtPlayTime(225)).toBe("3:45");
    expect(fmtPlayTime(729)).toBe("12:09");
    expect(fmtPlayTime(3723)).toBe("1:02:03");
    expect(fmtPlayTime(-4)).toBe("0:00");
    expect(fmtPlayTime(Number.NaN)).toBe("0:00");
  });
});
