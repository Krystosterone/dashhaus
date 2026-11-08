import { describe, expect, it } from "vitest";
import { ACTION_LABEL, fmtHumidity, humidifierFacts, kindLabel, modeLabel, targetVerb } from "./labels";

describe("humidifier labels", () => {
  it("covers every action", () => {
    expect(Object.keys(ACTION_LABEL).sort()).toEqual(["drying", "humidifying", "idle", "off"]);
  });

  it("says what the unit is, with its range while it is known", () => {
    expect(kindLabel("dehumidifier")).toBe("Dehumidifier");
    expect(kindLabel(undefined)).toBe("Humidifier");
    expect(humidifierFacts({ kind: "humidifier", minHumidity: 30, maxHumidity: 80 })).toBe("Humidifier · 30–80%");
    expect(humidifierFacts({ kind: "dehumidifier", minHumidity: 30, maxHumidity: 80 }, true)).toBe("Dehumidifier");
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
