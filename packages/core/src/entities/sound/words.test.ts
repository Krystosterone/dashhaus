import { describe, expect, it } from "vitest";
import { volumeSaid, volumeText } from "../volume";
import { SOUND_OFF_SAID, soundVolumeReason, soundWord } from "./words";

describe("sound words", () => {
  it("says its state in one word", () => {
    expect(soundWord({ state: "on" })).toBe("On");
    expect(soundWord({ state: "off" })).toBe("Off");
    expect(soundWord({ state: "unavailable" })).toBe("Unavailable");
  });

  it("gives its volume no reason while it plays, and Off before the value while it doesn't (spec/cards.md)", () => {
    expect(volumeText(62, soundVolumeReason({ state: "on" }))).toBe("Volume 62%");
    expect(volumeText(62, soundVolumeReason({ state: "off" }))).toBe("Off · 62%");
    expect(volumeSaid(62, SOUND_OFF_SAID)).toBe("62 percent, sound off");
  });
});
