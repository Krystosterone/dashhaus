import { describe, expect, it } from "vitest";
import { parseGlassConfig } from "./config";
import { DashboardConfigError } from "../config";

describe("parseGlassConfig", () => {
  it("is automatic with no cards, titled Home", () => {
    expect(parseGlassConfig({ type: "custom:home-dashboard-glass" })).toEqual({ title: "Home", name: undefined, cards: undefined });
    expect(parseGlassConfig(undefined)).toEqual({ title: "Home", name: undefined, cards: undefined });
  });

  it("reads entity ids and cards, with each domain's card", () => {
    const config = parseGlassConfig({
      title: "Laid-back home",
      name: "Sam",
      cards: ["weather.home", { entity: "climate.living_room", name: "AC", area: "Living room", size: "xl" }, { entity: "switch.router", icon: "waves" }, "input_boolean.guest", "light.desk"],
    });
    expect(config.title).toBe("Laid-back home");
    expect(config.name).toBe("Sam");
    expect(config.cards).toEqual([
      { entity: "weather.home", kind: "weather", name: undefined, area: undefined, size: undefined },
      { entity: "climate.living_room", kind: "climate", name: "AC", area: "Living room", size: "xl" },
      { entity: "switch.router", kind: "toggle", name: undefined, area: undefined, size: undefined, icon: "waves" },
      { entity: "input_boolean.guest", kind: "toggle", name: undefined, area: undefined, size: undefined, icon: undefined },
      { entity: "light.desk", kind: "light", name: undefined, area: undefined, size: undefined },
    ]);
  });

  it("collects every problem with its path, and suggests the key that was meant", () => {
    let error: unknown;
    try {
      parseGlassConfig({ titel: "x", cards: ["sensor.kitchen", { entity: "light.desk", sise: "m" }, { entity: "light.desk", icon: "moon" }, { entity: "climate.ac", size: "huge" }, 3] });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(DashboardConfigError);
    expect((error as DashboardConfigError).problems).toEqual([
      'unknown key "titel" — did you mean "title"?',
      "cards[0]: sensor.kitchen: sensor.* entities have no glass card yet (supported: light, climate, weather, input_boolean, switch)",
      'cards[1] (light.desk): unknown key "sise" — did you mean "size"?',
      'cards[2] (light.desk): unknown key "icon"',
      'cards[3] (climate.ac): "size" must be one of "s", "m", "l", "xl"',
      'cards[4]: a card is an entity id, or a map with an "entity" key',
    ]);
  });

  it("wants a list of cards", () => {
    expect(() => parseGlassConfig({ cards: "light.desk" })).toThrow("cards: must be a list of entity ids or cards");
  });
});
