import { describe, expect, it } from "vitest";
import { roomSensors } from "./rooms";

const state = (device_class?: string, friendly_name?: string) => ({ attributes: { ...(device_class && { device_class }), ...(friendly_name && { friendly_name }) } });

describe("roomSensors", () => {
  it("takes one per device: a temperature with its humidity and battery, then humidity alone", () => {
    expect(roomSensors({
      states: {
        "sensor.bed_t": state("temperature", "Bedroom"),
        "sensor.bed_h": state("humidity"),
        "sensor.bed_b": state("battery"),
        "sensor.bath_h": state("humidity", "Bathroom"),
        "sensor.attic_t": state("temperature", "Attic"),
        "sensor.power": state("power"),
      },
      entities: {
        "sensor.bed_t": { device_id: "bed" },
        "sensor.bed_h": { device_id: "bed" },
        "sensor.bed_b": { device_id: "bed", entity_category: "diagnostic" },
        "sensor.bath_h": { device_id: "bath" },
      },
    })).toEqual([
      { entity: "sensor.attic_t" },
      { entity: "sensor.bed_t", humidity: "sensor.bed_h", battery: "sensor.bed_b" },
      { entity: "sensor.bath_h" },
    ]);
  });

  it("leaves out hidden sensors, and diagnostic ones unless they are a companion", () => {
    expect(roomSensors({
      states: { "sensor.a": state("temperature"), "sensor.b": state("temperature"), "sensor.b_bat": state("battery") },
      entities: { "sensor.a": { hidden: true }, "sensor.b": { device_id: "b" }, "sensor.b_bat": { device_id: "b", hidden: true } },
    })).toEqual([{ entity: "sensor.b" }]);
  });
});
