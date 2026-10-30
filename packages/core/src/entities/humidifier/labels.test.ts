import { describe, expect, it } from "vitest";
import { ACTION_LABEL, fmtHumidity, modeLabel, targetVerb } from "./labels";

describe("humidifier labels", () => {
  it("covers every action", () => {
    expect(Object.keys(ACTION_LABEL).sort()).toEqual(["drying", "humidifying", "idle", "off"]);
  });

  it("rounds humidity to whole percent", () => {
    expect(fmtHumidity(44.6)).toBe("45");
  });

  it("capitalizes and un-snakes a mode", () => {
    expect(modeLabel("comfort_continuous_night")).toBe("Comfort continuous night");
  });

  it("says what the target does by the kind of unit", () => {
    expect(targetVerb(undefined)).toBe("Humidify to");
    expect(targetVerb("dehumidifier")).toBe("Dry to");
  });
});
