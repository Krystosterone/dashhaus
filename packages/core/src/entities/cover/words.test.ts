import { describe, expect, it } from "vitest";
import type { CoverEntity } from "./types";
import { LEFT_OPEN_WORD, coverWord, isOpen, leftOpenSentence, leftOpenText, positionText } from "./words";
import { coverSeverity } from "./severity";

const cover = (over: Partial<CoverEntity>): CoverEntity => ({ entityId: "cover.garage", name: "Garage door", state: "closed", deviceClass: "garage", supportsPosition: false, supportsStop: true, ...over });

describe("cover words", () => {
  it("says its state as a verb while it travels, Unknown where it can't say, else Open or Closed", () => {
    expect(coverWord(cover({ state: "opening" }))).toBe("Opening");
    expect(coverWord(cover({ state: "closing" }))).toBe("Closing");
    expect(coverWord(cover({ state: "unknown" }))).toBe("Unknown");
    expect(coverWord(cover({ state: "open" }))).toBe("Open");
    expect(coverWord(cover({ state: "closed", position: 40 }))).toBe("Open");
    expect(coverWord(cover({ state: "closed" }))).toBe("Closed");
    expect(coverWord(cover({ state: "unavailable", position: 40 }))).toBe("Unavailable");
    expect(isOpen(cover({ state: "unavailable", position: 40 }))).toBe(false);
  });

  it("says a position in words", () => {
    expect(positionText(0)).toBe("Closed");
    expect(positionText(50)).toBe("Half open");
    expect(positionText(40)).toBe("40% open");
    expect(positionText(100)).toBe("Open");
  });

  it("says a door left open the same way as a garage door's binary sensor", () => {
    expect(LEFT_OPEN_WORD).toBe("Open");
    expect(leftOpenText("18:30")).toBe("Open since 18:30");
    expect(leftOpenText()).toBe("Open");
    expect(leftOpenSentence("Garage door", "18:30")).toBe("Garage door has been open since 18:30");
  });
});

describe("cover severity", () => {
  it("ranks a door, garage door or gate left open as advisory (spec/cards.md → severity is ranked once, in core)", () => {
    expect(coverSeverity(cover({ state: "open" }))).toBe("advisory");
    expect(coverSeverity(cover({ state: "open", deviceClass: "gate" }))).toBe("advisory");
    expect(coverSeverity(cover({ state: "open", deviceClass: "curtain" }))).toBeUndefined();
  });

  it("ranks nothing while it travels, can't say where it is, or is unavailable", () => {
    expect(coverSeverity(cover({ state: "closed" }))).toBeUndefined();
    expect(coverSeverity(cover({ state: "opening" }))).toBeUndefined();
    expect(coverSeverity(cover({ state: "unknown", position: 40 }))).toBeUndefined();
    expect(coverSeverity(cover({ state: "unavailable" }))).toBeUndefined();
  });
});
