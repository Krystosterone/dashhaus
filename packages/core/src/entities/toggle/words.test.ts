import { describe, expect, it } from "vitest";
import { toggleKind, toggleWord } from "./words";
import { soundAbilities, soundWord } from "../sound/words";
import { QUICK_LEVELS, lightAbilities, lightWord } from "../light/words";

describe("switched words", () => {
  it("says a toggle's state and what it is", () => {
    expect(toggleWord({ state: "on" })).toBe("On");
    expect(toggleWord({ state: "off" })).toBe("Off");
    expect(toggleWord({ state: "unavailable" })).toBe("Unavailable");
    expect(toggleKind({ entityId: "switch.dnd" })).toBe("Switch");
    expect(toggleKind({ entityId: "input_boolean.guest" })).toBe("Toggle helper");
  });

  it("says a sound's state and what it can do, the same On every skin says", () => {
    expect(soundWord({ state: "on" })).toBe("On");
    expect(soundWord({ state: "unavailable" })).toBe("Unavailable");
    expect(soundAbilities({ volume: 40 })).toBe("On / off, volume");
    expect(soundAbilities({})).toBe("On / off");
  });

  it("says a light's state, Unknown where it can still be driven, its quick levels and what it can do", () => {
    expect(lightWord({ state: "unknown" })).toBe("Unknown");
    expect(lightWord({ state: "off" })).toBe("Off");
    expect(QUICK_LEVELS.map((l) => l.label)).toEqual(["Night", "Dim", "Half", "Full"]);
    expect(lightAbilities({ supportsBrightness: true, supportsColorTemp: true, supportsColor: true })).toBe("Dimmable, warmth, colour");
    expect(lightAbilities({ supportsBrightness: false, supportsColorTemp: false, supportsColor: false })).toBe("On / off");
  });
});
