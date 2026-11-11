import { describe, expect, it } from "vitest";
import {
  areaId,
  areaName,
  areaOrder,
  byName,
  columnAreas,
  deviceCompanion,
  energySensors,
  friendlyName,
  groupByArea,
  numericSensors,
  outsideArea,
  placeColumns,
  placeSection,
  roomSensors,
  safetySensors,
  sortByName,
  visibleEntities,
  WALL_BANDS,
  wallBand,
  wallFootprint,
  wallAreas,
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

  it("looks only at the entity's own device, taking the first match in the states' order", () => {
    const battery = (name: string) => ({ attributes: { friendly_name: name, device_class: "battery" } });
    const house = {
      states: {
        "sensor.attic_battery": battery("Attic battery"),
        "lock.back": { attributes: {} },
        "sensor.back_battery_b": battery("Back battery B"),
        "lock.front": { attributes: {} },
        "sensor.back_battery_a": battery("Back battery A"),
        "sensor.front_battery": battery("Front battery"),
        "sensor.front_humidity": { attributes: { device_class: "humidity" } },
        "binary_sensor.front_door": { attributes: { device_class: "door" } },
      },
      entities: {
        "sensor.attic_battery": { device_id: "attic" },
        "lock.back": { device_id: "back" },
        "sensor.back_battery_b": { device_id: "back" },
        "lock.front": { device_id: "front" },
        "sensor.back_battery_a": { device_id: "back" },
        "sensor.front_battery": { device_id: "front" },
        "sensor.front_humidity": { device_id: "front" },
        "binary_sensor.front_door": { device_id: "front" },
      },
    };
    expect(deviceCompanion(house, "lock.back", "battery")).toBe("sensor.back_battery_b");
    expect(deviceCompanion(house, "lock.front", "battery")).toBe("sensor.front_battery");
    expect(deviceCompanion(house, "binary_sensor.front_door", "humidity")).toBe("sensor.front_humidity");
    expect(deviceCompanion(house, "sensor.attic_battery", "battery")).toBeUndefined();
    // A new snapshot of the house is read afresh, not from the last one's devices.
    const moved = { ...house, entities: { ...house.entities, "sensor.attic_battery": { device_id: "back" } } };
    expect(deviceCompanion(moved, "lock.back", "battery")).toBe("sensor.attic_battery");
    expect(deviceCompanion(house, "lock.back", "battery")).toBe("sensor.back_battery_b");
  });
});

