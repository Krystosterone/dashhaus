import { describe, expect, it } from "vitest";
import { autoModules, groupByArea } from "./auto";
import { parseFieldConfig } from "./config";

const state = (id: string, name: string, device_class?: string) => ({ entity_id: id, state: "on", attributes: { friendly_name: name, ...(device_class && { device_class }) } });

describe("autoModules", () => {
  it("takes every supported entity by name, leaving out hidden, config and diagnostic ones and other domains", () => {
    const modules = autoModules({
      states: { "light.b": state("light.b", "Bedside"), "light.a": state("light.a", "Attic"), "climate.hall": state("climate.hall", "Hall"), "light.h": state("light.h", "Hidden"), "light.c": state("light.c", "Config"), "input_text.n": state("input_text.n", "Note") },
      entities: { "light.h": { hidden: true }, "light.c": { entity_category: "config" } },
    });
    expect(modules).toEqual([{ entity: "light.a", kind: "light" }, { entity: "light.b", kind: "light" }, { entity: "climate.hall", kind: "climate" }]);
  });

  it("takes room air of sensors, one per device with its companions, among the rest by name", () => {
    const modules = autoModules({
      states: {
        "light.lamp": state("light.lamp", "Lamp"),
        "sensor.bed_t": state("sensor.bed_t", "Bedroom", "temperature"),
        "sensor.bed_h": state("sensor.bed_h", "Bedroom humidity", "humidity"),
        "sensor.bed_b": state("sensor.bed_b", "Bedroom battery", "battery"),
        "sensor.power": state("sensor.power", "Power", "power"),
      },
      entities: { "sensor.bed_t": { device_id: "bed" }, "sensor.bed_h": { device_id: "bed" }, "sensor.bed_b": { device_id: "bed", entity_category: "diagnostic" } },
    });
    expect(modules).toEqual([{ entity: "sensor.bed_t", humidity: "sensor.bed_h", battery: "sensor.bed_b", kind: "sensor" }, { entity: "light.lamp", kind: "light" }]);
  });
});

describe("groupByArea", () => {
  it("orders areas by name, keeps each area's own order, and puts modules with no area last", () => {
    const groups = groupByArea([{ entity: "light.z", area: "Office" }, { entity: "light.n" }, { entity: "light.y", area: "Kitchen" }, { entity: "light.x", area: "Office" }]);
    expect(groups.map((g) => [g.area, g.modules.map((m) => m.entity)])).toEqual([
      ["Kitchen", ["light.y"]],
      ["Office", ["light.z", "light.x"]],
      [undefined, ["light.n"]],
    ]);
  });
});

describe("parseFieldConfig", () => {
  it("defaults to automatic modules, Home Assistant's dark mode, standard modules", () => {
    expect(parseFieldConfig({ type: "custom:home-dashboard-field" })).toEqual({ title: undefined, finish: "home-assistant", footprint: "standard" });
  });

  it("reads supported modules as ids or maps, and reports every problem at once", () => {
    expect(parseFieldConfig({ footprint: "compact", modules: ["light.a", { entity: "light.b", footprint: "standard" }, "climate.hall"] }).modules).toEqual([
      { entity: "light.a", kind: "light", name: undefined, area: undefined, footprint: undefined },
      { entity: "light.b", kind: "light", name: undefined, area: undefined, footprint: "standard" },
      { entity: "climate.hall", kind: "climate", name: undefined, area: undefined, footprint: undefined },
    ]);
    expect(() => parseFieldConfig({ finish: "blak", modules: [{ name: "x" }] })).toThrow(/did you mean "black"\?[\s\S]*a module needs an "entity"/);
  });

  it("takes a sensor's companions and outdoor flag, on sensors only", () => {
    expect(parseFieldConfig({ modules: [{ entity: "sensor.bed_t", humidity: "sensor.bed_h", battery: "sensor.bed_b", outdoor: true }] }).modules).toEqual([
      { entity: "sensor.bed_t", kind: "sensor", name: undefined, area: undefined, footprint: undefined, humidity: "sensor.bed_h", battery: "sensor.bed_b", outdoor: true },
    ]);
    expect(() => parseFieldConfig({ modules: [{ entity: "sensor.bed_t", humidity: "light.lamp" }] })).toThrow("light.lamp must be a sensor.* entity");
    expect(() => parseFieldConfig({ modules: [{ entity: "light.lamp", battery: "sensor.b" }] })).toThrow('"battery"');
  });

  it("takes a card for the entity's domain with \"card\", and no other", () => {
    expect(parseFieldConfig({ modules: [{ entity: "sensor.bed_t", card: "sensor" }] }).modules?.[0].kind).toBe("sensor");
    expect(() => parseFieldConfig({ modules: [{ entity: "sensor.bed_t", card: "light" }] })).toThrow('"card" must be one of "sensor"');
  });
});
