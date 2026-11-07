import { describe, expect, it } from "vitest";
import { lastChangedFact, lastSeenFact, nowText, sinceFact, unavailableSince, updatedFact } from "./facts";

describe("facts", () => {
  it("says when an unavailable entity was last seen, even when nobody knows", () => {
    expect(lastSeenFact("10:42")).toBe("Last seen 10:42");
    expect(lastSeenFact()).toBe("Last seen unknown");
    expect(unavailableSince("10:42")).toBe("Unavailable since 10:42");
    expect(unavailableSince()).toBe("Unavailable since earlier");
  });

  it("says since when, and what last changed it, or nothing", () => {
    expect(sinceFact("10:42")).toBe("Since 10:42");
    expect(sinceFact()).toBeUndefined();
    expect(lastChangedFact("10:58")).toBe("Last changed 10:58");
    expect(lastChangedFact("10:58", "Keypad")).toBe("Last changed 10:58 by Keypad");
    expect(lastChangedFact(undefined, "Keypad")).toBe("");
  });

  it("says when it last reported, live or not", () => {
    expect(updatedFact("10:42")).toBe("Updated 10:42");
    expect(updatedFact("10:42", true)).toBe("Live · updated 10:42");
    expect(updatedFact()).toBe("");
  });

  it("says a reading as it is now, in one word every skin shares", () => {
    expect(nowText("20.4°")).toBe("20.4° now");
  });
});
