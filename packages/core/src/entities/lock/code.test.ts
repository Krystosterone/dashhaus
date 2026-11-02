import { describe, expect, it } from "vitest";
import { codeFits, codeKind } from "./code";

describe("a lock's code_format", () => {
  it("asks for a keypad when the pattern only takes digits, a keyboard otherwise", () => {
    expect(codeKind("^\\d{4}$")).toBe("number");
    expect(codeKind("^\\d{4,6}$")).toBe("number");
    expect(codeKind("^[0-9]+$")).toBe("number");
    expect(codeKind("\\d+")).toBe("number");
    expect(codeKind("^\\w{4,}$")).toBe("text");
    expect(codeKind(".+")).toBe("text");
    expect(codeKind(undefined)).toBeUndefined();
    expect(codeKind("")).toBeUndefined();
  });

  it("checks a code against the pattern, and lets Home Assistant judge one it can't compile", () => {
    expect(codeFits("^\\d{4}$", "1234")).toBe(true);
    expect(codeFits("^\\d{4}$", "123")).toBe(false);
    expect(codeFits("^\\d{4}$", "12a4")).toBe(false);
    expect(codeFits(undefined, "anything")).toBe(true);
    expect(codeFits("(", "anything")).toBe(true);
  });
});
