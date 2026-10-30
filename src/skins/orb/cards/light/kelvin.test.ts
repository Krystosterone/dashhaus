import { describe, expect, it } from "vitest";
import { K_DEFAULT, K_MAX, K_MIN } from "@dashhaus/core/entities/light/kelvin";
import { lampColor, warmGradient } from "./kelvin";

describe("lampColor", () => {
  it("paints a Kelvin value with the theme's accent lightness", () => {
    expect(lampColor(2200)).toBe("oklch(var(--accent-l) 0.16 80)");
    expect(lampColor(K_DEFAULT)).toBe("oklch(var(--accent-l) 0.128 92.1)");
  });
});

describe("warmGradient", () => {
  it("has 11 stops from min to max Kelvin", () => {
    const g = warmGradient().split(", ");
    expect(g).toHaveLength(11);
    expect(g[0]).toBe(`${lampColor(K_MIN)} 0.0%`);
    expect(g[10]).toBe(`${lampColor(K_MAX)} 100.0%`);
  });
});