describe("energySensors", () => {
  const ids = [
    "sensor.grid_power", "sensor.grid_import", "sensor.grid_export", "sensor.solar_power", "sensor.solar_energy",
    "sensor.battery_power", "sensor.battery_out", "sensor.battery_in", "sensor.gas", "sensor.water", "sensor.dishwasher",
    "sensor.hidden_power", "sensor.diagnostic_energy", "sensor.second_grid_power", "sensor.old_grid_import", "sensor.old_grid_export",
  ];
  const states = Object.fromEntries(ids.map((id) => [id, { attributes: { friendly_name: id } }]));
  const entities = { "sensor.hidden_power": { hidden: true }, "sensor.diagnostic_energy": { entity_category: "diagnostic" } };

  it("puts power now first, grid then solar then battery, then the meters: grid in, grid out, solar, battery out, battery in", () => {
    expect(energySensors({
      states,
      energy: {
        energy_sources: [
          { type: "battery", stat_energy_from: "sensor.battery_out", stat_energy_to: "sensor.battery_in", stat_rate: "sensor.battery_power" },
          { type: "solar", stat_energy_from: "sensor.solar_energy", stat_rate: "sensor.solar_power" },
          { type: "grid", stat_energy_from: "sensor.grid_import", stat_energy_to: "sensor.grid_export", stat_rate: "sensor.grid_power" },
          { type: "grid", stat_energy_from: null, stat_energy_to: null, stat_rate: "sensor.second_grid_power" },
        ],
      },
    })).toEqual([
      "sensor.grid_power", "sensor.second_grid_power", "sensor.solar_power", "sensor.battery_power",
      "sensor.grid_import", "sensor.grid_export", "sensor.solar_energy", "sensor.battery_out", "sensor.battery_in",
    ]);
  });

  it("reads a grid's older flow_from, flow_to and power lists as well as the flat keys", () => {
    expect(energySensors({
      states,
      energy: {
        energy_sources: [{
          type: "grid",
          flow_from: [{ stat_energy_from: "sensor.old_grid_import" }, { stat_energy_from: "sensor.grid_import" }],
          flow_to: [{ stat_energy_to: "sensor.old_grid_export" }],
          power: [{ stat_rate: "sensor.grid_power" }],
        }],
      },
    })).toEqual(["sensor.grid_power", "sensor.old_grid_import", "sensor.grid_import", "sensor.old_grid_export"]);
  });

  it("keeps only visible sensor entities that exist, once each", () => {
    expect(energySensors({
      states: { ...states, "input_number.grid": { attributes: {} } },
      entities,
      energy: {
        energy_sources: [
          { type: "grid", stat_energy_from: "opower:pge_elec_123", stat_energy_to: "sensor.removed", stat_rate: "sensor.hidden_power" },
          { type: "grid", stat_energy_from: "input_number.grid", stat_rate: "sensor.diagnostic_energy" },
          { type: "solar", stat_energy_from: "sensor.solar_energy", stat_rate: "sensor.solar_energy" },
          { type: "battery", stat_energy_from: "sensor.solar_energy", stat_energy_to: 42 as unknown as string },
        ],
      },
    })).toEqual(["sensor.solar_energy"]);
  });

  it("leaves out gas, water, the home and the devices under device consumption", () => {
    expect(energySensors({
      states,
      energy: {
        energy_sources: [
          { type: "gas", stat_energy_from: "sensor.gas", stat_rate: "sensor.gas" },
          { type: "water", stat_energy_from: "sensor.water" },
          { type: "home", stat_energy_to: "sensor.grid_import", stat_rate: "sensor.grid_power" },
        ],
        device_consumption: [{ stat_consumption: "sensor.dishwasher" }],
      },
    })).toEqual([]);
  });

  it("gives nothing with no preferences, empty ones, or ones that aren't the right shape", () => {
    expect(energySensors({ states })).toEqual([]);
    expect(energySensors({ states, energy: { energy_sources: [] } })).toEqual([]);
    expect(energySensors({ states, energy: { energy_sources: "grid" } as never })).toEqual([]);
    expect(energySensors({ states, energy: { energy_sources: [null, "grid", { type: "grid", flow_from: "sensor.grid_import" }] } as never })).toEqual([]);
  });
});

