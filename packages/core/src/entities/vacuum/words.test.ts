import { describe, expect, it } from "vitest";
import { batteryFact, fanSpeedLabel, inWords, pressWord, statusDetail, vacuumPress, vacuumWarning, vacuumWarningSentence, vacuumWarningText, vacuumWord } from "./words";
import type { VacuumEntity } from "./types";

const all = { supportsStart: true, supportsPause: true, supportsReturn: true } as const;

describe("vacuum words", () => {
  it("says its state as Home Assistant's activity, or in its own words", () => {
    expect(vacuumWord({ state: "cleaning" })).toBe("Cleaning");
    expect(vacuumWord({ state: "returning" })).toBe("Returning");
    expect(vacuumWord({ state: "cleaning", stateText: "Spot cleaning" })).toBe("Spot cleaning");
    expect(vacuumWord({ state: "other", stateText: "Updating firmware" })).toBe("Updating firmware");
    expect(vacuumWord({ state: "other" })).toBe("Unknown");
    expect(vacuumWord({ state: "unavailable", stateText: "x" })).toBe("Unavailable");
  });

  it("puts a Home Assistant name in words", () => {
    expect(inWords("zone_cleaning")).toBe("Zone cleaning");
    expect(inWords("MAX-PLUS")).toBe("Max plus");
    expect(fanSpeedLabel("turbo")).toBe("Turbo");
  });

  it("presses to pause while it moves and to start while it stands, as it supports", () => {
    expect(vacuumPress({ state: "cleaning", ...all })).toBe("pause");
    expect(vacuumPress({ state: "returning", ...all })).toBe("pause");
    expect(vacuumPress({ state: "cleaning", supportsReturn: true })).toBe("return");
    expect(vacuumPress({ state: "returning", supportsReturn: true })).toBeNull();
    expect(vacuumPress({ state: "docked", ...all })).toBe("start");
    expect(vacuumPress({ state: "error", ...all })).toBe("start");
    expect(vacuumPress({ state: "docked", supportsPause: true })).toBeNull();
    expect(vacuumPress({ state: "unavailable", ...all })).toBeNull();
  });

  it("prints what a press does", () => {
    expect(pressWord("start", { state: "docked" })).toBe("Start");
    expect(pressWord("start", { state: "paused" })).toBe("Resume");
    expect(pressWord("start", { state: "error" })).toBe("Start again");
    expect(pressWord("pause", { state: "cleaning" })).toBe("Pause");
    expect(pressWord("return", { state: "cleaning" })).toBe("Return to dock");
  });

  it("warns of an error, and of a low battery only while it stands away from the dock and isn't charging, in 13 characters at most", () => {
    const e: VacuumEntity = { entityId: "vacuum.x", name: "Robot vacuum", state: "error", error: "Main brush jammed", battery: 9 };
    expect(vacuumWarning(e)).toBe("Error");
    expect(vacuumWarningText(e)).toBe("Error · Main brush jammed");
    expect(vacuumWarningSentence(e)).toBe("Robot vacuum has stopped with an error: main brush jammed");
    expect(vacuumWarning({ state: "idle", battery: 9 })).toBe("Battery 9%");
    expect(vacuumWarning({ state: "paused", battery: 15 })).toBe("Battery 15%");
    expect(vacuumWarning({ state: "other", battery: 9 })).toBe("Battery 9%");
    expect(vacuumWarning({ state: "cleaning", battery: 9 })).toBeUndefined();
    expect(vacuumWarning({ state: "returning", battery: 9 })).toBeUndefined();
    expect(vacuumWarningSentence({ name: "Robot vacuum", state: "cleaning", battery: 9 })).toBeUndefined();
    expect(vacuumWarning({ state: "docked", battery: 9 })).toBeUndefined();
    expect(vacuumWarning({ state: "idle", battery: 9, charging: true })).toBeUndefined();
    expect(vacuumWarning({ state: "idle", battery: 16 })).toBeUndefined();
    expect(vacuumWarning({ state: "unavailable", battery: 9 })).toBeUndefined();
    for (const battery of [0, 9, 15]) expect(vacuumWarning({ state: "idle", battery })!.length).toBeLessThanOrEqual(13);
  });

  it("says its battery for its details", () => {
    expect(batteryFact({ state: "cleaning", battery: 72 })).toBe("Battery 72%");
    expect(batteryFact({ state: "docked", battery: 64, charging: true })).toBe("Battery 64%, charging");
    expect(batteryFact({ state: "idle", battery: 9 })).toBe("Battery 9%, needs charging");
    expect(batteryFact({ state: "cleaning", battery: 9 })).toBe("Battery 9%");
    expect(batteryFact({ state: "returning", battery: 9 })).toBe("Battery 9%");
    expect(batteryFact({ state: "idle" })).toBe("");
  });

  it("keeps the integration's status only where it says more than the state", () => {
    expect(statusDetail({ state: "cleaning", status: "cleaning" })).toBeUndefined();
    expect(statusDetail({ state: "docked", status: "Charging" })).toBe("Charging");
    expect(statusDetail({ state: "unavailable", status: "Charging" })).toBeUndefined();
  });
});
