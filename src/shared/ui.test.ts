import { describe, expect, it } from "vitest";
import { COLORS, fmt1, fmtDuration, paint } from "./ui";

describe("paint", () => {
  it("shows no glow attribute at zero", () => {
    const p = paint("energy", 0);
    expect(p["data-glow"]).toBeUndefined();
    expect(p.style["--hd-glow"]).toBe(0);
  });
  it("marks and quantifies glow above zero, rounded to thousandths", () => {
    const p = paint("energy", 0.123456);
    expect(p["data-glow"]).toBe("");
    expect(p.style["--hd-glow"]).toBe(0.123);
  });
  it("paints the colour slot only when a colour is resolved", () => {
    const p = paint("state", 0, { c: 0.13, h: 52 });
    expect(p["data-color"]).toBe("");
    expect(p.style["--color-c"]).toBe(0.13);
    expect(p.style["--color-h"]).toBe(52);
    expect(paint("state", 0).style["--color-c"]).toBeUndefined();
  });
  it("lets the prop override the widget's own colour, and none keep the orb neutral", () => {
    const own = { c: 0.13, h: 52 };
    const over = paint("energy", 0, own, "sage");
    expect(over.style["--color-c"]).toBe(COLORS.sage.c);
    expect(over.style["--color-h"]).toBe(COLORS.sage.h);
    const none = paint("energy", 0, own, "none");
    expect(none["data-color"]).toBeUndefined();
    expect(none.style["--color-c"]).toBeUndefined();
  });
  it("carries the role through", () => {
    expect(paint("reading", 0)["data-role"]).toBe("reading");
  });
});

describe("fmtDuration", () => {
  it("formats minutes only", () => {
    expect(fmtDuration(54)).toBe("54m");
  });
  it("formats whole hours", () => {
    expect(fmtDuration(180)).toBe("3h");
  });
  it("formats hours and minutes", () => {
    expect(fmtDuration(714)).toBe("11h 54m");
  });
  it("clamps negatives to zero", () => {
    expect(fmtDuration(-5)).toBe("0m");
  });
});

describe("fmt1", () => {
  it("shows one decimal", () => {
    expect(fmt1(3.141)).toBe("3.1");
  });
  it("rounds at one decimal", () => {
    expect(fmt1(0.05)).toBe("0.1");
  });
  it("never shows -0.0", () => {
    expect(fmt1(-0.04)).toBe("0.0");
  });
});
