import { describe, expect, it } from "vitest";
import { binarySensorSeverity, stateSeverity } from "./severity";
import type { BinarySensorEntity } from "./types";

const e: BinarySensorEntity = { entityId: "binary_sensor.hall_smoke", name: "Hall smoke", state: "off", deviceClass: "smoke" };

describe("binarySensorSeverity", () => {
  it("ranks smoke, gas and carbon monoxide an alarm, a leak urgent, and only while on", () => {
    for (const deviceClass of ["smoke", "gas", "carbon_monoxide"] as const) expect(binarySensorSeverity({ ...e, deviceClass, state: "on" })).toBe("alarm");
    expect(binarySensorSeverity({ ...e, deviceClass: "moisture", state: "on" })).toBe("urgent");
    expect(binarySensorSeverity({ ...e, state: "off" })).toBeUndefined();
  });

  it("warns of a garage door left open, as the cover card does: advisory, ahead of a low battery", () => {
    expect(binarySensorSeverity({ ...e, deviceClass: "garage_door", state: "on" })).toBe("advisory");
    expect(stateSeverity({ ...e, deviceClass: "garage_door", state: "on", battery: 3 } as BinarySensorEntity)).toBe("advisory");
    expect(binarySensorSeverity({ ...e, deviceClass: "garage_door", state: "off" })).toBeUndefined();
  });

  it("keeps a door, a window and a plain sensor a state, not a warning, however they are", () => {
    for (const deviceClass of ["door", "window", "motion", undefined] as const) expect(stateSeverity({ ...e, deviceClass, state: "on" })).toBeUndefined();
  });

  it("falls back to a low battery as advisory, and says nothing while unavailable", () => {
    expect(binarySensorSeverity({ ...e, deviceClass: "door", state: "on", battery: 15 })).toBe("advisory");
    expect(binarySensorSeverity({ ...e, deviceClass: "door", state: "on", battery: 16 })).toBeUndefined();
    expect(binarySensorSeverity({ ...e, state: "on", battery: 5 })).toBe("alarm");
    expect(binarySensorSeverity({ ...e, state: "unavailable", battery: 5 })).toBeUndefined();
  });
});
