import { describe, expect, it } from "vitest";
import { fmt__Name__, with__Name__Unit } from "./words";

describe("__label__ words", () => {
  it("keeps whole numbers and rounds the rest to one decimal", () => {
    expect(fmt__Name__(42)).toBe("42");
    expect(fmt__Name__(7.46)).toBe("7.5");
  });

  it("sets a symbol on the figure and a word a space apart", () => {
    expect(with__Name__Unit(42, "%")).toBe("42%");
    expect(with__Name__Unit(650, "ppm")).toBe("650 ppm");
    expect(with__Name__Unit(3)).toBe("3");
  });
});
