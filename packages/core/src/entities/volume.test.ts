import { describe, expect, it } from "vitest";
import { VOLUME, volumeSaid, volumeText } from "./volume";

describe("a volume in words", () => {
  it("says the volume while it sounds, and the reason before the value while it doesn't", () => {
    expect(volumeText(45)).toBe(`${VOLUME} 45%`);
    expect(volumeText(62, "Off")).toBe("Off · 62%");
    expect(volumeText(45, "Muted")).toBe("Muted · 45%");
    expect(volumeText(30, "Paused")).toBe("Paused · 30%");
  });

  it("says it for a screen reader, with the reason after the figure", () => {
    expect(volumeSaid(45)).toBe("45 percent");
    expect(volumeSaid(62, "sound off")).toBe("62 percent, sound off");
  });
});
