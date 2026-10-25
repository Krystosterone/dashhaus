import { describe, expect, it } from "vitest";
import { LAMP_COLORS, lampColorOf } from "./color";

describe("lampColorOf", () => {
  it("names each offered colour as itself", () => {
    for (const color of LAMP_COLORS) expect(lampColorOf(color.hs).name).toBe(color.name);
  });

  it("names the night light's reported amber", () => {
    expect(lampColorOf([31.086, 94.488]).name).toBe("Amber");
  });

  it("wraps red around 0 and 360", () => {
    expect(lampColorOf([350, 90]).name).toBe("Red");
    expect(lampColorOf([360, 90]).name).toBe("Red");
    expect(lampColorOf([-10, 90]).name).toBe("Red");
  });

  it("reads a barely saturated colour as white, whatever its hue", () => {
    expect(lampColorOf([220, 10]).name).toBe("White");
  });

  it("starts each family at its lower bound", () => {
    expect(lampColorOf([14.9, 100]).name).toBe("Red");
    expect(lampColorOf([15, 100]).name).toBe("Amber");
    expect(lampColorOf([42, 100]).name).toBe("Yellow");
    expect(lampColorOf([165, 100]).name).toBe("Blue");
    expect(lampColorOf([260, 100]).name).toBe("Purple");
  });
});
