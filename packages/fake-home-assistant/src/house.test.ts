import { describe, expect, it } from "vitest";
import { HOUSE_AREAS, houseDevices, houseEntityRegistry, houseRegistries, houseStates } from "./house.js";

describe("the sample house", () => {
  it("is the four areas and sixteen entities the DX journeys deploy against", () => {
    expect(HOUSE_AREAS.map((area) => area.area_id)).toEqual(["kitchen", "living_room", "bedroom", "office"]);

    const states = houseStates();
    expect(states).toHaveLength(16);
    const ceiling = states.find((state) => state.entity_id === "light.kitchen_ceiling");
    expect(ceiling?.state).toBe("on");
    expect(ceiling?.attributes).toMatchObject({ friendly_name: "Kitchen ceiling", brightness: 230 });
    expect(ceiling).not.toHaveProperty("area_id");
    expect(ceiling?.last_changed).toBe("2026-10-31T18:00:00Z");
    expect(ceiling?.last_updated).toBe("2026-10-31T18:00:00Z");
    expect(ceiling?.context).toEqual({ id: "fake", parent_id: null, user_id: null });
    expect(states.find((state) => state.entity_id === "sensor.office_temperature")?.state).toBe("unavailable");
  });

  it("puts a room's sensors on the room's device in both registries", () => {
    const display = houseEntityRegistry();
    expect(display.entity_categories).toEqual({});
    expect(display.entities).toHaveLength(16);
    expect(display.entities).toContainEqual({ ei: "light.kitchen_ceiling", ai: "kitchen" });
    expect(display.entities).toContainEqual({ ei: "sensor.kitchen_temperature", ai: "kitchen", di: "kitchen_air" });
    expect(display.entities).toContainEqual({ ei: "weather.home" });

    expect(houseDevices().map((device) => device.id)).toEqual(["kitchen_air", "living_room_air", "bedroom_air", "office_air"]);

    const registries = houseRegistries();
    expect(Object.keys(registries.entities)).toHaveLength(16);
    expect(registries.entities["sensor.kitchen_temperature"]).toMatchObject({ area_id: "kitchen", device_id: "kitchen_air", hidden: false, entity_category: null });
    expect(registries.devices["kitchen_air"]).toEqual({ id: "kitchen_air", area_id: "kitchen", name: "kitchen air" });
    expect(registries.areas).toEqual(Object.fromEntries(HOUSE_AREAS.map((area) => [area.area_id, area])));
  });

  it("returns fresh state and registry objects on every call", () => {
    const ceiling = houseStates().find((state) => state.entity_id === "light.kitchen_ceiling");
    if (ceiling) ceiling.attributes.brightness = 1;
    expect(houseStates().find((state) => state.entity_id === "light.kitchen_ceiling")?.attributes.brightness).toBe(230);
    expect(houseRegistries().entities["light.kitchen_ceiling"]).not.toBe(houseRegistries().entities["light.kitchen_ceiling"]);
  });
});
