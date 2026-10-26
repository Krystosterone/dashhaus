import { describe, expect, it } from "vitest";
import { autoModules, groupByArea } from "./auto";
import { parseFieldConfig } from "./config";

const state = (id: string, name: string) => ({ entity_id: id, state: "on", attributes: { friendly_name: name } });

describe("autoModules", () => {
  it("takes every light by name, leaving out hidden, config and diagnostic ones and other domains", () => {
    const modules = autoModules({
      states: { "light.b": state("light.b", "Bedside"), "light.a": state("light.a", "Attic"), "light.h": state("light.h", "Hidden"), "light.c": state("light.c", "Config"), "switch.s": state("switch.s", "Switch") },
      entities: { "light.h": { hidden: true }, "light.c": { entity_category: "config" } },
    });
    expect(modules).toEqual([{ entity: "light.a" }, { entity: "light.b" }]);
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

  it("reads modules as ids or maps, and reports every problem at once", () => {
    expect(parseFieldConfig({ footprint: "compact", modules: ["light.a", { entity: "light.b", footprint: "standard" }] }).modules).toEqual([
      { entity: "light.a", name: undefined, area: undefined, footprint: undefined },
      { entity: "light.b", name: undefined, area: undefined, footprint: "standard" },
    ]);
    expect(() => parseFieldConfig({ finish: "blak", modules: [{ name: "x" }] })).toThrow(/did you mean "black"\?[\s\S]*a module needs an "entity"/);
  });
});
