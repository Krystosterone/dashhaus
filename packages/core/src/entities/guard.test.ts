import { describe, expect, it } from "vitest";
import { ACTION_FAILED, WAITING, asksFirst, codeFor, waitingFor } from "./guard";

describe("a guard's words", () => {
  it("leave the end punctuation to the skin", () => {
    for (const words of [WAITING, waitingFor("lock"), ACTION_FAILED]) expect(words).not.toMatch(/[.…]$/);
    expect(waitingFor("garage door")).toBe("Waiting for the garage door");
  });

  it("names a keypad's verb phrase from an action's words where the domain has no word of its own", () => {
    expect(codeFor("Open door")).toBe("open door");
    expect(codeFor("Unlatch")).toBe("unlatch");
  });

  it("say what asks first in one sentence, or nothing", () => {
    expect(asksFirst(["Unlocking"])).toBe("Unlocking asks first.");
    expect(asksFirst(["Opening", "closing"])).toBe("Opening and closing ask first.");
    expect(asksFirst(["Unlock", "Open", "Close"])).toBe("Unlock, open and close ask first.");
    expect(asksFirst([false, "opening the door"])).toBe("Opening the door asks first.");
    expect(asksFirst([false, undefined])).toBeUndefined();
  });
});