describe("the wall", () => {
  interface Item { entity: string; card: string; area?: string }
  const wall = (items: Item[], outside?: string) => wallAreas(items, { card: (item) => item.card, area: (item) => item.area, outside });
  const ids = (list: Item[]) => list.map((item) => item.entity);

  it("bands every card the wall places, and footprints what is pressed compact and what is read standard", () => {
    expect(["light", "alarm", "camera", "owlet", "weather", "numeric"].map(wallBand)).toEqual(["actions", "security", "cameras", "status", "glance", "glance"]);
    expect(wallBand("picture")).toBeUndefined();
    expect(["climate", "light", "dyson", "alarm", "lock"].map(wallFootprint)).toEqual(Array(5).fill("compact"));
    // A Dyson is a fan's action, after the plain fan's.
    expect(WALL_BANDS.actions.indexOf("dyson")).toBe(WALL_BANDS.actions.indexOf("fan") + 1);
    expect(["binarySensor", "camera", "owlet", "guestWifi", "calendar", "weather", "sun", "sensor", "numeric", "picture"].map(wallFootprint)).toEqual(Array(10).fill("standard"));
  });

  it("makes a column per area, by area name, each in band order, and the house's own cards apart", () => {
    const { areas, house } = wall([
      { entity: "sensor.kitchen", card: "sensor", area: "Kitchen" },
      { entity: "lock.back", card: "lock", area: "Kitchen" },
      { entity: "light.kitchen", card: "light", area: "Kitchen" },
      { entity: "light.attic", card: "light", area: "Attic" },
      { entity: "calendar.family", card: "calendar" },
      { entity: "alarm_control_panel.house", card: "alarm" },
      { entity: "image.kitchen", card: "picture", area: "Kitchen" },
    ]);
    // A card in no band still goes in its column, after the glance.
    expect(areas.map((area) => [area.area, ids(area.items)])).toEqual([
      ["Attic", ["light.attic"]],
      ["Kitchen", ["light.kitchen", "lock.back", "sensor.kitchen", "image.kitchen"]],
    ]);
    expect(ids(house)).toEqual(["alarm_control_panel.house", "calendar.family"]);
  });

  it("orders the columns as Home Assistant orders its areas, an area it doesn't name after them by name", () => {
    const items = [
      { entity: "light.attic", card: "light", area: "Attic" },
      { entity: "light.kitchen", card: "light", area: "Kitchen" },
      { entity: "light.den", card: "light", area: "Den" },
      { entity: "light.yard", card: "light", area: "Yard" },
      { entity: "light.made_up", card: "light", area: "Made up" },
    ];
    const order = (names: string[]) => wallAreas(items, { card: (item) => item.card, area: (item) => item.area, order: names }).areas.map((area) => area.area);
    expect(order([])).toEqual(["Attic", "Den", "Kitchen", "Made up", "Yard"]);
    // Compared without case or the spaces around it; an area with no card takes no column.
    expect(order(["Yard", " kitchen", "Hall", "Attic", "Den"])).toEqual(["Yard", "Kitchen", "Attic", "Den", "Made up"]);
  });

  it("reads Home Assistant's area order: each floor's areas in floor order, then those on no floor, each in registry order", () => {
    expect(areaOrder({})).toEqual([]);
    expect(areaOrder({ areas: { yard: { name: "Yard" }, attic: { name: "Attic" } } })).toEqual(["Yard", "Attic"]);
    expect(areaOrder({
      areas: {
        garden: { name: "Garden" },
        bedroom: { name: "Bedroom", floor_id: "upstairs" },
        kitchen: { name: "Kitchen", floor_id: "ground" },
        loft: { name: "Loft", floor_id: "gone" },
        living: { name: "Living room", floor_id: "ground" },
        bath: { name: "Bathroom", floor_id: "upstairs" },
      },
      floors: { ground: {}, upstairs: {} },
    })).toEqual(["Kitchen", "Living room", "Bedroom", "Bathroom", "Garden", "Loft"]);
    // A person moved the upstairs floor first.
    expect(areaOrder({ areas: { kitchen: { name: "Kitchen", floor_id: "ground" }, bedroom: { name: "Bedroom", floor_id: "upstairs" } }, floors: { upstairs: {}, ground: {} } })).toEqual(["Bedroom", "Kitchen"]);
  });

  it("puts the weather and the sun in the area called Outside, or with the house's own cards", () => {
    const items = [
      { entity: "sun.sun", card: "sun" },
      { entity: "weather.home", card: "weather" },
      { entity: "light.porch", card: "light", area: "Outside" },
      { entity: "light.hall", card: "light", area: "Hall" },
    ];
    expect(wall(items, "Outside").areas.map((area) => [area.area, ids(area.items)])).toEqual([["Hall", ["light.hall"]], ["Outside", ["light.porch", "weather.home", "sun.sun"]]]);
    expect(ids(wall(items).house)).toEqual(["weather.home", "sun.sun"]);
    expect(outsideArea({ areas: { garden: { name: "Garden" }, out: { name: " outside" } } })).toBe(" outside");
    expect(outsideArea({ areas: { garden: { name: "Garden" } } })).toBeUndefined();
  });

  it("has no columns with fewer than two areas: every card is the house's, in band order", () => {
    const { areas, house } = wall([
      { entity: "sensor.living", card: "sensor", area: "Living room" },
      { entity: "alarm_control_panel.house", card: "alarm" },
      { entity: "light.living", card: "light", area: "Living room" },
    ]);
    expect(areas).toEqual([]);
    expect(ids(house)).toEqual(["light.living", "alarm_control_panel.house", "sensor.living"]);
  });

  it("places columns side by side, wrapping into rows of the same width, the last column in the first row", () => {
    const columns = [["a1", "a2"], ["b1"], ["c1"], ["d1"], ["e1"]];
    expect(placeColumns(columns, 3, ["h1", "h2"])).toEqual([
      { columns: 3, cards: [{ card: "a1", column: 1 }, { card: "a2", column: 1 }, { card: "b1", column: 2 }, { card: "h1", column: 3 }, { card: "h2", column: 3 }] },
      { columns: 3, cards: [{ card: "c1", column: 1 }, { card: "d1", column: 2 }, { card: "e1", column: 3 }] },
    ]);
    expect(placeColumns(columns, 4)).toEqual([
      { columns: 4, cards: [{ card: "a1", column: 1 }, { card: "a2", column: 1 }, { card: "b1", column: 2 }, { card: "c1", column: 3 }, { card: "d1", column: 4 }] },
      { columns: 4, cards: [{ card: "e1", column: 1 }] },
    ]);
    expect(placeColumns([["a1"], ["b1"]], 4, ["h1"])).toEqual([{ columns: 3, cards: [{ card: "a1", column: 1 }, { card: "b1", column: 2 }, { card: "h1", column: 3 }] }]);
    expect(placeColumns([], 4)).toEqual([]);
  });

  it("names each column's area where all its cards share one, case and spaces aside", () => {
    type Card = { item: { area?: string }; column?: number; width?: number | "full" };
    const areaOf = (item: { area?: string }) => item.area;
    const anchored = (...cards: [string | undefined, number][]): Card[] => cards.map(([area, column]) => ({ item: { area }, column, width: 1 }));
    expect(columnAreas({ cards: anchored(["Kitchen", 1], [" kitchen ", 1], ["Living Room", 2], ["living room", 2]) }, areaOf)).toEqual(["Kitchen", "Living Room"]);
    // " Living Room" and "living room" are one area: the first card's spelling heads the column.
    expect(columnAreas({ cards: anchored([" Living Room", 1], ["living room", 1]) }, areaOf)).toEqual([" Living Room"]);
    // A column of two areas, or of a card in none, names none; `columns` counts a column with no card.
    expect(columnAreas({ columns: 4, cards: anchored(["Kitchen", 1], ["Hall", 2], ["Attic", 2], [undefined, 3]) }, areaOf)).toEqual(["Kitchen", undefined, undefined, undefined]);
    // A titled row, a card left to the flow, a wider card, or no column of one area: none at all.
    expect(columnAreas({ title: "Kitchen", cards: anchored(["Kitchen", 1]) }, areaOf)).toBeUndefined();
    expect(columnAreas({ cards: [{ item: { area: "Kitchen" } }] }, areaOf)).toBeUndefined();
    expect(columnAreas({ cards: [...anchored(["Kitchen", 1]), { item: { area: "Hall" }, column: 2, width: 2 }] }, areaOf)).toBeUndefined();
    expect(columnAreas({ cards: anchored(["Kitchen", 1], ["Hall", 1]) }, areaOf)).toBeUndefined();
    expect(columnAreas({ cards: [] }, areaOf)).toBeUndefined();
  });
});
