import { describe, expect, it } from "vitest";
import { eitherWay, eitherWayHint } from "./assumed";

describe("an entity whose state Home Assistant can't vouch for", () => {
  it("offers both presses while its state is assumed or unknown, never while unavailable", () => {
    expect(eitherWay({ state: "on", assumedState: true })).toBe(true);
    expect(eitherWay({ state: "unknown" })).toBe(true);
    expect(eitherWay({ state: "on" })).toBe(false);
    expect(eitherWay({ state: "unavailable", assumedState: true })).toBe(false);
  });

  it("says why both are there", () => {
    expect(eitherWayHint({ state: "unknown" })).toBe("Its state isn't known yet, so both are here.");
    expect(eitherWayHint({ state: "off", assumedState: true })).toBe("Home Assistant assumes its state, so both are here.");
  });
});
