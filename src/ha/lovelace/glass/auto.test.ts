import { describe, expect, it } from "vitest";
import type { AutoInput, AutoState } from "../auto";
import { areaName, autoGlassCards } from "./auto";

const state = (entity_id: string, name: string): AutoState => ({ entity_id, state: "on", attributes: { friendly_name: name } });
const states = (...list: AutoState[]) => Object.fromEntries(list.map((s) => [s.entity_id, s]));

describe("autoGlassCards", () => {
  it("puts the weather first, then climate, modes, lights and switches, each by name", () => {
    const input: AutoInput = {
      states: states(
        state("switch.router", "WiFi"),
        state("light.shelf", "Shelf"),
        state("light.desk", "Desk"),
        state("input_boolean.guest", "Guest mode"),
        state("climate.living_room", "AC"),
        state("weather.home", "Home"),
        state("sensor.temperature", "Temperature"),
        state("cover.blind", "Blind"),
      ),
    };
    expect(autoGlassCards(input).map((c) => `${c.kind}:${c.entity}`)).toEqual([
      "weather:weather.home",
      "climate:climate.living_room",
      "toggle:input_boolean.guest",
      "light:light.desk",
      "light:light.shelf",
      "toggle:switch.router",
    ]);
  });

  it("keeps one weather and leaves out hidden, config and diagnostic entities", () => {
    const input: AutoInput = {
      states: states(state("weather.b", "B"), state("weather.a", "A"), state("light.hidden", "Hidden"), state("switch.base", "Base"), state("light.desk", "Desk")),
      entities: { "light.hidden": { hidden: true }, "switch.base": { entity_category: "config" } },
    };
    expect(autoGlassCards(input).map((c) => c.entity)).toEqual(["weather.a", "light.desk"]);
  });
});

describe("areaName", () => {
  const input: AutoInput = {
    states: {},
    entities: { "light.desk": { device_id: "lamp" }, "light.own": { area_id: "office", device_id: "lamp" }, "light.lost": { area_id: "gone" } },
    devices: { lamp: { area_id: "living" } },
    areas: { living: { name: "Living room" }, office: { name: "Office" } },
  };

  it("takes the entity's own area, else its device's", () => {
    expect(areaName(input, "light.own")).toBe("Office");
    expect(areaName(input, "light.desk")).toBe("Living room");
  });

  it("is undefined for an unknown area or entity", () => {
    expect(areaName(input, "light.lost")).toBeUndefined();
    expect(areaName(input, "light.none")).toBeUndefined();
  });
});
