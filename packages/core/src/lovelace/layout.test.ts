import { describe, expect, it } from "vitest";
import {
  areaId,
  areaName,
  byName,
  deviceCompanion,
  friendlyName,
  groupByArea,
  numericSensors,
  placeSection,
  roomSensors,
  safetySensors,
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

describe("safetySensors", () => {
  it("takes every visible door, window, leak and smoke sensor by name, with its device's battery, and nothing else", () => {
    expect(safetySensors({
      states: {
        "binary_sensor.patio": { attributes: { friendly_name: "Patio door", device_class: "door" } },
        "binary_sensor.patio_battery": { attributes: { friendly_name: "Patio battery", device_class: "battery" } },
        "sensor.patio_battery": { attributes: { friendly_name: "Patio battery", device_class: "battery" } },
        "binary_sensor.sink": { attributes: { friendly_name: "Leak", device_class: "moisture" } },
        "binary_sensor.hall_motion": { attributes: { friendly_name: "Hall motion", device_class: "motion" } },
        "binary_sensor.sock_off": { attributes: { friendly_name: "Sock off" } },
        "binary_sensor.old_smoke": { attributes: { friendly_name: "Old smoke", device_class: "smoke" } },
        "binary_sensor.tamper": { attributes: { friendly_name: "Tamper", device_class: "door" } },
      },
      entities: {
        "binary_sensor.patio": { device_id: "patio" },
        "binary_sensor.patio_battery": { device_id: "patio" },
        "sensor.patio_battery": { device_id: "patio", entity_category: "diagnostic" },
        "binary_sensor.old_smoke": { hidden: true },
        "binary_sensor.tamper": { entity_category: "diagnostic" },
      },
    })).toEqual([{ entity: "binary_sensor.sink" }, { entity: "binary_sensor.patio", battery: "sensor.patio_battery" }]);
  });
});

describe("numericSensors", () => {
  it("takes the room's air, one reading per device by class, by name, and leaves power and energy to a person", () => {
    expect(numericSensors({
      states: {
        "sensor.living_co2": { attributes: { friendly_name: "Living room CO2", device_class: "carbon_dioxide" } },
        "sensor.living_pm25": { attributes: { friendly_name: "Living room PM2.5", device_class: "pm25" } },
        "sensor.bedroom_voc": { attributes: { friendly_name: "Bedroom VOC", device_class: "volatile_organic_compounds" } },
        "sensor.attic_pm10": { attributes: { friendly_name: "Attic PM10", device_class: "pm10" } },
        "sensor.plug_power": { attributes: { friendly_name: "Plug power", device_class: "power" } },
        "sensor.house_energy": { attributes: { friendly_name: "House energy", device_class: "energy" } },
        "sensor.office_temperature": { attributes: { friendly_name: "Office", device_class: "temperature" } },
        "sensor.hidden_co2": { attributes: { friendly_name: "Hidden CO2", device_class: "carbon_dioxide" } },
        "sensor.diagnostic_co2": { attributes: { friendly_name: "Diagnostic CO2", device_class: "carbon_dioxide" } },
      },
      entities: {
        "sensor.living_pm25": { device_id: "air" },
        "sensor.living_co2": { device_id: "air" },
        "sensor.bedroom_voc": { device_id: "bedroom" },
        "sensor.hidden_co2": { hidden: true },
        "sensor.diagnostic_co2": { entity_category: "diagnostic" },
      },
    })).toEqual(["sensor.attic_pm10", "sensor.bedroom_voc", "sensor.living_co2"]);
  });
});

describe("deviceCompanion", () => {
  const lock = {
    states: {
      ...input.states,
      "lock.front": { attributes: { friendly_name: "Front door" } },
      "sensor.front_battery": { attributes: { friendly_name: "Front door battery", device_class: "battery" } },
      "sensor.front_battery_hidden": { attributes: { friendly_name: "Old battery", device_class: "battery" } },
      "binary_sensor.front_battery": { attributes: { friendly_name: "Front door battery low", device_class: "battery" } },
    },
    entities: {
      ...input.entities,
      "lock.front": { device_id: "front" },
      "sensor.front_battery_hidden": { device_id: "front", hidden: true },
      "sensor.front_battery": { device_id: "front", entity_category: "diagnostic" as const },
      "binary_sensor.front_battery": { device_id: "front" },
    },
  };

  it("finds a device's battery sensor for any entity on it, a lock's as a room sensor's", () => {
    expect(deviceCompanion(lock, "lock.front", "battery")).toBe("sensor.front_battery");
    expect(deviceCompanion(lock, "sensor.temperature", "battery")).toBe("sensor.battery");
    expect(deviceCompanion(lock, "lock.front", "battery", "binary_sensor")).toBe("binary_sensor.front_battery");
  });

  it("finds nothing without a device, or with no sensor of that class on it", () => {
    expect(deviceCompanion(lock, "light.kitchen", "battery")).toBeUndefined();
    expect(deviceCompanion(lock, "lock.front", "humidity")).toBeUndefined();
    expect(deviceCompanion(lock, "lock.missing", "battery")).toBeUndefined();
  });
});
