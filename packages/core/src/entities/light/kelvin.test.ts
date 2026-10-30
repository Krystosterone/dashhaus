import { describe, expect, it } from "vitest";
import { K_MAX, K_MIN, kelvinName, kelvinToLch } from "./kelvin";

describe("kelvinToLch", () => {
  it("is golden at the low end", () => {
    expect(kelvinToLch(K_MIN)).toEqual({ c: 0.16, h: 80 });
  });
  it("is neutral at 4800 K", () => {
    expect(kelvinToLch(4800)).toEqual({ c: 0.02, h: 105 });
  });
  it("is pale blue at the high end", () => {
    expect(kelvinToLch(K_MAX)).toEqual({ c: 0.08, h: 245 });
  });
  it("stays inside the golden-to-blue envelope at the seams", () => {
    for (const k of [K_MIN, 2500, 3200, 4200, 4800, 4801, 5500, K_MAX]) {
      const { h, c } = kelvinToLch(k);
      expect(h).toBeGreaterThanOrEqual(80);
      expect(h).toBeLessThanOrEqual(245);
      expect(c).toBeGreaterThan(0);
    }
  });
});

describe("kelvinName", () => {
  it("names the boundary ranges", () => {
    expect(kelvinName(2500)).toBe("Candlelight");
    expect(kelvinName(2501)).toBe("Warm white");
    expect(kelvinName(3200)).toBe("Warm white");
    expect(kelvinName(3201)).toBe("Neutral white");
    expect(kelvinName(4200)).toBe("Neutral white");
    expect(kelvinName(4201)).toBe("Daylight");
    expect(kelvinName(5500)).toBe("Daylight");
    expect(kelvinName(5501)).toBe("Cool daylight");
  });
});
