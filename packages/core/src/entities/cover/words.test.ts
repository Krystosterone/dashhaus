import { describe, expect, it } from "vitest";
import type { CoverEntity } from "./types";
import { COVER_ASKS_HINT, LEFT_OPEN_WORD, coverAskAction, coverAskDetail, coverAskWaiting, coverQuestion, coverWord, isOpen, leftOpenText, positionText } from "./words";
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
  });
});

describe("asking first", () => {
  it("asks with the name, and says what yes means: who it lets in, or what it could close on", () => {
    expect(coverQuestion("close", "Garage door")).toBe("Close Garage door?");
    expect(coverQuestion("open", "Driveway gate")).toBe("Open Driveway gate?");
    expect(coverAskDetail("open", cover({}))).toBe("It opens now, and anyone outside can come in.");
    expect(coverAskDetail("close", cover({ state: "open" }))).toBe("It closes now. Check nothing is in its way.");
  });

  it("says where it is isn't known, and that it can't be stopped from here when it can't stop", () => {
    expect(coverAskDetail("close", cover({ state: "unknown" }))).toBe("It closes now. Check nothing is in its way. Where it is isn't known.");
    expect(coverAskDetail("open", cover({ supportsStop: false }))).toBe("It opens now, and anyone outside can come in. It can't be stopped from here.");
  });

  it("names the thing its yes moves, never a bare Close beside the details' own close", () => {
    expect(coverAskAction("close", cover({}))).toBe("Close garage door");
    expect(coverAskAction("open", cover({ deviceClass: "gate" }))).toBe("Open gate");
    expect(coverAskAction("close", cover({ deviceClass: "door" }))).toBe("Close door");
    expect(COVER_ASKS_HINT).toBe("Opening and closing ask first.");
  });

  it("says what it waits for, naming the thing, with no end punctuation of its own", () => {
    expect(coverAskWaiting(cover({}))).toBe("Waiting for the garage door");
    expect(coverAskWaiting(cover({ deviceClass: "gate" }))).toBe("Waiting for the gate");
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
