import { describe, expect, it } from "vitest";
import { ACTION_LABEL, MODE_META, fmtCurrent, fmtTarget, titleCase, toneColor } from "./modes";

describe("titleCase", () => {
  it("capitalizes and un-snakes", () => {
    expect(titleCase("heat_cool")).toBe("Heat cool");
  });
});

describe("fmtTarget", () => {
  it("keeps integers bare", () => {
    expect(fmtTarget(21)).toBe("21");
  });
  it("shows one decimal otherwise", () => {
    expect(fmtTarget(21.5)).toBe("21.5");
  });
});

describe("fmtCurrent", () => {
  it("always shows one decimal", () => {
    expect(fmtCurrent(21)).toBe("21.0");
  });
});

describe("toneColor", () => {
  it("uses the mode's chroma and hue", () => {
    expect(toneColor("cool")).toBe("oklch(var(--accent-l) 0.09 235)");
  });
});

describe("MODE_META", () => {
  it("covers every HvacMode", () => {
    expect(Object.keys(MODE_META).sort()).toEqual(["auto", "cool", "dry", "fan_only", "heat", "heat_cool", "off"]);
  });
  it("ACTION_LABEL covers every HvacAction", () => {
    expect(Object.keys(ACTION_LABEL).sort()).toEqual(["cooling", "drying", "fan", "heating", "idle", "off"]);
  });
});
