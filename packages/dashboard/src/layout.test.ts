import { describe, expect, it } from "vitest";
import {
  areaId,
  areaName,
  byName,
  friendlyName,
  groupByArea,
  placeSection,
  roomSensors,
  sortByName,
  visibleEntities,
} from "./layout";
import type { AutoInput } from "./layout";

const state = (id: string, name: string, device_class?: string) => ({ entity_id: id, state: "on", attributes: { friendly_name: name, ...(device_class && { device_class }) } });

const input: AutoInput = {
  states: {
    "light.living": state("light.living", "Zebra"),
    "light.kitchen": state("light.kitchen", "Alpha"),
    "light.hidden": { attributes: { friendly_name: "Hidden" } },
    "sensor.temperature": { attributes: { friendly_name: "Temperature", device_class: "temperature" } },
    "sensor.humidity": { attributes: { friendly_name: "Humidity", device_class: "humidity" } },
    "sensor.battery": { attributes: { friendly_name: "Battery", device_class: "battery" } },
    "sensor.humidity_only": { attributes: { friendly_name: "Humidity only", device_class: "humidity" } },
  },
  entities: {
    "light.living": { device_id: "lamp" },
    "light.kitchen": { area_id: "kitchen" },
    "light.hidden": { hidden: true },
    "sensor.temperature": { device_id: "climate" },
    "sensor.humidity": { device_id: "climate", entity_category: "diagnostic" },
    "sensor.battery": { device_id: "climate", entity_category: "diagnostic" },
    "sensor.humidity_only": { device_id: "bath" },
  },
  devices: { lamp: { area_id: "living" }, climate: { area_id: "bedroom" }, bath: { area_id: "bathroom" } },
  areas: { living: { name: "Living room" }, kitchen: { name: "Kitchen" }, bedroom: { name: "Bedroom" }, bathroom: { name: "Bathroom" } },
};

describe("visibleEntities", () => {
  it("leaves out hidden, config and diagnostic entities, and whatever the skin doesn't support", () => {
    expect(visibleEntities(input)).toEqual(["light.living", "light.kitchen", "sensor.temperature", "sensor.humidity_only"]);
    expect(visibleEntities(input, (entity) => entity.startsWith("light."))).toEqual(["light.living", "light.kitchen"]);
  });
});

describe("area resolution", () => {
  it("takes an entity's own area before its device's", () => {
    expect(areaId(input, "light.kitchen")).toBe("kitchen");
    expect(areaId(input, "light.living")).toBe("living");
    expect(areaName(input, "light.living")).toBe("Living room");
  });

  it("has no area for an unknown entity or an area the registry doesn't name", () => {
    expect(areaId(input, "light.missing")).toBeUndefined();
    expect(areaName({ ...input, areas: {} }, "light.living")).toBeUndefined();
  });
});

describe("name sort", () => {
  it("sorts by Home Assistant's name, falling back to the entity id", () => {
    expect(friendlyName(input.states, "light.living")).toBe("Zebra");
    expect(friendlyName(input.states, "light.missing")).toBe("light.missing");
    expect(["light.living", "light.kitchen"].sort(byName(input.states))).toEqual(["light.kitchen", "light.living"]);
    expect(sortByName([{ id: "b", name: "Beta" }, { id: "a", name: "Alpha" }], (item) => item.name).map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("groupByArea", () => {
  it("orders areas by name, keeps each area's own order, and puts items with no area last", () => {
    const groups = groupByArea([{ area: "Kitchen", id: 1 }, { area: undefined, id: 2 }, { area: "Bedroom", id: 3 }, { area: "Kitchen", id: 4 }]);
    expect(groups.map((group) => [group.area, group.modules.map((item) => item.id)])).toEqual([
      ["Bedroom", [3]],
      ["Kitchen", [1, 4]],
      [undefined, [2]],
    ]);
  });
});

describe("placeSection", () => {
  it("joins a section of the same title, case-insensitively, and leaves the first section's own name", () => {
    const sections: { title: string; cards: string[] }[] = [{ title: "Nursery", cards: ["light.a"] }];
    placeSection(sections, { title: "nursery", cards: ["sensor.owlet_sleep_state"] });
    placeSection(sections, { title: "Outside", cards: ["weather.home"] });
    expect(sections).toEqual([
      { title: "Nursery", cards: ["light.a", "sensor.owlet_sleep_state"] },
      { title: "Outside", cards: ["weather.home"] },
    ]);
  });
});

describe("roomSensors", () => {
  it("takes one sensor per device, its companions beside it, and a humidity sensor whose device has no temperature", () => {
    expect(roomSensors(input)).toEqual([
      { entity: "sensor.temperature", humidity: "sensor.humidity", battery: "sensor.battery" },
      { entity: "sensor.humidity_only" },
    ]);
  });
});
