import { describe, expect, it } from "vitest";
import { greeting } from "./greeting";

const at = (hour: number, minute = 0) => new Date(2026, 9, 25, hour, minute);

describe("greeting", () => {
  it("follows the local hour", () => {
    expect(greeting(at(5))).toBe("Good morning");
    expect(greeting(at(11, 59))).toBe("Good morning");
    expect(greeting(at(12))).toBe("Good afternoon");
    expect(greeting(at(16, 59))).toBe("Good afternoon");
    expect(greeting(at(17))).toBe("Good evening");
    expect(greeting(at(0))).toBe("Good evening");
    expect(greeting(at(4, 59))).toBe("Good evening");
  });

  it("adds a name, and leaves out a blank one", () => {
    expect(greeting(at(9), "Sam")).toBe("Good morning, Sam");
    expect(greeting(at(9), "  ")).toBe("Good morning");
  });
});
