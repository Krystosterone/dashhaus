import { describe, expect, it } from "vitest";
import { mmss, modeChoices, needsCode } from "./modes";

describe("modeChoices", () => {
  it("puts Off before the panel's modes", () => {
    expect(modeChoices(["home", "away"], "off")).toEqual(["off", "home", "away"]);
  });

  it("keeps a mode the panel was armed in from elsewhere, so it never reads as Off", () => {
    expect(modeChoices(["home", "away"], "custom_bypass")).toEqual(["off", "home", "away", "custom_bypass"]);
  });
});

describe("needsCode", () => {
  it("asks for nothing without a code format", () => {
    expect(needsCode({ codeFormat: null }, { kind: "disarm" })).toBe(false);
  });

  it("asks to arm too unless the integration says it needn't, as Home Assistant does", () => {
    expect(needsCode({ codeFormat: "number" }, { kind: "arm", mode: "away" })).toBe(true);
    expect(needsCode({ codeFormat: "number", codeArmRequired: false }, { kind: "arm", mode: "away" })).toBe(false);
    expect(needsCode({ codeFormat: "number", codeArmRequired: false }, { kind: "disarm" })).toBe(true);
  });
});

describe("mmss", () => {
  it("prints minutes and two places of seconds, rounding a part second up", () => {
    expect(mmss(42)).toBe("0:42");
    expect(mmss(600)).toBe("10:00");
    expect(mmss(0.2)).toBe("0:01");
    expect(mmss(-3)).toBe("0:00");
  });
});
